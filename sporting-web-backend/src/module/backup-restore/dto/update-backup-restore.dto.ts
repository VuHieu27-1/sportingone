import { PartialType } from '@nestjs/mapped-types';
import { CreateBackupRestoreDto } from './create-backup-restore.dto';

export class UpdateBackupRestoreDto extends PartialType(CreateBackupRestoreDto) {}
