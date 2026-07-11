import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationUser } from '../../notification-users/entities/notification-user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'notification_name',
    nullable: false,
    type: 'varchar',
    length: 150,
  })
  notificationName: string;

  @Column({ name: 'contents', nullable: false, type: 'text' })
  contents: string;

  @OneToMany(
    () => NotificationUser,
    (notificationUser) => notificationUser.notification,
  )
  notificationUsers: NotificationUser[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
