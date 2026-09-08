import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AiKeyStatus, AiProvider } from '../entities/ai-api-key.entity';

export class CreateAiApiKeyDto {
  @IsString({ message: 'Tên API Key phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên nhận diện API Key' })
  name: string;

  @IsString({ message: 'Mã API Key phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp mã API Key' })
  apiKey: string;

  @IsOptional()
  @IsEnum(AiProvider, { message: 'Nhà cung cấp không hợp lệ' })
  provider?: AiProvider;

  @IsOptional()
  @IsEnum(AiKeyStatus, { message: 'Trạng thái không hợp lệ' })
  status?: AiKeyStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
