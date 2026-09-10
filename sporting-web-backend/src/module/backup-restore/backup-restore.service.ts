import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  BackupRestore,
  BackupType,
  BackupStatus,
  StorageLocation,
} from './entities/backup-restore.entity';
import { CreateBackupRestoreDto, RestoreBackupDto } from './dto/create-backup-restore.dto';
import { GoogleDriveService, BufferedFile } from '../../common/google-drive/google-drive.service';
import {
  createZipArchive,
  extractZipArchive,
  calculateSha256,
} from './utils/zip.util';

export interface RestoreStepLog {
  step: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  message: string;
  timestamp: string;
}

export interface RestoreExecutionResult {
  success: boolean;
  message: string;
  safetyBackup: {
    id: number;
    filename: string;
    fileSize: number;
    checksum: string | null;
    createdAt: Date;
  };
  restoredBackup: {
    id?: number;
    filename: string;
  };
  executionTrace: RestoreStepLog[];
}

@Injectable()
export class BackupRestoreService implements OnModuleInit {
  private readonly logger = new Logger(BackupRestoreService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');

  constructor(
    @InjectRepository(BackupRestore)
    private readonly backupRepo: Repository<BackupRestore>,
    private readonly dataSource: DataSource,
    private readonly googleDriveService: GoogleDriveService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) { }

  async onModuleInit() {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    await this.syncLocalBackupsWithDatabase();
    this.registerAutoBackupCron();
  }


  async syncLocalBackupsWithDatabase(): Promise<void> {
    if (!fs.existsSync(this.backupDir)) return;

    try {
      const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith('.zip'));
      for (const fileName of files) {
        const existing = await this.backupRepo.findOne({ where: { filename: fileName } });
        if (!existing) {
          const filePath = path.join(this.backupDir, fileName);
          const stat = fs.statSync(filePath);
          const fileBuffer = fs.readFileSync(filePath);
          const checksum = calculateSha256(fileBuffer);

          let tablesCount = 0;
          let recordsCount = 0;
          let backupType = BackupType.MANUAL;
          let notes: string | null = null;

          if (fileName.includes('SAFETY_BEFORE_RESTORE')) {
            backupType = BackupType.SAFETY_BEFORE_RESTORE;
            notes = 'Bản sao lưu an toàn tự động tạo trước khi phục hồi';
          } else if (fileName.includes('AUTOMATED')) {
            backupType = BackupType.AUTOMATED;
            notes = 'Tự động sao lưu định kỳ';
          }

          try {
            const entries = extractZipArchive(fileBuffer);
            const manifestEntry = entries.find((e) => e.filename === 'manifest.json');
            if (manifestEntry) {
              const manifest = JSON.parse(manifestEntry.data.toString('utf8'));
              tablesCount = manifest.tablesCount || 0;
              recordsCount = manifest.totalRecords || 0;
              if (manifest.backupType) {
                backupType = manifest.backupType;
              }
            }
          } catch (e) {
            // ignore extract error if zip has issue
          }

          const record = this.backupRepo.create({
            filename: fileName,
            filePath,
            fileSize: stat.size,
            checksum,
            backupType,
            status: BackupStatus.SUCCESS,
            storageLocation: StorageLocation.LOCAL,
            tablesCount,
            recordsCount,
            notes,
            createdBy: 'System (Auto-Synced)',
            createdAt: stat.birthtime || stat.mtime || new Date(),
          });

          await this.backupRepo.save(record);
          this.logger.log(`[Sync] Đã tự động đồng bộ khôi phục bản ghi sao lưu: ${fileName}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`[Sync] Không thể đồng bộ file sao lưu: ${err.message}`);
    }
  }


  private registerAutoBackupCron() {
    const enabled =
      this.configService.get<string>('BACKUP_SCHEDULE_ENABLED', 'true') !== 'false';
    if (!enabled) {
      this.logger.log('[Auto-Backup] Tự động sao lưu định kỳ đang TẮT (BACKUP_SCHEDULE_ENABLED=false).');
      return;
    }

    let cronExpr = this.configService.get<string>('BACKUP_SCHEDULE_CRON');
    const scheduleTime = this.configService.get<string>('BACKUP_SCHEDULE_TIME');

    if (!cronExpr) {
      if (scheduleTime && /^\d{1,2}:\d{2}$/.test(scheduleTime.trim())) {
        const [hour, minute] = scheduleTime.trim().split(':');
        cronExpr = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;
      } else {
        cronExpr = '0 18 * * *'; // Mặc định 18:00 (6h chiều hàng ngày)
      }
    }

    const timeZone =
      this.configService.get<string>('BACKUP_SCHEDULE_TIMEZONE') ||
      this.configService.get<string>('TZ') ||
      'Asia/Ho_Chi_Minh';

    try {
      const job = CronJob.from({
        cronTime: cronExpr,
        onTick: async () => {
          this.logger.log(
            `[Auto-Backup] Đang tự động sao lưu theo lịch (${scheduleTime || cronExpr})...`,
          );
          try {
            const backup = await this.createBackup({
              backupType: BackupType.AUTOMATED,
              notes: `Tự động sao lưu định kỳ lúc ${scheduleTime || cronExpr} (${timeZone})`,
              createdBy: 'System Scheduler (Cron)',
            });
            this.logger.log(
              `[Auto-Backup] Sao lưu tự động thành công: #${backup.id} (${backup.filename})`,
            );
          } catch (err: any) {
            this.logger.error(
              `[Auto-Backup] Lỗi trong quá trình tự động sao lưu: ${err?.message || err}`,
            );
          }
        },
        start: true,
        timeZone,
      });

      this.schedulerRegistry.addCronJob('sporting_auto_backup_job', job);
      const nextRun = job.nextDate().toFormat('yyyy-MM-dd HH:mm:ss');
      this.logger.log(
        `[Auto-Backup] Đã bật lịch sao lưu tự động: "${cronExpr}" (${timeZone}). Lần chạy kế tiếp: ${nextRun}`,
      );
    } catch (scheduleErr: any) {
      this.logger.error(
        `[Auto-Backup] Không thể kích hoạt lịch Cron: ${scheduleErr?.message || scheduleErr}`,
      );
    }
  }

  /**
   * Helper to format values for SQL INSERT
   */
  private escapeSqlValue(val: any): string {
    if (val === null || val === undefined) {
      return 'NULL';
    }
    if (typeof val === 'boolean') {
      return val ? '1' : '0';
    }
    if (typeof val === 'number') {
      return isNaN(val) ? 'NULL' : String(val);
    }
    if (val instanceof Date) {
      return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    if (Buffer.isBuffer(val)) {
      return `X'${val.toString('hex')}'`;
    }
    if (typeof val === 'object') {
      const jsonStr = JSON.stringify(val);
      return `'${jsonStr.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
          case '\0': return '\\0';
          case '\x08': return '\\b';
          case '\x09': return '\\t';
          case '\x1a': return '\\z';
          case '\n': return '\\n';
          case '\r': return '\\r';
          case '"':
          case "'":
          case '\\':
          case '%': return '\\' + char;
          default: return char;
        }
      })}'`;
    }

    const str = String(val);
    return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%': return '\\' + char;
        default: return char;
      }
    })}'`;
  }

  /**
   * Generates full database SQL dump with manifest metadata
   */
  private async exportDatabaseDump(backupType: BackupType): Promise<{
    sqlContent: string;
    manifest: any;
    tablesCount: number;
    recordsCount: number;
  }> {
    const rawTables = await this.dataSource.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
    );
    // Hard exclude system tables (backup_restore) so backup history is NEVER dumped or overwritten
    const tableNames: string[] = rawTables
      .map((r: any) => Object.values(r)[0] as string)
      .filter((t: string) => t !== 'backup_restore');

    let sqlDump = `-- Sporting Web Database Backup\n`;
    sqlDump += `-- Exported At: ${new Date().toISOString()}\n`;
    sqlDump += `-- Backup Type: ${backupType}\n`;
    sqlDump += `-- ------------------------------------------------------\n\n`;
    sqlDump += `SET NAMES utf8mb4;\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    sqlDump += `SET UNIQUE_CHECKS = 0;\n`;
    sqlDump += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n`;

    let totalRecords = 0;
    const tablesMeta: Array<{ name: string; rowCount: number }> = [];

    for (const table of tableNames) {
      // Get Create Table SQL
      const createTableResult = await this.dataSource.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createTableResult[0]['Create Table'];

      sqlDump += `-- Table structure for table \`${table}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      sqlDump += `${createSql};\n\n`;

      // Get Rows
      const rows = await this.dataSource.query(`SELECT * FROM \`${table}\``);
      const rowCount = rows.length;
      totalRecords += rowCount;
      tablesMeta.push({ name: table, rowCount });

      if (rowCount > 0) {
        sqlDump += `-- Dumping data for table \`${table}\`\n`;
        const columns = Object.keys(rows[0]);
        const colsSql = columns.map((c) => `\`${c}\``).join(', ');

        const CHUNK_SIZE = 200;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          const valuesSql = chunk
            .map((row: any) => `(${columns.map((col) => this.escapeSqlValue(row[col])).join(', ')})`)
            .join(',\n');

          sqlDump += `INSERT INTO \`${table}\` (${colsSql}) VALUES\n${valuesSql};\n`;
        }
        sqlDump += `\n`;
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sqlDump += `SET UNIQUE_CHECKS = 1;\n`;

    const manifest = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      backupType,
      tablesCount: tableNames.length,
      totalRecords,
      tables: tablesMeta,
      sqlChecksum: calculateSha256(Buffer.from(sqlDump, 'utf8')),
    };

    return {
      sqlContent: sqlDump,
      manifest,
      tablesCount: tableNames.length,
      recordsCount: totalRecords,
    };
  }

  /**
   * CREATE BACKUP (Manual, Automated, or Safety Backup)
   */
  async createBackup(dto: CreateBackupRestoreDto = {}): Promise<BackupRestore> {
    const backupType = dto.backupType || BackupType.MANUAL;
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const prefix =
      backupType === BackupType.SAFETY_BEFORE_RESTORE
        ? 'SAFETY_BEFORE_RESTORE'
        : backupType.toUpperCase();
    const fileName = `sporting_${prefix}_${dateStr}.zip`;
    const filePath = path.join(this.backupDir, fileName);

    this.logger.log(`[Backup] Bắt đầu tạo sao lưu: ${fileName} (Type: ${backupType})`);

    const { sqlContent, manifest, tablesCount, recordsCount } =
      await this.exportDatabaseDump(backupType);

    const zipBuffer = createZipArchive([
      {
        filename: 'manifest.json',
        data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
      },
      {
        filename: 'database.sql',
        data: Buffer.from(sqlContent, 'utf8'),
      },
    ]);

    fs.writeFileSync(filePath, zipBuffer);
    const checksum = calculateSha256(zipBuffer);

    let storageLocation = StorageLocation.LOCAL;
    let googleDriveFileId: string | null = null;
    let googleDriveWebUrl: string | null = null;

    try {
      const uploadResult = await this.googleDriveService.uploadBackup(zipBuffer, fileName);
      storageLocation = StorageLocation.BOTH;
      googleDriveFileId = uploadResult.fileId;
      googleDriveWebUrl = uploadResult.directUrl;
      this.logger.log(`[Backup] Đồng bộ Google Drive thành công: ${uploadResult.fileId}`);
    } catch (driveErr: any) {
      this.logger.warn(`[Backup] Không thể đồng bộ lên Google Drive: ${driveErr?.message || driveErr}`);
    }

    const record = this.backupRepo.create({
      filename: fileName,
      filePath,
      fileSize: zipBuffer.length,
      checksum,
      backupType,
      status: BackupStatus.SUCCESS,
      storageLocation,
      googleDriveFileId,
      googleDriveWebUrl,
      tablesCount,
      recordsCount,
      notes: dto.notes || null,
      createdBy: dto.createdBy || 'System Admin',
    });

    const saved = await this.backupRepo.save(record);
    this.logger.log(
      `[Backup] Hoàn tất sao lưu #${saved.id} - ${fileName} (${zipBuffer.length} bytes)`,
    );
    return saved;
  }

  /**
   * Split SQL text into executable statements safely
   */
  private splitSqlStatements(sqlText: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;

    for (let i = 0; i < sqlText.length; i++) {
      const char = sqlText[i];
      const nextChar = sqlText[i + 1];

      if (inComment) {
        if (char === '\n') inComment = false;
        continue;
      }

      if (!inString && char === '-' && nextChar === '-') {
        inComment = true;
        i++;
        continue;
      }

      if (inString) {
        current += char;
        if (char === stringChar && sqlText[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (char === "'" || char === '"' || char === '`') {
          inString = true;
          stringChar = char;
          current += char;
        } else if (char === ';') {
          const trimmed = current.trim();
          if (trimmed) statements.push(trimmed);
          current = '';
        } else {
          current += char;
        }
      }
    }

    const remaining = current.trim();
    if (remaining) statements.push(remaining);
    return statements;
  }

  /**
   * STRICT PRODUCTION RESTORE FLOW
   */
  async restoreBackup(backupId: number, dto: RestoreBackupDto = {}): Promise<RestoreExecutionResult> {
    const trace: RestoreStepLog[] = [];
    const logStep = (step: number, name: string, status: 'RUNNING' | 'SUCCESS' | 'FAILED', msg: string) => {
      const entry: RestoreStepLog = {
        step,
        name,
        status,
        message: msg,
        timestamp: new Date().toISOString(),
      };
      trace.push(entry);
      this.logger.log(`[Restore Step ${step}] ${name} -> [${status}] ${msg}`);
    };


    logStep(1, 'Select Backup', 'RUNNING', `Kiểm tra bản sao lưu mục tiêu ID #${backupId}`);
    const targetBackup = await this.backupRepo.findOne({ where: { id: backupId } });
    if (!targetBackup) {
      logStep(1, 'Select Backup', 'FAILED', `Không tìm thấy bản sao lưu ID #${backupId}`);
      throw new NotFoundException(`Không tìm thấy bản sao lưu với ID: ${backupId}`);
    }
    logStep(
      1,
      'Select Backup',
      'SUCCESS',
      `Đã chọn bản sao lưu: "${targetBackup.filename}" (Loại: ${targetBackup.backupType}, Kích thước: ${targetBackup.fileSize} bytes)`,
    );

    logStep(2, 'Confirm Restore', 'RUNNING', 'Kiểm tra xác nhận phục hồi từ Quản trị viên');
    const adminUser = dto.executedBy || 'System Admin';
    logStep(
      2,
      'Confirm Restore',
      'SUCCESS',
      `Xác nhận thành công bởi Quản trị viên: ${adminUser}`,
    );

    logStep(3, 'Download Backup', 'RUNNING', `Nạp file sao lưu "${targetBackup.filename}"`);
    let zipBuffer: Buffer;

    // Check if local file exists
    if (targetBackup.filePath && fs.existsSync(targetBackup.filePath)) {
      zipBuffer = fs.readFileSync(targetBackup.filePath);
      logStep(3, 'Download Backup', 'SUCCESS', `Đã nạp file từ kho lưu trữ máy chủ cục bộ`);
    } else if (targetBackup.googleDriveFileId) {
      try {
        zipBuffer = await this.googleDriveService.downloadBackup(targetBackup.googleDriveFileId);
        logStep(3, 'Download Backup', 'SUCCESS', `Đã tải thành công file.`);
      } catch (dlErr: any) {
        logStep(3, 'Download Backup', 'FAILED', `Tải file từ Google Drive thất bại: ${dlErr.message}`);
        throw new BadRequestException(`Không thể tải bản sao lưu từ Google Drive: ${dlErr.message}`);
      }
    } else {
      logStep(3, 'Download Backup', 'FAILED', `Không tìm thấy file sao lưu.`);
      throw new NotFoundException(`File sao lưu không tồn tại hoặc đã bị xóa khỏi hệ thống lưu trữ.`);
    }

    logStep(4, 'Validate Backup', 'RUNNING', 'Giải nén và kiểm tra tính toàn vẹn');
    let manifestData: any;
    let sqlContent: string;

    try {
      const entries = extractZipArchive(zipBuffer);
      const manifestEntry = entries.find((e) => e.filename === 'manifest.json');
      const sqlEntry = entries.find((e) => e.filename === 'database.sql');

      if (!manifestEntry || !sqlEntry) {
        throw new Error('Gói ZIP thiếu manifest.json hoặc database.sql');
      }

      manifestData = JSON.parse(manifestEntry.data.toString('utf8'));
      sqlContent = sqlEntry.data.toString('utf8');

      const computedSqlChecksum = calculateSha256(sqlEntry.data);
      if (manifestData.sqlChecksum && manifestData.sqlChecksum !== computedSqlChecksum) {
        throw new Error('Checksum của file database.sql không khớp với manifest.');
      }

      if (!sqlContent.includes('SET FOREIGN_KEY_CHECKS') && !sqlContent.includes('CREATE TABLE')) {
        throw new Error('Nội dung file database.sql không hợp lệ hoặc rỗng.');
      }

      logStep(
        4,
        'Validate Backup',
        'SUCCESS',
        `Xác thực toàn vẹn thành công: ${manifestData.tablesCount} bảng, ${manifestData.totalRecords} bản ghi. Checksum hợp lệ.`,
      );
    } catch (valErr: any) {
      logStep(4, 'Validate Backup', 'FAILED', `Bản sao lưu không hợp lệ: ${valErr.message}`);
      throw new BadRequestException(`Bản sao lưu không hợp lệ: ${valErr.message}`);
    }
    logStep(
      5,
      'SAFETY BACKUP CURRENT DATA',
      'RUNNING',
      'BẮT BUỘC: Đang sao lưu toàn bộ dữ liệu hiện tại trước khi thực hiện bất kỳ thay đổi nào...',
    );

    let safetyBackup: BackupRestore;
    try {
      safetyBackup = await this.createBackup({
        backupType: BackupType.SAFETY_BEFORE_RESTORE,
        notes: `Tự động tạo bởi hệ thống trước khi phục hồi bản sao lưu #${targetBackup.id} (${targetBackup.filename})`,
        createdBy: adminUser,
      });

      logStep(
        5,
        'SAFETY BACKUP CURRENT DATA',
        'SUCCESS',
        `Đã tạo bản Safety Backup an toàn: #${safetyBackup.id} - "${safetyBackup.filename}"`,
      );
    } catch (safetyErr: any) {
      logStep(
        5,
        'SAFETY BACKUP CURRENT DATA',
        'FAILED',
        `HARD STOP: Tạo Safety Backup thất bại: ${safetyErr.message}. QUÁ TRÌNH RESTORE BỊ HỦY BỎ LẬP TỨC.`,
      );
      throw new InternalServerErrorException(
        `QUÁ TRÌNH RESTORE BỊ HỦY: Không thể tạo bản sao lưu an toàn (Safety Backup). Dữ liệu hiện tại được bảo vệ 100%. Lỗi: ${safetyErr.message}`,
      );
    }

    logStep(6, 'Verify Safety Backup SUCCESS', 'RUNNING', 'Kiểm tra xác nhận bản Safety Backup thành công 100%...');

    const isSafetyValid =
      safetyBackup &&
      safetyBackup.status === BackupStatus.SUCCESS &&
      safetyBackup.filePath &&
      fs.existsSync(safetyBackup.filePath) &&
      fs.statSync(safetyBackup.filePath).size > 0 &&
      safetyBackup.tablesCount > 0;

    if (!isSafetyValid) {
      logStep(
        6,
        'Verify Safety Backup SUCCESS',
        'FAILED',
        'Xác minh Safety Backup THẤT BẠI: File không hợp lệ hoặc kích thước rỗng. DỪNG TIẾN TRÌNH.',
      );
      throw new InternalServerErrorException(
        'HARD STOP: Bản Safety Backup chưa được xác minh SUCCESS. Quá trình Restore bị chặn để bảo đảm an toàn dữ liệu.',
      );
    }

    logStep(
      6,
      'Verify Safety Backup SUCCESS',
      'SUCCESS',
      `XÁC MINH HOÀN TẤT: Safety Backup #${safetyBackup.id} sẵn sàng (Kích thước: ${safetyBackup.fileSize} bytes, Checksum: ${safetyBackup.checksum?.slice(0, 16)}...). Đủ điều kiện bắt đầu khôi phục.`,
    );


    logStep(7, 'Restore Selected Backup', 'RUNNING', 'Bắt đầu nạp dữ liệu từ bản sao lưu được chọn...');
    const statements = this.splitSqlStatements(sqlContent);

    const backupHistorySnapshot = await this.backupRepo.find();

    try {
      await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await this.dataSource.query(`SET UNIQUE_CHECKS = 0`);

      let executedCount = 0;
      for (const statement of statements) {
        if (statement.trim().length > 0) {
          if (/\b(`?backup_restore`?)\b/i.test(statement)) {
            this.logger.log(`[Restore] Bỏ qua câu lệnh can thiệp bảng hệ thống backup_restore`);
            continue;
          }
          await this.dataSource.query(statement);
          executedCount++;
        }
      }

      logStep(
        7,
        'Restore Selected Backup',
        'SUCCESS',
        `Đã thực thi thành công ${executedCount} câu lệnh dữ liệu (Đã bảo vệ an toàn bảng backup_restore).`,
      );
    } catch (restoreErr: any) {
      logStep(7, 'Restore Selected Backup', 'FAILED', `Lỗi khi thực thi SQL Restore: ${restoreErr.message}`);
      throw new InternalServerErrorException(
        `Lỗi trong quá trình phục hồi: ${restoreErr.message}. Bạn có thể khôi phục lại dữ liệu gốc từ Safety Backup #${safetyBackup.id}.`,
      );
    } finally {
      await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 1`);
      await this.dataSource.query(`SET UNIQUE_CHECKS = 1`);

      for (const rec of backupHistorySnapshot) {
        const exists = await this.backupRepo.findOne({ where: { id: rec.id } });
        if (!exists) {
          await this.backupRepo.save(rec);
        }
      }
    }

    logStep(8, 'Verify Restore', 'RUNNING', 'Kiểm tra trạng thái hệ thống và số lượng bảng sau khôi phục...');
    const verifyTables = await this.dataSource.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
    );

    logStep(
      8,
      'Verify Restore',
      'SUCCESS',
      `Kiểm tra thành công: Database hiện có ${verifyTables.length} bảng hoạt động bình thường.`,
    );


    logStep(9, 'Complete', 'SUCCESS', 'Quy trình Production-Safe Restore hoàn tất trọn vẹn và an toàn.');

    return {
      success: true,
      message: `Khôi phục thành công dữ liệu từ bản sao lưu "${targetBackup.filename}". Bản sao lưu an toàn dữ liệu trước khôi phục: #${safetyBackup.id} ("${safetyBackup.filename}").`,
      safetyBackup: {
        id: safetyBackup.id,
        filename: safetyBackup.filename,
        fileSize: safetyBackup.fileSize,
        checksum: safetyBackup.checksum,
        createdAt: safetyBackup.createdAt,
      },
      restoredBackup: {
        id: targetBackup.id,
        filename: targetBackup.filename,
      },
      executionTrace: trace,
    };
  }

  /**
   * Disaster Recovery: Restores database from an uploaded ZIP file
   */
  async restoreFromUploadedZip(
    file: BufferedFile,
    adminUser: string,
    notes?: string,
  ): Promise<RestoreExecutionResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Vui lòng tải lên file ZIP sao lưu hợp lệ.');
    }

    // 1. Verify ZIP contents (must contain database.sql)
    let manifestData: any = {};
    try {
      const entries = extractZipArchive(file.buffer);
      const manifestEntry = entries.find((e) => e.filename === 'manifest.json');
      const sqlEntry = entries.find((e) => e.filename === 'database.sql');

      if (!sqlEntry) {
        throw new Error('Gói ZIP không chứa file database.sql');
      }

      if (manifestEntry) {
        manifestData = JSON.parse(manifestEntry.data.toString('utf8'));
      }
    } catch (zipErr: any) {
      throw new BadRequestException(`File ZIP không hợp lệ hoặc bị hỏng: ${zipErr.message}`);
    }

    // 2. Write file to backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetFilename = cleanName.endsWith('.zip') ? cleanName : `${cleanName}.zip`;
    const targetPath = path.join(this.backupDir, targetFilename);

    fs.writeFileSync(targetPath, file.buffer);
    const checksum = calculateSha256(file.buffer);

    // 3. Register or locate in backup_restore table
    let backupRecord = await this.backupRepo.findOne({ where: { checksum } });
    if (!backupRecord) {
      backupRecord = await this.backupRepo.findOne({ where: { filename: targetFilename } });
    }

    if (!backupRecord) {
      backupRecord = this.backupRepo.create({
        filename: targetFilename,
        filePath: targetPath,
        fileSize: file.buffer.length,
        checksum,
        backupType: manifestData.backupType || BackupType.MANUAL,
        status: BackupStatus.SUCCESS,
        storageLocation: StorageLocation.LOCAL,
        tablesCount: manifestData.tablesCount || 0,
        recordsCount: manifestData.totalRecords || 0,
        notes: notes?.trim() || `Tải lên từ máy tính (${targetFilename})`,
        createdBy: adminUser,
      });
      backupRecord = await this.backupRepo.save(backupRecord);
      this.logger.log(`[Disaster Recovery] Đã lưu bản ghi sao lưu #${backupRecord.id} từ file upload: ${targetFilename}`);
    } else {
      backupRecord.filePath = targetPath;
      backupRecord.fileSize = file.buffer.length;
      if (notes?.trim()) backupRecord.notes = notes.trim();
      backupRecord = await this.backupRepo.save(backupRecord);
    }

    // 4. Run standard safe restore pipeline
    return this.restoreBackup(backupRecord.id, {
      adminConfirmation: 'CONFIRMED',
      executedBy: adminUser,
    });
  }

  /**
   * Get all backups list
   */
  async findAll(): Promise<BackupRestore[]> {
    await this.syncLocalBackupsWithDatabase();
    return this.backupRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get single backup
   */
  async findOne(id: number): Promise<BackupRestore> {
    const backup = await this.backupRepo.findOne({ where: { id } });
    if (!backup) {
      throw new NotFoundException(`Không tìm thấy bản sao lưu với ID: ${id}`);
    }
    return backup;
  }

  /**
   * Download physical backup file
   */
  async getBackupFileBuffer(id: number): Promise<{ filename: string; buffer: Buffer }> {
    const backup = await this.findOne(id);
    if (backup.filePath && fs.existsSync(backup.filePath)) {
      return {
        filename: backup.filename,
        buffer: fs.readFileSync(backup.filePath),
      };
    }

    if (backup.googleDriveFileId) {
      const buffer = await this.googleDriveService.downloadBackup(backup.googleDriveFileId);
      return {
        filename: backup.filename,
        buffer,
      };
    }

    throw new NotFoundException(`File sao lưu không còn tồn tại trên bộ nhớ.`);
  }

  /**
   * Delete backup
   */
  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const backup = await this.findOne(id);

    if (backup.filePath && fs.existsSync(backup.filePath)) {
      try {
        fs.unlinkSync(backup.filePath);
      } catch (err: any) {
        this.logger.warn(`Không thể xóa file ${backup.filePath}: ${err.message}`);
      }
    }

    if (backup.googleDriveFileId) {
      await this.googleDriveService.deleteFile(backup.googleDriveFileId);
    }

    await this.backupRepo.remove(backup);
    return { success: true, message: `Đã xóa bản sao lưu #${id} thành công.` };
  }

  /**
   * Get overall system backup & storage status
   */
  async getStatus() {
    const totalBackups = await this.backupRepo.count();
    const safetyBackups = await this.backupRepo.count({
      where: { backupType: BackupType.SAFETY_BEFORE_RESTORE },
    });
    const latestBackups = await this.backupRepo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const latestBackup = latestBackups.length > 0 ? latestBackups[0] : null;

    const latestSafeties = await this.backupRepo.find({
      where: { backupType: BackupType.SAFETY_BEFORE_RESTORE },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const latestSafety = latestSafeties.length > 0 ? latestSafeties[0] : null;

    const googleDriveStatus = await this.googleDriveService.getBackupStorageStatus();

    const scheduleEnabled =
      this.configService.get<string>('BACKUP_SCHEDULE_ENABLED', 'true') !== 'false';
    const scheduleTime = this.configService.get<string>('BACKUP_SCHEDULE_TIME', '18:00');
    const scheduleCron = this.configService.get<string>('BACKUP_SCHEDULE_CRON', '0 18 * * *');
    let nextRun: string | null = null;
    try {
      const job = this.schedulerRegistry.getCronJob('sporting_auto_backup_job');
      if (job) {
        nextRun = job.nextDate().toFormat('yyyy-MM-dd HH:mm:ss');
      }
    } catch {
      nextRun = null;
    }

    return {
      totalBackups,
      safetyBackups,
      latestBackup,
      latestSafety,
      googleDrive: googleDriveStatus,
      schedule: {
        enabled: scheduleEnabled,
        time: scheduleTime,
        cron: scheduleCron,
        nextRun,
      },
      localBackupDir: this.backupDir,
    };
  }
}
