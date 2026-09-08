import { IsArray, IsNumber } from 'class-validator';

export class PayBookingsWithWalletDto {
  @IsArray()
  @IsNumber({}, { each: true })
  bookingIds: number[];
}
