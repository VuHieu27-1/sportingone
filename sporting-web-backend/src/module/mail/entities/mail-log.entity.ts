import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum MailStatus {
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('mail_logs')
export class MailLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'to_email', nullable: false, length: 255 })
  toEmail: string;

  @Column({ name: 'subject', nullable: false, length: 255 })
  subject: string;

  @Column({ name: 'mail_type', nullable: false, length: 100 })
  mailType: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MailStatus,
    default: MailStatus.SENT,
  })
  status: MailStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
