import { useEffect } from "react";
import { useThemeStore } from "./stores/useThemeStore";
import { useAppStateStore } from "./stores/useAppStateStore";
import Desktop from "./components/Desktop";
import Taskbar from "./components/Taskbar";
import SearchBar from "./components/SearchBar";
import useUserStore from "./stores/useUserStore";
import "./styles/index.css";

function Sparos() {
  const { user } = useUserStore();
  const { theme } = useThemeStore();
  const resetAppState = useAppStateStore(state => state.resetAppState);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  // Reset app state when user logs in
  useEffect(() => {
    if (user) resetAppState();
  }, [user, resetAppState]);

  return (
    <>
      {!user ? (
        <div className="page-layout login-screen">
          <div className="login-header">
            <h1>sparOS</h1>
          </div>
          <SearchBar />
        </div>
      ) : (
        <div className="page-layout">
          <Taskbar />
          <Desktop />
        </div>
      )}
    </>
  );
}

export default Sparos;