import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateQrDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  transactionId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Số tiền chuyển khoản phải lớn hơn 0' })
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  addInfo?: string;

  @IsString()
  @IsOptional()
  template?: string;
}
