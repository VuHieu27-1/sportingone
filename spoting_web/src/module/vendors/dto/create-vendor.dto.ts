import { IsNotEmpty, IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateVendorDto {
  @IsNumber() @IsNotEmpty()
  userId: number;

  @IsString() @IsNotEmpty()
  vendorName: string;

  @IsString() @IsOptional()
  vendorAddress?: string | null;

  @IsString() @IsOptional()
  vendorPhone?: string | null;

  @IsString() @IsOptional()
  @IsIn(['pending', 'reject', 'active'])
  status?: 'pending' | 'reject' | 'active';
}

