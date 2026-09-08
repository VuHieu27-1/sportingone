import { PartialType } from '@nestjs/mapped-types';
import { CreateTypesDto } from './create-type.dto';

export class UpdateTypesDto extends PartialType(CreateTypesDto) {}
