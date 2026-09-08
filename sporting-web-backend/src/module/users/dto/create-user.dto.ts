import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  username: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
