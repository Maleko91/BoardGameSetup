type DangerZoneProps = {
  profileDeleting: boolean;
  profileLoading: boolean;
  onDelete: () => void;
};

export default function DangerZone({
  profileDeleting,
  profileLoading,
  onDelete
}: DangerZoneProps) {
  return (
    <div className="panel profile-danger">
      <div className="profile-danger-row">
        <div>
          <h3>Danger Zone</h3>
          <p>Permanently delete your account and all data.</p>
        </div>
        <button
          type="button"
          className="btn danger"
          onClick={onDelete}
          disabled={profileDeleting || profileLoading}
        >
          {profileDeleting ? "Deleting..." : "Delete account"}
        </button>
      </div>
    </div>
  );
}
