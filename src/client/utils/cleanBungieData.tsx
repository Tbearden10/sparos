
export function cleanBungieData(rawData: any[]): any[] {
  // Just return as-is for mock data, but you could map fields here for real API
  return rawData.map(user => ({
    id: user.id,
    displayName: user.displayName,
    profilePicture: user.profilePicture,
    bio: user.bio,
  }));
}