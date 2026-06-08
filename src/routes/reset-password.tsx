import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { TriangleAlert, Lock, CheckCircle } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — BotbaseAI" },
      { name: "description", content: "Set a new password for your BotbaseAI account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery") && hash.includes("access_token=")) {
      setReady(true);
    } else {
      setError("Invalid or expired reset link. Please request a new one.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? accessToken,
        });
        if (sessionError) throw new Error(sessionError.message);
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      setSuccess(true);
      window.location.hash = "";
      setTimeout(() => navigate({ to: "/login" }), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <TriangleAlert className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Supabase not configured</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Set <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> in{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code> to enable authentication.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">← Back to home</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
          {success ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Password reset!</h1>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
                  <Lock className="h-5 w-5 text-primary-foreground" />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Set new password</h1>
                  <p className="text-sm text-muted-foreground">Must be at least 8 characters.</p>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}

              {ready && (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="password">New password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || password.length < 8}
                    className="w-full rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary hover:underline">← Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
