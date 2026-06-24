import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  stripeClient = new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
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

export const DEFAULT_CREDIT_LIMITS: Record<string, number> = {
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

function requirePlanPrice(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const PLAN_AMOUNTS: Record<string, { monthly: number; yearly: number }> = {
  hobby: {
    monthly: requirePlanPrice("NEXT_PUBLIC_PLAN_PRICE_HOBBY_MONTHLY", 32),
    yearly: requirePlanPrice("NEXT_PUBLIC_PLAN_PRICE_HOBBY_YEARLY", 384),
  },
  standard: {
    monthly: requirePlanPrice("NEXT_PUBLIC_PLAN_PRICE_STANDARD_MONTHLY", 120),
    yearly: requirePlanPrice("NEXT_PUBLIC_PLAN_PRICE_STANDARD_YEARLY", 1440),
  },
  pro: {
    monthly: requirePlanPrice("NEXT_PUBLIC_PLAN_PRICE_PRO_MONTHLY", 400),
    yearly: requirePlanPrice("NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY", 4800),
  },
};

export async function getOrCreatePrice(
  stripe: Stripe,
  amount: number,
  interval: "month" | "year",
  planName: string,
): Promise<string> {
  const productName = `BotbaseAI ${planName}`;

  const existingProducts = await stripe.products.search({
    query: `name:"${productName}"`,
  });
  let product = existingProducts.data[0];
  if (!product) {
    product = await stripe.products.create({ name: productName });
  }

  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });
  const match = existingPrices.data.find(
    (p) =>
      p.unit_amount === amount * 100 &&
      p.currency === "usd" &&
      p.recurring?.interval === interval,
  );
  if (match) return match.id;

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount * 100,
    currency: "usd",
    recurring: { interval },
  });
  return price.id;
}
