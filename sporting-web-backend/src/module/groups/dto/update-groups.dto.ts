import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-groups.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
