import { PartialType } from '@nestjs/mapped-types';
import { CreateYardDto } from './create-yard.dto';

export class UpdateYardDto extends PartialType(CreateYardDto) {}
