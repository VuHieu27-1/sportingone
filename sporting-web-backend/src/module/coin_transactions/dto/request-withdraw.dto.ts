import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class RequestWithdrawDto {
  @IsNumber()
  @Min(20000, { message: 'Số tiền rút tối thiểu là 20.000 Xu (20.000 VNĐ)' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên ngân hàng' })
  bankName: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập số tài khoản ngân hàng' })
  bankNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên chủ tài khoản' })
  bankAccountName: string;
}
