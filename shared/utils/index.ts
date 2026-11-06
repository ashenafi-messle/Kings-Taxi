/**
 * Kings Taxi Platform — Shared System Utilities
 */

export function formatETB(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETB`;
}

export function maskContact(value: string): string {
  if (!value) return '';
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  }
  const digits = value.replace(/\s+/g, '');
  if (digits.length <= 4) return '****';
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

