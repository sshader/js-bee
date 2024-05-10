import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";
import { SessionProvider } from "convex-helpers/react/sessions";
import { PlayerProvider } from "./lib/PlayerProvider";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <SessionProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </SessionProvider>
    </ConvexProvider>
  </React.StrictMode>
);
