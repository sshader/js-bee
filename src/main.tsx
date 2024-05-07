import {
  ConvexProvider,
  ConvexReactClient,
  useMutation,
  useQuery,
} from "convex/react";
import React, { useContext, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Game from "./Game";
import ProblemEditor from "./ProblemEditor";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SessionProvider, useSessionId } from "convex-helpers/react/sessions";
import { Doc, Id } from "convex/_generated/dataModel";
import { api } from "convex/_generated/api";
import { PlayerProvider } from "./lib/PlayerProvider";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "games/:gameId",
    element: <Game />,
  },
  {
    path: "problems/:problemId",
    element: <ProblemEditor />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <SessionProvider>
        <PlayerProvider>
          <RouterProvider router={router} />
        </PlayerProvider>
      </SessionProvider>
    </ConvexProvider>
  </React.StrictMode>
);
