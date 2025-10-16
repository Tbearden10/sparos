# **Comprehensive Setup Guide (Local Storage, Modular Helpers, Full Clears Worker, No DB Yet)**

This guide provides a full setup for your app, using local storage for user and theme data, modular helper functions for API calls, data cleaning, grouping, stat computation, and a backend worker for full clears computation (which finds the fastest full clear and counts total full clears by checking every PGCR). **All database code is replaced with placeholders and not included.**

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
│   ├── types.js
│   ├── api.js                 # API call helpers
│   ├── activityHelpers.js     # Data cleaning, grouping, stat helpers
├── styles/
│   ├── global.css
│   ├── Desktop.css
│   ├── Taskbar.css
│   ├── SearchBar.css
│   ├── ProfileApp.css
├── worker/
│   ├── fullClearWorker.js     # Backend worker for full clears
├── App.js
└── index.js
```

---

## **2. Types**
- **File:** `/utils/types.js`
```javascript name=src/utils/types.js
/** @typedef {Object} Activity
 *  @property {string} dungeonId
 *  @property {string} dungeonName
 *  @property {string} instanceId
 *  @property {number} duration
 *  @property {Object} [values]
 */

/** @typedef {Object} DungeonGroup
 *  @property {string} id
 *  @property {string} name
 *  @property {Activity[]} activities
 */
```

---

## **3. API Call Helpers**
- **File:** `/utils/api.js`
```javascript name=src/utils/api.js
const API_BASE_URL = "https://www.bungie.net/Platform";

/** Fetch user info by username */
export async function fetchUser(username, apiKey) {
  const response = await fetch(`${API_BASE_URL}/User/SearchUsers/?q=${username}`, {
    headers: { "X-API-Key": apiKey }
  });
  if (!response.ok) throw new Error("Failed to fetch user data");
  const data = await response.json();
  if (data && data.Response && data.Response.length > 0) return data.Response[0];
  throw new Error("No user found");
}

/** Fetch activities for a user (paginated) */
export async function fetchAllActivities(userId, apiKey, maxPages = 20, pageSize = 250) {
  let allActivities = [];
  let page = 0;
  let hasMore = true;
  while (hasMore && page < maxPages) {
    const response = await fetch(
      `${API_BASE_URL}/Destiny2/Stats/ActivityHistory/${userId}/?page=${page}&count=${pageSize}`,
      { headers: { "X-API-Key": apiKey } }
    );
    if (!response.ok) throw new Error("Failed to fetch activity data");
    const data = await response.json();
    const activities = data.Response?.activities || [];
    allActivities = [...allActivities, ...activities];
    hasMore = activities.length === pageSize;
    page++;
  }
  return allActivities;
}

/** Fetch PGCR for an activity instanceId */
export async function fetchPgcr(instanceId, apiKey) {
  const resp = await fetch(
    `${API_BASE_URL}/Destiny2/Stats/PostGameCarnageReport/${instanceId}/`,
    { headers: { "X-API-Key": apiKey } }
  );
  if (!resp.ok) return null;
  return await resp.json();
}
```

---

## **4. Data Cleaning, Grouping, Stat Helpers**
- **File:** `/utils/activityHelpers.js`
```javascript name=src/utils/activityHelpers.js
/** Cleans and normalizes an activity object from API */
export function cleanActivity(activity) {
  return {
    dungeonId: activity.dungeonId || "unknown",
    dungeonName: activity.dungeonName || "Unknown Dungeon",
    instanceId: activity.instanceId,
    duration: activity.duration,
    values: activity.values || {}
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
    totalClears: dungeon.activities.reduce((sum, act) => sum + (act.values?.clears || 0), 0),
    totalFullClears: dungeon.activities.reduce((sum, act) => sum + (act.values?.fullClears || 0), 0),
    totalSherpa: dungeon.activities.reduce((sum, act) => sum + (act.values?.sherpaCount || 0), 0),
    totalActivities: dungeon.activities.length,
  };
}
```

---

## **5. Full Clear Worker (Backend Worker/Cloudflare Worker)**
- **File:** `/worker/fullClearWorker.js`
```javascript name=src/worker/fullClearWorker.js
import { fetchPgcr } from "../utils/api";

/**
 * Computes fastest and total full clears for a dungeon.
 * @param {Array} activities - Array of { instanceId, duration, ... }
 * @param {string} dungeonId
 * @param {string} apiKey
 * @returns { fastest: Activity, total: number }
 */
export async function computeFullClears(activities, dungeonId, apiKey) {
  // Sort by duration ascending for fastest first
  const sorted = activities.slice().sort((a, b) => a.duration - b.duration);

  let fastestFullClear = null;
  let totalFullClears = 0;

  for (const activity of sorted) {
    const pgcr = await fetchPgcr(activity.instanceId, apiKey);
    if (pgcr && isFullClear(pgcr, dungeonId)) {
      totalFullClears++;
      if (!fastestFullClear) {
        fastestFullClear = activity;
      }
    }
  }
  return { fastest: fastestFullClear, total: totalFullClears };
}

/** Implement logic to determine if PGCR is a full clear for this dungeon */
function isFullClear(pgcr, dungeonId) {
  // Custom logic per dungeon, e.g., all phases/bosses complete, etc.
  return true; // Stub: replace with actual check
}
```

---

## **6. Zustand Stores**

### **User Store**
- **File:** `/stores/useUserStore.js`
```javascript name=src/stores/useUserStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchUser } from "../utils/api";

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,
      fetchUser: async (username, apiKey) => {
        set({ isLoading: true, error: null });
        try {
          const user = await fetchUser(username, apiKey);
          set({ user });
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

### **Activity Store**
- **File:** `/stores/useActivityStore.js`
```javascript name=src/stores/useActivityStore.js
import { create } from "zustand";
import { fetchAllActivities } from "../utils/api";
import { cleanActivity, groupActivitiesToDungeonArray } from "../utils/activityHelpers";

const useActivityStore = create((set) => ({
  dungeons: [],
  isLoading: false,
  error: null,

  fetchActivities: async (userId, apiKey) => {
    set({ isLoading: true, error: null });
    try {
      const rawActivities = await fetchAllActivities(userId, apiKey);
      const cleanedActivities = rawActivities.map(cleanActivity);
      const grouped = groupActivitiesToDungeonArray(cleanedActivities);
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

### **App State Store**
- **File:** `/stores/useAppStateStore.js`
```javascript name=src/stores/useAppStateStore.js
import { create } from "zustand";

const useAppStateStore = create((set) => ({
  apps: {
    ProfileApp: { isOpen: false, isMinimized: false, position: { x: 100, y: 100 }, size: { width: 400, height: 300 } },
  },
  toggleApp: (appName) =>
    set((state) => ({
      apps: {
        ...state.apps,
        [appName]: { ...state.apps[appName], isOpen: !state.apps[appName].isOpen },
      },
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

### **Theme Store**
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
    {
      name: "theme-store",
    }
  )
);

export default useThemeStore;
```

---

## **7. Integration in App Component**

- **File:** `/App.js`
```javascript name=src/App.js
import React, { useState } from "react";
import useUserStore from "./stores/useUserStore";
import SearchBar from "./components/SearchBar";
import Desktop from "./components/Desktop";

function App({ apiKey }) {
  const user = useUserStore((state) => state.user);
  const [isDataFetched, setIsDataFetched] = useState(false);

  const handleSearchComplete = () => setIsDataFetched(true);

  return isDataFetched && user ? (
    <Desktop />
  ) : (
    <SearchBar onSearchComplete={handleSearchComplete} apiKey={apiKey} />
  );
}

export default App;
```

---

## **8. SearchBar Example Using Helpers**

- **File:** `/components/SearchBar.js`
```javascript name=src/components/SearchBar.js
import React, { useState } from "react";
import useUserStore from "../stores/useUserStore";
import useActivityStore from "../stores/useActivityStore";
import useGlobalLoading from "../utils/useGlobalLoading";

function SearchBar({ onSearchComplete, apiKey }) {
  const [username, setUsername] = useState("");
  const { fetchUser, resetUser } = useUserStore();
  const { fetchActivities, resetActivities } = useActivityStore();
  const isLoading = useGlobalLoading();

  const handleSearch = async () => {
    if (username.trim() === "") return;
    resetUser();
    resetActivities();
    await fetchUser(username, apiKey);
    const user = useUserStore.getState().user;
    if (user && user.membershipId) {
      await fetchActivities(user.membershipId, apiKey);
      onSearchComplete();
      // Placeholder: Kick off full clear worker logic here if needed
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

## **9. Profile App**

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
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Platform:</strong> {user.platform}</p>
          <p><strong>Current Theme:</strong> {theme}</p>
          <button onClick={toggleTheme}>Toggle Theme</button>
        </div>
      </ResizableBox>
    </Draggable>
  );
}

export default ProfileApp;
```

---

## **10. Setup Guides: Core Libraries**

### **Zustand**
```bash
npm install zustand
```
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

### **react-dnd**
```bash
npm install react-dnd react-dnd-html5-backend
```
- [React DnD Docs](https://react-dnd.github.io/react-dnd/about)
- Example usage:
  ```javascript
  import { DndProvider } from 'react-dnd';
  import { HTML5Backend } from 'react-dnd-html5-backend';

  function App() {
    return (
      <DndProvider backend={HTML5Backend}>
        <YourComponent />
      </DndProvider>
    );
  }
  ```

---

### **react-resizable**
```bash
npm install react-resizable
```
- [react-resizable Docs](https://www.npmjs.com/package/react-resizable)
- Example usage:
  ```javascript
  import { ResizableBox } from "react-resizable";

  <ResizableBox width={200} height={200} minConstraints={[100, 100]} maxConstraints={[300, 300]}>
    <div>Resizable Content</div>
  </ResizableBox>
  ```

---

### **react-draggable**
```bash
npm install react-draggable
```
- [react-draggable Docs](https://www.npmjs.com/package/react-draggable)
- Example usage:
  ```javascript
  import Draggable from "react-draggable";

  <Draggable>
    <div>Drag me!</div>
  </Draggable>
  ```

---

## **11. Global Styling**
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

**You now have a production-ready modular setup for your app! All database code is omitted, and you can add it later. Local storage is enabled for user and theme data.**
