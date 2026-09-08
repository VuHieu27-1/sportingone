import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @IsString({ message: 'Username must be a string' })
  @MaxLength(100, { message: 'Username cannot exceed 100 characters' })
  username: string;

  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty' })
  @IsString({ message: 'Password must be a string' })
  @MaxLength(255, { message: 'Password cannot exceed 255 characters' })
  password: string;

  @IsOptional()
  @IsInt({ message: 'roleId must be an integer' })
  roleId?: number;
}
