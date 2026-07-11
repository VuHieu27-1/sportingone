import { PartialType } from '@nestjs/mapped-types';
import { CreateDetailUserDto } from './create-detail-user.dto';

export class UpdateDetailUserDto extends PartialType(CreateDetailUserDto) {}
