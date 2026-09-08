import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayOSService } from './payos.service';
import { PayOSController } from './payos.controller';
import { Booking } from '../../module/bookings/entities/booking.entity';
import { Payment } from '../../module/payments/entities/payment.entity';

import { MailModule } from '../../module/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Payment]), MailModule],
  controllers: [PayOSController],
  providers: [PayOSService],
  exports: [PayOSService],
})
export class PayOSModule {}
