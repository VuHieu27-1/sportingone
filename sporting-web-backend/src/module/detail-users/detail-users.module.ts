import { Module } from '@nestjs/common';
import { DetailUsersService } from './detail-users.service';
import { DetailUsersController } from './detail-users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DetailUser } from './entities/detail-user.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { UserAddress } from '../user_address/entities/user_address.entity';
import { OpenRouteServiceModule } from '../../common/open-route-service/open-route-service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DetailUser, User, Vendor, UserAddress]),
    OpenRouteServiceModule,
  ],
  controllers: [DetailUsersController],
  providers: [DetailUsersService],
})
export class DetailUsersModule {}
