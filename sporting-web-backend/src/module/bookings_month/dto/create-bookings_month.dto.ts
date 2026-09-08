import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateBookingsMonthDto {
  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  bookingType?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in format YYYY-MM-DD',
  })
  startDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in format YYYY-MM-DD',
  })
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be in format HH:mm or HH:mm:ss',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be in format HH:mm or HH:mm:ss',
  })
  endTime: string;

  @IsString()
  @IsOptional()
  @IsIn(['unpaid', 'paid', 'cancelled', 'refund', 'refunded'], {
    message: 'Status must be "unpaid", "paid", "cancelled", "refund", or "refunded"',
  })
  status?: string | null;

  @IsNumber()
  @IsOptional()
  priced?: number;
}
