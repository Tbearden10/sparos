import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SearchProvider } from "./context/SearchContext.tsx";
import Spar from "./Spar.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<SearchProvider>
		<Spar />
		</SearchProvider>
	</StrictMode>,
);
