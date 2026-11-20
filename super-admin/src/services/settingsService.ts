import { SystemSettings } from '../types';
import { mockSystemSettings } from './mockData/settings.mock';

let settingsStore: SystemSettings = { ...mockSystemSettings };

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ...settingsStore };
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    settingsStore = {
      ...settingsStore,
      ...data,
    };
    return { ...settingsStore };
  },
};
