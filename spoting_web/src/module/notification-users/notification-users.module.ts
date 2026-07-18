import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationUsersService } from './notification-users.service';
import { NotificationUsersController } from './notification-users.controller';
import { NotificationUser } from './entities/notification-user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationUser, Notification, User])],
  controllers: [NotificationUsersController],
  providers: [NotificationUsersService],
  exports: [TypeOrmModule],
})
export class NotificationUsersModule {}
