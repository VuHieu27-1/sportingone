import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterUserService } from './register-user.service';
import { RegisterUserController } from './register-user.controller';
import { RegisterUser } from './entities/register-user.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';

import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegisterUser, User]),
    UsersModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-12345',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as unknown as '1d',
      },
    }),
  ],
  controllers: [RegisterUserController],
  providers: [RegisterUserService],
  exports: [RegisterUserService],
})
export class RegisterUserModule {}

