import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  notificationName: string;

  @IsString()
  @IsNotEmpty()
  contents: string;

  @IsArray()
  @IsOptional()
  receiverIds?: number[];
}
