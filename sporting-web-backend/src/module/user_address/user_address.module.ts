import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddressService } from './user_address.service';
import { UserAddressController } from './user_address.controller';
import { UserAddress } from './entities/user_address.entity';
import { User } from '../users/entities/user.entity';
import { OpenRouteServiceModule } from '../../common/open-route-service/open-route-service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAddress, User]),
    OpenRouteServiceModule,
  ],
  controllers: [UserAddressController],
  providers: [UserAddressService],
  exports: [UserAddressService, TypeOrmModule],
})
export class UserAddressModule {}
