import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateSaleDto {
  @IsString() @IsNotEmpty()
  salesName: string;

  @IsNumber() @IsNotEmpty()
  price: number;

  @IsNumber() @IsOptional()
  persent?: number | null;
}
