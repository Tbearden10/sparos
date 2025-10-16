import { useState } from "react";
import { useSearch } from "../context/SearchContext";
import "../../styles/SearchBar.css"

function SearchBar() {
  const [query, setQuery] = useState("");
  const { handleSearch, loading } = useSearch();

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (query.trim()) handleSearch(query.trim());
      }}
      className="search-bar"
    >
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search Bungie users..."
        disabled={loading}
        className="search-input"
      />
      <button type="submit" disabled={loading} className="search-button">
        Search
      </button>
    </form>
  );
}

export default SearchBar;