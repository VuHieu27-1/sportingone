import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BackupType {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  SAFETY_BEFORE_RESTORE = 'SAFETY_BEFORE_RESTORE',
}

export enum BackupStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum StorageLocation {
  LOCAL = 'LOCAL',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  BOTH = 'BOTH',
}

@Entity('backup_restore')
export class BackupRestore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null; // SHA-256

  @Column({
    type: 'enum',
    enum: BackupType,
    default: BackupType.MANUAL,
  })
  backupType: BackupType;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.PENDING,
  })
  status: BackupStatus;

  @Column({
    type: 'enum',
    enum: StorageLocation,
    default: StorageLocation.LOCAL,
  })
  storageLocation: StorageLocation;

  @Column({ type: 'varchar', length: 255, nullable: true })
  googleDriveFileId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  googleDriveWebUrl: string | null;

  @Column({ type: 'int', default: 0 })
  tablesCount: number;

  @Column({ type: 'int', default: 0 })
  recordsCount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
