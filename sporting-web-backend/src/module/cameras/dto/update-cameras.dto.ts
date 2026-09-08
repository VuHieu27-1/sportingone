import { PartialType } from '@nestjs/mapped-types';
import { CreateCameraDto } from './create-cameras.dto';

export class UpdateCameraDto extends PartialType(CreateCameraDto) {}
