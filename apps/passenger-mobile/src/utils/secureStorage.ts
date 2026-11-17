import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SecureStorageUtil {
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(`@secure_${key}`, value);
      }
    } catch {
      // Fallback when SecureStore fails (e.g. Android 2048-byte limit or Keystore error)
      await AsyncStorage.setItem(`@secure_${key}`, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null && val !== undefined) {
          return val;
        }
        // Fallback to AsyncStorage if SecureStore had failed on setItem or returned null
        return await AsyncStorage.getItem(`@secure_${key}`);
      } else {
        return await AsyncStorage.getItem(`@secure_${key}`);
      }
    } catch {
      return await AsyncStorage.getItem(`@secure_${key}`);
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Non-blocking
    }
    try {
      await AsyncStorage.removeItem(`@secure_${key}`);
    } catch {
      // Non-blocking
    }
  }
}
