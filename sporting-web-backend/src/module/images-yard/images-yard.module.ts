import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImagesYardService } from './images-yard.service';
import { ImagesYardController } from './images-yard.controller';
import { ImagesYard } from './entities/images-yard.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { VendorOrAdminGuard } from '../auth/guards/vendor-or-admin.guard';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImagesYard, Yard, User]),
    GoogleDriveModule,
  ],
  controllers: [ImagesYardController],
  providers: [ImagesYardService, VendorOrAdminGuard],
  exports: [TypeOrmModule, ImagesYardService],
})
export class ImagesYardModule {}
