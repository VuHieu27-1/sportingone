import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCoinDepositDto {
  @IsNumber()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10.000 VNĐ (10.000 Xu)' })
  amount: number;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
