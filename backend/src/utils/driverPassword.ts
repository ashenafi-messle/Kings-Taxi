import crypto from 'crypto';

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnpqrstuvwxyz';
const DIGIT_CHARS = '23456789';
const SYMBOL_CHARS = '@#$%&*!?';
const ALL_CHARS = `${UPPERCASE_CHARS}${LOWERCASE_CHARS}${DIGIT_CHARS}${SYMBOL_CHARS}`;

const SCRYPT_OPTIONS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1 };
const SCRYPT_KEYLEN = 64;

export const TEMP_PASSWORD_TTL_DAYS = 7;

/**
 * Generates a cryptographically secure, unpredictable temporary password
 * tailored for mobile keyboard usability (avoids ambiguous 0/O, 1/l/I).
 */
export function generateSecureTemporaryPassword(length = 12): string {
  const safeLength = Math.max(12, length);
  const chars: string[] = [
    UPPERCASE_CHARS[crypto.randomInt(0, UPPERCASE_CHARS.length)],
    LOWERCASE_CHARS[crypto.randomInt(0, LOWERCASE_CHARS.length)],
    DIGIT_CHARS[crypto.randomInt(0, DIGIT_CHARS.length)],
    SYMBOL_CHARS[crypto.randomInt(0, SYMBOL_CHARS.length)],
  ];

  for (let i = chars.length; i < safeLength; i++) {
    chars.push(ALL_CHARS[crypto.randomInt(0, ALL_CHARS.length)]);
  }

  // Cryptographically secure Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

/**
 * Hashes a password with a random 16-byte salt using scrypt,
 * returning `${hexHash}:${hexSalt}` consistent with Kings Taxi auth.
 */
export function hashDriverPassword(plainPassword: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${derivedKey.toString('hex')}:${salt}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored `${hexHash}:${hexSalt}` value
 * using constant-time comparison.
 */
export function verifyDriverPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return Promise.resolve(false);
  const [expectedHex, salt] = parts;
  if (!expectedHex || !salt) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (expectedBuf.length !== derivedKey.length) {
        return resolve(false);
      }
      resolve(crypto.timingSafeEqual(expectedBuf, derivedKey));
    });
  });
}

export function computeTempPasswordExpiry(ttlDays = TEMP_PASSWORD_TTL_DAYS): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}
