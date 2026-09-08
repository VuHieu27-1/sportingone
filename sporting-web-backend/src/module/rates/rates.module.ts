import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { Rate } from './entities/rate.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rate, Yard, User, Booking]),
    GoogleDriveModule,
  ],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}
