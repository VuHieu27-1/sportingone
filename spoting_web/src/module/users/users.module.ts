import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { DetailUser } from '../detail-users/entities/detail-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, DetailUser])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
