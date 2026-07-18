import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateTournamentDto {
  @IsString() @IsNotEmpty()
  tournamentName: string;

  @IsNumber() @IsNotEmpty()
  sportTypeId: number;

  @IsNumber() @IsNotEmpty()
  vendorId: number;

  @IsDateString() @IsNotEmpty()
  startDate: string;

  @IsDateString() @IsNotEmpty()
  endDate: string;

  @IsNumber() @IsNotEmpty()
  quantity: number;

  @IsString() @IsOptional()
  status?: string | null;
}
