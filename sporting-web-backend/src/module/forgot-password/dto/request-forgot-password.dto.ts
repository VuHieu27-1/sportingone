import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestForgotPasswordDto {
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @IsString()
  @MaxLength(100)
  username: string;

  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email: string;
}
