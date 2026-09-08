import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

interface JwtPayload {
  sub: number;
  username: string;
  role: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-12345',
    });
  }

  /**
   * Validates and verifies parameters for validate.
   */
  validate(payload: JwtPayload) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
