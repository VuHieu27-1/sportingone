import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly usersService: UsersService,
  ) {
    super({
      clientID:
        process.env.GOOGLE_CLIENT_ID ||
        'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'), false);
      }

      // 1. Check if user already exists in main `users` table
      const existingUser = await this.usersService.findOneByEmail(email);
      if (existingUser) {
        const { password, ...result } = existingUser;
        void password;
        return done(null, result);
      }

      // 2. User does not exist in `users` table -> Create directly in `users` entity
      const baseUsername = email.split('@')[0].toLowerCase();
      const username = await this.generateUniqueUsername(baseUsername);

      const randomPassword =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const createdUser = await this.usersService.create({
        username,
        email,
        password: randomPassword,
      });

      const { password, ...result } = createdUser;
      void password;
      return done(null, result);
    } catch (error) {
      return done(error, false);
    }
  }

  /**
   * Generates a unique username by counting prefix to define upper bound (high) and using Binary Search
   * Reduces DB queries from O(N) down to O(log N)
   */
  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    if (!(await this.usersService.findOneByUsername(baseUsername))) {
      return baseUsername;
    }

    const count = await this.usersService.countByUsernamePrefix(baseUsername);
    let low = 1;
    let high = count + 1;

    let result = high;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const isTaken = await this.usersService.findOneByUsername(
        `${baseUsername}${mid}`,
      );

      if (isTaken) {
        low = mid + 1;
      } else {
        result = mid;
        high = mid - 1;
      }
    }

    return `${baseUsername}${result}`;
  }
}
