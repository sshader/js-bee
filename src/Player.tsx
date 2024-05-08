import { useState } from "react";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function Player() {
  const player = useCurrentPlayer();
  const [name, setName] = useState(player.name);
  const updatePlayer = useMutation(api.myFunctions.updatePlayer);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void updatePlayer({ name, playerId: player._id });
      }}
    >
      <label>Name:</label>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
      ></input>
      <input type="submit" value={"Save"} />
    </form>
  );
}

export default Player;
