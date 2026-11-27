import { DEMO_TARIFF_CONFIG, MOCK_PROVISIONED_DRIVERS } from '../data/mockDriverData';
import { DriverProfile, FareBreakdown, MockTariffConfig } from '../types/driver.types';

/**
 * Phase 1 isolated mock service layer.
 * Replace these methods with real backend API calls in Phase 2.
 */

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('09') && digits.length === 10) return `+251${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 9) return `+251${digits}`;
  return raw.trim();
}

export async function mockAuthenticateDriver(
  identifier: string,
  password: string
): Promise<{ success: boolean; profile?: DriverProfile; error?: string }> {
  await new Promise((r) => setTimeout(r, 550));

  const trimmedId = identifier.trim();
  if (!trimmedId || !password) {
    return { success: false, error: 'Please enter your email or phone number and password.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const normalizedEmail = trimmedId.toLowerCase();
  const normalizedPhone = normalizePhone(trimmedId);

  const matched = MOCK_PROVISIONED_DRIVERS.find(
    (entry) =>
      entry.email.toLowerCase() === normalizedEmail || entry.phone === normalizedPhone
  );

  // For Phase 1 UI demo, allow the provisioned mock driver with demoPasswordHint
  // or any valid non-empty password >= 6 chars for that provisioned mock account.
  if (!matched) {
    return {
      success: false,
      error:
        'No provisioned mock driver matched that identifier. Use abebe.kebede@kingstaxi.et or +251911223344 for Phase 1 preview.',
    };
  }

  if (password !== matched.demoPasswordHint && password.length < 8) {
    return {
      success: false,
      error: 'Invalid credentials. For Phase 1 demo use password Driver@2026.',
    };
  }

  return { success: true, profile: matched.profile };
}

export async function mockRequestPasswordResetOtp(
  email: string
): Promise<{ success: boolean; maskedEmail?: string; error?: string }> {
  await new Promise((r) => setTimeout(r, 500));
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { success: false, error: 'Please enter a valid registered email address.' };
  }
  const [user, domain] = clean.split('@');
  const masked = `${user.slice(0, 2)}***@${domain}`;
  return { success: true, maskedEmail: masked };
}

export async function mockVerifyResetOtp(
  otp: string
): Promise<{ success: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 450));
  const clean = otp.trim();
  if (!/^\d{6}$/.test(clean)) {
    return { success: false, error: 'Enter the 6-digit simulated OTP (e.g. 123456).' };
  }
  return { success: true };
}

export async function mockCompletePasswordReset(
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 500));
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }
  return { success: true };
}

export function calculateDemoFare(
  distanceKm: number,
  durationMin: number,
  tariff: MockTariffConfig = DEMO_TARIFF_CONFIG
): FareBreakdown {
  const safeDistance = Math.max(0.5, Number(distanceKm.toFixed(1)));
  const safeDuration = Math.max(1, Math.round(durationMin));
  const distanceFareETB = Math.round(safeDistance * tariff.perKmETB);
  const timeFareETB = Math.round(safeDuration * tariff.perMinuteETB);
  const totalFareETB = tariff.baseFareETB + distanceFareETB + timeFareETB;

  return {
    baseFareETB: tariff.baseFareETB,
    distanceKm: safeDistance,
    distanceFareETB,
    durationMin: safeDuration,
    timeFareETB,
    totalFareETB,
  };
}

export async function mockSubmitPaymentReference(params: {
  rideId: string;
  institutionName: string;
  transactionReference: string;
}): Promise<{ success: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 600));
  const ref = params.transactionReference.trim();
  if (ref.length < 4) {
    return { success: false, error: 'Please enter a valid transaction reference (at least 4 characters).' };
  }
  return { success: true };
}
