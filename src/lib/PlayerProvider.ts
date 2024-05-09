import { useSessionId } from "convex-helpers/react/sessions";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import React, { useContext, useEffect, useState } from "react";

const PlayerContext = React.createContext<Doc<"player"> | null>(null);
export const PlayerProvider: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const [sessionId] = useSessionId();
  const [playerId, setPlayerId] = useState<Id<"player"> | null>(null);
  const createPlayer = useMutation(api.players.getOrCreatePlayer);
  const player = useQuery(
    api.players.getPlayer,
    playerId === null ? "skip" : { playerId }
  );
  useEffect(() => {
    const f = async () => {
      if (sessionId !== undefined) {
        const result = await createPlayer({ sessionId });
        setPlayerId(result);
      }
      return;
    };
    void f();
  });
  if (player === undefined) {
    return "Loading...";
  }
  return React.createElement(
    PlayerContext.Provider,
    { value: player },
    children
  );
};

export function useCurrentPlayer(): Doc<"player"> {
  const ctx = useContext(PlayerContext);
  if (ctx === null) {
    throw new Error("Missing a <PlayerProvider> wrapping this code.");
  }
  return ctx;
}
