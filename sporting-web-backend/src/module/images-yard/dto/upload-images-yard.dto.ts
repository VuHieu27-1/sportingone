import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadImagesYardDto {
  @IsNotEmpty()
  yardId: string | number;

  @IsOptional()
  isCover?: string | boolean;

  @IsOptional()
  @IsString()
  caption?: string;
}
