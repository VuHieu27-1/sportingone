import { PartialType } from '@nestjs/mapped-types';
import { CreateYardDto } from './create-yards.dto';

export class UpdateYardDto extends PartialType(CreateYardDto) {}
