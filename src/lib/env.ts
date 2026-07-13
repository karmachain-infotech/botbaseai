const REQUIRED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const;

const SERVER_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }

  if (typeof window === "undefined") {
    for (const key of SERVER_ENV_VARS) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Missing environment variables: ${missing.join(", ")}. ` +
          "These are required for the application to function.",
      );
    }
    console.warn(
      `Missing environment variables: ${missing.join(", ")}. ` +
        "Some features may not work correctly.",
    );
  }
}
