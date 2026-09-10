import * as zlib from 'zlib';
import * as crypto from 'crypto';

export interface ZipEntry {
  filename: string;
  data: Buffer;
}

// Precomputed CRC32 table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

export function calculateCrc32(buffer: Buffer): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Creates a valid PKWARE ZIP file buffer from an array of entries.
 */
export function createZipArchive(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirectoryHeaders: Buffer[] = [];
  let currentOffset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.filename, 'utf8');
    const uncompressedData = entry.data;
    const crc = calculateCrc32(uncompressedData);
    const compressedData = zlib.deflateRawSync(uncompressedData);

    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6);      // General purpose bit flag: UTF-8 encoding (bit 11)
    localHeader.writeUInt16LE(8, 8);          // Compression method: Deflate (8)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(uncompressedData.length, 22);
    localHeader.writeUInt16LE(filenameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);         // Extra field length
    filenameBuffer.copy(localHeader, 30);

    const fullLocalFile = Buffer.concat([localHeader, compressedData]);
    localHeaders.push(fullLocalFile);

    const cdHeader = Buffer.alloc(46 + filenameBuffer.length);
    cdHeader.writeUInt32LE(0x02014b50, 0);    // Central directory header signature
    cdHeader.writeUInt16LE(20, 4);            // Version made by: 2.0 (DOS/FAT)
    cdHeader.writeUInt16LE(20, 6);            // Version needed to extract: 2.0
    cdHeader.writeUInt16LE(0x0800, 8);         // Flags: UTF-8 encoding (bit 11)
    cdHeader.writeUInt16LE(8, 10);            // Compression: Deflate
    cdHeader.writeUInt16LE(dosTime, 12);
    cdHeader.writeUInt16LE(dosDate, 14);
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compressedData.length, 20);
    cdHeader.writeUInt32LE(uncompressedData.length, 24);
    cdHeader.writeUInt16LE(filenameBuffer.length, 28);
    cdHeader.writeUInt16LE(0, 30);            // Extra field length
    cdHeader.writeUInt16LE(0, 32);            // File comment length
    cdHeader.writeUInt16LE(0, 34);            // Disk number start
    cdHeader.writeUInt16LE(0, 36);            // Internal attributes
    cdHeader.writeUInt32LE(0x20, 38);         // External attributes: Standard Archive file (0x20)
    cdHeader.writeUInt32LE(currentOffset, 42);// Relative offset of local header
    filenameBuffer.copy(cdHeader, 46);

    centralDirectoryHeaders.push(cdHeader);
    currentOffset += fullLocalFile.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirectoryHeaders);
  const centralDirOffset = currentOffset;
  const centralDirSize = centralDirBuffer.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // End of central dir signature
  eocd.writeUInt16LE(0, 4);                   // Disk number
  eocd.writeUInt16LE(0, 6);                   // Disk with central dir
  eocd.writeUInt16LE(entries.length, 8);      // Entries on this disk
  eocd.writeUInt16LE(entries.length, 10);     // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);     // Size of central dir
  eocd.writeUInt32LE(centralDirOffset, 16);   // Offset of central dir
  eocd.writeUInt16LE(0, 20);                  // Comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}

/**
 * Extracts all files from a standard ZIP buffer.
 */
export function extractZipArchive(buffer: Buffer): ZipEntry[] {
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Định dạng file không phải là ZIP hợp lệ (Không tìm thấy EOCD header).');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  const extractedEntries: ZipEntry[] = [];
  let currentCdOffset = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (buffer.readUInt32LE(currentCdOffset) !== 0x02014b50) {
      throw new Error(`Corrupted Central Directory header tại vị trí ${currentCdOffset}`);
    }

    const compressionMethod = buffer.readUInt16LE(currentCdOffset + 10);
    const compressedSize = buffer.readUInt32LE(currentCdOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(currentCdOffset + 24);
    const filenameLength = buffer.readUInt16LE(currentCdOffset + 28);
    const extraLength = buffer.readUInt16LE(currentCdOffset + 30);
    const commentLength = buffer.readUInt16LE(currentCdOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(currentCdOffset + 42);

    const filename = buffer.toString('utf8', currentCdOffset + 46, currentCdOffset + 46 + filenameLength);

    // Read data from local header
    const localDataOffset = localHeaderOffset + 30 +
      buffer.readUInt16LE(localHeaderOffset + 26) + // local filename len
      buffer.readUInt16LE(localHeaderOffset + 28);   // local extra len

    const compressedPayload = buffer.subarray(localDataOffset, localDataOffset + compressedSize);

    let extractedData: Buffer;
    if (compressionMethod === 0) {
      extractedData = Buffer.from(compressedPayload);
    } else if (compressionMethod === 8) {
      extractedData = zlib.inflateRawSync(compressedPayload);
    } else {
      throw new Error(`Phương thức nén không được hỗ trợ: ${compressionMethod}`);
    }

    if (extractedData.length !== uncompressedSize) {
      throw new Error(`Kích thước giải nén không khớp cho file ${filename}`);
    }

    extractedEntries.push({
      filename,
      data: extractedData,
    });

    currentCdOffset += 46 + filenameLength + extraLength + commentLength;
  }

  return extractedEntries;
}
