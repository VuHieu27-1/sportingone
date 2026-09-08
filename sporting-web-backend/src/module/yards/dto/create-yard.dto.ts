import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateYardDto {
  @IsString()
  @IsNotEmpty()
  yardName: string;

  @IsNumber()
  @IsOptional()
  sportTypeId?: number | null;

  @IsNumber()
  @IsOptional()
  vendorId?: number | null;

  @IsNumber()
  @IsOptional()
  saleId?: number | null;

  @IsNumber()
  @IsOptional()
  typeYardId?: number | null;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsOptional()
  peakHourPrice?: number | null;

  @IsString()
  @IsOptional()
  @IsIn(['available', 'booked', 'maintenance'])
  status?: string | null;
}
