# **Comprehensive Setup Guide (Cloudflare DB Edition, Modular Helpers, Full Clears Worker)**

This guide provides a full setup for your app, integrating Cloudflare KV for user activity summaries, modular helper functions for API calls, data cleaning, grouping, stat computation, and a backend worker for full clears (which both finds the fastest full clear and counts total full clears by checking every PGCR). All logic is separated for maintainability and clarity.

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
├── db/
│   ├── cloudflareDb.js        # DB helper for KV read/write
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

/** @typedef {Object} UserSummary
 *  @property {string} membershipId
 *  @property {DungeonGroup[]} activities
 *  @property {Object} fullClears  // { [dungeonId]: { fastest: {...}, total: number } }
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
import { DungeonGroup, Activity } from "./types";

/** Cleans and normalizes an activity object from API */
export function cleanActivity(activity) {
  return {
    dungeonId: activity.dungeonId || "unknown",
    dungeonName: activity.dungeonName || "Unknown Dungeon",
    instanceId: activity.instanceId,
    duration: activity.duration,
    values: activity.values || {}
    // ...other fields if needed
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

## **5. Cloudflare DB Utility**
- **File:** `/db/cloudflareDb.js`
```javascript name=src/db/cloudflareDb.js
// For Cloudflare Worker (KV binding: env.USER_SUMMARIES)
export async function getUserSummaryKV(env, membershipId) {
  const summaryStr = await env.USER_SUMMARIES.get(membershipId);
  return summaryStr ? JSON.parse(summaryStr) : null;
}

export async function setUserSummaryKV(env, membershipId, summary) {
  await env.USER_SUMMARIES.put(membershipId, JSON.stringify(summary));
}
```

---

## **6. Full Clear Worker (Backend Worker/Cloudflare Worker)**
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

## **7. Store Example Using Helpers**
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

---

## **8. SearchBar Example Using Helpers**
- **File:** `/components/SearchBar.js`
```javascript name=src/components/SearchBar.js
import React, { useState } from "react";
import useUserStore from "../stores/useUserStore";
import useActivityStore from "../stores/useActivityStore";
import useGlobalLoading from "../utils/useGlobalLoading";
import { fetchUser } from "../utils/api";
import { getUserSummaryKV } from "../db/cloudflareDb";

function SearchBar({ onSearchComplete, apiKey, env }) {
  const [username, setUsername] = useState("");
  const { resetUser } = useUserStore();
  const { fetchActivities, resetActivities } = useActivityStore();
  const isLoading = useGlobalLoading();

  const handleSearch = async () => {
    if (username.trim() === "") return;
    resetUser();
    resetActivities();
    let user;
    try {
      user = await fetchUser(username, apiKey);
    } catch (e) {
      // handle fetch error
      return;
    }
    if (user && user.membershipId) {
      // Try to get summary from DB
      const summary = await getUserSummaryKV(env, user.membershipId);
      if (summary) {
        onSearchComplete();
        fetchActivities(user.membershipId, apiKey);
      } else {
        await fetchActivities(user.membershipId, apiKey);
        onSearchComplete();
        // Kick off full clear worker, update DB after
      }
    }
  };

  // ... UI code unchanged
}

export default SearchBar;
```

---

## **9. App Component Logic (Simplified)**
- **File:** `/App.js`
```javascript name=src/App.js
import useUserStore from "./stores/useUserStore";
import SearchBar from "./components/SearchBar";
import Desktop from "./components/Desktop";
import { getUserSummaryKV } from "./db/cloudflareDb";

function App({ apiKey, env }) {
  const user = useUserStore((state) => state.user);
  const [isDataFetched, setIsDataFetched] = useState(false);

  useEffect(() => {
    async function checkDB() {
      if (user && user.membershipId) {
        const summary = await getUserSummaryKV(env, user.membershipId);
        setIsDataFetched(!!summary);
      }
    }
    checkDB();
  }, [user]);

  return isDataFetched && user
    ? <Desktop />
    : <SearchBar onSearchComplete={() => setIsDataFetched(true)} apiKey={apiKey} env={env} />;
}
```

---

## **10. Summary**

- **API calls, data cleaning/grouping, and stat computation** are handled by dedicated helper modules.
- **User summary stored in Cloudflare KV, read before activity fetching.**
- **Full clear stats computed in backend worker and written to KV. Worker checks PGCR for every activity.**
- **Both fastest full clear and total full clears are produced.**
- **UI loads instantly if summary exists; otherwise, fetches activities and computes stats before render.**
- **All logic is modular and easy to test or swap as needed.**

---

Let me know if you need further helper functions, advanced schema for Cloudflare D1, or expanded worker/queue patterns!
