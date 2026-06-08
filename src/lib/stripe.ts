import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  stripeClient = new Stripe(key, {
    apiVersion: "2025-03-31",
  });
  return stripeClient;
}

export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set");
  }
  return key;
}

function requirePriceId(key: string, label: string): string {
  const val = process.env[key];
  if (!val) {
    console.warn(`Missing environment variable ${key} (${label})`);
    return "";
  }
  return val;
}

export const PRICE_IDS = {
  hobby: {
    monthly: requirePriceId("NEXT_PUBLIC_STRIPE_PRICE_HOBBY_MONTHLY", "Hobby Monthly"),
    yearly: requirePriceId("NEXT_PUBLIC_STRIPE_PRICE_HOBBY_YEARLY", "Hobby Yearly"),
  },
  standard: {
    monthly: requirePriceId("NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY", "Standard Monthly"),
    yearly: requirePriceId("NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY", "Standard Yearly"),
  },
  pro: {
    monthly: requirePriceId("NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY", "Pro Monthly"),
    yearly: requirePriceId("NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY", "Pro Yearly"),
  },
} as const;

export const CREDIT_LIMITS: Record<string, number> = {
  free: 50,
  hobby: 500,
  standard: 4000,
  pro: 15000,
  enterprise: 999999,
};

export function getPlanFromPriceId(priceId: string): string {
  const all = Object.entries(PRICE_IDS);
  for (const [plan, variants] of all) {
    if (Object.values(variants).includes(priceId)) return plan;
  }
  return "free";
}
