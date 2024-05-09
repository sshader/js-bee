import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Game from "./Game";
import ProblemEditor from "./ProblemEditor";
import ErrorPage from "./ErrorPage";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SessionProvider } from "convex-helpers/react/sessions";
import { PlayerProvider } from "./lib/PlayerProvider";
import { ErrorBoundary } from "react-error-boundary";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
  },
  {
    path: "games/:gameId",
    element: <Game />,
    errorElement: <ErrorPage />,
  },
  {
    path: "problems/:problemId",
    element: <ProblemEditor />,
    errorElement: <ErrorPage />,
  },
  {
    path: "*",
    element: <ErrorPage />,
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
