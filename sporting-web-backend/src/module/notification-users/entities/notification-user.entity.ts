import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';

@Entity('notification_user')
export class NotificationUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Notification,
    (notification) => notification.notificationUsers,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column({ name: 'status', nullable: true, type: 'varchar', length: 20 })
  status: string | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
