import { DRIVER_API_ENDPOINTS } from '../config/api';
import { DriverProfile } from '../types/driver.types';
import { DriverTokenStorage } from '../utils/secureStorage';
import { driverApiRequest, refreshDriverSession } from './apiClient';

interface BackendDriverPayload {
  id: string;
  driverCode: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  city: string;
  accountStatus: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rating: number;
  totalTrips: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    serviceTier: string;
  } | null;
  license: {
    licenseNumber: string;
    expiryDate: string;
    issuingAuthority: string;
  };
}

function mapBackendDriverToProfile(raw: BackendDriverPayload): DriverProfile {
  const mappedVerification =
    raw.verificationStatus === 'APPROVED' || raw.verificationStatus === 'VERIFIED'
      ? 'VERIFIED'
      : raw.verificationStatus === 'SUSPENDED'
      ? 'SUSPENDED'
      : 'PENDING';

  return {
    id: raw.id,
    driverCode: raw.driverCode,
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    avatarUrl:
      raw.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(raw.fullName)}&background=111111&color=FFFFFF&size=128`,
    city: raw.city || 'Gondar',
    verificationStatus: mappedVerification,
    rating: raw.rating ?? 5.0,
    totalTrips: raw.totalTrips ?? 0,
    acceptanceRate: 100,
    vehicle: raw.vehicle || {
      make: 'Kings Fleet',
      model: 'Unassigned',
      year: new Date().getFullYear(),
      color: 'Silver',
      plateNumber: 'Pending Assignment',
      serviceTier: 'Standard',
    },
    license: raw.license || {
      licenseNumber: 'Pending',
      expiryDate: 'N/A',
      issuingAuthority: 'Ethiopian Transport Authority',
    },
  };
}

export async function loginDriver(
  identifier: string,
  password: string
): Promise<DriverProfile> {
  const data = await driverApiRequest<{
    driver: BackendDriverPayload;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>(DRIVER_API_ENDPOINTS.login, {
    method: 'POST',
    skipAuth: true,
    skipRefreshOn401: true,
    body: JSON.stringify({
      identifier: identifier.trim(),
      password,
    }),
  });

  await DriverTokenStorage.saveTokens(data.accessToken, data.refreshToken);
  return mapBackendDriverToProfile(data.driver);
}

export async function restoreDriverSession(): Promise<DriverProfile | null> {
  const accessToken = await DriverTokenStorage.getAccessToken();
  const refreshToken = await DriverTokenStorage.getRefreshToken();

  if (!accessToken && !refreshToken) {
    return null;
  }

  try {
    if (!accessToken && refreshToken) {
      const refreshed = await refreshDriverSession();
      if (!refreshed) {
        await DriverTokenStorage.clearTokens();
        return null;
      }
    }

    const data = await driverApiRequest<{ driver: BackendDriverPayload }>(
      DRIVER_API_ENDPOINTS.me,
      { method: 'GET' }
    );
    return mapBackendDriverToProfile(data.driver);
  } catch {
    await DriverTokenStorage.clearTokens();
    return null;
  }
}

export async function logoutDriver(): Promise<void> {
  try {
    const refreshToken = await DriverTokenStorage.getRefreshToken();
    const accessToken = await DriverTokenStorage.getAccessToken();
    if (accessToken) {
      await driverApiRequest<null>(DRIVER_API_ENDPOINTS.logout, {
        method: 'POST',
        skipRefreshOn401: true,
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Always clear local tokens even if backend logout fails
  } finally {
    await DriverTokenStorage.clearTokens();
  }
}

export async function requestDriverPasswordResetOtp(
  email: string
): Promise<{ message: string }> {
  return driverApiRequest<{ message: string }>(DRIVER_API_ENDPOINTS.forgotPassword, {
    method: 'POST',
    skipAuth: true,
    skipRefreshOn401: true,
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function verifyDriverResetOtp(
  email: string,
  otp: string
): Promise<{ resetToken: string; expiresInSeconds: number }> {
  return driverApiRequest<{ resetToken: string; expiresInSeconds: number }>(
    DRIVER_API_ENDPOINTS.verifyResetOtp,
    {
      method: 'POST',
      skipAuth: true,
      skipRefreshOn401: true,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      }),
    }
  );
}

export async function resetDriverPassword(
  resetToken: string,
  newPassword: string
): Promise<void> {
  await driverApiRequest<null>(DRIVER_API_ENDPOINTS.resetPassword, {
    method: 'POST',
    skipAuth: true,
    skipRefreshOn401: true,
    body: JSON.stringify({
      resetToken,
      newPassword,
    }),
  });
}
