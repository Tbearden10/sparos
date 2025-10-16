import { useSearch } from "./context/SearchContext";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import UserCard from "./components/UserCard/UserCard";
import "./styles/index.css";
import "./styles/UserList.css"

function Spar() {
  const { results, loading, error } = useSearch();

  return (
    <div className="page-layout">
      <Header />
      <main className="page-content">
        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading-message">Loading...</div>}
        {!loading && results.length === 0 && !error && (
          <div className="info-message">Search for a Bungie user above!</div>
        )}
        <ul className="user-list">
          {results.map((user) => (
            <UserCard user={user} />
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}

export default Spar;