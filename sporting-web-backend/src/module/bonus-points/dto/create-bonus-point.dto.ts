import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateBonusPointDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  bonusPoint: number;
}
