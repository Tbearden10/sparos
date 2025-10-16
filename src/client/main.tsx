import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Sparos from "./Sparos.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Sparos />
	</StrictMode>,
);
