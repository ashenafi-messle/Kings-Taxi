import { mockHeritageSites } from '../mocks';
import { ApiResponse, HeritageSite } from '../types';

export class HeritageService {
  static async getAllSites(): Promise<ApiResponse<HeritageSite[]>> {
    return {
      success: true,
      data: mockHeritageSites,
    };
  }

  static async getSiteById(id: string): Promise<ApiResponse<HeritageSite | null>> {
    const site = mockHeritageSites.find((s) => s.id === id) || null;
    return {
      success: Boolean(site),
      data: site,
    };
  }
}
