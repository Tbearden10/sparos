import { createContext, useContext, useState } from "react";
import { fetchBungieUser } from "../api/bungie";
import { cleanBungieData } from "../utils/cleanBungieData";

// Context type: user results, loading, error, and the search function
const SearchContext = createContext({
  results: [],
  loading: false,
  error: null,
  handleSearch: async (query: string) => {},
});

export function SearchProvider({ children }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(query: string) {
    setLoading(true);
    setError(null);
    try {
      const rawData = await fetchBungieUser(query);
      const cleaned = cleanBungieData(rawData);
      setResults(cleaned);
      if (cleaned.length === 0) setError("No users found.");
    } catch (e) {
      setError("Search failed.");
      setResults([]);
    }
    setLoading(false);
  }

  return (
    <SearchContext.Provider value={{ results, loading, error, handleSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}