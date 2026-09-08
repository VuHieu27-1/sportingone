import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { BookingsMonth } from '../bookings_month/entities/bookings_month.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CoinTransaction } from '../coin_transactions/entities/coin_transaction.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingsMonth,
      Yard,
      User,
      Wallet,
      CoinTransaction,
    ]),
    UsersModule,
    MailModule,
    NotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService, TypeOrmModule],
})
export class BookingsModule {}
