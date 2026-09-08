import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateMatchDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;

  @IsNumber()
  @IsNotEmpty()
  groupId: number;

  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsNumber()
  @IsNotEmpty()
  team1Id: number;

  @IsNumber()
  @IsNotEmpty()
  team2Id: number;

  @IsDateString()
  @IsNotEmpty()
  matchDate: string;

  @IsNumber()
  @IsOptional()
  scoreTeam1?: number | null;

  @IsNumber()
  @IsOptional()
  scoreTeam2?: number | null;

  @IsNumber()
  @IsOptional()
  winnerId?: number | null;
}
