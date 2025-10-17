import { useAppStateStore } from "../stores/useAppStateStore";
import ProfileApp from "../components/apps/ProfileApp"; // <--- default import
import "../styles/Desktop.css";

function Desktop() {
  const { apps } = useAppStateStore();

  return (
    <div className="desktop">
      {apps.ProfileApp.isOpen && <ProfileApp />}
      
    </div>
  );
}

export default Desktop;