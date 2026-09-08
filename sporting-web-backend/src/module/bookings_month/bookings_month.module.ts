import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsMonthService } from './bookings_month.service';
import { BookingsMonthController } from './bookings_month.controller';
import { BookingsMonth } from './entities/bookings_month.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CoinTransaction } from '../coin_transactions/entities/coin_transaction.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingsMonth,
      Booking,
      Yard,
      User,
      Wallet,
      CoinTransaction,
    ]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [BookingsMonthController],
  providers: [BookingsMonthService],
  exports: [BookingsMonthService],
})
export class BookingsMonthModule {}
