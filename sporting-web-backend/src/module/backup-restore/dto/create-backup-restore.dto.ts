import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BackupType } from '../entities/backup-restore.entity';

export class CreateBackupRestoreDto {
  @IsOptional()
  @IsEnum(BackupType)
  backupType?: BackupType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class RestoreBackupDto {
  @IsOptional()
  @IsString()
  adminConfirmation?: string;

  @IsOptional()
  @IsString()
  executedBy?: string;
}
