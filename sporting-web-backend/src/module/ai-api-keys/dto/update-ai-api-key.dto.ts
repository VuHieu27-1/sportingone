import { PartialType } from '@nestjs/mapped-types';
import { CreateAiApiKeyDto } from './create-ai-api-key.dto';

export class UpdateAiApiKeyDto extends PartialType(CreateAiApiKeyDto) {}
