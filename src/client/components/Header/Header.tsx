import SearchBar from "../SearchBar/SearchBar";
import "../../styles/Header.css"
import "../../styles/SearchBar.css"

function Header() {
  return (
    <header className="header">
      <SearchBar />
    </header>
  );
}
export default Header;