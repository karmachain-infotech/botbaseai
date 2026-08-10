import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "../supabase/admin";
import { handleServerError } from "../errors";

export const DEFAULT_CREDIT_LIMITS: Record<string, number> = {
  free: 50,
  hobby: 500,
  standard: 4000,
  pro: 15000,
  enterprise: 999999,
};

export async function getCreditLimits(): Promise<Record<string, number>> {
  try {
    const admin = getAdminClient();
    const { data } = await admin
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "default_free_credits",
        "default_hobby_credits",
        "default_standard_credits",
        "default_pro_credits",
        "default_enterprise_credits",
      ]);

    if (data && data.length > 0) {
      const limits = { ...DEFAULT_CREDIT_LIMITS };
      for (const row of data as Array<{ key: string; value: unknown }>) {
        const plan = row.key.replace("default_", "").replace("_credits", "");
        const val = row.value;
        if (typeof val === "number") {
          limits[plan] = val;
        }
      }
      return limits;
    }
  } catch (err) {
    console.error("[getCreditLimits] Failed to fetch, using defaults:", err);
  }
  return { ...DEFAULT_CREDIT_LIMITS };
}

export interface PublicPlatformSettings {
  platform_name: string;
  platform_logo: string | null;
  maintenance_mode: boolean;
  announcement_banner_enabled: boolean;
  announcement_banner_message: string;
  feature_allow_export: boolean;
  feature_allow_team: boolean;
  feature_allow_custom_domain: boolean;
}

export const getPublicPlatformSettings = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const admin = getAdminClient();
    const { data } = await admin.from("platform_settings").select("key, value");

    const defaults: PublicPlatformSettings = {
      platform_name: "BotbaseAI",
      platform_logo: null,
      maintenance_mode: false,
      announcement_banner_enabled: false,
      announcement_banner_message: "",
      feature_allow_export: true,
      feature_allow_team: false,
      feature_allow_custom_domain: false,
    };

    if (!data) return defaults;

    const map: Record<string, unknown> = {};
    for (const row of data as Array<{ key: string; value: unknown }>) {
      map[row.key] = row.value;
    }

    return {
      platform_name: (map.platform_name as string) ?? defaults.platform_name,
      platform_logo:
        (map.platform_logo as string | null) ?? defaults.platform_logo,
      maintenance_mode:
        map.maintenance_mode === true || map.maintenance_mode === "true",
      announcement_banner_enabled:
        map.announcement_banner_enabled === true ||
        map.announcement_banner_enabled === "true",
      announcement_banner_message:
        (map.announcement_banner_message as string) ??
        defaults.announcement_banner_message,
      feature_allow_export:
        map.feature_allow_export === true ||
        map.feature_allow_export === "true",
      feature_allow_team:
        map.feature_allow_team === true || map.feature_allow_team === "true",
      feature_allow_custom_domain:
        map.feature_allow_custom_domain === true ||
        map.feature_allow_custom_domain === "true",
    };
  } catch (error) {
    throw handleServerError(error, "getPublicPlatformSettings");
  }
});

export async function getWebhookUrl(): Promise<string> {
  try {
    const admin = getAdminClient();
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "webhook_notification_url")
      .single();

    const row = data as { value: unknown } | null;
    if (row && typeof row.value === "string" && row.value) {
      return row.value;
    }
  } catch {
    // ignore
  }
  return "";
}

export async function fireNotificationWebhook(
  event: string,
  payload: Record<string, unknown>,
) {
  const url = await getWebhookUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        data: payload,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("[fireNotificationWebhook] Failed to send webhook:", err);
  }
}
