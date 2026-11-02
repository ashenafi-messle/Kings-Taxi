import { mockHotels } from '../mocks';
import { ApiResponse, Hotel, HotelReservation } from '../types';

export class HotelService {
  static async searchHotels(query?: string, city?: string): Promise<ApiResponse<Hotel[]>> {
    let list = mockHotels;
    if (city) {
      list = list.filter((h) => h.city.toLowerCase() === city.toLowerCase());
    }
    if (query) {
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(query.toLowerCase()) ||
          h.city.toLowerCase().includes(query.toLowerCase())
      );
    }
    return {
      success: true,
      data: list,
    };
  }

  static async getHotelById(id: string): Promise<ApiResponse<Hotel | null>> {
    const hotel = mockHotels.find((h) => h.id === id) || null;
    return {
      success: Boolean(hotel),
      data: hotel,
    };
  }
}
