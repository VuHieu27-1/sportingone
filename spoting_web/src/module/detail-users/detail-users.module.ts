import { Module } from '@nestjs/common';
import { DetailUsersService } from './detail-users.service';
import { DetailUsersController } from './detail-users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DetailUser } from './entities/detail-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetailUser, User])],
  controllers: [DetailUsersController],
  providers: [DetailUsersService],
})
export class DetailUsersModule {}
