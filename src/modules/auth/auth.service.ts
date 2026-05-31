import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthLoginDto, AuthRegisterDto } from './auth.dto';
import { AuthenticatedUser } from './auth.types';

interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: AuthRegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered.');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        passwordHash: this.hashPassword(dto.password),
      },
      select: { uuid: true, email: true, name: true },
    });

    return this.toAuthResponse(this.toAuthenticatedUser(user));
  }

  async login(dto: AuthLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { uuid: true, email: true, name: true, passwordHash: true } });
    if (!user?.passwordHash || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.toAuthResponse(this.toAuthenticatedUser(user));
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { uuid: userId }, select: { uuid: true, email: true, name: true } });
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found.');
    }
    return this.toAuthenticatedUser(user);
  }

  getStatus() {
    return { authenticated: false, strategy: 'jwt' };
  }

  getUserFromAuthorization(authorization?: string): AuthenticatedUser | null {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      return null;
    }

    try {
      const payload = this.verifyAccessToken(token);
      return { id: payload.sub, email: payload.email, name: payload.name };
    } catch {
      return null;
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const expected = this.signJwtPart(`${encodedHeader}.${encodedPayload}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid access token signature.');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as JwtPayload;
    if (!payload.sub || !payload.email || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Expired access token.');
    }

    return payload;
  }

  private toAuthenticatedUser(user: { uuid: string; email: string; name: string | null }): AuthenticatedUser {
    return { id: user.uuid, email: user.email, name: user.name };
  }

  private toAuthResponse(user: AuthenticatedUser) {
    return {
      accessToken: this.signAccessToken(user),
      tokenType: 'Bearer',
      expiresInSeconds: this.getJwtTtlSeconds(),
      user,
    };
  }

  private signAccessToken(user: AuthenticatedUser): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: now,
      exp: now + this.getJwtTtlSeconds(),
    };
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signJwtPart(`${encodedHeader}.${encodedPayload}`);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private signJwtPart(value: string): string {
    return createHmac('sha256', this.getJwtSecret()).update(value).digest('base64url');
  }

  private getJwtSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET') || '';
    if (secret) {
      return secret;
    }
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('JWT_SECRET is required in production.');
    }
    return 'local-dev-only-jwt-secret-change-me';
  }

  private getJwtTtlSeconds(): number {
    return this.config.get<number>('JWT_EXPIRES_IN_SECONDS') || 60 * 60 * 24 * 7;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('base64url');
    const hash = scryptSync(password, salt, 64).toString('base64url');
    return `scrypt.v1.${salt}.${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [algorithm, version, salt, hash] = storedHash.split('.');
    if (algorithm !== 'scrypt' || version !== 'v1' || !salt || !hash) {
      return false;
    }
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'base64url');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }
    const [type, token] = authorization.split(' ');
    return type?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
