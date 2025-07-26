import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
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
import Header from "./Header";

function Game() {
  const player = useCurrentPlayer();
  const joinGame = useMutation(api.games.joinGame);
  const inviteBot = useMutation(api.games.inviteBot);

  const { gameId } = useParams();
  const gameInfo = useQuery(api.games.gameInfo, { gameId: gameId! });
  const gameState = gameInfo?.game.status;

  if (gameInfo === undefined) {
    return <Skeleton />;
  }
  const expandSetup = gameState === "NotStarted" || gameState === "Inputting";
  return (
    <>
      <Header>
        <div className="flex gap-2   items-center font-normal text-sm">
          <div className="text-primary">
            {`${gameInfo.player1.name} ${player._id === gameInfo.player1?._id ? "(You)" : ""}`}
          </div>
          <div>and</div>

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
      </Header>
      <div className="flex flex-1 min-w-0 flex-col gap-4">
        <CollapsibleCard header={"How to play:"} startOpen={expandSetup}>
          <Instructions />
        </CollapsibleCard>

        <Prompt
          problemPrompt={gameInfo.problemPrompt}
          problemLanguage={gameInfo.problemLanguage}
          startOpen={expandSetup}
          game={gameInfo.game}
        />

        <GameState
          game={gameInfo.game}
          problemLanguage={gameInfo.problemLanguage}
        />
      </div>
    </>
  );
}

export function Prompt({
  problemPrompt,
  problemLanguage,
  startOpen,
  game,
}: {
  problemPrompt: string | null;
  problemLanguage: "javascript" | "python" | null;
  startOpen: boolean;
  game: Doc<"game">;
}) {
  const player = useCurrentPlayer();
  if (problemPrompt !== null && problemLanguage !== null) {
    return (
      <CollapsibleCard header="Prompt:" startOpen={startOpen}>
        <CodeBlock
          text={`${problemPrompt}\n\n${wrapInFunction(
            "// your code here",
            problemLanguage
          )}`}
        />
      </CollapsibleCard>
    );
  }
  const isPlaying = game.player1 === player._id || game.player2 === player._id;
  if (!isPlaying) {
    return (
      <CollapsibleCard header="Prompt:" startOpen={startOpen}>
        Waiting for players to select a problem...
      </CollapsibleCard>
    );
  }
  return (
    <CollapsibleCard header="Choose problem:" startOpen={startOpen}>
      <ProblemSelector gameId={game._id} />
    </CollapsibleCard>
  );
}

function ProblemSelector({ gameId }: { gameId: Id<"game"> }) {
  const player = useCurrentPlayer();
  const problems = useQuery(api.problems.list) ?? [];
  const selectProblem = useMutation(api.games.selectProblem);
  const createProblem = useMutation(api.problems.create);
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-2">
      {problems.map((p) => {
        return (
          <Card
            className="flex gap-2 items-center p-2 w-full justify-between hover:border-secondary cursor-default"
            key={p._id}
            onClick={() => {
              void selectProblem({
                playerId: player._id,
                gameId,
                problemId: p._id,
              });
            }}
          >
            <div className="flex gap-2 items-center">
              <span>{p.language === "python" ? "(Python)" : "(JS)"}</span>
              {p.summary ?? p.prompt.substring(0, 50)}
            </div>
          </Card>
        );
      })}
      <Button
        className="ml-auto mr-auto"
        onClick={() => {
          const f = async () => {
            const problem = await createProblem({
              prompt:
                "// Explain your problem here and give an example\nsolution({ a: 1, b: 2 }) // 3",
              testCases: [{ args: { a: 1, b: 2 }, expected: 3 }],
              isPublished: false,
            });
            navigate(`/problems/${problem._id}`);
          };
          void f();
        }}
      >
        New problem
      </Button>
    </div>
  );
}

export function GameState({
  game,
  problemLanguage,
}: {
  game: Doc<"game">;
  problemLanguage: "javascript" | "python";
}) {
  const player = useCurrentPlayer();
  switch (game.status) {
    case "NotStarted": {
      if (game.player2 === null) {
        if (player._id === game.player1) {
          return <Invite gameId={game._id} />;
        } else {
          return <JoinGame gameId={game._id} />;
        }
      } else {
        return null;
      }
    }
    case "InputDone": {
      return <Scoring gameId={game._id} />;
    }
    case "Done":
      return <CompleteGame gameId={game._id} />;
    case "Inputting": {
      const isPlaying =
        game.player1 === player._id || game.player2 === player._id;
      if (isPlaying) {
        return <Controls game={game} />;
      }
      return <SpectatingGame game={game} problemLanguage={problemLanguage} />;
    }
  }
}

function SpectatingGame({
  game,
  problemLanguage,
}: {
  game: Doc<"game">;
  problemLanguage: "javascript" | "python";
}) {
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
      <CodeBlock text={wrapInFunction(result.state.code, problemLanguage)} />
    </div>
  );
}
export default Game;
