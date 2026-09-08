import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateNotificationUserDto {
  @IsNumber()
  @IsNotEmpty()
  notificationId: number;

  @IsNumber()
  @IsNotEmpty()
  receiverId: number;

  @IsString()
  @IsOptional()
  status?: string | null;
}
