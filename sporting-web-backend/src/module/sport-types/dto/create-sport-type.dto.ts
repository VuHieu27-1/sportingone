import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSportTypeDto {
  @IsString()
  @IsNotEmpty()
  sportName: string;
}
