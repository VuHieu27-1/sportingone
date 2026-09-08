import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateImagesYardDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsBoolean()
  @IsOptional()
  isCover?: boolean;

  @IsString()
  @IsOptional()
  caption?: string;
}
