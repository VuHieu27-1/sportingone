import { PartialType } from '@nestjs/mapped-types';
import { CreateRegisterUserDto } from './create-register-user.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { RegisterUserStatus } from '../entities/register-user.entity';

export class UpdateRegisterUserDto extends PartialType(CreateRegisterUserDto) {
  @IsOptional()
  @IsEnum(RegisterUserStatus)
  status?: RegisterUserStatus;
}
