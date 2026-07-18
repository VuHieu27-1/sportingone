import { PartialType } from '@nestjs/mapped-types';
import { CreateTypesDto } from './create-types.dto';

export class UpdateTypesDto extends PartialType(CreateTypesDto) {}
