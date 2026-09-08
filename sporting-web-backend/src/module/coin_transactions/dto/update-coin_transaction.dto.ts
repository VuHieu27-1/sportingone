import { PartialType } from '@nestjs/mapped-types';
import { CreateCoinTransactionDto } from './create-coin_transaction.dto';

export class UpdateCoinTransactionDto extends PartialType(
  CreateCoinTransactionDto,
) {}
