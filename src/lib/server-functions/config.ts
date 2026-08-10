import { createServerFn } from "@tanstack/react-start";

export const getAppUrl = createServerFn({ method: "GET" }).handler(async () => {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://botbaseai.com").replace(
    /\/+$/,
    "",
  );
});
