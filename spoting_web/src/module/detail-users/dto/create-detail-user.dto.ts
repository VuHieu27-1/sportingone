import { IsString, IsNotEmpty, IsNumber, IsBoolean, MinLength, MaxLength, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class CreateDetailUserDto {
    @IsNumber()
    @IsNotEmpty()
    userId: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDateString()
    @IsNotEmpty()
    birthday: string;

    @IsString()
    @IsNotEmpty()
    gender: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    address: string;
}
