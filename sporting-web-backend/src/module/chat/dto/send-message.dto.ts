import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatAttachmentDto {
  @IsString({ message: 'Tên tệp phải là chuỗi' })
  name: string;

  @IsString({ message: 'MimeType phải là chuỗi hợp lệ' })
  mimeType: string;

  @IsString({ message: 'Dữ liệu tệp (Base64) không được để trống' })
  data: string;

  @IsOptional()
  @IsNumber({}, { message: 'Kích thước tệp phải là số byte' })
  size?: number;

  @IsOptional()
  @IsString({ message: 'previewUrl phải là chuỗi' })
  previewUrl?: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi ký tự' })
  @MaxLength(4000, { message: 'Nội dung tin nhắn không được vượt quá 4000 ký tự' })
  message?: string;

  @IsOptional()
  @IsNumber({}, { message: 'conversationId phải là số nguyên' })
  conversationId?: number;

  @IsOptional()
  @IsBoolean({ message: 'stream phải là giá trị boolean' })
  stream?: boolean;

  @IsOptional()
  @IsArray({ message: 'attachments phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}

