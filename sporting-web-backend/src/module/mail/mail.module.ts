import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailLog } from './entities/mail-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MailLog])],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
