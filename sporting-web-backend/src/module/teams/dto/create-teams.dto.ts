import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  teamName: string;

  @IsString()
  @IsOptional()
  logo?: string | null;

  @IsNumber()
  @IsOptional()
  captainId?: number | null;
}
