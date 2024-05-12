import { useMutation } from "convex/react";
import { Operation, State } from "../../common/inputs";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCurrentPlayer } from "@/lib/PlayerProvider";
import { Button } from "@/components/ui/button";

function renderInput(input: Operation | null) {
  if (input === null) {
    return "(nothing)";
  }
  switch (input.kind) {
    case "Add": {
      if (input.input === " ") {
        return "space";
      }
      if (input.input === "\n") {
        return "\\n";
      }
      if (input.input === "\t") {
        return "\\t";
      }
      return input.input;
    }
    case "Delete":
      return `clear ${input.numDeleted ?? 1}`;
    case "Finish":
      return "done";
    case "Skip":
      return `skip ${input.numSkips}`;
    case "Skipped":
      return "skipped";
  }
}

export function ReadOnlyPlayerInputs({ gameState }: { gameState: State }) {
  return (
    <div className="flex gap-2">
      <NoninteractiveInput
        input={gameState.lastPlayer1Input}
        isActive={gameState.isLastPlayerPlayer1}
        playerVariant="primary"
      />
      <NoninteractiveInput
        input={gameState.lastPlayer2Input}
        isActive={!gameState.isLastPlayerPlayer1}
        playerVariant="secondary"
      />
    </div>
  );
}

export function NoninteractiveInput({
  input,
  isActive,
  playerVariant,
}: {
  input: Operation | null;
  isActive: boolean;
  playerVariant: "primary" | "secondary";
}) {
  return (
    <div
      className={`border-solid rounded-md border-4 p-4 text-4xl text-center min-w-[5em] ${isActive ? `border-${playerVariant}` : "border-muted text-muted"}`}
    >
      {renderInput(input)}
    </div>
  );
}

export function InputForm({
  gameId,
  isActive,
  playerVariant,
}: {
  gameId: Id<"game">;
  isActive: boolean;
  playerVariant: "primary" | "secondary";
}) {
  const player = useCurrentPlayer();
  const [playerInput, setPlayerInput] = useState("");
  const takeTurn = useMutation(api.engine.takeTurn);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void takeTurn({
          gameId: gameId,
          playerId: player._id,
          input: playerInput,
        }).finally(() => setPlayerInput(""));
      }}
    >
      <div
        className="text-2xl"
        title={isActive ? "Your turn!" : "Waiting for partner"}
      >{`You: ${isActive ? "👩‍💻" : "🕦"}`}</div>
      <input
        className={`text-${playerVariant} border-solid rounded-md border-4 border-muted p-4 text-4xl w-[5em] text-center`}
        autoFocus
        value={playerInput}
        onChange={(event) => setPlayerInput(event.target.value)}
      />
      <Button type="submit" variant="outline" disabled={!isActive}>
        Submit
      </Button>
    </form>
  );
}
