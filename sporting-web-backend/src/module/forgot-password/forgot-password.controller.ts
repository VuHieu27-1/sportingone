import { Controller, Post, Body } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { RequestForgotPasswordDto } from './dto/request-forgot-password.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('forgot-password')
export class ForgotPasswordController {
  constructor(
    private readonly forgotPasswordService: ForgotPasswordService,
  ) { }

  @Post()
  create(@Body() requestDto: RequestForgotPasswordDto) {
    return this.forgotPasswordService.create(requestDto);
  }

  @Post('verify')
  verify(@Body() verifyDto: VerifyForgotPasswordDto) {
    return this.forgotPasswordService.verify(verifyDto);
  }

  @Post('reset')
  resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.forgotPasswordService.resetPassword(resetDto);
  }
}
