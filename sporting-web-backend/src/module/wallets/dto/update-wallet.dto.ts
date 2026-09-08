import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletDto } from './create-wallet.dto';
import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateWalletDto extends PartialType(CreateWalletDto) {
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z\s]+$/, {
    message:
      'bankAccountName chỉ được chứa chữ cái in hoa không dấu, không chứa số hoặc ký tự đặc biệt (VD: NGUYEN VAN A)',
  })
  bankAccountName?: string | null;
}
