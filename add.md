# **Comprehensive Setup Guide (Cloudflare DB Edition, Modular Helpers)**

This guide provides a full setup for your app with Cloudflare DB integration for user activity summaries, **modular helper functions for API calls, cleaning, grouping, and stat computation**, and separation of concerns across your codebase.  
**UPDATED:** All API and data helpers are separated for clarity—making maintenance and testing easier.

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
│   ├── fullClearWorker.js
├── db/
│   ├── cloudflareDb.js        # DB utility to read/write user summary
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
 *  @property {string} [id]
 *  @property {string} [date]
 *  @property {number} [kills]
 *  @property {number} [score]
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
/**
 * Example: Cloudflare Worker for Fastest Full Clear Stat
 * This worker receives a job payload with dungeon activities,
 * checks PGCRs, and returns the fastest full clear result.
 */
export default {
  async fetch(request, env) {
    const { membershipId, dungeonId, activityIds } = await request.json();
    let fastestClear = null;

    for (const activityId of activityIds) {
      // Fetch PGCR from Bungie API
      const pgcrResp = await fetch(
        `https://www.bungie.net/Platform/Destiny2/Stats/PostGameCarnageReport/${activityId}/`,
        { headers: { "X-API-Key": env.BUNGIE_API_KEY } }
      );
      if (!pgcrResp.ok) continue;
      const pgcr = await pgcrResp.json();

      // Check if PGCR represents a full clear (implement your own logic)
      if (isFullClear(pgcr, dungeonId)) {
        const clearTime = getClearTime(pgcr);
        if (!fastestClear || clearTime < fastestClear.clearTime) {
          fastestClear = { activityId, clearTime, pgcr };
        }
      }
    }

    // Save result to KV using DB helper
    await env.USER_SUMMARIES.put(membershipId, JSON.stringify({ dungeonId, fastestClear }));
    return new Response(JSON.stringify({ dungeonId, membershipId, fastestClear }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

function isFullClear(pgcr, dungeonId) {
  // Implement logic for determining full clear
  return true;
}

function getClearTime(pgcr) {
  return pgcr.Response.activityDetails.clearTimeSeconds || 0;
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

## **9. Summary**

- **API calls, data cleaning/grouping, and stat computation** are handled by dedicated helper modules.
- **User summary stored in Cloudflare KV, read before activity fetching.**
- **Full clear stats computed in backend worker and written to KV.**
- **UI loads instantly if summary exists; otherwise, fetches activities and computes stats before render.**
- **All logic is modular and easy to test or swap as needed.**

---

Let me know if you need further helper functions, advanced schema for Cloudflare D1, or expanded worker/queue patterns!
