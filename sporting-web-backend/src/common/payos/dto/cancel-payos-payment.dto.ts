import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CancelPayOSPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  orderCode: number;

  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
