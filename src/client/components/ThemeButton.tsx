import { useThemeStore } from "../stores/useThemeStore";
import "../styles/ThemeButton.css";

export default function ThemeButton() {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}