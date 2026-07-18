import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber() @IsNotEmpty()
  yardId: number;

  @IsNumber() @IsNotEmpty()
  userId: number;

  @IsNumber() @IsOptional()
  bookingId?: number | null;

  @IsNumber() @IsNotEmpty()
  totalPrice: number;
}
