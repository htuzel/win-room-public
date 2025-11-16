// Win Room v2.0 - Metrics Calculation Helpers
import { queryOne } from '../db/connection';

const currencyAliasMap: Record<string, string> = {
  USD: 'USD',
  US: 'USD',
  '$': 'USD',
  TRY: 'TRY',
  TR: 'TRY',
  TL: 'TRY',
  '₺': 'TRY',
  SAR: 'SAR',
};

function normalizeCurrency(currency?: string | null): string | null {
  if (!currency) {
    return null;
  }

  const cleaned = currency.trim().toUpperCase();
  if (!cleaned) {
    return null;
  }

  return currencyAliasMap[cleaned] || cleaned;
}

/**
 * Get USD/TRY rate from cache or database
 */
let cachedUsdRate: number | null = null;
let cachedUsdRateExpiresAt = 0;
let usdRateWarningLogged = false;

export async function getUsdTryRate(): Promise<number> {
  const now = Date.now();
  if (cachedUsdRate && now < cachedUsdRateExpiresAt) {
    return cachedUsdRate;
  }

  const setCache = (rate: number) => {
    cachedUsdRate = rate;
    cachedUsdRateExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  };

  // Try calling helper function if it exists
  try {
    const result = await queryOne<{ rate: number }>(
      'SELECT wr_get_usd_try_rate() as rate'
    );
    if (result?.rate && Number(result.rate) > 0) {
      const rate = Number(result.rate);
      setCache(rate);
      return rate;
    }
  } catch (error) {
    if (!usdRateWarningLogged) {
      console.warn(
        '[Metrics] wr_get_usd_try_rate() missing, falling back to custom_settings lookup'
      );
      usdRateWarningLogged = true;
    }
  }

  // Fallback: read directly from custom_settings
  try {
    const fallback = await queryOne<{ rate: string | number }>(
      `SELECT (value)::numeric AS rate
       FROM custom_settings
       WHERE name = 'dolar'
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 1`
    );
    const parsed = fallback?.rate ? Number(fallback.rate) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) {
      setCache(parsed);
      return parsed;
    }
  } catch (error) {
    if (!usdRateWarningLogged) {
      console.warn(
        '[Metrics] Unable to read USD/TRY rate from custom_settings, using fallback'
      );
      usdRateWarningLogged = true;
    }
  }

  // Last resort: environment variable or static fallback
  const envRate = process.env.USD_TRY_RATE ? Number(process.env.USD_TRY_RATE) : NaN;
  const rate = !Number.isNaN(envRate) && envRate > 0 ? envRate : 42;
  setCache(rate);
  return rate;
}

/**
 * Convert amount to USD
 */
export async function convertToUsd(
  amount: number,
  currency: string
): Promise<number | null> {
  const normalizedCurrency = normalizeCurrency(currency);
  if (!normalizedCurrency) {
    return null;
  }

  if (normalizedCurrency === 'USD') {
    return amount;
  }

  if (normalizedCurrency === 'TRY') {
    const rate = await getUsdTryRate();
    return amount / rate;
  }

  if (normalizedCurrency === 'SAR') {
    const SAR_TO_USD = 3.75; // 1 USD ≈ 3.75 SAR
    return amount / SAR_TO_USD;
  }

  return null; // unknown currency
}

/**
 * Get lesson price based on campaign minutes
 */
export function getLessonPriceUsd(campaignMinute: number): number {
  switch (campaignMinute) {
    case 25:
      return 5;
    case 50:
      return 10;
    case 20:
      return 4;
    case 40:
      return 8;
    default:
      return 5;
  }
}

/**
 * Calculate subscription metrics
 */
export interface MetricsInput {
  subscription_id: number;
  subs_amount: number | null;
  currency: string | null;
  campaign_lenght: number;
  per_week: number;
  campaign_minute: number;
  is_free: number;
  payment_channel: string;
  status: string;
}

export interface MetricsOutput {
  revenue_usd: number | null;
  cost_usd: number;
  margin_amount_usd: number;
  margin_percent: number;
  is_jackpot: boolean;
  currency_source: string;
}

interface PaymentPrice {
  amount: number;
  currency: string;
  usdAmount: number | null;
}

/**
 * Fetch price from payment tables when subscription amount is missing.
 * Returns both the raw amount and its USD conversion (if currency is supported).
 */
async function fetchPaymentPrice(subscriptionId: number): Promise<PaymentPrice | null> {
  try {
    // Grab latest payment conversation + info in one round trip
    const paymentInfo = await queryOne<{ paidprice: string | number; currency: string }>(
      `SELECT pi."paidPrice" AS paidprice, pi.currency AS currency
       FROM payment_conversations pc
       JOIN payment_infos pi ON pi.id = pc.paymentinfo_id
       WHERE pc.subscription_id = $1
       ORDER BY pc.id DESC
       LIMIT 1`,
      [subscriptionId]
    );

    if (!paymentInfo?.paidprice) {
      return null;
    }

    const amount = Number(paymentInfo.paidprice);
    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    const normalizedCurrency = normalizeCurrency(paymentInfo.currency) || 'TRY';
    const usdAmount = await convertToUsd(amount, normalizedCurrency);

    return { amount, currency: normalizedCurrency, usdAmount };
  } catch (error) {
    console.error(`[Metrics] Failed to fetch payment price for subscription ${subscriptionId}:`, error);
    return null;
  }
}

const CAMPAIGN_MARGIN_MULTIPLIERS: Record<number, number> = {
  1: 1,
  3: 0.9,
  6: 0.8,
  12: 0.7,
};

function getMarginMultiplier(campaignLength: number): number {
  return CAMPAIGN_MARGIN_MULTIPLIERS[campaignLength] ?? 0.7;
}

export async function calculateMetrics(
  input: MetricsInput
): Promise<MetricsOutput> {
  const lessonPriceUsd = getLessonPriceUsd(input.campaign_minute);
  const totalLessons = input.campaign_lenght * input.per_week * 4;
  const marginMultiplier = getMarginMultiplier(input.campaign_lenght);
  const costUsd = totalLessons * lessonPriceUsd * marginMultiplier;

  let amount = input.subs_amount;
  let currency = normalizeCurrency(input.currency);
  let revenueUsd: number | null = null;

  // If amount is null, try to fetch from payment tables
  if (!amount || !currency) {
    console.log(`[Metrics] Amount/currency null for subscription ${input.subscription_id}, fetching from payment tables`);
    const paymentPrice = await fetchPaymentPrice(input.subscription_id);
    if (paymentPrice) {
      amount = paymentPrice.amount;
      currency = paymentPrice.currency;
      revenueUsd = paymentPrice.usdAmount;
      console.log(`[Metrics] Found payment price: ${amount} ${currency} for subscription ${input.subscription_id}`);
    } else {
      console.warn(`[Metrics] No payment price found for subscription ${input.subscription_id}`);
    }
  }

  if (revenueUsd == null && amount && currency) {
    revenueUsd = await convertToUsd(amount, currency);
  }
  const currencySource = currency || 'UNKNOWN';

  const marginAmountUsd = Math.max((revenueUsd || 0) - costUsd, 0);
  const marginPercent =
    revenueUsd && revenueUsd > 0 ? marginAmountUsd / revenueUsd : 0;

  // Jackpot check
  const usdTryRate = await getUsdTryRate();
  const thresholdUsd = 40000 / usdTryRate;
  const isJackpot =
    (revenueUsd || 0) >= thresholdUsd &&
    input.is_free === 0 &&
    input.payment_channel !== 'Hediye' &&
    ['paid', 'active'].includes(input.status);

  return {
    revenue_usd: revenueUsd,
    cost_usd: costUsd,
    margin_amount_usd: marginAmountUsd,
    margin_percent: marginPercent,
    is_jackpot: isJackpot,
    currency_source: currencySource,
  };
}

/**
 * Generate fingerprint for duplicate detection
 */
export function generateFingerprint(data: {
  user_id: number;
  campaign_id: number;
  created_at: string;
  stripe_sub_id?: string;
  paypal_sub_id?: string;
}): string {
  const crypto = require('crypto');
  const dateHour = new Date(data.created_at).toISOString().slice(0, 13); // truncate to hour

  const fingerprintInput = [
    data.user_id,
    data.campaign_id,
    dateHour,
    data.stripe_sub_id || '',
    data.paypal_sub_id || '',
  ].join('|');

  return crypto.createHash('sha256').update(fingerprintInput).digest('hex');
}

/**
 * Calculate time to sale (TTS)
 */
export function calculateTTS(
  userCreatedAt: string,
  subscriptionCreatedAt: string
): string {
  const userDate = new Date(userCreatedAt);
  const subsDate = new Date(subscriptionCreatedAt);
  const diffMs = subsDate.getTime() - userDate.getTime();

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (diffDays > 0) {
    return `${diffDays}g ${diffHours}s`;
  } else {
    return `${diffHours}s`;
  }
}
