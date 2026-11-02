/**
 * Formats a numeric value into Ethiopian Birr (ETB) format
 */
export function formatETB(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ETB';
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `${formatted} ETB`;
}

export function formatPriceRangeETB(min: number, max: number): string {
  return `${formatETB(min)} - ${formatETB(max)}`;
}
