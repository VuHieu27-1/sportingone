import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateUserAddressDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
