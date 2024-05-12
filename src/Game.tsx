import { api } from "../convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { Button } from "./components/ui/button";
import { wrapInFunction } from "./lib/ScoreCode";
import { Card } from "./components/ui/card";
import { Link2Icon } from "@radix-ui/react-icons";
import { CodeBlock } from "./components/CodeBlock";
import { Skeleton } from "./components/ui/skeleton";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Controls from "./game/Controls";
import { Invite, JoinGame } from "./game/Invite";
import { Scoring } from "./game/Scoring";
import { CompleteGame } from "./game/CompleteGame";
import { Instructions } from "./game/Instructions";
import { CollapsibleCard } from "./components/CollapsibleCard";
import { ReadOnlyPlayerInputs } from "./game/PlayerInputs";

function Game() {
  const player = useCurrentPlayer();
  const joinGame = useMutation(api.games.joinGame);
  const inviteBot = useMutation(api.games.inviteBot);

  const { gameId } = useParams();
  const gameInfo = useQuery(api.games.gameInfo, { gameId: gameId! });
  const gameState = gameInfo?.game.phase.status;

  if (gameInfo === undefined) {
    return <Skeleton />;
  }
  const expandSetup = gameState === "NotStarted" || gameState === "Inputting";
  return (
    <div className="flex flex-1 min-w-0 flex-col gap-4">
      <div className="flex gap-4 items-center">
        <div className="text-primary">
          {`${gameInfo.player1.name} ${player._id === gameInfo.player1?._id ? "(You)" : ""}`}
        </div>
        <div>vs.</div>

        {gameInfo.player2 !== null ? (
          <div className="text-secondary">
            {`${gameInfo.player2.name} ${player._id === gameInfo.player2._id ? "(You)" : ""}`}
          </div>
        ) : player._id === gameInfo.player1?._id ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="secondary">Invite</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
              <Card className="flex flex-col">
                <DropdownMenu.Item
                  className="py-2 px-4"
                  onClick={() => {
                    void inviteBot({
                      gameId: gameInfo.game._id,
                      botType: "chatgpt",
                    });
                  }}
                >
                  Invite ChatGPT
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="py-2 px-4"
                  onClick={() => {
                    void inviteBot({
                      gameId: gameInfo.game._id,
                      botType: "claude",
                    });
                  }}
                >
                  Invite Claude
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="py-2 px-4 flex items-center gap-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  Copy link
                  <Link2Icon />
                </DropdownMenu.Item>
              </Card>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        ) : (
          <Button
            onClick={() => {
              void joinGame({
                gameId: gameInfo.game._id,
                playerId: player._id,
              });
            }}
          >
            Join game
          </Button>
        )}
      </div>
      <CollapsibleCard header={"How to play:"} startOpen={expandSetup}>
        <Instructions />
      </CollapsibleCard>

      <CollapsibleCard header="Prompt:" startOpen={expandSetup}>
        <CodeBlock
          text={`${gameInfo.problemPrompt}\n\n${wrapInFunction("// your code here")}`}
        />
      </CollapsibleCard>

      <GameState game={gameInfo.game} />
    </div>
  );
}

function GameState({ game }: { game: Doc<"game"> }) {
  const player = useCurrentPlayer();
  switch (game.phase.status) {
    case "NotStarted": {
      if (player._id === game.phase.player1) {
        return <Invite gameId={game._id} />;
      } else {
        return <JoinGame gameId={game._id} />;
      }
    }
    case "InputDone": {
      return <Scoring gameId={game._id} />;
    }
    case "Done":
      return <CompleteGame gameId={game._id} />;
    case "Inputting": {
      const isPlaying =
        game.phase.player1 === player._id || game.phase.player2 === player._id;
      if (isPlaying) {
        return <Controls game={game} />;
      }
      return <SpectatingGame game={game} />;
    }
  }
}

function SpectatingGame({ game }: { game: Doc<"game"> }) {
  const player = useCurrentPlayer();
  const result = useQuery(api.games.spectateGameInputs, {
    gameId: game._id,
    playerId: player._id,
  });
  if (result === undefined) {
    return <Skeleton />;
  }
  return (
    <div>
      <ReadOnlyPlayerInputs gameState={result.state} />
      <CodeBlock text={wrapInFunction(result.state.code)} />
    </div>
  );
}
export default Game;
