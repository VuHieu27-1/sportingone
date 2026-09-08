import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Yard, User, Booking])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
