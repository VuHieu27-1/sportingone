import { IsNotEmpty, IsString, IsOptional, IsInt, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  username: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
