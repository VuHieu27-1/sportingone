import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum ForgotPasswordStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  SUPERSEDED = 'superseded',
}

@Entity('forgot_passwords')
export class ForgotPassword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', nullable: false, length: 100 })
  username: string;

  @Column({ name: 'email', nullable: false, length: 255 })
  email: string;

  @Column({ name: 'verification_token', nullable: false, length: 255 })
  verificationToken: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ForgotPasswordStatus,
    default: ForgotPasswordStatus.PENDING,
  })
  status: ForgotPasswordStatus;

  @Column({ name: 'fail_count', type: 'int', default: 0 })
  failCount: number;

  @Column({ name: 'banned_until', type: 'datetime', nullable: true })
  bannedUntil: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: false })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
