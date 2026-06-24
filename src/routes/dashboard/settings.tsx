import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { User, CreditCard, Lock, Trash2, Check, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getUserProfile, updateProfile, changePassword, deleteAccount } from "@/lib/server-functions/users";
import { createPortalSession, syncSubscription } from "@/lib/server-functions/stripe";
import { toast } from "sonner";
import type { User as AppUser } from "@/types/database";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BotbaseAI" },
      { name: "description", content: "Manage your BotbaseAI account settings." },
    ],
  }),
  component: AccountSettings,
});

function AccountSettings() {
  const { user: authUser, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loadError, setLoadError] = useState("");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadProfile();
    return () => { mountedRef.current = false; };
  }, []);

  async function loadProfile() {
    try {
      setLoadError("");
      await syncSubscription();
      const p = await getUserProfile();
      if (mountedRef.current) {
        setProfile(p as unknown as AppUser);
        setEditName((p as unknown as AppUser).name ?? "");
      }
    } catch {
      if (mountedRef.current) {
        setLoadError("Failed to load profile.");
        console.error("Failed to load profile");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function handleSaveName() {
    if (!editName.trim()) return;
    setSavingName(true);
    setNameError("");
    setNameSaved(false);
    try {
      await updateProfile({ data: { name: editName.trim() } });
      if (mountedRef.current) {
        setNameSaved(true);
        setProfile(prev => prev ? { ...prev, name: editName.trim() } : prev);
        setTimeout(() => { if (mountedRef.current) setNameSaved(false); }, 2000);
      }
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      if (mountedRef.current) setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError("");
    setPasswordSaved(false);
    try {
      await changePassword({ data: { currentPassword, newPassword } });
      if (mountedRef.current) {
        setPasswordSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => { if (mountedRef.current) setPasswordSaved(false); }, 2000);
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      if (mountedRef.current) setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount();
      await signOut();
      window.location.href = "/";
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  const creditsUsed = profile?.message_credits_used ?? 0;
  const creditsLimit = profile?.message_credits_limit ?? 50;
  const pct = Math.min(100, Math.round((creditsUsed / creditsLimit) * 100));

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-32 animate-pulse rounded bg-secondary" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>

      {loadError && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <span>{loadError}</span>
          <button onClick={() => { setLoadError(""); setLoading(true); loadProfile(); }}
            className="ml-3 shrink-0 rounded-lg bg-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/30">
            Retry
          </button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* Profile */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-foreground">{authUser?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setNameSaved(false); }}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !editName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingName ? "Saving..." : nameSaved ? <><Check className="h-4 w-4" /> Saved</> : "Save"}
                </button>
              </div>
              {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Plan</label>
              <p className="mt-1 text-foreground capitalize">{profile?.plan ?? "free"}</p>
            </div>
          </div>
        </section>

        {/* Usage */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Usage</h2>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Message credits</span>
              <span>{creditsUsed.toLocaleString()} / {creditsLimit.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Link to="/pricing" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Upgrade plan
          </Link>
        </section>

        {/* Billing */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Billing</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium capitalize">{profile?.plan ?? "free"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits</span>
              <span>{creditsLimit.toLocaleString()} / month</span>
            </div>
            <button
              onClick={async () => {
                try {
                  const result = await createPortalSession();
                  if (result.url) window.location.href = result.url;
                } catch {
                  toast.error("Failed to open billing portal");
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" /> Manage billing
            </button>
          </div>
        </section>

        {/* Change Password */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            <button
              type="submit"
              disabled={changingPassword || !currentPassword || newPassword.length < 8}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {changingPassword ? "Changing..." : passwordSaved ? <><Check className="h-4 w-4" /> Changed</> : "Change password"}
            </button>
          </form>
        </section>

        {/* Delete Account */}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="deleteConfirm">
                Type <span className="font-mono text-destructive">DELETE</span> to confirm
              </label>
              <input
                id="deleteConfirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
              />
            </div>
            {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== "DELETE"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : <><Trash2 className="h-4 w-4" /> Delete my account</>}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
