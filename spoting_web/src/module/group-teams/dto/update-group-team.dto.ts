import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupTeamDto } from './create-group-team.dto';

export class UpdateGroupTeamDto extends PartialType(CreateGroupTeamDto) {}
