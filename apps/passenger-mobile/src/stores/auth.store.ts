import { create } from 'zustand';
import { PassengerProfile } from '../types';
import { mockPassenger } from '../mocks';

interface AuthState {
  user: PassengerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password?: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<PassengerProfile>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: mockPassenger,
  token: 'mock_jwt_token_kings_78912',
  isAuthenticated: true, // Default to true for smooth developer preview & testing
  isLoading: false,

  login: async (phone: string, _password?: string) => {
    set({ isLoading: true });
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 800));
    set({
      user: { ...mockPassenger, phone },
      token: 'mock_jwt_token_kings_78912',
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  verifyOtp: async (code: string) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Accepts any 4 to 6 digit code for development ease
    if (code.length >= 4) {
      set({
        user: mockPassenger,
        token: 'mock_jwt_token_kings_78912',
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false });
    return false;
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateProfile: (updates: Partial<PassengerProfile>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },
}));
