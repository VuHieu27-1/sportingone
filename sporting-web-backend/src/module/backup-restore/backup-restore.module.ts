import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupRestoreService } from './backup-restore.service';
import { BackupRestoreController } from './backup-restore.controller';
import { BackupRestore } from './entities/backup-restore.entity';
import { User } from '../users/entities/user.entity';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BackupRestore, User]),
    GoogleDriveModule,
  ],
  controllers: [BackupRestoreController],
  providers: [BackupRestoreService],
  exports: [BackupRestoreService],
})
export class BackupRestoreModule {}
