/**
 * Administrator & Authentication Type Definitions
 */

export type AdminRole = 
  | 'SUPER_ADMIN'
  | 'OPERATIONS_ADMIN'
  | 'DRIVER_MANAGER'
  | 'PASSENGER_SUPPORT_ADMIN'
  | 'HOTEL_MANAGER'
  | 'TOURISM_MANAGER';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  phone?: string;
  department?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  permissions: string[];
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthSession {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface PasswordResetPayload {
  email: string;
  resetToken?: string;
  newPassword?: string;
}
