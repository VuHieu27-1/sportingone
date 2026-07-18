import { PartialType } from '@nestjs/mapped-types';
import { CreateBonusPointDto } from './create-bonus-points.dto';

export class UpdateBonusPointDto extends PartialType(CreateBonusPointDto) {}
