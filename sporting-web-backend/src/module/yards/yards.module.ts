import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YardsService } from './yards.service';
import { YardsController } from './yards.controller';
import { Yard } from './entities/yard.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Types } from '../types/entities/type.entity';
import { User } from '../users/entities/user.entity';
import { UserAddress } from '../user_address/entities/user_address.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingsMonth } from '../bookings_month/entities/bookings_month.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CoinTransaction } from '../coin_transactions/entities/coin_transaction.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Yard,
      SportType,
      Vendor,
      Sale,
      Types,
      User,
      UserAddress,
      Booking,
      BookingsMonth,
      Wallet,
      CoinTransaction,
    ]),
    NotificationsModule,
  ],
  controllers: [YardsController],
  providers: [YardsService],
  exports: [TypeOrmModule, YardsService],
})
export class YardsModule {}
