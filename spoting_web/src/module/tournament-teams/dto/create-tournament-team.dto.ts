import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTournamentTeamDto {
  @IsNumber() @IsNotEmpty()
  teamId: number;

  @IsNumber() @IsNotEmpty()
  tournamentId: number;

  @IsNumber() @IsOptional()
  seed?: number | null;

  @IsString() @IsOptional()
  status?: string | null;
}
