import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCameraDto {
  @IsString()
  @IsNotEmpty()
  cameraName: string;

  @IsString()
  @IsOptional()
  videoPath?: string | null;

  @IsNumber()
  @IsNotEmpty()
  yardId: number;
}
