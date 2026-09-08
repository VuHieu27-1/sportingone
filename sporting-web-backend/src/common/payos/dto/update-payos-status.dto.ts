import { IsArray, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdatePayOSStatusDto {
  @IsNumber()
  @IsNotEmpty()
  orderCode: number;

  @IsNumber()
  @IsOptional()
  bookingId?: number;

  @IsArray()
  @IsOptional()
  bookingIds?: number[];
}
