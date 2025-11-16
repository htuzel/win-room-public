/**
 * Format utilities for display in UI
 */

/**
 * Masks an email address for privacy
 * Example: john.doe@company.com -> joh***oe@company.com
 * Shows first 3 and last 2 characters of local part
 */
export function maskEmail(email: string): string {
  if (!email) return '';

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  // If local part is very short, show less
  if (localPart.length <= 4) {
    const masked = localPart.charAt(0) + '*'.repeat(Math.max(2, localPart.length - 1));
    return `${masked}@${domain}`;
  }

  // Show first 3 and last 2 characters
  const firstPart = localPart.substring(0, 3);
  const lastPart = localPart.substring(localPart.length - 2);
  const masked = firstPart + '*'.repeat(Math.max(3, localPart.length - 5)) + lastPart;
  return `${masked}@${domain}`;
}

/**
 * Formats USD currency
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats percentage
 */
export function formatPercent(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return `${num.toFixed(1)}%`;
}

/**
 * Formats large numbers with K/M suffix
 */
export function formatCompactNumber(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}
