import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseReady } from "../lib/supabase";
import { useSession } from "../context/SessionContext";

type UserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const PROFILE_SELECT =
  "id, email, display_name, is_admin, created_at, updated_at";

export default function ProfilePage() {
  const { session, authLoading } = useSession();
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNameTouched, setProfileNameTouched] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDeleting, setProfileDeleting] = useState(false);
  const authTabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!session) {
      setUserProfile(null);
      setProfileName("");
      setProfileNameTouched(false);
      setProfileError("");
      setProfileNotice("");
      setProfileDeleting(false);
      return;
    }
    setProfileError("");
    setProfileNotice("");
    setProfileNameTouched(false);
    setProfileDeleting(false);
    setAuthPassword("");
  }, [session]);

  useEffect(() => {
    if (profileNameTouched) {
      return;
    }
    const displayName =
      userProfile?.display_name ??
      session?.user?.user_metadata?.display_name ??
      session?.user?.user_metadata?.full_name ??
      "";
    setProfileName(displayName);
  }, [profileNameTouched, session, userProfile]);

  useEffect(() => {
    const client = supabase;
    if (!supabaseReady || !client) {
      setProfileLoading(false);
      return;
    }
    if (!session?.user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    setProfileError("");

    const userId = session.user.id;
    const userEmail = session.user.email ?? null;
    const fallbackName =
      session.user.user_metadata?.display_name ??
      session.user.user_metadata?.full_name ??
      null;

    const loadProfile = async () => {
      const { data, error } = await client
        .from("users")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .maybeSingle();

      if (!active) {
        return;
      }
      if (error) {
        setProfileError(error.message);
        setProfileLoading(false);
        return;
      }
      if (data) {
        setUserProfile(data);
        setProfileLoading(false);
        return;
      }

      const { data: created, error: createError } = await client
        .from("users")
        .upsert(
          {
            id: userId,
            email: userEmail,
            display_name: fallbackName
          },
          { onConflict: "id" }
        )
        .select(PROFILE_SELECT)
        .single();

      if (!active) {
        return;
      }
      if (createError) {
        setProfileError(createError.message);
        setProfileLoading(false);
        return;
      }
      setUserProfile(created);
      setProfileLoading(false);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasRecoveryFlag =
      searchParams.get("reset") === "1" ||
      searchParams.get("type") === "recovery" ||
      window.location.hash.includes("type=recovery");
    if (hasRecoveryFlag) {
      setRecoveryMode(true);
    }
  }, []);

  const updateAuthHighlight = useCallback((target: HTMLElement | null) => {
    const tabs = authTabsRef.current;
    if (!tabs) {
      return;
    }
    if (!target) {
      tabs.style.setProperty("--auth-highlight-opacity", "0");
      return;
    }
    const tabsRect = tabs.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const left = targetRect.left - tabsRect.left;
    tabs.style.setProperty("--auth-highlight-left", `${left}px`);
    tabs.style.setProperty("--auth-highlight-width", `${targetRect.width}px`);
    tabs.style.setProperty("--auth-highlight-opacity", "1");
  }, []);

  const resetAuthHighlight = useCallback(() => {
    const tabs = authTabsRef.current;
    if (!tabs) {
      return;
    }
    const active = tabs.querySelector<HTMLElement>(".auth-tab.active");
    updateAuthHighlight(active);
  }, [updateAuthHighlight]);

  useLayoutEffect(() => {
    if (session || authLoading) {
      return;
    }
    resetAuthHighlight();
  }, [authLoading, authMode, resetAuthHighlight, session]);

  useEffect(() => {
    const handleResize = () => {
      resetAuthHighlight();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetAuthHighlight]);

  const profileEmail = useMemo(
    () => userProfile?.email ?? session?.user?.email ?? "",
    [session, userProfile]
  );
  const isAdmin = Boolean(userProfile?.is_admin);
  const fallbackName = useMemo(() => {
    const displayName =
      userProfile?.display_name ??
      session?.user?.user_metadata?.display_name ??
      session?.user?.user_metadata?.full_name ??
      "";
    const trimmed = displayName.trim();
    if (trimmed) {
      return trimmed;
    }
    if (profileEmail) {
      return profileEmail.split("@")[0] ?? "Player";
    }
    return "Player";
  }, [profileEmail, session, userProfile]);
  const profileNamePreview = profileName.trim() || fallbackName;
  const avatarInitial = profileNamePreview.charAt(0).toUpperCase() || "P";

  const clearRecoveryParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    url.searchParams.delete("type");
    url.hash = "";
    window.history.replaceState(null, "", url.pathname + url.search);
  };

  const handleAuthModeChange = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthError("");
    setAuthNotice("");
    if (mode === "login") {
      setAuthDisplayName("");
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

    if (!supabaseReady || !supabase) {
      setAuthError("Missing Supabase configuration.");
      return;
    }

    const email = authEmail.trim();
    const password = authPassword;
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          throw error;
        }
        setAuthNotice("Signed in.");
      } else {
        const displayName = authDisplayName.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: displayName ? { data: { display_name: displayName } } : undefined
        });
        if (error) {
          throw error;
        }
        if (data.session) {
          setAuthNotice("Account created.");
        } else {
          setAuthNotice("Check your email to confirm your account.");
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setAuthError("");
    setAuthNotice("");
    if (!supabaseReady || !supabase) {
      setAuthError("Missing Supabase configuration.");
      return;
    }
    const email = authEmail.trim();
    if (!email) {
      setAuthError("Enter your email to receive a reset link.");
      return;
    }
    setResetSending(true);
    try {
      const baseUrl = import.meta.env.BASE_URL ?? "/";
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      const redirectUrl = new URL(`${normalizedBase}profile`, window.location.origin);
      redirectUrl.searchParams.set("reset", "1");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl.toString()
      });
      if (error) {
        throw error;
      }
      setAuthNotice("Check your email for a reset link.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setResetSending(false);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecoveryError("");
    setRecoveryNotice("");
    if (!supabaseReady || !supabase) {
      setRecoveryError("Missing Supabase configuration.");
      return;
    }
    if (!session) {
      setRecoveryError("Reset link expired or invalid.");
      return;
    }
    if (!recoveryPassword || recoveryPassword.length < 8) {
      setRecoveryError("Password must be at least 8 characters.");
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setRecoveryError("Passwords do not match.");
      return;
    }
    setRecoverySaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: recoveryPassword
      });
      if (error) {
        throw error;
      }
      setRecoveryNotice("Password updated.");
      setRecoveryPassword("");
      setRecoveryConfirm("");
      setRecoveryMode(false);
      clearRecoveryParams();
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : String(err));
    } finally {
      setRecoverySaving(false);
    }
  };

  const handleCancelRecovery = () => {
    setRecoveryMode(false);
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setRecoveryError("");
    setRecoveryNotice("");
    setAuthMode("login");
    clearRecoveryParams();
  };

  const handleSignOut = async () => {
    setAuthError("");
    setAuthNotice("");
    if (!supabaseReady || !supabase) {
      setAuthError("Missing Supabase configuration.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthMode("login");
    setAuthNotice("Signed out.");
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");

    if (!supabaseReady || !supabase) {
      setProfileError("Missing Supabase configuration.");
      return;
    }
    if (!session?.user) {
      setProfileError("No active session.");
      return;
    }

    const displayName = profileName.trim();
    const currentName = userProfile?.display_name ?? "";
    if (displayName === currentName) {
      setProfileNotice("No changes to save.");
      return;
    }

    setProfileSaving(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            id: session.user.id,
            email: session.user.email ?? userProfile?.email ?? null,
            display_name: displayName || null
          },
          { onConflict: "id" }
        )
        .select(PROFILE_SELECT)
        .single();
      if (error) {
        throw error;
      }
      setUserProfile(data);
      setProfileNameTouched(false);

      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName || null }
      });
      if (authError) {
        setProfileNotice("Profile saved, but auth metadata failed to update.");
        return;
      }
      setProfileNotice("Profile updated.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setProfileError("");
    setProfileNotice("");
    setAuthNotice("");

    if (!supabaseReady || !supabase) {
      setProfileError("Missing Supabase configuration.");
      return;
    }
    if (!session?.user) {
      setProfileError("No active session.");
      return;
    }

    const confirmed = window.confirm(
      "This will permanently delete your account and profile. This cannot be undone. Continue?"
    );
    if (!confirmed) {
      return;
    }

    setProfileDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_account");
      if (error) {
        throw error;
      }
      await supabase.auth.signOut();
      setUserProfile(null);
      setAuthNotice("Account deleted.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setProfileDeleting(false);
    }
  };

  return (
    <section className="stage">
      {!supabaseReady && (
        <div className="status error">Missing Supabase configuration.</div>
      )}
      {supabaseReady && authLoading && (
        <div className="status">Checking session...</div>
      )}
      {supabaseReady && !authLoading && recoveryMode && (
        <div className="panel auth-panel">
          <div className="auth-header">
            <div>
              <h2>Reset password</h2>
              <p className="hint">Enter a new password for your account.</p>
            </div>
          </div>
          <form className="auth-form" onSubmit={handleRecoverySubmit}>
            <label className="form-field">
              <span>New password</span>
              <input
                type="password"
                value={recoveryPassword}
                onChange={(event) => setRecoveryPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="form-field">
              <span>Confirm password</span>
              <input
                type="password"
                value={recoveryConfirm}
                onChange={(event) => setRecoveryConfirm(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <div className="auth-actions">
              <button type="button" className="btn ghost" onClick={handleCancelRecovery}>
                Back to sign in
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={recoverySaving || !session}
              >
                {recoverySaving ? "Saving..." : "Save new password"}
              </button>
            </div>
          </form>
          {!session && (
            <div className="status error">
              Reset link expired or invalid. Request a new one.
            </div>
          )}
          {recoveryError && <div className="status error">{recoveryError}</div>}
          {recoveryNotice && <div className="status">{recoveryNotice}</div>}
        </div>
      )}
      {supabaseReady && !authLoading && !recoveryMode && session && (
        <div className="profile-stage">
          <div className="profile-hero">
            <div className="profile-avatar" aria-hidden="true">
              <span>{avatarInitial}</span>
            </div>
            <div className="profile-identity">
              <div className="profile-name">{profileNamePreview}</div>
              <div className="profile-email">{profileEmail}</div>
            </div>
          </div>

          <div className="panel profile-settings">
            <div className="profile-settings-header">
              <div>
                <h2>Profile Settings</h2>
                <p>Manage your account preferences</p>
              </div>
            </div>
            {profileLoading && <div className="status">Loading profile...</div>}
            <form
              className="profile-form profile-settings-form"
              onSubmit={handleProfileSave}
            >
              <label className="form-field">
                <span>Display name</span>
                <input
                  type="text"
                  value={profileName}
                  onChange={(event) => {
                    setProfileName(event.target.value);
                    setProfileNameTouched(true);
                  }}
                  placeholder="Add a display name"
                  autoComplete="name"
                />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  value={profileEmail}
                  readOnly
                  aria-readonly="true"
                />
              </label>
              <div className="profile-settings-actions">
                <button
                  type="button"
                  className="btn ghost profile-outline"
                  onClick={handleSignOut}
                  disabled={profileSaving || profileLoading || profileDeleting}
                >
                  Sign out
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={profileSaving || profileLoading || profileDeleting}
                >
                  {profileSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
            {profileError && <div className="status error">{profileError}</div>}
            {profileNotice && <div className="status">{profileNotice}</div>}
          </div>

          {isAdmin && (
            <div className="panel profile-admin">
              <div className="profile-admin-header">
                <span className="profile-admin-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation">
                    <path
                      d="M12 3l7 3v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <div>
                  <h3>Admin Access</h3>
                  <p>You have administrator privileges.</p>
                </div>
              </div>
              <p className="profile-admin-copy">
                Manage the game library, expansions, and setup steps.
              </p>
              <Link className="btn ghost profile-outline" to="/admin">
                Go to Admin Console
              </Link>
            </div>
          )}

          <div className="panel profile-danger">
            <div className="profile-danger-row">
              <div>
                <h3>Danger Zone</h3>
                <p>Permanently delete your account and all data.</p>
              </div>
              <button
                type="button"
                className="btn danger"
                onClick={handleDeleteAccount}
                disabled={profileDeleting || profileLoading}
              >
                {profileDeleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
      {supabaseReady && !authLoading && !recoveryMode && !session && (
        <div className="panel auth-panel">
          <div className="auth-header">
            <div className="auth-tabs" ref={authTabsRef}>
              <span className="auth-highlight" aria-hidden="true" />
              <button
                type="button"
                className={authMode === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => handleAuthModeChange("login")}
                aria-pressed={authMode === "login"}
              >
                Sign in
              </button>
              <button
                type="button"
                className={authMode === "signup" ? "auth-tab active" : "auth-tab"}
                onClick={() => handleAuthModeChange("signup")}
                aria-pressed={authMode === "signup"}
              >
                Create account
              </button>
            </div>
            <p className="hint">
              Sign in to save your profile settings across devices.
            </p>
          </div>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <label className="form-field">
                <span>Display name (optional)</span>
                <input
                  type="text"
                  value={authDisplayName}
                  onChange={(event) => setAuthDisplayName(event.target.value)}
                  placeholder="How should we call you?"
                  autoComplete="name"
                />
              </label>
            )}
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>
            <div className={authMode === "login" ? "auth-actions" : "auth-actions single"}>
              {authMode === "login" && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handlePasswordResetRequest}
                  disabled={resetSending}
                >
                  {resetSending ? "Sending..." : "Reset password"}
                </button>
              )}
              <button
                type="submit"
                className="btn primary"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? "Working..."
                  : authMode === "login"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </div>
          </form>
          {authError && <div className="status error">{authError}</div>}
          {authNotice && <div className="status">{authNotice}</div>}
        </div>
      )}
    </section>
  );
}
