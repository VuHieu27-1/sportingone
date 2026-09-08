import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinTransactionsService } from './coin_transactions.service';
import { CoinTransactionsController } from './coin_transactions.controller';
import { CoinTransaction } from './entities/coin_transaction.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { PayOSModule } from '../../common/payos/payos.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoinTransaction, User, Wallet, Booking]),
    PayOSModule,
    NotificationsModule,
  ],
  controllers: [CoinTransactionsController],
  providers: [CoinTransactionsService],
  exports: [TypeOrmModule, CoinTransactionsService],
})
export class CoinTransactionsModule {}
