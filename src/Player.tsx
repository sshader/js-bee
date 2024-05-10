import { useState } from "react";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";

function Player() {
  const player = useCurrentPlayer();
  const [name, setName] = useState(player.name);
  const updatePlayer = useMutation(api.players.updatePlayer);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void updatePlayer({ name, playerId: player._id });
      }}
    >
      <div className="flex flex-row gap-2">
        <Input
          className="max-w-[20vw]"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <Button variant="outline" disabled={player.name === name} type="submit">
          {player.name === name ? "✅" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default Player;
