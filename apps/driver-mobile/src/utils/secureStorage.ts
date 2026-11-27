import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'kt_driver_access_token';
const REFRESH_TOKEN_KEY = 'kt_driver_refresh_token';

// In-memory fallback for environments where browser storage is unavailable
const memoryStore = new Map<string, string>();

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    return SecureStore.getItemAsync(key);
  }
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(key);
  }
  memoryStore.delete(key);
}

export const DriverTokenStorage = {
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      setSecureItem(ACCESS_TOKEN_KEY, accessToken),
      setSecureItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return getSecureItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return getSecureItem(REFRESH_TOKEN_KEY);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      deleteSecureItem(ACCESS_TOKEN_KEY).catch(() => undefined),
      deleteSecureItem(REFRESH_TOKEN_KEY).catch(() => undefined),
    ]);
  },
};
