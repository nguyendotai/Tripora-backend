import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
}

/** V9 vong 1 — xac thuc bang chinh Access Token JWT dang dung cho REST (khong tao co che rieng).
 * Client gui qua handshake.auth.token, join phong "user:<id>" de moi tab/thiet bi cua 1 user deu
 * nhan duoc — cung kieu phong se dung lai cho Chat (conversation:<id>) o vong sau. */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      await client.join(`user:${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected socket connection: invalid token (${client.id})`);
      client.disconnect();
    }
  }
}
