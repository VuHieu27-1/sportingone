import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TestAiApiKeyDto {
  @IsString({ message: 'Mã API Key phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp mã API Key cần kiểm tra' })
  apiKey: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
