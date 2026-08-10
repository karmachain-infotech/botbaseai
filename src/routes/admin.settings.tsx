import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminGetSettings,
  adminUpdateSetting,
} from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Mail,
  Webhook,
  Palette,
  ToggleLeft,
} from "lucide-react";

interface SettingsData {
  platform_name: string;
  platform_logo: string | null;
  announcement_banner_message: string;
  announcement_banner_enabled: boolean;
  webhook_notification_url: string;
  default_free_credits: number;
  default_hobby_credits: number;
  default_standard_credits: number;
  default_pro_credits: number;
  default_enterprise_credits: number;
  feature_allow_export: boolean;
  feature_allow_team: boolean;
  feature_allow_custom_domain: boolean;
  maintenance_mode: boolean | { enabled: boolean; message: string };
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Partial<SettingsData>>({});
  const loadedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminGetSettings(),
  });

  useEffect(() => {
    if (data && !loadedRef.current) {
      setLocalSettings(data as Partial<SettingsData>);
      loadedRef.current = true;
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (vars: { key: string; value: string | number | boolean }) =>
      adminUpdateSetting({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Setting saved");
    },
    onError: () => toast.error("Failed to save setting"),
  });

  const debouncedSave = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {} as Record<string, ReturnType<typeof setTimeout>>,
  );

  function updateAndSave(
    key: string,
    value: string | number | boolean,
    delay = 600,
  ) {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    if (debouncedSave.current[key]) clearTimeout(debouncedSave.current[key]);
    debouncedSave.current[key] = setTimeout(() => {
      updateMutation.mutate({ key, value });
    }, delay);
  }

  function toggleAndSave(key: string) {
    const next = !(localSettings as Record<string, unknown>)[key];
    setLocalSettings((prev) => ({ ...prev, [key]: next }));
    updateMutation.mutate({ key, value: next });
  }

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure global platform settings and feature flags.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Section icon={Palette} title="General">
          <SettingRow label="Platform Name">
            <input
              type="text"
              value={localSettings.platform_name ?? "BotbaseAI"}
              onChange={(e) => updateAndSave("platform_name", e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
            />
          </SettingRow>
          <SettingRow label="Platform Logo URL">
            <input
              type="text"
              value={localSettings.platform_logo ?? ""}
              onChange={(e) => updateAndSave("platform_logo", e.target.value)}
              placeholder="/logos.svg"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
            />
          </SettingRow>
        </Section>

        <Section icon={Shield} title="Default Plan Limits (messages/month)">
          {["free", "hobby", "standard", "pro", "enterprise"].map((plan) => {
            const key = `default_${plan}_credits`;
            return (
              <SettingRow
                key={plan}
                label={plan.charAt(0).toUpperCase() + plan.slice(1)}
              >
                <input
                  type="number"
                  value={String(
                    (localSettings as Record<string, unknown>)[key] ?? "",
                  )}
                  onChange={(e) => updateAndSave(key, Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
                />
              </SettingRow>
            );
          })}
        </Section>

        <Section icon={ToggleLeft} title="Feature Flags">
          {[
            { key: "feature_allow_export", label: "Allow Data Export" },
            { key: "feature_allow_team", label: "Team Collaboration" },
            { key: "feature_allow_custom_domain", label: "Custom Domains" },
          ].map((f) => (
            <SettingRow key={f.key} label={f.label}>
              <Toggle
                enabled={!!(localSettings as Record<string, unknown>)[f.key]}
                onClick={() => toggleAndSave(f.key)}
              />
            </SettingRow>
          ))}
        </Section>

        <Section icon={Bell} title="Announcement Banner">
          <SettingRow label="Enable Banner">
            <Toggle
              enabled={!!localSettings.announcement_banner_enabled}
              onClick={() => toggleAndSave("announcement_banner_enabled")}
            />
          </SettingRow>
          <SettingRow label="Banner Message">
            <input
              type="text"
              value={localSettings.announcement_banner_message ?? ""}
              onChange={(e) =>
                updateAndSave("announcement_banner_message", e.target.value)
              }
              placeholder="We're experiencing higher than normal traffic..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
            />
          </SettingRow>
        </Section>

        <Section icon={Shield} title="Maintenance Mode">
          <SettingRow label="Enable Maintenance Mode">
            <Toggle
              enabled={!!localSettings.maintenance_mode}
              onClick={() => toggleAndSave("maintenance_mode")}
              color="red"
            />
          </SettingRow>
        </Section>

        <Section icon={Mail} title="SMTP Settings">
          {[
            { key: "smtp_host", label: "SMTP Host" },
            { key: "smtp_port", label: "SMTP Port" },
            { key: "smtp_user", label: "SMTP Username" },
            { key: "smtp_pass", label: "SMTP Password", type: "password" },
            { key: "smtp_from", label: "SMTP From Email", type: "text" },
          ].map((f) => (
            <SettingRow key={f.key} label={f.label}>
              <input
                type={f.type || "text"}
                value={
                  ((localSettings as Record<string, unknown>)[f.key] ??
                    "") as string
                }
                onChange={(e) => updateAndSave(f.key, e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
              />
            </SettingRow>
          ))}
        </Section>

        <Section icon={Webhook} title="Webhook URL">
          <SettingRow label="Notification Webhook">
            <input
              type="text"
              value={localSettings.webhook_notification_url ?? ""}
              onChange={(e) =>
                updateAndSave("webhook_notification_url", e.target.value)
              }
              placeholder="https://hooks.example.com/notify"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
            />
          </SettingRow>
        </Section>
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onClick,
  color = "green",
}: {
  enabled: boolean;
  onClick: () => void;
  color?: string;
}) {
  const colors: Record<string, string> = {
    green: "bg-green-600",
    red: "bg-red-600",
  };
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? colors[color] : "bg-zinc-700"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-zinc-400">{label}</label>
      <div className="w-64">{children}</div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 bg-zinc-800" />
      <div className="mt-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
