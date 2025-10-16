import { fetchBungieData } from "../utils/fetchBungieData";
import { BungieUser } from "../utils/types"

/** Fetch user info by username */
export async function fetchBungieUser(
    bungieName: string
) {
    
    // return null if no input
    if (!bungieName) return {};

    // Try primary search
    const encodedBungieName = encodeURIComponent(bungieName);

    // Call bungie api
    const primaryRes = await fetchBungieData(
        `/Destiny2/SearchDestinyPlayer/-1/${encodedBungieName}`,
        'GET'
    );

    // Backup fallback: split and search
    let prefix = bungieName;
    let code: string | undefined = undefined;
    if (bungieName.includes('#')) [prefix, code] = bungieName.split('#');

    if (primaryRes.ok) {
        const userData = await primaryRes.json();

        if (userData.Response && userData.Response.length > 0) {

            // try first result
            const firstOption = userData.Response[0];
            // then try displayName = bungieGlobalDisplayName
            const secondOption = userData.Response.find(
                (u: BungieUser) => u.displayName === u.bungieGlobalDisplayName
            );

            

            // test if user is valid
            async function testUser(user: BungieUser) {
                try {
                    const testRes = await fetchBungieData(
                        `/Detiny2/${user.membershipType}/Account/${user.membershipId}/Stats/`,
                        'GET'
                    );
                }
            }
        }
    }
}