import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';
import { useAuthStore } from '../stores/auth.store';

export interface PassengerRideSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onRequestAccepted?: (payload: any) => void;
  onRequestRejected?: (payload: any) => void;
  onRequestCancelled?: (payload: any) => void;
  onRequestExpired?: (payload: any) => void;
  onDriverAvailabilityChanged?: (payload: {
    driverId: string;
    availabilityStatus: string;
    subcities?: Array<{ id: string; name: string }>;
  }) => void;
}

function resolvePassengerSocketUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  return API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, '');
}

class PassengerRideSocketService {
  private socket: Socket | null = null;
  private subscribers = new Set<PassengerRideSocketCallbacks>();

  connect(callbacks: PassengerRideSocketCallbacks): () => void {
    this.subscribers.add(callbacks);

    const token = useAuthStore.getState().token;
    if (!token) {
      return () => {
        this.subscribers.delete(callbacks);
      };
    }

    if (!this.socket) {
      const socketUrl = resolvePassengerSocketUrl();
      this.socket = io(socketUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 10000,
      });

      this.socket.on('connect', () => {
        this.subscribers.forEach((cb) => cb.onConnect?.());
      });

      this.socket.on('disconnect', (reason) => {
        this.subscribers.forEach((cb) => cb.onDisconnect?.(reason));
      });

      this.socket.on('ride:request:accepted', (payload) => {
        this.subscribers.forEach((cb) => cb.onRequestAccepted?.(payload));
      });

      this.socket.on('ride:request:rejected', (payload) => {
        this.subscribers.forEach((cb) => cb.onRequestRejected?.(payload));
      });

      this.socket.on('ride:request:cancelled', (payload) => {
        this.subscribers.forEach((cb) => cb.onRequestCancelled?.(payload));
      });

      this.socket.on('ride:request:expired', (payload) => {
        this.subscribers.forEach((cb) => cb.onRequestExpired?.(payload));
      });

      this.socket.on('driver:availability:changed', (payload) => {
        this.subscribers.forEach((cb) => cb.onDriverAvailabilityChanged?.(payload));
      });
    } else if (!this.socket.connected) {
      this.socket.auth = { token };
      this.socket.connect();
    }

    return () => {
      this.subscribers.delete(callbacks);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const passengerRideSocket = new PassengerRideSocketService();
