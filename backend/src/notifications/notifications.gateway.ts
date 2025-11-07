import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../logger/logger.service';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true, // Allow all origins, will be validated in handleConnection
    credentials: true,
  },
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private connectedUsers = new Map<number, AuthenticatedSocket>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  afterInit(server: Server) {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
    this.logger.log(`WebSocket gateway initialized on /notifications namespace`, 'NotificationsGateway');
    this.logger.log(`WebSocket CORS origin: ${corsOrigin}`, 'NotificationsGateway');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn('WebSocket connection rejected: No token provided', 'NotificationsGateway');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'your-super-secret-jwt-key-change-in-production',
        ),
      });

      // Store user info in socket
      client.userId = payload.sub;
      client.userRole = payload.role;

      // Ensure userId is set before using it
      if (!client.userId) {
        this.logger.warn('WebSocket connection rejected: No userId in token payload', 'NotificationsGateway');
        client.disconnect();
        return;
      }

      // Store connection
      this.connectedUsers.set(client.userId, client);

      // Join user-specific room for targeted notifications
      client.join(`user:${client.userId}`);

      this.logger.info(
        `WebSocket client connected: ${client.userId} (${client.userRole})`,
        'NotificationsGateway',
      );
    } catch (error) {
      this.logger.warn(
        `WebSocket connection rejected: Invalid token`,
        'NotificationsGateway',
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.info(
        `WebSocket client disconnected: ${client.userId}`,
        'NotificationsGateway',
      );
    }
  }

  /**
   * Send notification to a specific user
   */
  notifyUser(userId: number, event: string, data: any) {
    if (!this.server) {
      this.logger.warn(
        `WebSocket server not initialized. Cannot send notification to user ${userId}`,
        'NotificationsGateway',
      );
      return;
    }

    const room = `user:${userId}`;
    const isUserConnected = this.connectedUsers.has(userId);

    // Safely check room size
    let roomSize = 0;
    try {
      const adapter = this.server.sockets?.adapter;
      if (adapter && adapter.rooms) {
        const socketsInRoom = adapter.rooms.get(room);
        roomSize = socketsInRoom ? socketsInRoom.size : 0;
      }
    } catch (error) {
      this.logger.warn(
        `Could not check room size for ${room}: ${error instanceof Error ? error.message : String(error)}`,
        'NotificationsGateway',
      );
    }

    this.logger.info(
      `Sending notification to user ${userId}: ${event} (connected: ${isUserConnected}, room size: ${roomSize})`,
      'NotificationsGateway',
    );

    if (roomSize === 0 && !isUserConnected) {
      this.logger.warn(
        `User ${userId} is not connected to WebSocket. Notification will not be delivered.`,
        'NotificationsGateway',
      );
    }

    // Emit the notification
    this.server.to(room).emit(event, data);

    this.logger.info(
      `Notification emitted to room ${room} for event ${event}`,
      'NotificationsGateway',
    );
  }

  /**
   * Send notification to all connected users (for admins/managers)
   */
  notifyAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast notification: ${event}`, 'NotificationsGateway');
  }
}

