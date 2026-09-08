import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationUser } from '../notification-users/entities/notification-user.entity';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, NotificationUser])],
  controllers: [NotificationsController],
  providers: [NotificationsService, AdminOnlyGuard],
  exports: [TypeOrmModule, NotificationsService],
})
export class NotificationsModule {}

