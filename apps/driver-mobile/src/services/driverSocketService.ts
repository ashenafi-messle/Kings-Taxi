import { io, Socket } from 'socket.io-client';
import { resolveSocketUrl } from '../config/api';
import { DriverTokenStorage } from '../utils/secureStorage';
import { BackendRideRequestDto } from './driverRideService';

export interface DriverSocketCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onReconnectedSync?: (payload: {
    availabilityStatus: string;
    activeRequest: BackendRideRequestDto | null;
  }) => void;
  onAvailabilityChanged?: (payload: { driverId: string; availabilityStatus: string }) => void;
  onNewRequest?: (req: BackendRideRequestDto) => void;
  onRequestAccepted?: (req: BackendRideRequestDto) => void;
  onRequestRejected?: (req: BackendRideRequestDto) => void;
  onRequestCancelled?: (req: BackendRideRequestDto) => void;
  onRequestExpired?: (payload: { id: string; status: string }) => void;
}

class DriverSocketClient {
  private socket: Socket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  async connect(callbacks: DriverSocketCallbacks): Promise<void> {
    const token = await DriverTokenStorage.getAccessToken();
    if (!token) return;

    if (this.socket) {
      this.disconnect();
    }

    const socketUrl = resolveSocketUrl();
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      callbacks.onConnectionChange?.(true);
      this.startHeartbeat();
    });

    socket.on('disconnect', () => {
      callbacks.onConnectionChange?.(false);
      this.stopHeartbeat();
    });

    socket.on('connect_error', () => {
      callbacks.onConnectionChange?.(false);
    });

    socket.on('driver:session:reconnected', (payload) => {
      callbacks.onReconnectedSync?.(payload);
    });

    socket.on('driver:availability:changed', (payload) => {
      callbacks.onAvailabilityChanged?.(payload);
    });

    socket.on('ride:request:new', (req: BackendRideRequestDto) => {
      callbacks.onNewRequest?.(req);
    });

    socket.on('ride:request:accepted', (req: BackendRideRequestDto) => {
      callbacks.onRequestAccepted?.(req);
    });

    socket.on('ride:request:rejected', (req: BackendRideRequestDto) => {
      callbacks.onRequestRejected?.(req);
    });

    socket.on('ride:request:cancelled', (req: BackendRideRequestDto) => {
      callbacks.onRequestCancelled?.(req);
    });

    socket.on('ride:request:expired', (payload: { id: string; status: string }) => {
      callbacks.onRequestExpired?.(payload);
    });

    this.socket = socket;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('driver:heartbeat');
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const driverSocketClient = new DriverSocketClient();
