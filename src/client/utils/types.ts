export interface Activity {
    dungeonId: string;
    dungeonName: string;
    instanceId: string;
    duration: number;
    values?: Object;
}

export interface DungeonGroup {
    id: string;
    name: string;
    activities: Activity[];
}

export interface BungieUser {
    membershipType: string;
    membershipId: string;
    bungieGlobalDisplayName: string;
    bungieGlobalDisplayNameCode: number;
    displayName: string;
    displayNameCode: number;
    iconPath: string;
};