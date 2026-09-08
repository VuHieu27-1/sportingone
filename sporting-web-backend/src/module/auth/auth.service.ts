import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterUserService } from '../register-user/register-user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly registerUserService: RegisterUserService,
    private readonly jwtService: JwtService,
  ) { }

  async validateUser(
    username: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const result = { ...user };
      delete (result as Partial<User>).password;
      return result;
    }
    return null;
  }

  /**
   * Authenticates a user and returns JWT access_token and 1-year refresh_token.
   */
  login(user: Omit<User, 'password'>) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role ? user.role.roleName : null,
    };
    const accessExpiresIn = (process.env.JWT_EXPIRES_IN || '1d') as any;
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '365d') as any;
    const access_token = this.jwtService.sign(payload, { expiresIn: accessExpiresIn });
    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: refreshExpiresIn },
    );

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }

  /**
   * Generates new access_token and refresh_token using a valid refresh_token.
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (!payload || payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      const newPayload = {
        username: user.username,
        sub: user.id,
        role: user.role ? user.role.roleName : null,
      };

      const accessExpiresIn = (process.env.JWT_EXPIRES_IN || '1d') as any;
      const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '365d') as any;
      const access_token = this.jwtService.sign(newPayload, { expiresIn: accessExpiresIn });
      const new_refresh_token = this.jwtService.sign(
        { ...newPayload, type: 'refresh' },
        { expiresIn: refreshExpiresIn },
      );

      return {
        access_token,
        refresh_token: new_refresh_token,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Refresh token has expired or is invalid');
    }
  }

  /**
   * Registers a new user account.
   */
  async register(registerDto: RegisterDto) {
    return this.registerUserService.create(registerDto);
  }

  /**
   * Handles Google OAuth login/callback result.
   */
  googleLogin(user: any) {
    return this.login(user);
  }

  /**
   * Generates redirect URL and result payload for Google OAuth login.
   */
  getGoogleAuthRedirectUrl(user: any, state?: string): { url: string; data: any } {
    const result: any = this.googleLogin(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isAddAccount = state === 'add-account';
    const redirectPath = isAddAccount ? '/add-account' : '/login';

    if (result?.access_token) {
      return {
        url: `${frontendUrl}${redirectPath}?token=${result.access_token}&refresh_token=${result.refresh_token || ''}&username=${encodeURIComponent(result.user.username)}&role=${result.user.role?.roleName || 'user'}`,
        data: result,
      };
    }

    return {
      url: `${frontendUrl}${redirectPath}`,
      data: result,
    };
  }

  /**
   * Retrieves the profile information of the currently authenticated user.
   */
  async getProfile(userId: number) {
    if (!userId) return null;
    return this.usersService.findOne(userId);
  }
}


