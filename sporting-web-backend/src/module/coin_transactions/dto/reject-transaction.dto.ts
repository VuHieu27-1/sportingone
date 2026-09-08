import { IsString, IsOptional } from 'class-validator';

export class RejectTransactionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
