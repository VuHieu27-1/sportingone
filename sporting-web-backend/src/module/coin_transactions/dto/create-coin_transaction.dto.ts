import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import {
  CoinTransactionType,
  CoinTransactionStatus,
} from '../entities/coin_transaction.entity';

export class CreateCoinTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(CoinTransactionType)
  @IsOptional()
  type?: CoinTransactionType;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsOptional()
  balanceAfter?: number;

  @IsString()
  @IsOptional()
  transactionCode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CoinTransactionStatus)
  @IsOptional()
  status?: CoinTransactionStatus;
}
