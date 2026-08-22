import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/** Wrapper mong bao ngoai ioredis client — mirror triet ly RealtimeService/NotificationService
 * (service mong, khong them logic nghiep vu). Dung cho cache-aside cac endpoint "popular" —
 * loi Redis khong duoc lam gian doan request (best-effort, tra null/bo qua thay vi throw). */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`Cache GET failed for key "${key}"`, error instanceof Error ? error.stack : error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache SET failed for key "${key}"`, error instanceof Error ? error.stack : error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Cache DEL failed for key "${key}"`, error instanceof Error ? error.stack : error);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
