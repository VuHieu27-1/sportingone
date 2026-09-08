import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateVendorDto {
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsString()
  @IsOptional()
  avatar?: string | null;

  @IsString()
  @IsNotEmpty()
  vendorAddress?: string | null;

  @IsString()
  @IsOptional()
  vendorPhone?: string | null;

  @IsString()
  @IsOptional()
  openTime?: string | null;

  @IsString()
  @IsOptional()
  closeTime?: string | null;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'reject', 'active'])
  status?: 'pending' | 'reject' | 'active';

  @IsNumber()
  @IsOptional()
  latitude?: number | null;

  @IsNumber()
  @IsOptional()
  longitude?: number | null;

  @IsString()
  @IsOptional()
  reason?: string;
}
