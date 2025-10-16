interface Activity {
    dungeonId: string;
    dungeonName: string;
    instanceId: string;
    duration: number;
    values?: Object;
}

interface DungeonGroup {
    id: string;
    name: string;
    activities: Activity[];
}