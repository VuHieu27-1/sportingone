import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class CreateRateDto {
  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsOptional()
  bookingId?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsNumber()
  @IsOptional()
  rateId?: number | null;

  @IsArray()
  @IsOptional()
  images?: string[];
}
