import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsOptional()
  bookingId?: number | null;

  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;

  @IsString()
  @IsOptional()
  status?: string | null;

  @IsString()
  @IsOptional()
  paymentMethod?: string | null;
}
