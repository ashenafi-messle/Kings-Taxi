import { create } from 'zustand';
import {
  SupportedLanguage,
  changeLanguage,
  getCurrentLanguage,
  getPersistedLanguage,
} from '../i18n';
import { BiometricAuthService } from '../services/biometricAuth.service';

interface SettingsState {
  language: SupportedLanguage;
  notificationsEnabled: boolean;
  biometricLoginEnabled: boolean;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  initSettings: () => Promise<void>;
  toggleNotifications: () => void;
  setBiometricLoginEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: getCurrentLanguage(),
  notificationsEnabled: true,
  biometricLoginEnabled: false,

  setLanguage: async (language: SupportedLanguage) => {
    set({ language });
    await changeLanguage(language);
  },

  initSettings: async () => {
    const persisted = await getPersistedLanguage();
    const biometricActive = await BiometricAuthService.isBiometricLoginActive();
    set({ language: persisted, biometricLoginEnabled: biometricActive });
    await changeLanguage(persisted);
  },

  toggleNotifications: () =>
    set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

  setBiometricLoginEnabled: (enabled: boolean) =>
    set({ biometricLoginEnabled: enabled }),
}));

export { SupportedLanguage };
