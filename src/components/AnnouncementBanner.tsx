import { useQuery } from "@tanstack/react-query";
import { getPublicPlatformSettings } from "@/lib/server-functions/settings";
import { X } from "lucide-react";
import { useState } from "react";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["public-platform-settings"],
    queryFn: () => getPublicPlatformSettings(),
    staleTime: 60_000,
  });

  if (
    !settings?.announcement_banner_enabled ||
    !settings.announcement_banner_message ||
    dismissed
  ) {
    return null;
  }

  return (
    <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 px-4 py-2.5 text-sm text-white">
      <span>{settings.announcement_banner_message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
