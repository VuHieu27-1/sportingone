import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationUser } from './entities/notification-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationUser])],
  exports: [TypeOrmModule],
})
export class NotificationUsersModule {}
