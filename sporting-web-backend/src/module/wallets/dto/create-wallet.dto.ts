import { IsNumber, IsString, IsOptional, Min, IsNotEmpty, Matches } from 'class-validator';

export class CreateWalletDto {
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsNotEmpty()
  bankName?: string | null;

  @IsString()
  @IsNotEmpty()
  bankNumber?: string | null;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z\s]+$/, {
    message:
      'bankAccountName chỉ được chứa chữ cái in hoa không dấu, không chứa số hoặc ký tự đặc biệt',
  })
  bankAccountName?: string | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  balance?: number;
}
