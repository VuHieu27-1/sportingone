import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @IsString({ message: 'Username must be a string' })
  @MaxLength(100, { message: 'Username cannot exceed 100 characters' })
  username: string;

  @IsNotEmpty({ message: 'Password cannot be empty' })
  @IsString({ message: 'Password must be a string' })
  @MaxLength(255, { message: 'Password cannot exceed 255 characters' })
  password: string;
}
