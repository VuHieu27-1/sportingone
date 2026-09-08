import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreatePricingRuleDto {
  @IsString()
  @IsNotEmpty()
  ruleName: string;

  @IsNumber()
  @IsNotEmpty()
  yardId: number;

  @IsBoolean()
  @IsNotEmpty()
  isHoliday: boolean;

  @IsString()
  @IsOptional()
  dayOfWeek?: string | null;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}
