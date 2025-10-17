import { fetchBungieData } from "../utils/fetchBungieData";
import { fetchBungieBackup } from "./fetchUserBackup";
import * as Types from "../utils/types";

/**
 * Returns the full BungieUser object (with all known fields)
 * and a memberships object containing DestinyMemberships (from Bungie's API).
 * Throws custom errors for "not found", "invalid format", or Bungie API errors.
 */
export async function fetchBungieUser(
  bungieName: string
): Promise<{ user: Types.BungieUser | null; memberships: Types.memberships | null }> {
  if (!bungieName) {
    throw new Error("Please enter a Bungie name.");
  }

  const encodedBungieName = encodeURIComponent(bungieName);

  // Call Bungie API (primary)
  const userData = await fetchBungieData(
    `/Destiny2/SearchDestinyPlayer/-1/${encodedBungieName}/`,
    "GET"
  );

  // Handle Bungie API errors (non-1 error code)
  if (userData.ErrorCode !== 1) {
    throw new Error(userData.Message || "Bungie API returned an error.");
  }

  // Fallback: split and search
  let prefix = bungieName;
  let code: string | undefined = undefined;
  if (bungieName.includes("#")) [prefix, code] = bungieName.split("#");

  // No users found
  if (!userData.Response || userData.Response.length === 0) {
    throw new Error("No users found with that Bungie name.");
  }

  // memberships: array of BungieUser objects, but we want DestinyMemberships array for memberships type
  const membershipsArr: Types.memberships["memberships"] = userData.Response.map((u: Types.BungieUser) => ({
    membershipType: u.membershipType,
    membershipId: u.membershipId,
    displayName: u.displayName,
    bungieGlobalDisplayName: u.bungieGlobalDisplayName,
    bungieGlobalDisplayNameCode: u.bungieGlobalDisplayNameCode,
    crossSaveOverride: (u as any).crossSaveOverride,
    applicableMembershipTypes: (u as any).applicableMembershipTypes,
    iconPath: u.iconPath,
  }));

  const membershipsObj: Types.memberships = { memberships: membershipsArr };

  const firstOption: Types.BungieUser = userData.Response[0];
  const secondOption: Types.BungieUser | undefined = userData.Response.find(
    (u: Types.BungieUser) => u.displayName === u.bungieGlobalDisplayName
  );

  // Helper to test user
  async function testUser(user: Types.BungieUser) {
    try {
      const stats = await fetchBungieData(
        `/Destiny2/${user.membershipType}/Account/${user.membershipId}/Stats/`,
        "GET"
      );
      return !!stats.Response;
    } catch {
      return false;
    }
  }

  // Try first option
  if (firstOption && await testUser(firstOption)) {
    return {
      user: firstOption,
      memberships: membershipsObj,
    };
  }

  // Try second option if different than first
  if (
    secondOption &&
    secondOption !== firstOption &&
    (await testUser(secondOption))
  ) {
    return {
      user: secondOption,
      memberships: membershipsObj,
    };
  }

  // No valid Destiny account found, but memberships exist
  if (membershipsArr.length > 0) {
    throw new Error("No valid Destiny account found for this Bungie name.");
  }

  // Ensure the prefix has no leading 0s
  if (code) {
    code = code.replace(/^0+/, '');
  }

  if (!prefix || !code) {
    throw new Error("Invalid Bungie name format. Please use Name#1234.");
  }

  // Use backup search logic
  const { user, memberships } = await fetchBungieBackup(prefix, code);
  if (!user) {
    throw new Error("No Destiny account found using backup search.");
  }
  return {
    user,
    memberships,
  };
}