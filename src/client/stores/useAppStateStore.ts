import { create } from "zustand";

type AppWindowState = {
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
};

type AppsMap = {
  [key: string]: AppWindowState;
};

interface AppState {
  apps: AppsMap;
  openApp: (appName: string) => void;
  closeApp: (appName: string) => void;
  minimizeApp: (appName: string) => void;
  maximizeApp: (appName: string) => void;
  restoreApp: (appName: string) => void;
  resetAppState: () => void;
}

const initialApps: AppsMap = {
  ProfileApp: {
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
  },
  // Add other apps here as needed
};

export const useAppStateStore = create<AppState>((set) => ({
  apps: initialApps,
  openApp: (appName: string) =>
    set((state) => {
      console.log("[openApp]", appName, state.apps[appName]);
      return {
        apps: {
          ...state.apps,
          [appName]: { ...state.apps[appName], isOpen: true, isMinimized: false },
        },
      };
    }),
  closeApp: (appName: string) =>
    set((state) => {
      console.log("[closeApp]", appName, state.apps[appName]);
      return {
        apps: {
          ...state.apps,
          [appName]: { ...state.apps[appName], isOpen: false },
        },
      };
    }),
  minimizeApp: (appName: string) =>
    set((state) => {
      console.log("[minimizeApp]", appName, state.apps[appName]);
      return {
        apps: {
          ...state.apps,
          [appName]: { ...state.apps[appName], isMinimized: true },
        },
      };
    }),
  maximizeApp: (appName: string) =>
    set((state) => {
      console.log("[maximizeApp]", appName, state.apps[appName]);
      return {
        apps: {
          ...state.apps,
          [appName]: { ...state.apps[appName], isMaximized: true },
        },
      };
    }),
  restoreApp: (appName: string) =>
    set((state) => {
      console.log("[restoreApp]", appName, state.apps[appName]);
      return {
        apps: {
          ...state.apps,
          [appName]: { ...state.apps[appName], isMinimized: false, isMaximized: false },
        },
      };
    }),
  resetAppState: () => {
    console.log("[resetAppState]", initialApps);
    return { apps: initialApps };
  },
}));