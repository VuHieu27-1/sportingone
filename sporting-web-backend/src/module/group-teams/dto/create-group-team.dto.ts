import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateGroupTeamDto {
  @IsNumber()
  @IsNotEmpty()
  groupId: number;

  @IsNumber()
  @IsNotEmpty()
  teamId: number;
}
