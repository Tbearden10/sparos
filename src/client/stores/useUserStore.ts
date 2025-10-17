import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as Types from "../utils/types";

interface UserStoreState {
  user: Types.BungieUser | null;
  memberships: Types.memberships | null;
  setUser: (user: Types.BungieUser | null, memberships: Types.memberships | null) => void;
  resetUser: () => void;
}

const useUserStore = create<UserStoreState>()(
  persist(
    (set) => ({
      user: null,
      memberships: null,
      setUser: (user, memberships) => set({ user, memberships }),
      resetUser: () => set({ user: null, memberships: null }),
    }),
    { name: "user-store" }
  )
);

export default useUserStore;