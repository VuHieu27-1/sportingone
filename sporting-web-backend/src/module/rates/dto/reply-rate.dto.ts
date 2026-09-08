import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

export class ReplyRateDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}
