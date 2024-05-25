import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { InputForm, NoninteractiveInput } from "./PlayerInputs";
import { useCurrentPlayer } from "@/lib/PlayerProvider";

function Controls({ game }: { game: Doc<"game"> }) {
  const player = useCurrentPlayer();
  const result = useQuery(api.games.watchGameWhilePlaying, {
    gameId: game._id,
    playerId: player._id,
  });
  if (result === undefined) {
    return <Skeleton />;
  }

  if (game.status !== "Inputting" || result === null) {
    return "";
  }
  const { isCurrentPlayersTurn, lastPartnerInput } = result;

  if (game.player1 === player._id) {
    return (
      <div className="flex gap-2">
        <InputForm
          gameId={game._id}
          isActive={isCurrentPlayersTurn}
          playerVariant="primary"
        />
        <div className="flex flex-col gap-2">
          <div className="text-2xl">{`Partner:`}</div>
          <NoninteractiveInput
            input={lastPartnerInput}
            isActive={isCurrentPlayersTurn}
            playerVariant="secondary"
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          <div className="text-2xl">{`Partner:`}</div>
          <NoninteractiveInput
            input={lastPartnerInput}
            isActive={isCurrentPlayersTurn}
            playerVariant="primary"
          />
        </div>
        <InputForm
          gameId={game._id}
          isActive={isCurrentPlayersTurn}
          playerVariant="secondary"
        />
      </div>
    );
  }
}

export default Controls;
