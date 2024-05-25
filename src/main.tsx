import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";
import { SessionProvider } from "convex-helpers/react/sessions";
import { PlayerProvider } from "./lib/PlayerProvider";
import { SessionId } from "convex-helpers/server/sessions";
import { Toaster } from "@/components/ui/toaster";

/**
 * Compare with {@link useState}, but also persists the value in localStorage.
 * @param key Key to use for localStorage.
 * @param initialValue If there is no value in storage, use this.
 * @returns The value and a function to update it.
 */
export function useLocalStorage(
  key: string,
  initialValue: SessionId | undefined
) {
  const [value, setValueInternal] = useState<SessionId | undefined>(() => {
    if (typeof localStorage !== "undefined") {
      const existing = localStorage.getItem(key);
      if (existing) {
        if (existing === "undefined") {
          return undefined;
        }
        return existing as SessionId;
      }
      if (initialValue !== undefined) localStorage.setItem(key, initialValue);
    }
    return initialValue;
  });
  const setValue = useCallback(
    (value: SessionId | undefined) => {
      if (value !== undefined) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
      setValueInternal(value);
    },
    [key]
  );
  return [value, setValue] as const;
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <SessionProvider useStorage={useLocalStorage}>
        <PlayerProvider>
          <App />
          <Toaster />
        </PlayerProvider>
      </SessionProvider>
    </ConvexProvider>
  </React.StrictMode>
);
