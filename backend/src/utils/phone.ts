/**
 * Kings Taxi — Ethiopian Phone Number Normalization & Validation Utility
 *
 * Supported formats:
 * - Local 10-digit with 0 prefix:   0946084865, 0712345678
 * - International without + prefix: 251946084865, 251712345678
 * - International with + prefix:    +251946084865, +251712345678
 * - 9-digit national subscriber:    946084865, 712345678
 * - Formatted with delimiters:      +251 946-084-865, (0946) 084865
 *
 * Standard normalized output: E.164 international format (+2519XXXXXXXX or +2517XXXXXXXX)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // e.g. "+251946084865"
  nationalNumber?: string; // e.g. "0946084865"
  operator?: 'Ethio Telecom' | 'Safaricom Ethiopia' | 'Unknown';
  error?: string;
}

export function normalizeEthiopianPhone(input: string): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Phone number is required',
    };
  }

  // Strip all whitespace, hyphens, brackets, dots
  let clean = input.trim().replace(/[\s\-\(\)\.]/g, '');

  // Strip leading plus if present
  if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }

  // Only digits allowed now
  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      normalized: '',
      error: 'Phone number must contain only digits',
    };
  }

  let subscriberNumber = '';

  // Case 1: Starts with 09 or 07 (10 digits total, e.g. 0946084865)
  if (/^0[79]\d{8}$/.test(clean)) {
    subscriberNumber = clean.slice(1);
  }
  // Case 2: Starts with 2519 or 2517 (12 digits total, e.g. 251946084865)
  else if (/^251[79]\d{8}$/.test(clean)) {
    subscriberNumber = clean.slice(3);
  }
  // Case 3: Starts with 9 or 7 (9 digits total, e.g. 946084865)
  else if (/^[79]\d{8}$/.test(clean)) {
    subscriberNumber = clean;
  }
  else {
    return {
      isValid: false,
      normalized: '',
      error: 'Invalid Ethiopian mobile number. Must start with 09 (Ethio Telecom) or 07 (Safaricom) with 9 digits.',
    };
  }

  const normalized = `+251${subscriberNumber}`;
  const nationalNumber = `0${subscriberNumber}`;
  const operator = subscriberNumber.startsWith('9')
    ? 'Ethio Telecom'
    : subscriberNumber.startsWith('7')
    ? 'Safaricom Ethiopia'
    : 'Unknown';

  return {
    isValid: true,
    normalized,
    nationalNumber,
    operator,
  };
}

/**
 * Checks whether an incoming Telegram text message appears to be a user manually typing their phone number
 * (e.g. "0946084865", "+251946084865", "251946084865", "946084865")
 */
export function isManualPhoneInput(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const trimmed = text.trim();
  // Strip non-digits
  const digits = trimmed.replace(/[^0-9]/g, '');

  // If message is primarily digits (8-13 digits) and resembles Ethiopian format
  if (digits.length >= 8 && digits.length <= 13) {
    if (
      digits.startsWith('09') ||
      digits.startsWith('07') ||
      digits.startsWith('251') ||
      digits.startsWith('9') ||
      digits.startsWith('7')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Safely masks a phone number for logging and UI display
 * e.g. "+251946084865" -> "+251 94***865"
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '***';
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.length >= 10) {
    const start = clean.slice(0, 6); // "+25194" or "09460"
    const end = clean.slice(-3);     // "865"
    return `${start}***${end}`;
  }
  return '***';
}

