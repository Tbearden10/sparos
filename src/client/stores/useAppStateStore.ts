import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  moveApp: (appName: string, x: number, y: number) => void;
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
  // ...other apps
};

export const useAppStateStore = create<AppState>()(
  persist(
    (set) => ({
      apps: initialApps,
      openApp: (appName: string) =>
        set((state) => ({
          apps: {
            ...state.apps,
            [appName]: { ...state.apps[appName], isOpen: true, isMinimized: false },
          },
        })),
      closeApp: (appName: string) =>
        set((state) => ({
          apps: {
            ...state.apps,
            [appName]: { ...state.apps[appName], isOpen: false },
          },
        })),
      minimizeApp: (appName: string) =>
        set((state) => ({
          apps: {
            ...state.apps,
            [appName]: { ...state.apps[appName], isMinimized: true },
          },
        })),
      maximizeApp: (appName: string) =>
        set((state) => ({
          apps: {
            ...state.apps,
            [appName]: { ...state.apps[appName], isMaximized: true },
          },
        })),
      restoreApp: (appName: string) =>
        set((state) => ({
          apps: {
            ...state.apps,
            [appName]: { ...state.apps[appName], isMinimized: false, isMaximized: false },
          },
        })),
      moveApp: (appName: string, x: number, y: number) =>
        set((state) => ({
          apps: {
            ...state.apps,
            [appName]: { ...state.apps[appName], position: { x, y } },
          },
        })),
      resetAppState: () => ({ apps: initialApps }),
    }),
    {
      name: "app-state",
      partialize: (state) => ({
        apps: {
          ProfileApp: state.apps.ProfileApp
        }
      }),
    }
  )
);