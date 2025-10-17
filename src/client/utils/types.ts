export interface BungieUser {
  membershipType: string;
  membershipId: string;
  bungieGlobalDisplayName?: string;
  bungieGlobalDisplayNameCode?: number;
  displayName?: string;
  displayNameCode?: number;
  iconPath?: string;
  bungieNetMembershipId?: string;
  destinyMemberships?: DestinyMembership[];
}

export interface DestinyMembership {
  membershipId: string;
  membershipType: number;
  displayName: string;
}

export interface memberships {
  memberships: Array<{
    membershipType: string;
    membershipId: string;
    displayName?: string;
    bungieGlobalDisplayName?: string;
    bungieGlobalDisplayNameCode?: number;
    crossSaveOverride?: number;
    applicableMembershipTypes?: number[];
    iconPath?: string;
  }>;
}