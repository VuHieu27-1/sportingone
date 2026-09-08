import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface GoogleDriveUploadResult {
  fileId: string;
  directUrl: string;
  webViewLink?: string;
  fileName: string;
}

export interface BufferedFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;
  private avatarFolderId: string | null = null;
  private vendorAvatarFolderId: string | null = null;
  private yardImagesFolderId: string | null = null;
  private ratesImagesFolderId: string | null = null;
  private chatFilesFolderId: string | null = null;

  constructor(private readonly configService: ConfigService) { }

  /**
   * Reads Service Account Credentials from JSON file
   */
  private getServiceAccountCredentials(): {
    client_email: string;
    private_key: string;
    token_uri: string;
  } {
    const credPath =
      this.configService.get<string>('GOOGLE_DRIVE_CREDENTIAL_PATH') ||
      process.env.GOOGLE_DRIVE_CREDENTIAL_PATH ||
      'src/credential/service-account.json';

    const absolutePath = path.isAbsolute(credPath)
      ? credPath
      : path.join(process.cwd(), credPath);

    if (!fs.existsSync(absolutePath)) {
      this.logger.error(`Google Drive credential file not found at: ${absolutePath}`);
      throw new InternalServerErrorException(
        `Google Drive credential file not found at ${credPath}`,
      );
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      const json = JSON.parse(content);
      if (!json.client_email || !json.private_key) {
        throw new Error('Credential file is missing client_email or private_key');
      }
      return {
        client_email: json.client_email,
        private_key: json.private_key,
        token_uri: json.token_uri || 'https://oauth2.googleapis.com/token',
      };
    } catch (err: any) {
      this.logger.error(`Error parsing Google Drive credentials: ${err?.message || err}`);
      throw new InternalServerErrorException(
        `Error reading Google Drive credential file: ${err?.message || err}`,
      );
    }
  }

  /**
   * Generates JWT Token and requests Access Token from Google OAuth2
   */
  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    if (this.cachedAccessToken && this.tokenExpiresAt > now + 300) {
      return this.cachedAccessToken;
    }

    const refreshToken =
      this.configService.get<string>('GOOGLE_DRIVE_REFRESH_TOKEN') ||
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    const clientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID') ||
      process.env.GOOGLE_CLIENT_ID;

    const clientSecret =
      this.configService.get<string>('GOOGLE_CLIENT_SECRET') ||
      process.env.GOOGLE_CLIENT_SECRET;

    // 1. If personal Google account refresh token is available, use it directly
    if (refreshToken && clientId && clientSecret) {
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }).toString(),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            access_token: string;
            expires_in: number;
          };
          this.cachedAccessToken = data.access_token;
          this.tokenExpiresAt = now + (data.expires_in || 3600);
          return this.cachedAccessToken;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to refresh token via OAuth2 client, falling back to Service Account: ${err?.message || err}`);
      }
    }

    // 2. Use Service Account Credentials
    const creds = this.getServiceAccountCredentials();

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const claim = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: creds.token_uri,
      exp: now + 3600,
      iat: now,
    };

    const encodeBase64Url = (obj: any) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claim)}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    sign.end();
    const signature = sign
      .sign(creds.private_key, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signature}`;

    try {
      const response = await fetch(creds.token_uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google OAuth2 error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };

      this.cachedAccessToken = data.access_token;
      this.tokenExpiresAt = now + (data.expires_in || 3600);
      return this.cachedAccessToken;
    } catch (err: any) {
      this.logger.error(`Failed to get Google Drive access token: ${err?.message || err}`);
      throw new InternalServerErrorException(
        `Không thể lấy access token cho Google Drive: ${err?.message || err}`,
      );
    }
  }

  /**
   * Finds or creates avatar-user folder inside root folder
   */
  async getAvatarFolderId(): Promise<string> {
    if (this.avatarFolderId) {
      return this.avatarFolderId;
    }

    const rootFolderId =
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID') ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      '1qn6Cu-SrehkvG0jC26dq1RcvCa93XwQX';

    const avatarFolderName =
      this.configService.get<string>('GOOGLE_DRIVE_AVATAR_FOLDER_NAME') ||
      process.env.GOOGLE_DRIVE_AVATAR_FOLDER_NAME ||
      'avatar-user';

    const accessToken = await this.getAccessToken();

    try {
      const query = `'${rootFolderId}' in parents and name = '${avatarFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(
        query,
      )}&fields=files(id,name)`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          files?: Array<{ id: string; name: string }>;
        };
        if (searchData.files && searchData.files.length > 0) {
          this.avatarFolderId = searchData.files[0].id;
          this.logger.log(`Found existing avatar folder: ${this.avatarFolderId}`);
          return this.avatarFolderId;
        }
      }
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: avatarFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });

      if (createRes.ok) {
        const createData = (await createRes.json()) as { id: string };
        this.avatarFolderId = createData.id;
        this.logger.log(`Created new avatar folder: ${this.avatarFolderId}`);
        return this.avatarFolderId;
      }
      this.avatarFolderId = rootFolderId;
      return this.avatarFolderId;
    } catch (err: any) {
      this.logger.warn(`Error resolving avatar folder ID, falling back to root folder: ${err?.message || err}`);
      this.avatarFolderId = rootFolderId;
      return this.avatarFolderId;
    }
  }

  /**
   * Finds or creates avatar-vendor folder inside root folder
   */
  async getVendorAvatarFolderId(): Promise<string> {
    if (this.vendorAvatarFolderId) {
      return this.vendorAvatarFolderId;
    }

    const rootFolderId =
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID') ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      '1qn6Cu-SrehkvG0jC26dq1RcvCa93XwQX';

    const vendorAvatarFolderName =
      this.configService.get<string>('GOOGLE_DRIVE_VENDOR_AVATAR_FOLDER_NAME') ||
      process.env.GOOGLE_DRIVE_VENDOR_AVATAR_FOLDER_NAME ||
      'avatar-vendor';

    const accessToken = await this.getAccessToken();

    try {
      const query = `'${rootFolderId}' in parents and name = '${vendorAvatarFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(
        query,
      )}&fields=files(id,name)`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          files?: Array<{ id: string; name: string }>;
        };
        if (searchData.files && searchData.files.length > 0) {
          this.vendorAvatarFolderId = searchData.files[0].id;
          this.logger.log(`Found existing vendor avatar folder: ${this.vendorAvatarFolderId}`);
          return this.vendorAvatarFolderId;
        }
      }
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: vendorAvatarFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });

      if (createRes.ok) {
        const createData = (await createRes.json()) as { id: string };
        this.vendorAvatarFolderId = createData.id;
        this.logger.log(`Created new vendor avatar folder: ${this.vendorAvatarFolderId}`);
        return this.vendorAvatarFolderId;
      }
      this.vendorAvatarFolderId = rootFolderId;
      return this.vendorAvatarFolderId;
    } catch (err: any) {
      this.logger.warn(`Error resolving vendor avatar folder ID, falling back to root folder: ${err?.message || err}`);
      this.vendorAvatarFolderId = rootFolderId;
      return this.vendorAvatarFolderId;
    }
  }

  /**
   * Finds or creates images-yard folder inside root folder
   */
  async getYardImagesFolderId(): Promise<string> {
    if (this.yardImagesFolderId) {
      return this.yardImagesFolderId;
    }

    const rootFolderId =
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID') ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      '1qn6Cu-SrehkvG0jC26dq1RcvCa93XwQX';

    const yardImagesFolderName =
      this.configService.get<string>('GOOGLE_DRIVE_YARD_IMAGES_FOLDER_NAME') ||
      process.env.GOOGLE_DRIVE_YARD_IMAGES_FOLDER_NAME ||
      'images-yard';

    const accessToken = await this.getAccessToken();

    try {
      const query = `'${rootFolderId}' in parents and name = '${yardImagesFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(
        query,
      )}&fields=files(id,name)`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          files?: Array<{ id: string; name: string }>;
        };
        if (searchData.files && searchData.files.length > 0) {
          this.yardImagesFolderId = searchData.files[0].id;
          this.logger.log(`Found existing yard images folder: ${this.yardImagesFolderId}`);
          return this.yardImagesFolderId;
        }
      }
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: yardImagesFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });

      if (createRes.ok) {
        const createData = (await createRes.json()) as { id: string };
        this.yardImagesFolderId = createData.id;
        this.logger.log(`Created new yard images folder: ${this.yardImagesFolderId}`);
        return this.yardImagesFolderId;
      }
      this.yardImagesFolderId = rootFolderId;
      return this.yardImagesFolderId;
    } catch (err: any) {
      this.logger.warn(`Error resolving yard images folder ID, falling back to root folder: ${err?.message || err}`);
      this.yardImagesFolderId = rootFolderId;
      return this.yardImagesFolderId;
    }
  }

  /**
   * Finds or creates rates-images folder inside root folder
   */
  async getRatesImagesFolderId(): Promise<string> {
    if (this.ratesImagesFolderId) {
      return this.ratesImagesFolderId;
    }

    const rootFolderId =
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID') ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      '1qn6Cu-SrehkvG0jC26dq1RcvCa93XwQX';

    const ratesImagesFolderName =
      this.configService.get<string>('GOOGLE_DRIVE_RATES_IMAGES_FOLDER_NAME') ||
      process.env.GOOGLE_DRIVE_RATES_IMAGES_FOLDER_NAME ||
      'rates-images';

    const accessToken = await this.getAccessToken();

    try {
      const query = `'${rootFolderId}' in parents and name = '${ratesImagesFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(
        query,
      )}&fields=files(id,name)`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          files?: Array<{ id: string; name: string }>;
        };
        if (searchData.files && searchData.files.length > 0) {
          this.ratesImagesFolderId = searchData.files[0].id;
          this.logger.log(`Found existing rates images folder: ${this.ratesImagesFolderId}`);
          return this.ratesImagesFolderId;
        }
      }
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: ratesImagesFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });

      if (createRes.ok) {
        const createData = (await createRes.json()) as { id: string };
        this.ratesImagesFolderId = createData.id;
        this.logger.log(`Created new rates images folder: ${this.ratesImagesFolderId}`);
        return this.ratesImagesFolderId;
      }
      this.ratesImagesFolderId = rootFolderId;
      return this.ratesImagesFolderId;
    } catch (err: any) {
      this.logger.warn(`Error resolving rates images folder ID, falling back to root folder: ${err?.message || err}`);
      this.ratesImagesFolderId = rootFolderId;
      return this.ratesImagesFolderId;
    }
  }

  /**
   * Sets public read permission for file so it can be viewed in UI
   */
  async makeFilePublic(fileId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Failed to set public permission on file ${fileId}: ${errText}`);
      }
    } catch (err: any) {
      this.logger.warn(`Error making file public: ${err?.message || err}`);
    }
  }

  /**
   * Uploads user avatar image to Google Drive folder avatar-user
   */
  async uploadAvatar(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId?: number,
  ): Promise<GoogleDriveUploadResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Upload file contains no data');
    }

    const folderId = await this.getAvatarFolderId();
    const accessToken = await this.getAccessToken();

    const ext = path.extname(originalName) || '.jpg';
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `avatar_user_${userId || 'guest'}_${Date.now()}_${safeBaseName}${ext}`;

    const boundary = `-------SportingDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType || 'image/jpeg',
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'image/jpeg'}\r\n` +
        'Content-Transfer-Encoding: binary\r\n\r\n',
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Drive upload error (${response.status}): ${errorText}`);
      throw new InternalServerErrorException(
        `Failed to upload image to Google Drive: ${errorText}`,
      );
    }

    const resultData = (await response.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
    };

    await this.makeFilePublic(resultData.id);
    const directUrl = `https://lh3.googleusercontent.com/d/${resultData.id}`;
    return {
      fileId: resultData.id,
      directUrl,
      webViewLink: resultData.webViewLink,
      fileName: resultData.name,
    };
  }

  /**
   * Uploads vendor avatar image to Google Drive folder avatar-vendor
   */
  async uploadVendorAvatar(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    vendorId?: number,
  ): Promise<GoogleDriveUploadResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Upload file contains no data');
    }

    const folderId = await this.getVendorAvatarFolderId();
    const accessToken = await this.getAccessToken();

    const ext = path.extname(originalName) || '.jpg';
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `avatar_vendor_${vendorId || 'unknown'}_${Date.now()}_${safeBaseName}${ext}`;

    const boundary = `-------SportingVendorDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType || 'image/jpeg',
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'image/jpeg'}\r\n` +
        'Content-Transfer-Encoding: binary\r\n\r\n',
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Drive vendor avatar upload error (${response.status}): ${errorText}`);
      throw new InternalServerErrorException(
        `Failed to upload vendor image to Google Drive: ${errorText}`,
      );
    }

    const resultData = (await response.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
    };

    await this.makeFilePublic(resultData.id);
    const directUrl = `https://lh3.googleusercontent.com/d/${resultData.id}`;
    return {
      fileId: resultData.id,
      directUrl,
      webViewLink: resultData.webViewLink,
      fileName: resultData.name,
    };
  }

  /**
   * Uploads yard image to Google Drive folder images-yard
   */
  async uploadYardImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    yardId?: number,
  ): Promise<GoogleDriveUploadResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Upload file contains no data');
    }

    const folderId = await this.getYardImagesFolderId();
    const accessToken = await this.getAccessToken();

    const ext = path.extname(originalName) || '.jpg';
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `yard_${yardId || 'image'}_${Date.now()}_${safeBaseName}${ext}`;

    const boundary = `-------SportingYardDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType || 'image/jpeg',
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'image/jpeg'}\r\n` +
        'Content-Transfer-Encoding: binary\r\n\r\n',
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Drive yard image upload error (${response.status}): ${errorText}`);
      throw new InternalServerErrorException(
        `Failed to upload yard image to Google Drive: ${errorText}`,
      );
    }

    const resultData = (await response.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
    };

    await this.makeFilePublic(resultData.id);
    const directUrl = `https://lh3.googleusercontent.com/d/${resultData.id}`;
    return {
      fileId: resultData.id,
      directUrl,
      webViewLink: resultData.webViewLink,
      fileName: resultData.name,
    };
  }

  /**
   * Uploads rating image to Google Drive folder rates-images
   */
  async uploadRateImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    rateId?: number,
  ): Promise<GoogleDriveUploadResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Upload file contains no data');
    }

    const folderId = await this.getRatesImagesFolderId();
    const accessToken = await this.getAccessToken();

    const ext = path.extname(originalName) || '.jpg';
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `rate_${rateId || 'review'}_${Date.now()}_${safeBaseName}${ext}`;

    const boundary = `-------SportingRateDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType || 'image/jpeg',
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'image/jpeg'}\r\n` +
        'Content-Transfer-Encoding: binary\r\n\r\n',
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Drive rate image upload error (${response.status}): ${errorText}`);
      throw new InternalServerErrorException(
        `Failed to upload rate image to Google Drive: ${errorText}`,
      );
    }

    const resultData = (await response.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
    };

    await this.makeFilePublic(resultData.id);
    const directUrl = `https://lh3.googleusercontent.com/d/${resultData.id}`;
    return {
      fileId: resultData.id,
      directUrl,
      webViewLink: resultData.webViewLink,
      fileName: resultData.name,
    };
  }

  /**
   * Finds or creates chat-ai-files folder inside root folder
   */
  async getChatFilesFolderId(): Promise<string> {
    if (this.chatFilesFolderId) {
      return this.chatFilesFolderId;
    }

    const rootFolderId =
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID') ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      '1qn6Cu-SrehkvG0jC26dq1RcvCa93XwQX';

    const chatFilesFolderName =
      this.configService.get<string>('GOOGLE_DRIVE_CHAT_FILES_FOLDER_NAME') ||
      process.env.GOOGLE_DRIVE_CHAT_FILES_FOLDER_NAME ||
      'chat-ai-files';

    const accessToken = await this.getAccessToken();

    try {
      const query = `'${rootFolderId}' in parents and name = '${chatFilesFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(
        query,
      )}&fields=files(id,name)`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          files?: Array<{ id: string; name: string }>;
        };
        if (searchData.files && searchData.files.length > 0) {
          this.chatFilesFolderId = searchData.files[0].id;
          this.logger.log(`Found existing chat AI files folder: ${this.chatFilesFolderId}`);
          return this.chatFilesFolderId;
        }
      }

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: chatFilesFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });

      if (createRes.ok) {
        const createData = (await createRes.json()) as { id: string };
        this.chatFilesFolderId = createData.id;
        this.logger.log(`Created new chat AI files folder: ${this.chatFilesFolderId}`);
        return this.chatFilesFolderId;
      }
      this.chatFilesFolderId = rootFolderId;
      return this.chatFilesFolderId;
    } catch (err: any) {
      this.logger.warn(`Error resolving chat files folder ID, falling back to root folder: ${err?.message || err}`);
      this.chatFilesFolderId = rootFolderId;
      return this.chatFilesFolderId;
    }
  }

  /**
   * Uploads image, video or document file from AI chat.
   */
  async uploadChatFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId?: number,
  ): Promise<GoogleDriveUploadResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Upload file contains no data');
    }

    const folderId = await this.getChatFilesFolderId();
    const accessToken = await this.getAccessToken();

    const ext = path.extname(originalName) || '';
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `chat_ai_${userId || 'guest'}_${Date.now()}_${safeBaseName}${ext}`;

    const boundary = `-------SportingChatDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType || 'application/octet-stream',
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'application/octet-stream'}\r\n` +
        'Content-Transfer-Encoding: binary\r\n\r\n',
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Drive chat file upload error (${response.status}): ${errorText}`);
      throw new InternalServerErrorException(
        `Failed to upload chat file to Google Drive: ${errorText}`,
      );
    }

    const resultData = (await response.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
    };

    await this.makeFilePublic(resultData.id);
    const directUrl = `https://lh3.googleusercontent.com/d/${resultData.id}`;
    return {
      fileId: resultData.id,
      directUrl,
      webViewLink: resultData.webViewLink,
      fileName: resultData.name,
    };
  }

  /**
   * Deletes file from Google Drive by fileId
   */
  async deleteFile(fileId: string): Promise<boolean> {
    if (!fileId) return false;
    try {
      const accessToken = await this.getAccessToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return res.ok || res.status === 404;
    } catch (err: any) {
      this.logger.warn(`Error deleting file ${fileId} from Google Drive: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Extracts Google Drive File ID from image URL (if exists)
   */
  extractFileIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    // Format: https://lh3.googleusercontent.com/d/FILE_ID
    const lh3Match = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) return lh3Match[1];

    // Format: https://drive.google.com/uc?id=FILE_ID or &id=FILE_ID
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) return ucMatch[1];

    // Format: https://drive.google.com/file/d/FILE_ID/...
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) return fileDMatch[1];

    return null;
  }
}
