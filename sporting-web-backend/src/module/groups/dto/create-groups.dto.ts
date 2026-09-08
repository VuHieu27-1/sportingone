import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  groupName: string;

  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}
