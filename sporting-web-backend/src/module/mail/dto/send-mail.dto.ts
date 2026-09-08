import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMailDto {
  @IsNotEmpty({ message: 'toEmail is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  toEmail: string;

  @IsNotEmpty({ message: 'subject is required' })
  @IsString()
  subject: string;

  @IsNotEmpty({ message: 'mailType is required' })
  @IsString()
  mailType: string;

  @IsNotEmpty({ message: 'htmlContent is required' })
  @IsString()
  htmlContent: string;
}
