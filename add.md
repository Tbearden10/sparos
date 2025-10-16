# **Comprehensive Setup Guide**

This guide provides the full setup for your app, including **global CSS**, **login screen**, **desktop environment**, **taskbar**, **Profile/Settings App**, and the **Activity Store**.  
**UPDATED:** The Activity Store now stores activities grouped by dungeon as an array of dungeon objects (`{id, name, activities}`), includes global utility functions, types, and helpers wherever possible.

---

## **1. Folder/Project Structure**

```
src/
├── components/
│   ├── Desktop.js
│   ├── Taskbar.js
│   ├── SearchBar.js
├── apps/
│   ├── ProfileApp.js
├── stores/
│   ├── useUserStore.js
│   ├── useActivityStore.js
│   ├── useAppStateStore.js
│   ├── useThemeStore.js
├── utils/
│   ├── useGlobalLoading.js
│   ├── activityHelpers.js
│   ├── types.js
├── styles/
│   ├── global.css
│   ├── Desktop.css
│   ├── Taskbar.css
│   ├── SearchBar.css
│   ├── ProfileApp.css
├── App.js
└── index.js
```

---

## **2. Core Setup**

### **2.1 Types**
- **File:** `/utils/types.js`
```javascript name=src/utils/types.js
/** @typedef {Object} Activity
 *  @property {string} dungeonId
 *  @property {string} dungeonName
 *  @property {string} [id]
 *  @property {string} [date]
 *  @property {number} [kills]
 *  @property {number} [score]
 *  @property {string} [otherFields]
 */

/** @typedef {Object} DungeonGroup
 *  @property {string} id
 *  @property {string} name
 *  @property {Activity[]} activities
 */
```

---

### **2.2 Utility & Helper Functions**

- **File:** `/utils/activityHelpers.js`
```javascript name=src/utils/activityHelpers.js
import { DungeonGroup, Activity } from "./types";

/** Cleans and normalizes an activity object from API */
export function cleanActivity(activity) {
  return {
    dungeonId: activity.dungeonId || "unknown",
    dungeonName: activity.dungeonName || "Unknown Dungeon",
    ...activity
  };
}

/** Groups activities into an array of dungeon objects */
export function groupActivitiesToDungeonArray(activities) {
  const dungeonMap = {};
  activities.forEach(activity => {
    const dungeonId = activity.dungeonId;
    const dungeonName = activity.dungeonName;
    if (!dungeonMap[dungeonId]) {
      dungeonMap[dungeonId] = {
        id: dungeonId,
        name: dungeonName,
        activities: [],
      };
    }
    dungeonMap[dungeonId].activities.push(activity);
  });
  return Object.values(dungeonMap);
}

/** Aggregate stats for a dungeon group */
export function getDungeonStats(dungeon) {
  return {
    totalKills: dungeon.activities.reduce((sum, act) => sum + (act.kills || 0), 0),
    totalScore: dungeon.activities.reduce((sum, act) => sum + (act.score || 0), 0),
    totalActivities: dungeon.activities.length,
  };
}
```

---

### **2.3 Zustand Stores**

#### **User Store**
- **File:** `/stores/useUserStore.js`
```javascript name=src/stores/useUserStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
const API_BASE_URL = "https://www.bungie.net/Platform";

const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      fetchUser: async (username) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/User/SearchUsers/?q=${username}`, {
            headers: { "X-API-Key": "YOUR_BUNGIE_API_KEY" },
          });
          if (!response.ok) throw new Error("Failed to fetch user data");
          const data = await response.json();
          if (data && data.Response && data.Response.length > 0) {
            const user = data.Response[0];
            set({ user });
          } else {
            throw new Error("No user found");
          }
        } catch (error) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },
      resetUser: () => set({ user: null }),
    }),
    {
      name: "user-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
export default useUserStore;
```

---

#### **Activity Store (Array of Dungeon Groups with Helpers and Types)**
- **File:** `/stores/useActivityStore.js`
```javascript name=src/stores/useActivityStore.js
import { create } from "zustand";
import { cleanActivity, groupActivitiesToDungeonArray } from "../utils/activityHelpers";

const API_BASE_URL = "https://www.bungie.net/Platform";

/** Zustand store for activities grouped by dungeon */
const useActivityStore = create((set) => ({
  dungeons: [], // Array of { id, name, activities }
  isLoading: false,
  error: null,

  fetchActivities: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      let allActivities = [];
      let page = 0;
      let hasMore = true;

      // Fetch up to 20 pages, 250 activities per page
      while (hasMore && page < 20) {
        const response = await fetch(
          `${API_BASE_URL}/Destiny2/Stats/ActivityHistory/${userId}/?page=${page}&count=250`,
          { headers: { "X-API-Key": "YOUR_BUNGIE_API_KEY" } }
        );
        if (!response.ok) throw new Error("Failed to fetch activity data");
        const data = await response.json();
        const activities = (data.Response?.activities || []).map(cleanActivity);
        allActivities = [...allActivities, ...activities];
        hasMore = activities.length === 250;
        page += 1;
      }

      const grouped = groupActivitiesToDungeonArray(allActivities);
      set({ dungeons: grouped });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  resetActivities: () => set({ dungeons: [] }),
}));

export default useActivityStore;
```

---

#### **App State Store**
- **File:** `/stores/useAppStateStore.js`
```javascript name=src/stores/useAppStateStore.js
import { create } from "zustand";
const useAppStateStore = create((set) => ({
  apps: {
    ProfileApp: { isOpen: false, isMinimized: false, position: { x: 100, y: 100 }, size: { width: 400, height: 300 } },
  },
  toggleApp: (appName) =>
    set((state) => ({
      apps: { ...state.apps, [appName]: { ...state.apps[appName], isOpen: !state.apps[appName].isOpen } },
    })),
  resetAppState: () =>
    set({
      apps: {
        ProfileApp: { isOpen: false, isMinimized: false, position: { x: 100, y: 100 }, size: { width: 400, height: 300 } },
      },
    }),
}));
export default useAppStateStore;
```

---

#### **Theme Store**
- **File:** `/stores/useThemeStore.js`
```javascript name=src/stores/useThemeStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
const useThemeStore = create(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),
    }),
    { name: "theme-storage" }
  )
);
export default useThemeStore;
```

---

### **2.4 Global Loading Utility**
- **File:** `/utils/useGlobalLoading.js`
```javascript name=src/utils/useGlobalLoading.js
import useUserStore from "../stores/useUserStore";
import useActivityStore from "../stores/useActivityStore";

/** Returns true if any global loading state is active */
export default function useGlobalLoading() {
  const userLoading = useUserStore((state) => state.isLoading);
  const activityLoading = useActivityStore((state) => state.isLoading);
  return userLoading || activityLoading;
}
```

---

## **3. Components**

### **3.1 Search Bar**
- **File:** `/components/SearchBar.js`
```javascript name=src/components/SearchBar.js
import React, { useState } from "react";
import useUserStore from "../stores/useUserStore";
import useActivityStore from "../stores/useActivityStore";
import useGlobalLoading from "../utils/useGlobalLoading";

function SearchBar({ onSearchComplete }) {
  const [username, setUsername] = useState("");
  const { fetchUser, resetUser } = useUserStore();
  const { fetchActivities, resetActivities } = useActivityStore();
  const isLoading = useGlobalLoading();

  const handleSearch = async () => {
    if (username.trim() === "") return;
    resetUser();
    resetActivities();
    await fetchUser(username);
    const user = useUserStore.getState().user;
    if (user && user.membershipId) {
      await fetchActivities(user.membershipId);
      onSearchComplete();
    }
  };

  return (
    <div className="search-bar-container">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username..."
        className="search-bar"
        disabled={isLoading}
      />
      <button onClick={handleSearch} className="search-button" disabled={isLoading}>
        {isLoading ? "Loading..." : "Search"}
      </button>
      {isLoading && <p className="loading-message">Fetching data, please wait...</p>}
    </div>
  );
}

export default SearchBar;
```

---

### **3.2 Desktop**
- **File:** `/components/Desktop.js`
```javascript name=src/components/Desktop.js
import React from "react";
import useAppStateStore from "../stores/useAppStateStore";
import ProfileApp from "../apps/ProfileApp";
import Taskbar from "./Taskbar";

function Desktop() {
  const { apps } = useAppStateStore();
  return (
    <div className="desktop">
      {apps.ProfileApp.isOpen && <ProfileApp />}
      <Taskbar />
    </div>
  );
}

export default Desktop;
```

---

### **3.3 Taskbar**
- **File:** `/components/Taskbar.js`
```javascript name=src/components/Taskbar.js
import React from "react";
import useAppStateStore from "../stores/useAppStateStore";

function Taskbar() {
  const { apps, toggleApp } = useAppStateStore();
  return (
    <div className="taskbar">
      {Object.keys(apps).map((appName) => (
        <button
          key={appName}
          onClick={() => toggleApp(appName)}
          className={apps[appName].isOpen ? "taskbar-button active" : "taskbar-button"}
        >
          {appName}
        </button>
      ))}
    </div>
  );
}

export default Taskbar;
```

---

### **3.4 Profile/Settings App**
- **File:** `/apps/ProfileApp.js`
```javascript name=src/apps/ProfileApp.js
import React from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import useUserStore from "../stores/useUserStore";
import useThemeStore from "../stores/useThemeStore";

function ProfileApp() {
  const { user } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();
  if (!user) return null;
  return (
    <Draggable grid={[20, 20]}>
      <ResizableBox width={400} height={300} minConstraints={[300, 200]} maxConstraints={[800, 600]}>
        <div className="app-window">
          <h2>User Profile</h2>
          <img src={user.emblem} alt="User Emblem" className="profile-emblem" />
          <p>Username: {user.username}</p>
          <p>Platform: {user.platform}</p>
          <p>Current Theme: {theme}</p>
          <button onClick={toggleTheme}>Toggle Theme</button>
        </div>
      </ResizableBox>
    </Draggable>
  );
}

export default ProfileApp;
```

---

## **4. App Component**
- **File:** `/App.js`
```javascript name=src/App.js
import React, { useState } from "react";
import useUserStore from "./stores/useUserStore";
import SearchBar from "./components/SearchBar";
import Desktop from "./components/Desktop";

function App() {
  const user = useUserStore((state) => state.user);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const handleSearchComplete = () => setIsDataFetched(true);
  return isDataFetched && user ? <Desktop /> : <SearchBar onSearchComplete={handleSearchComplete} />;
}

export default App;
```

---

## **5. Global Styling**
- **File:** `/styles/global.css`
```css name=src/styles/global.css
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #0d1117;
  color: white;
}
```

---

## **6. Run the Project**
1. Install dependencies:
   ```bash
   npm install zustand react-draggable react-resizable
   ```
2. Start the development server:
   ```bash
   npm start
   ```

---

## **Summary of Activity Store Approach**

- **Activities are stored as an array of dungeon objects** (`{id, name, activities}`) for efficient grouping and stat calculation.
- **Types and helper utilities** are used for data normalization, grouping, and stat aggregation.
- **Global loading utility** and consistent modular structure across the app.

Let me know if you’d like example UI for dungeon stats or integrating new features!
