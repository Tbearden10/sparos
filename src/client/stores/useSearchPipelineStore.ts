import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchBungieUser } from "../lib/fetchBungieUser";
import useUserStore from "../stores/useUserStore";
// import useActivityStore from "../stores/useActivityStore";
// import more stores and fetch helpers as needed

interface SearchJob {
  bungieName: string;
  startedAt: number;
}

interface SearchPipelineState {
  isLoading: boolean;
  error: string | null;
  job: SearchJob | null;
  jobToken: number; // increments to invalidate old jobs
  searchUserPipeline: (bungieName: string) => void;
  restoreJob: () => void;
  cancelJob: () => void;
}

export const useSearchPipelineStore = create<SearchPipelineState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      job: null,
      jobToken: 0,
      // Pipeline entry point
      searchUserPipeline: (bungieName: string) => {
        // Cancel any running job by bumping the token
        const newToken = get().jobToken + 1;
        set({
          isLoading: true,
          error: null,
          job: { bungieName, startedAt: Date.now() },
          jobToken: newToken,
        });

        // Async IIFE to allow using await
        (async (jobTokenAtStart) => {
          try {
            // 1. User search
            const { user, memberships } = await fetchBungieUser(bungieName);

            // If a new job started, abort this one
            if (get().jobToken !== jobTokenAtStart) return;

            useUserStore.getState().setUser(user, memberships);

            // 2. Activities (example block for easy extension)
            // if (user?.membershipId) {
            //   await useActivityStore.getState().fetchActivities(user.membershipId, user.membershipType);
            //   // If a new job started, abort this one
            //   if (get().jobToken !== jobTokenAtStart) return;
            // }

            // 3. Add more blocks here as needed in future!

            set({
              isLoading: false,
              job: null,      // clear the job so loaders go away
              error: null,    // clear previous errors
            });
          } catch (err: any) {
            if (get().jobToken !== jobTokenAtStart) return;
            set({
              error: err.message || "An unknown error occurred.",
              isLoading: false,
              job: null,      // clear the job so loaders go away
            });
            useUserStore.getState().resetUser?.();
            // useActivityStore.getState().resetActivities?.();
          }
        })(newToken);
      },
      // Restore job from localStorage (if wanted)
      restoreJob: () => {
        const job = get().job;
        if (job) {
          get().searchUserPipeline(job.bungieName);
        }
      },
      // Cancel any running job
      cancelJob: () => {
        set((state) => ({
          jobToken: state.jobToken + 1,
          isLoading: false,
          job: null,
        }));
      },
    }),
    {
      name: "search-pipeline-store",
      partialize: (state) => ({
        job: state.job,
        // you may also want to persist isLoading/error if desired
      }),
    }
  )
);