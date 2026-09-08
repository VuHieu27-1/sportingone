import { PartialType } from '@nestjs/mapped-types';
import { CreateSaleDto } from './create-sales.dto';

export class UpdateSaleDto extends PartialType(CreateSaleDto) {}
