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
      // Fallback
      await AsyncStorage.setItem(`@secure_${key}`, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        return await SecureStore.getItemAsync(key);
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
      } else {
        await AsyncStorage.removeItem(`@secure_${key}`);
      }
    } catch {
      await AsyncStorage.removeItem(`@secure_${key}`);
    }
  }
}
