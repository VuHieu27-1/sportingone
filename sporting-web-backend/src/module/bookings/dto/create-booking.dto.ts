import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateBookingDto {
  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  @IsIn(['unpaid', 'paid', 'cancelled'], {
    message: 'Status must be "unpaid", "paid", or "cancelled"',
  })
  status?: string | null;

  @IsNumber()
  @IsOptional()
  priced?: number;
}
