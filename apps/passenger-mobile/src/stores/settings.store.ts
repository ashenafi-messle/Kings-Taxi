import { create } from 'zustand';
import {
  SupportedLanguage,
  changeLanguage,
  getCurrentLanguage,
  getPersistedLanguage,
} from '../i18n';

interface SettingsState {
  language: SupportedLanguage;
  notificationsEnabled: boolean;
  smsReceiptsEnabled: boolean;
  biometricLoginEnabled: boolean;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  initSettings: () => Promise<void>;
  toggleNotifications: () => void;
  toggleSmsReceipts: () => void;
  toggleBiometrics: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: getCurrentLanguage(),
  notificationsEnabled: true,
  smsReceiptsEnabled: true,
  biometricLoginEnabled: false,

  setLanguage: async (language: SupportedLanguage) => {
    set({ language });
    await changeLanguage(language);
  },

  initSettings: async () => {
    const persisted = await getPersistedLanguage();
    set({ language: persisted });
    await changeLanguage(persisted);
  },

  toggleNotifications: () =>
    set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
  toggleSmsReceipts: () =>
    set((state) => ({ smsReceiptsEnabled: !state.smsReceiptsEnabled })),
  toggleBiometrics: () =>
    set((state) => ({ biometricLoginEnabled: !state.biometricLoginEnabled })),
}));

export { SupportedLanguage };
