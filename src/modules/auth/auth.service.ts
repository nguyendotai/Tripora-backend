import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UserRepository } from '../user/user.repository';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.ensureActive(user.status);

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user };
  }

  /** Verify ID token bang google-auth-library (khong tu viet lai JWT verify). Tai khoan moi tao
   * ra co passwordHash la 1 chuoi random khong ai doan duoc (schema User.passwordHash van required,
   * khong doi schema) — khop theo email da duoc Google xac thuc, khong co flow dat mat khau rieng
   * cho tai khoan nay (ngoai pham vi). */
  async loginWithGoogle(idToken: string) {
    const client = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
    let payload: {
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Invalid Google token');
    }

    let user = await this.userRepository.findByEmail(payload.email);
    if (!user) {
      const passwordHash = await bcrypt.hash(
        crypto.randomBytes(32).toString('hex'),
        10,
      );
      user = await this.userRepository.create({
        email: payload.email,
        passwordHash,
        firstName: payload.given_name,
        lastName: payload.family_name,
        avatar: payload.picture,
      });
    }

    this.ensureActive(user.status);

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user };
  }

  async refresh(rawRefreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = BigInt(payload.sub);
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.authRepository.findActiveByUserAndHash(
      userId,
      tokenHash,
    );
    if (!stored) {
      throw new UnauthorizedException(
        'Refresh token revoked or not recognized',
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.authRepository.revoke(stored.id);
      throw new UnauthorizedException('Account is no longer active');
    }

    await this.authRepository.revoke(stored.id);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.authRepository.revokeByHash(tokenHash);
  }

  private async issueTokens(userId: bigint, email: string, role: string) {
    const payload = { sub: userId.toString(), email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.authRepository.createRefreshToken(userId, tokenHash, expiresAt);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private ensureActive(status: UserStatus) {
    if (status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        status === UserStatus.BANNED
          ? 'This account has been banned'
          : 'This account is inactive',
      );
    }
  }
}
