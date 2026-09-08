import { PartialType } from '@nestjs/mapped-types';
import { CreateImagesYardDto } from './create-images-yard.dto';

export class UpdateImagesYardDto extends PartialType(CreateImagesYardDto) {}
