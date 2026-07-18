import { IsNotEmpty, IsNumber, IsDateString, IsString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsNumber() @IsNotEmpty()
  yardId: number;

  @IsNumber() @IsNotEmpty()
  userId: number;

  @IsDateString() @IsNotEmpty()
  startTime: string;

  @IsDateString() @IsNotEmpty()
  endTime: string;

  @IsString() @IsOptional()
  status?: string | null;
}
