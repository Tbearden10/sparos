// Dummy Bungie-style search function
export async function fetchBungieUser(query: string): Promise<any[]> {
  await new Promise(r => setTimeout(r, 300)); // Simulate network delay
  // Dummy data array
  const MOCK_USERS = [
    { id: "1", displayName: "Anna Bungie", profilePicture: "https://placehold.co/48x48?text=AB", bio: "Titan main" },
    { id: "2", displayName: "Ben Destiny", profilePicture: "https://placehold.co/48x48?text=BD", bio: "Hunter main" },
    { id: "3", displayName: "Cara Guardian", profilePicture: "https://placehold.co/48x48?text=CG", bio: "Warlock main" },
  ];
  return MOCK_USERS.filter(u => u.displayName.toLowerCase().includes(query.toLowerCase()));
}