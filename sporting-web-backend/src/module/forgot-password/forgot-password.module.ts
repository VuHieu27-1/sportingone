import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForgotPassword } from './entities/forgot-password.entity';
import { User } from '../users/entities/user.entity';
import { ForgotPasswordService } from './forgot-password.service';
import { ForgotPasswordController } from './forgot-password.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([ForgotPassword, User]), MailModule],
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService],
  exports: [ForgotPasswordService],
})
export class ForgotPasswordModule {}
