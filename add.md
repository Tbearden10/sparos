# **Comprehensive Setup Guide**

This guide is split into two parts:

1. **Part 1:** Full setup with everything except DB connection and full clears worker.
2. **Part 2:** How to integrate Cloudflare KV DB and a full clears worker.
3. **Setup Guides:** Instructions for installing and configuring React DnD, react-resizable, Zustand, and other core libraries.

---

## **Part 1: Frontend + Core App Setup (No DB or Worker)**

### **1. Folder/Project Structure**

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
├── App.js
└── index.js
```

---

### **2. Types**
- **File:** `/utils/types.js`
```javascript
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

### **3. API Call Helpers**
- **File:** `/utils/api.js`
```javascript
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
```

---

### **4. Data Cleaning, Grouping, Stat Helpers**
- **File:** `/utils/activityHelpers.js`
```javascript
export function cleanActivity(activity) {
  return {
    dungeonId: activity.dungeonId || "unknown",
    dungeonName: activity.dungeonName || "Unknown Dungeon",
    instanceId: activity.instanceId,
    duration: activity.duration,
    values: activity.values || {}
  };
}

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

### **5. Zustand Stores**
#### **User Store**
```javascript
import { create } from "zustand";
import { fetchUser } from "../utils/api";
const useUserStore = create((set) => ({
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
}));
export default useUserStore;
```

#### **Activity Store**
```javascript
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

---

### **6. Loading Utility**
```javascript
import useUserStore from "../stores/useUserStore";
import useActivityStore from "../stores/useActivityStore";

export default function useGlobalLoading() {
  const userLoading = useUserStore((state) => state.isLoading);
  const activityLoading = useActivityStore((state) => state.isLoading);
  return userLoading || activityLoading;
}
```

---

### **7. Example Components**
#### **SearchBar**
```javascript
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

### **8. App Component**
```javascript
import React, { useState } from "react";
import useUserStore from "./stores/useUserStore";
import SearchBar from "./components/SearchBar";
import Desktop from "./components/Desktop";

function App({ apiKey }) {
  const user = useUserStore((state) => state.user);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const handleSearchComplete = () => setIsDataFetched(true);
  return isDataFetched && user
    ? <Desktop />
    : <SearchBar onSearchComplete={handleSearchComplete} apiKey={apiKey} />;
}

export default App;
```

---

### **9. Global Styling**
```css
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #0d1117;
  color: white;
}
```

---

## **Part 2: Integrating Cloudflare KV DB and Full Clears Worker**

### **1. Cloudflare KV Integration**

#### **KV Helper**
```javascript
// For Cloudflare Worker (KV binding: env.USER_SUMMARIES)
export async function getUserSummaryKV(env, membershipId) {
  const summaryStr = await env.USER_SUMMARIES.get(membershipId);
  return summaryStr ? JSON.parse(summaryStr) : null;
}

export async function setUserSummaryKV(env, membershipId, summary) {
  await env.USER_SUMMARIES.put(membershipId, JSON.stringify(summary));
}
```

#### **Program Flow**
1. On user search, check KV for user summary.
2. If found, pre-load desktop; fetch activities in background.
3. If not found, fetch activities, process as usual, then kick off the full clears worker.
4. After full clears worker finishes, save results to KV.

---

### **2. Full Clears Worker**

```javascript
import { fetchPgcr } from "../utils/api";

/**
 * Computes fastest and total full clears for a dungeon.
 * @param {Array} activities - Array of { instanceId, duration }
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

### **3. Example Integration in SearchBar**

```javascript
import { getUserSummaryKV, setUserSummaryKV } from "../db/cloudflareDb";
// ...other imports

async function handleSearch() {
  // ...existing logic
  if (user && user.membershipId) {
    const summary = await getUserSummaryKV(env, user.membershipId);
    if (summary) {
      onSearchComplete();
      fetchActivities(user.membershipId, apiKey);
    } else {
      await fetchActivities(user.membershipId, apiKey);
      onSearchComplete();

      // Kick off full clears worker (pseudo-code)
      // for (const dungeon of useActivityStore.getState().dungeons) {
      //   const result = await computeFullClears(dungeon.activities, dungeon.id, apiKey);
      //   // Save result to KV
      //   await setUserSummaryKV(env, user.membershipId, { ...existingSummary, fullClears: { [dungeon.id]: result } });
      // }
    }
  }
}
```

---

### **4. Summary**

- **KV is checked before activity fetch:** If summary exists, desktop loads instantly.
- **Full clears worker checks every PGCR, returns both fastest and total full clears.**
- **All helper logic and worker separated for maintainability.**

---

## **Setup Guides: Core Libraries**

### **Zustand**
```bash
npm install zustand
```
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- Usage: See store examples above.

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

*Let me know if you need setup guides for other libraries!*
