import { type FormEvent } from "react";

type RecoveryFormProps = {
  recoveryPassword: string;
  recoveryConfirm: string;
  recoverySaving: boolean;
  recoveryError: string;
  recoveryNotice: string;
  hasSession: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function RecoveryForm({
  recoveryPassword,
  recoveryConfirm,
  recoverySaving,
  recoveryError,
  recoveryNotice,
  hasSession,
  onPasswordChange,
  onConfirmChange,
  onCancel,
  onSubmit
}: RecoveryFormProps) {
  return (
    <div className="panel auth-panel">
      <div className="auth-header">
        <div>
          <h2>Reset password</h2>
          <p className="hint">Enter a new password for your account.</p>
        </div>
      </div>
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="form-field">
          <span>New password</span>
          <input
            type="password"
            value={recoveryPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="form-field">
          <span>Confirm password</span>
          <input
            type="password"
            value={recoveryConfirm}
            onChange={(event) => onConfirmChange(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <div className="auth-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Back to sign in
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={recoverySaving || !hasSession}
          >
            {recoverySaving ? "Saving..." : "Save new password"}
          </button>
        </div>
      </form>
      {!hasSession && (
        <div className="status error" role="alert">
          Reset link expired or invalid. Request a new one.
        </div>
      )}
      {recoveryError && (
        <div className="status error" role="alert">
          {recoveryError}
        </div>
      )}
      {recoveryNotice && (
        <div className="status" role="status" aria-live="polite">
          {recoveryNotice}
        </div>
      )}
    </div>
  );
}
