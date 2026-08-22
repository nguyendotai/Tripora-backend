import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitToUser(userId: bigint | string, event: string, payload: unknown) {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
  }
}
