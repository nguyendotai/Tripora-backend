import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './redis.constants';

/** V9 vong 5 — mirror dung DatabaseModule (@Global, 1 client dung chung toan app cho cache).
 * Rieng voi BullMQ (registerQueue o tung module dung queue) — moi Queue/Worker BullMQ tu quan ly
 * connection Redis rieng, khong dung chung instance nay (khuyen nghi tu BullMQ, tranh xung dot
 * lenh blocking noi bo). */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'),
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}
