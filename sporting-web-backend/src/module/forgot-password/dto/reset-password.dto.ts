import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @IsString()
  @MaxLength(100)
  username: string;

  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email: string;

  @IsNotEmpty({ message: 'New password cannot be empty' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @MaxLength(255)
  newPassword: string;
}
