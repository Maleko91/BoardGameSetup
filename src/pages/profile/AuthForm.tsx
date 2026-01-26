import { useCallback, useEffect, useLayoutEffect, useRef, type FormEvent } from "react";

export type AuthMode = "login" | "signup";

type AuthFormProps = {
  authMode: AuthMode;
  authEmail: string;
  authPassword: string;
  authDisplayName: string;
  authSubmitting: boolean;
  resetSending: boolean;
  authError: string;
  authNotice: string;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthDisplayNameChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordReset: () => void;
};

export default function AuthForm({
  authMode,
  authEmail,
  authPassword,
  authDisplayName,
  authSubmitting,
  resetSending,
  authError,
  authNotice,
  onAuthModeChange,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthDisplayNameChange,
  onAuthSubmit,
  onPasswordReset
}: AuthFormProps) {
  const authTabsRef = useRef<HTMLDivElement | null>(null);

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
    resetAuthHighlight();
  }, [authMode, resetAuthHighlight]);

  useEffect(() => {
    const handleResize = () => {
      resetAuthHighlight();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetAuthHighlight]);

  return (
    <div className="panel auth-panel">
      <div className="auth-header">
        <div className="auth-tabs" ref={authTabsRef}>
          <span className="auth-highlight" aria-hidden="true" />
          <button
            type="button"
            className={authMode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => onAuthModeChange("login")}
            aria-pressed={authMode === "login"}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => onAuthModeChange("signup")}
            aria-pressed={authMode === "signup"}
          >
            Create account
          </button>
        </div>
        <p className="hint">Sign in to save your profile settings across devices.</p>
      </div>
      <form className="auth-form" onSubmit={onAuthSubmit}>
        {authMode === "signup" && (
          <label className="form-field">
            <span>Display name (optional)</span>
            <input
              type="text"
              value={authDisplayName}
              onChange={(event) => onAuthDisplayNameChange(event.target.value)}
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
            onChange={(event) => onAuthEmailChange(event.target.value)}
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
            onChange={(event) => onAuthPasswordChange(event.target.value)}
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            required
          />
        </label>
        <div className={authMode === "login" ? "auth-actions" : "auth-actions single"}>
          {authMode === "login" && (
            <button
              type="button"
              className="btn ghost"
              onClick={onPasswordReset}
              disabled={resetSending}
            >
              {resetSending ? "Sending..." : "Reset password"}
            </button>
          )}
          <button type="submit" className="btn primary" disabled={authSubmitting}>
            {authSubmitting
              ? "Working..."
              : authMode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </div>
      </form>
      {authError && (
        <div className="status error" role="alert">
          {authError}
        </div>
      )}
      {authNotice && (
        <div className="status" role="status" aria-live="polite">
          {authNotice}
        </div>
      )}
    </div>
  );
}
