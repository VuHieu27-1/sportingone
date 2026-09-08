import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Request() req: { user: Omit<User, 'password'> },
    @Body() loginDto: LoginDto,
  ) {
    void loginDto;
    return this.authService.login(req.user);
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  async googleAuth() {
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleAuthRedirect(@Request() req: any, @Res() res: any) {
    const { url, data } = this.authService.getGoogleAuthRedirectUrl(
      req.user,
      req.query?.state,
    );
    if (
      req.headers?.accept?.includes('text/html') ||
      !req.headers?.accept?.includes('application/json')
    ) {
      return res.redirect(url);
    }

    return res.json(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.authService.getProfile(userId);
  }
}


