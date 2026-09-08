import {
  IsString,
  IsNumber,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateDetailUserDto {
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  birthday?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10}$/, {
    message: 'Số điện thoại phải bao gồm đúng 10 chữ số và không chứa chữ',
  })
  phone?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number | null;

  @IsNumber()
  @IsOptional()
  longitude?: number | null;
}
