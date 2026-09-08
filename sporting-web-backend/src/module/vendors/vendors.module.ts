import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { Vendor } from './entities/vendor.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { OpenRouteServiceModule } from '../../common/open-route-service/open-route-service.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, User, Role]),
    OpenRouteServiceModule,
    NotificationsModule,
    GoogleDriveModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [TypeOrmModule, VendorsService],
})
export class VendorsModule {}
