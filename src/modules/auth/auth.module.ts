import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/** V9 vong 5 — ThrottlerModule dang ky rieng o day (khong global o app.module.ts) vi chi
 * register/login/refresh dung ThrottlerGuard tuong minh (xem auth.controller.ts) — 3 route nay
 * truoc gio chua co bao ve brute-force nao. Storage Redis (khong dung in-memory mac dinh) de dung
 * that ha tang Redis vong nay, khong chi la ly thuyet. */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UserModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ limit: 5, ttl: 60000 }],
        storage: new ThrottlerStorageRedisService(config.get<string>('REDIS_URL')),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
})
export class AuthModule {}
