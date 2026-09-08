import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournaments.dto';

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {}
