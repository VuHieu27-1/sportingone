import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyForgotPasswordDto {
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsNotEmpty({ message: 'Token cannot be empty' })
  @IsString()
  token: string;
}
