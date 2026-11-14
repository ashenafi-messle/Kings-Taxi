import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SecureStorageUtil } from '../utils/secureStorage';
import { API_CONFIG } from '../config/api';

export type BiometricType = 'FACE_ID' | 'FINGERPRINT' | 'IRIS' | 'DEVICE_PIN' | 'NONE';

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  canAuthenticate: boolean;
  biometricType: BiometricType;
  label: string;
}

const BIOMETRIC_ENABLED_KEY = 'kings_taxi_biometric_enabled';
const BIOMETRIC_USER_ID_KEY = 'kings_taxi_biometric_user_id';

export class BiometricAuthService {
  private static isAuthenticating = false;

  /**
   * Evaluates available device biometric hardware, enrollment status, and auth type.
   */
  static async checkCapability(): Promise<BiometricCapability> {
    if (Platform.OS === 'web') {
      return {
        hasHardware: false,
        isEnrolled: false,
        canAuthenticate: false,
        biometricType: 'NONE',
        label: 'Biometrics unavailable in browser',
      };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricType = 'NONE';
      let label = 'Device Screen Lock / Passcode';

      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'FACE_ID';
        label = Platform.OS === 'ios' ? 'Face ID' : 'Facial Recognition';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'FINGERPRINT';
        label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'IRIS';
        label = 'Iris Recognition';
      } else if (hasHardware && isEnrolled) {
        biometricType = 'DEVICE_PIN';
        label = 'Device Screen Lock';
      }

      return {
        hasHardware,
        isEnrolled,
        canAuthenticate: hasHardware && isEnrolled,
        biometricType,
        label,
      };
    } catch (err) {
      console.warn('[BiometricAuth] Capability check failed:', err);
      return {
        hasHardware: false,
        isEnrolled: false,
        canAuthenticate: false,
        biometricType: 'NONE',
        label: 'Biometrics unavailable',
      };
    }
  }

  /**
   * Prompts native biometric / device screen-lock authentication.
   * Never collects, stores, or transmits biometric templates or device PINs.
   */
  static async authenticate(promptMessage = 'Confirm your identity to access Kings Taxi'): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (Platform.OS === 'web') {
      return { success: true };
    }

    if (this.isAuthenticating) {
      return { success: false, error: 'Authentication prompt is already active.' };
    }

    this.isAuthenticating = true;
    try {
      const capability = await this.checkCapability();
      if (!capability.canAuthenticate) {
        return {
          success: false,
          error: 'Biometric authentication is not configured on this device.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Device PIN / Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Authentication was cancelled or failed.',
      };
    } catch (err: any) {
      console.warn('[BiometricAuth] Authentication error:', err);
      return {
        success: false,
        error: err.message || 'Device authentication failed.',
      };
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Enables biometric login preference for the authenticated passenger.
   * Prompts biometric verification once to confirm ownership before activating.
   */
  static async enableBiometricLogin(
    passengerId: string,
    accessToken?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    const authResult = await this.authenticate('Confirm biometric access for Kings Taxi');
    if (!authResult.success) {
      return authResult;
    }

    try {
      await SecureStorageUtil.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      await SecureStorageUtil.setItem(BIOMETRIC_USER_ID_KEY, passengerId);

      // Notify backend to register session biometric status
      if (accessToken && !API_CONFIG.isMockAuth) {
        const capability = await this.checkCapability();
        fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerBiometric}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            enabled: true,
            biometricType: capability.biometricType,
            deviceName: `${Platform.OS.toUpperCase()} Device`,
          }),
        }).catch((e) => console.warn('[BiometricAuth] Backend sync failed:', e));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save biometric configuration.' };
    }
  }

  /**
   * Disables biometric login and clears local secure preference.
   */
  static async disableBiometricLogin(accessToken?: string | null): Promise<void> {
    try {
      await SecureStorageUtil.removeItem(BIOMETRIC_ENABLED_KEY);
      await SecureStorageUtil.removeItem(BIOMETRIC_USER_ID_KEY);

      if (accessToken && !API_CONFIG.isMockAuth) {
        fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerBiometric}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ enabled: false }),
        }).catch((e) => console.warn('[BiometricAuth] Backend sync failed:', e));
      }
    } catch (err) {
      console.warn('[BiometricAuth] Failed to disable biometrics:', err);
    }
  }

  /**
   * Checks whether biometric login is actively enabled and supported on the device.
   * If enrollment or device credentials have changed/been removed, safely deactivates the local preference.
   */
  static async isBiometricLoginActive(): Promise<boolean> {
    try {
      const stored = await SecureStorageUtil.getItem(BIOMETRIC_ENABLED_KEY);
      if (stored !== 'true') return false;

      const capability = await this.checkCapability();
      if (!capability.canAuthenticate) {
        // Biometric credentials were removed or device screen lock was disabled
        await SecureStorageUtil.removeItem(BIOMETRIC_ENABLED_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears biometric preference and stored identity metadata on logout or account switch.
   */
  static async clearBiometricSession(): Promise<void> {
    try {
      await SecureStorageUtil.removeItem(BIOMETRIC_ENABLED_KEY);
      await SecureStorageUtil.removeItem(BIOMETRIC_USER_ID_KEY);
    } catch {
      // Non-blocking cleanup
    }
  }

  /**
   * Returns passenger ID registered with biometric login, if any.
   */
  static async getBiometricPassengerId(): Promise<string | null> {
    try {
      return await SecureStorageUtil.getItem(BIOMETRIC_USER_ID_KEY);
    } catch {
      return null;
    }
  }
}

