import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayOSPaymentDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bookingId?: number;

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  bookingIds?: number[];

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

