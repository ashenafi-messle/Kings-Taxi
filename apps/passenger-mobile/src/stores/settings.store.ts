import { create } from 'zustand';

export type SupportedLanguage = 'en' | 'am' | 'om';

interface SettingsState {
  language: SupportedLanguage;
  notificationsEnabled: boolean;
  smsReceiptsEnabled: boolean;
  biometricLoginEnabled: boolean;

  setLanguage: (lang: SupportedLanguage) => void;
  toggleNotifications: () => void;
  toggleSmsReceipts: () => void;
  toggleBiometrics: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  notificationsEnabled: true,
  smsReceiptsEnabled: true,
  biometricLoginEnabled: false,

  setLanguage: (language) => set({ language }),
  toggleNotifications: () =>
    set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
  toggleSmsReceipts: () =>
    set((state) => ({ smsReceiptsEnabled: !state.smsReceiptsEnabled })),
  toggleBiometrics: () =>
    set((state) => ({ biometricLoginEnabled: !state.biometricLoginEnabled })),
}));
