import { fetchBungieData } from "../utils/fetchBungieData";
import * as Types from "../utils/types";

export async function fetchBungieBackup(
    prefix: string,
    code: string,
    matchMembershipId?: string
): Promise<{ user: Types.BungieUser | null; memberships: Types.memberships }> {
    if (!prefix || !code) return { user: null, memberships: { memberships: [] } };

        let allResults: any[] = [];
        let page = 0;
        let hasMore = true;
        while (hasMore) {
            const data = await fetchBungieData(
            `/User/Search/GlobalName/${page}/`,
            "POST",
            { displayNamePrefix: prefix }
        );
        const pageResults = data?.Response?.searchResults ?? [];
        allResults = allResults.concat(pageResults);
        hasMore = !!data?.Response?.hasMore;
        if (!pageResults.length) break;
        page += 1;
    }

  allResults = allResults.filter(u => u.bungieNetMembershipId !== undefined);

  if (!allResults.length) return { user: null, memberships: { memberships: [] } };

  const matchedUser = allResults.find(
    (u: any) => String(u.bungieGlobalDisplayNameCode) === String(code)
  );
  if (!matchedUser) return { user: null, memberships: { memberships: [] } };

  let membershipsArr = matchedUser.destinyMemberships || [];
  if (matchMembershipId) {
    membershipsArr = membershipsArr.filter(
      (m: Types.DestinyMembership) => String(m.membershipId) === String(matchMembershipId)
    );
  }

  const user: Types.BungieUser = {
    membershipType: "",
    membershipId: membershipsArr[0]?.membershipId || "",
    bungieGlobalDisplayName: matchedUser.bungieGlobalDisplayName,
    bungieGlobalDisplayNameCode: matchedUser.bungieGlobalDisplayNameCode,
    displayName: matchedUser.bungieGlobalDisplayName,
    displayNameCode: matchedUser.bungieGlobalDisplayNameCode,
    iconPath: undefined,
    bungieNetMembershipId: matchedUser.bungieNetMembershipId,
    destinyMemberships: membershipsArr,
  };

  const memberships = membershipsArr.map((m: Types.DestinyMembership) => ({
    membershipType: String(m.membershipType),
    membershipId: m.membershipId,
    displayName: m.displayName,
  }));

  return { user, memberships };
}