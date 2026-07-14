import posthog from "posthog-js";

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // PostHog
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }

  // GA4 (gtag)
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (gaId && typeof window.gtag === "function") {
    window.gtag("event", event, properties);
  }
}
