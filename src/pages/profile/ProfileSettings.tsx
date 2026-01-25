import { type FormEvent } from "react";

type ProfileSettingsProps = {
  profileLoading: boolean;
  profileName: string;
  profileEmail: string;
  profileSaving: boolean;
  profileDeleting: boolean;
  profileError: string;
  profileNotice: string;
  onProfileNameChange: (value: string) => void;
  onProfileSave: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
};

export default function ProfileSettings({
  profileLoading,
  profileName,
  profileEmail,
  profileSaving,
  profileDeleting,
  profileError,
  profileNotice,
  onProfileNameChange,
  onProfileSave,
  onSignOut
}: ProfileSettingsProps) {
  return (
    <div className="panel profile-settings">
      <div className="profile-settings-header">
        <div>
          <h2>Profile Settings</h2>
          <p>Manage your account preferences</p>
        </div>
      </div>
      {profileLoading && (
        <div className="status" role="status" aria-live="polite">
          Loading profile...
        </div>
      )}
      <form className="profile-form profile-settings-form" onSubmit={onProfileSave}>
        <label className="form-field">
          <span>Display name</span>
          <input
            type="text"
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            placeholder="Add a display name"
            autoComplete="name"
          />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input type="email" value={profileEmail} readOnly aria-readonly="true" />
        </label>
        <div className="profile-settings-actions">
          <button
            type="button"
            className="btn ghost profile-outline"
            onClick={onSignOut}
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
      {profileError && (
        <div className="status error" role="alert">
          {profileError}
        </div>
      )}
      {profileNotice && (
        <div className="status" role="status" aria-live="polite">
          {profileNotice}
        </div>
      )}
    </div>
  );
}
