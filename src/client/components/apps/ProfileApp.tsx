import useUserStore from "../../stores/useUserStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useAppStateStore } from "../../stores/useAppStateStore";
import AppWindow from "../AppWindow";

function ProfileApp() {
  const user = useUserStore(state => state.user);
  const { theme, toggleTheme } = useThemeStore();
  const profileApp = useAppStateStore(state => state.apps.ProfileApp);
  const closeApp = useAppStateStore(state => state.closeApp);
  const minimizeApp = useAppStateStore(state => state.minimizeApp);
  const moveApp = useAppStateStore(state => state.moveApp);

  if (!user) return null;

  return (
    <AppWindow
      title="User Profile"
      onClose={() => closeApp("ProfileApp")}
      onMinimize={() => minimizeApp("ProfileApp")}
      isMinimized={profileApp.isMinimized}
      position={profileApp.position}
      onMove={(x: number, y: number) => moveApp("ProfileApp", x, y)}
    >
      <p><strong>Username:</strong> {user.bungieGlobalDisplayName}</p>
      <p><strong>Display Name:</strong> {user.displayName}</p>
      <p><strong>Membership ID:</strong> {user.membershipId}</p>
      <p><strong>Current Theme:</strong> {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </AppWindow>
  );
}

export default ProfileApp;