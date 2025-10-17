import React, { useState } from "react";
import { useSearchPipelineStore } from "../stores/useSearchPipelineStore";
import { useDelayedLoader } from "../hooks/useDelayedLoader";
import BootSequenceLoader from "./BootSequenceLoader";
import "../styles/SearchBar.css";

export default function SearchBar() {
  const [input, setInput] = useState("");
  const { searchUserPipeline, error, isLoading, job } = useSearchPipelineStore();
  const showLoader = useDelayedLoader(isLoading || !!job, 150);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      searchUserPipeline(input.trim());
    }
  };

  return (
    <div className="searchbar-wrapper">
      <form className="searchbar-form" onSubmit={handleSubmit}>
        <input
          className="searchbar-input"
          type="text"
          placeholder="Enter Bungie name (e.g. Sparrow#1234)"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
          disabled={isLoading}
        />
        <button
          className="searchbar-btn"
          type="submit"
          disabled={!input.trim() || isLoading}
        >
          Search
        </button>
      </form>
      {showLoader && (
        <div className="searchbar-loader">
          <BootSequenceLoader width={240} />
        </div>
      )}
      {error && (
        <div className="searchbar-error">
          {error}
        </div>
      )}
    </div>
  );
}