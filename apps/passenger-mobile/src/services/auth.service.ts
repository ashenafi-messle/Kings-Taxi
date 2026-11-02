import { mockPassenger } from '../mocks';
import { PassengerProfile, ApiResponse } from '../types';

export class AuthService {
  static async getCurrentPassenger(): Promise<ApiResponse<PassengerProfile>> {
    return {
      success: true,
      data: mockPassenger,
    };
  }

  static async sendOtp(phone: string): Promise<ApiResponse<{ message: string }>> {
    return {
      success: true,
      data: { message: `OTP sent to ${phone}` },
    };
  }

  static async verifyOtp(
    _phone: string,
    code: string
  ): Promise<ApiResponse<{ token: string; user: PassengerProfile }>> {
    if (code.length >= 4) {
      return {
        success: true,
        data: {
          token: 'mock_jwt_token_kings_78912',
          user: mockPassenger,
        },
      };
    }
    return {
      success: false,
      data: {} as any,
      error: 'Invalid verification code',
    };
  }
}
