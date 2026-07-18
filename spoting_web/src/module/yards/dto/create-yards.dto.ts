import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateYardDto {
  @IsString() @IsNotEmpty()
  yardName: string;

  @IsNumber() @IsOptional()
  sportTypeId?: number | null;

  @IsNumber() @IsOptional()
  vendorId?: number | null;

  @IsNumber() @IsOptional()
  saleId?: number | null;

  @IsNumber() @IsOptional()
  typeYardId?: number | null;

  @IsNumber() @IsNotEmpty()
  quantity: number;

  @IsNumber() @IsNotEmpty()
  price: number;

  @IsString() @IsOptional()
  status?: string | null;
}
