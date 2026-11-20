import { AdminUser } from '../types';
import { mockAdmins } from './mockData/admins.mock';

let adminsStore: AdminUser[] = [...mockAdmins];

export const adminService = {
  async getAdmins(): Promise<AdminUser[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return [...adminsStore];
  },

  async getAdminById(id: string): Promise<AdminUser | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return adminsStore.find((a) => a.id === id) || null;
  },

  async createAdmin(data: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const newAdmin: AdminUser = {
      ...data,
      id: `adm_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    adminsStore.push(newAdmin);
    return newAdmin;
  },

  async updateAdmin(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = adminsStore.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Administrator not found');

    const updated: AdminUser = {
      ...adminsStore[index],
      ...data,
    };
    adminsStore[index] = updated;
    return updated;
  },

  async deleteAdmin(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 70));
    const index = adminsStore.findIndex((a) => a.id === id);
    if (index === -1) return false;
    adminsStore.splice(index, 1);
    return true;
  },
};
