import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseReady } from "../lib/supabase";
import { useSession } from "../context/SessionContext";
import AuthForm, { type AuthMode } from "./profile/AuthForm";
import RecoveryForm from "./profile/RecoveryForm";
import ProfileSettings from "./profile/ProfileSettings";
import DangerZone from "./profile/DangerZone";

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
  const [authMode, setAuthMode] = useState<AuthMode>("login");
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

  const handleAuthModeChange = (mode: AuthMode) => {
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
        <div className="status error" role="alert">
          Missing Supabase configuration.
        </div>
      )}
      {supabaseReady && authLoading && (
        <div className="status" role="status" aria-live="polite">
          Checking session...
        </div>
      )}
      {supabaseReady && !authLoading && recoveryMode && (
        <RecoveryForm
          recoveryPassword={recoveryPassword}
          recoveryConfirm={recoveryConfirm}
          recoverySaving={recoverySaving}
          recoveryError={recoveryError}
          recoveryNotice={recoveryNotice}
          hasSession={Boolean(session)}
          onPasswordChange={setRecoveryPassword}
          onConfirmChange={setRecoveryConfirm}
          onCancel={handleCancelRecovery}
          onSubmit={handleRecoverySubmit}
        />
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

          <ProfileSettings
            profileLoading={profileLoading}
            profileName={profileName}
            profileEmail={profileEmail}
            profileSaving={profileSaving}
            profileDeleting={profileDeleting}
            profileError={profileError}
            profileNotice={profileNotice}
            onProfileNameChange={(value) => {
              setProfileName(value);
              setProfileNameTouched(true);
            }}
            onProfileSave={handleProfileSave}
            onSignOut={handleSignOut}
          />

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

          <DangerZone
            profileDeleting={profileDeleting}
            profileLoading={profileLoading}
            onDelete={handleDeleteAccount}
          />
        </div>
      )}
      {supabaseReady && !authLoading && !recoveryMode && !session && (
        <AuthForm
          authMode={authMode}
          authEmail={authEmail}
          authPassword={authPassword}
          authDisplayName={authDisplayName}
          authSubmitting={authSubmitting}
          resetSending={resetSending}
          authError={authError}
          authNotice={authNotice}
          onAuthModeChange={handleAuthModeChange}
          onAuthEmailChange={setAuthEmail}
          onAuthPasswordChange={setAuthPassword}
          onAuthDisplayNameChange={setAuthDisplayName}
          onAuthSubmit={handleAuthSubmit}
          onPasswordReset={handlePasswordResetRequest}
        />
      )}
    </section>
  );
}
