import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTypesDto {
  @IsString() @IsNotEmpty()
  typeName: string;
}
