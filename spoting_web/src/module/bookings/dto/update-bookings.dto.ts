import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-bookings.dto';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}
