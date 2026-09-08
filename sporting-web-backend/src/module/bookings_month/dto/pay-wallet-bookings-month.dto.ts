import { IsArray, IsNumber } from 'class-validator';

export class PayBookingsMonthWithWalletDto {
  @IsArray()
  @IsNumber({}, { each: true })
  bookingMonthIds: number[];
}
