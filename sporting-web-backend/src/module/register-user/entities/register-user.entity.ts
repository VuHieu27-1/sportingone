import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum RegisterUserStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  SUPERSEDED = 'superseded',
}

@Entity('register_users')
export class RegisterUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'email', nullable: false, length: 255 })
  email: string;

  @Column({ name: 'username', nullable: false, length: 100 })
  username: string;

  @Column({ name: 'password', nullable: false, length: 255 })
  password: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RegisterUserStatus,
    default: RegisterUserStatus.PENDING,
  })
  status: RegisterUserStatus;

  @Column({ name: 'verification_token', nullable: true, length: 255 })
  verificationToken: string;

  @Column({ name: 'fail_count', type: 'int', default: 0 })
  failCount: number;

  @Column({ name: 'banned_until', type: 'datetime', nullable: true })
  bannedUntil: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
