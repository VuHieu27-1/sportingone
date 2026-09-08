import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingsMonthDto } from './create-bookings_month.dto';

export class UpdateBookingsMonthDto extends PartialType(CreateBookingsMonthDto) {}
