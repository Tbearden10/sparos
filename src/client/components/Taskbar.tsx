import { useAppStateStore } from "../stores/useAppStateStore";
import "../styles/Taskbar.css";

const UserSVG = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Profile">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20c0-4 8-4 8-4s8 0 8 4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

function Taskbar() {
  const { apps, openApp, restoreApp } = useAppStateStore();

  return (
    <div className="taskbar">
      <button
        className={`taskbar-icon${apps.ProfileApp.isOpen ? " active" : ""}`}
        title="Profile App"
        onClick={() => {
          apps.ProfileApp.isOpen ? restoreApp("ProfileApp") : openApp("ProfileApp");
        }}
      >
        {UserSVG}
      </button>
    </div>
  );
}

export default Taskbar;