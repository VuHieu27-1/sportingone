import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateTypesDto {
  @IsString()
  @IsNotEmpty()
  typeName: string;

  @IsNumber()
  @IsOptional()
  sportTypeId?: number | null;
}
