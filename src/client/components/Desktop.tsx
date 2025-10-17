import { useAppStateStore } from "../stores/useAppStateStore";
import useUserStore from "../stores/useUserStore";
import ProfileApp from "../components/apps/ProfileApp"; // <--- default import
import "../styles/Desktop.css";

function Desktop() {
  const { apps } = useAppStateStore();
  const { user, memberships } = useUserStore();

  return (
    <div className="desktop">
      {apps.ProfileApp.isOpen && <ProfileApp />}
      <pre className="desktop-user-raw">{JSON.stringify(user, null, 2)}</pre>
      {memberships && (
        <pre className="desktop-user-raw">{JSON.stringify(memberships, null, 2)}</pre>
      )}
    </div>
  );
}

export default Desktop;