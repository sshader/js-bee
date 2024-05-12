import { api } from "../convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { Button } from "./components/ui/button";
import { scoreCode } from "./lib/ScoreCode";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardTitle } from "./components/ui/card";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Link1Icon,
  Link2Icon,
} from "@radix-ui/react-icons";
import { CodeBlock } from "./components/CodeBlock";
import { Separator } from "@radix-ui/react-separator";
import { Link } from "./components/typography/link";
import { Skeleton } from "./components/ui/skeleton";
import {
  Input,
  Operation,
  State,
  applyInput,
  getInitialState,
} from "../common/inputs";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const makeCodeBlock = (body: string) => {
  return `function solution(a) {\n\t${body}\n}`;
};

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
          text={`${gameInfo.problemPrompt}\n\n${makeCodeBlock("// your code here")}`}
        />
      </CollapsibleCard>

      <Result game={gameInfo.game} />
    </div>
  );
}

function CollapsibleCard({
  header,
  startOpen,
  children,
}: {
  header: string;
  startOpen: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(startOpen);
  useEffect(() => {
    setIsOpen(startOpen);
  }, [setIsOpen, startOpen]);
  return (
    <Collapsible open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <Card className="flex flex-col gap-4 p-2">
        <CollapsibleTrigger className="flex flex-col gap-2">
          <CardTitle className="flex gap-2 w-full">
            <div>{header}</div>
            {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </CardTitle>
          {isOpen && (
            <Separator decorative className="w-full h-[1px] bg-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Instructions() {
  return (
    <div>
      <p>
        This is a{" "}
        <Link
          href="https://dropbox.tech/developers/introducing-the-python-bee"
          target="_blank"
        >
          "JavaScript Bee"
        </Link>
        . Two people take turns coding out a solution one character at a time
        without being able to see what you're writing until the end.
      </p>
      <div className="whitespace-pre-line">
        {`
              Special commands:
                - Type "done" on your turn to finish the solution
                - Type "clearline" to clear the last line (including the newline)
                - Type "clear N" to clear the last N characters.
                - In case of emergency, type "skip N" to skip your partner N times`}
      </div>
    </div>
  );
}

function Playback({ inputs }: { inputs: Array<Input> }) {
  const [frame, setFrame] = useState(0);
  const [gameState, setGameState] = useState<State>(getInitialState());

  useEffect(() => {
    const advance = setInterval(() => {
      let f = frame;
      let input = inputs[f];
      f = (f + 1) % inputs.length;
      setFrame(f);
      setGameState(applyInput(f === 0 ? getInitialState() : gameState, input));
      if (input.operation.kind === "Skipped") {
        input = inputs[f];
        f = (f + 1) % inputs.length;
        setFrame(f);
        setGameState(
          applyInput(f === 0 ? getInitialState() : gameState, input)
        );
      }
    }, 300);
    return () => clearInterval(advance);
  });
  return (
    <div className="flex flex-col gap">
      <div className="flex gap-2">
        <div
          className={`border-solid rounded-md border-4 p-4 text-4xl text-center min-w-[5em] ${gameState.isLastPlayerPlayer1 ? "border-primary" : "border-muted text-muted"}`}
        >
          {renderInput(gameState.lastPlayer1Input)}
        </div>
        <div
          className={`border-solid rounded-md border-4 p-4 text-4xl text-center min-w-[5em] ${gameState.isLastPlayerPlayer1 ? "border-muted text-muted" : "border-secondary"}`}
        >
          {renderInput(gameState.lastPlayer2Input)}
        </div>
      </div>
      <CodeBlock text={makeCodeBlock(gameState.code)} />
    </div>
  );
}

function Result({ game }: { game: Doc<"game"> }) {
  const player = useCurrentPlayer();
  const joinGame = useMutation(api.games.joinGame);
  switch (game.phase.status) {
    case "NotStarted": {
      if (player._id === game.phase.player1) {
        return <Invite gameId={game._id} />;
      } else {
        return (
          <Card>
            This game needs another player!
            <Button
              variant="secondary"
              onClick={() => {
                void joinGame({ gameId: game._id, playerId: player._id });
              }}
            >
              Join
            </Button>
          </Card>
        );
      }
    }
    case "InputDone": {
      return <Scoring gameId={game._id} />;
    }
    case "Done":
      return <Done gameId={game._id} />;
    case "Inputting": {
      const isPlaying =
        game.phase.player1 === player._id || game.phase.player2 === player._id;
      if (isPlaying) {
        return <GameControls game={game} playerId={player._id} />;
      }
      return <SpectatingGame game={game} playerId={player._id} />;
    }
  }
}

function Done({ gameId }: { gameId: Id<"game"> }) {
  const info = useQuery(api.games.infoForPlayback, { gameId });
  if (info === undefined) {
    return <Skeleton />;
  }
  const result = info.testResults;
  const testCases = info.problem.testCases;
  const resultCodeSnippets = result.results.map((r, idx) => {
    const testCase = testCases[idx];
    const argStr = JSON.stringify(testCase.args, null, 2);
    const expected = JSON.stringify(testCase.expected, null, 2);
    const funcCall = `solution(${argStr}); // -> ${expected}`;
    switch (r.status) {
      case "EvaluationFailed":
        return `// ❌ Evaluation failed -- ${r.error}\n${funcCall}`;
      case "ExecutionFailed":
        return `// ❌ Execution failed -- ${r.error}\n${funcCall}`;
      case "ResultIncorrect":
        return `// ❌ Result incorrect -- Actual: ${JSON.stringify(r.actual, null, 2)}\n${funcCall}`;
      case "Passed":
        return `// ✅ Passed!\n${funcCall}`;
      default:
        return "";
    }
  });
  const numPassed = result.results.filter((r) => r.status === "Passed").length;
  const total = testCases.length;
  const summaryString = result.results
    .map((r) => (r.status === "Passed" ? "✅" : "❌"))
    .join("");

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-2 flex flex-col gap-2">
        <CardTitle>
          {numPassed === total
            ? `Result: 🎉 ${summaryString} ${numPassed} / ${total}`
            : `Result: 🤷 ${summaryString} ${numPassed} / ${total}`}
        </CardTitle>
        <div>Code submitted:</div>
        <Playback inputs={info.inputs.flatMap((i) => i.inputs)} />
      </Card>
      <CollapsibleCard header="Test cases:" startOpen>
        <CodeBlock text={resultCodeSnippets.join("\n\n")} />
      </CollapsibleCard>
    </div>
  );
}

function Scoring({ gameId }: { gameId: Id<"game"> }) {
  const scoringInfo = useQuery(api.games.infoForScoring, { gameId: gameId });
  const recordResult = useMutation(api.engine.recordResult);
  if (scoringInfo === undefined) {
    return <Skeleton />;
  }
  return (
    <CollapsibleCard header="Input done!" startOpen={true}>
      <div className="flex flex-col gap-2">
        <div>Code submitted:</div>
        <CodeBlock text={makeCodeBlock(scoringInfo.code)} />
        <div>Test cases:</div>
        <CodeBlock
          text={`const testCases = ${JSON.stringify(scoringInfo.problem.testCases, null, 2)}`}
        />
        <form
          className="flex flex-col items-start gap 2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = async () => {
              const result = await scoreCode(
                makeCodeBlock(scoringInfo.code),
                scoringInfo.problem.testCases
              );
              await recordResult({
                gameId,
                testCaseResults: result,
              });
            };
            void f();
          }}
        >
          <div className="flex gap-2">
            <input type="checkbox" required />
            <label>
              I acknowledge that this code will run these test cases in my
              browser, and accept the risk.
            </label>
          </div>
          <Button type="submit">Run and score</Button>
        </form>
      </div>
    </CollapsibleCard>
  );
}

function Invite({ gameId }: { gameId: Id<"game"> }) {
  const inviteBot = useMutation(api.games.inviteBot);
  return (
    <Card className="flex flex-col gap-4 p-2">
      Waiting for another player. Want to invite one?
      <div className="flex w-full gap-4">
        <Button
          variant="secondary"
          onClick={() => {
            void inviteBot({
              gameId,
              botType: "chatgpt",
            });
          }}
        >
          Invite ChatGPT
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void inviteBot({
              gameId,
              botType: "claude",
            });
          }}
        >
          Invite Claude
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
          }}
        >
          Copy link
          <Link2Icon />
        </Button>
      </div>
    </Card>
  );
}

function GameControls({
  game,
  playerId,
}: {
  game: Doc<"game">;
  playerId: Id<"player">;
}) {
  const result = useQuery(api.games.watchGameWhilePlaying, {
    gameId: game._id,
    playerId,
  });
  const [playerInput, setPlayerInput] = useState("");
  const takeTurn = useMutation(api.engine.takeTurn);
  if (result === undefined) {
    return <Skeleton />;
  }

  if (game.phase.status !== "Inputting" || result === null) {
    return "";
  }
  const { isCurrentPlayersTurn, lastPartnerInput } = result;

  const [selfClass, partnerClass] =
    playerId == game.phase.player1
      ? ["primary", "secondary"]
      : ["secondary", "primary"];
  const playerForm = (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void takeTurn({
          gameId: game._id,
          playerId,
          input: playerInput,
        }).finally(() => setPlayerInput(""));
      }}
    >
      <div
        className="text-2xl"
        title={isCurrentPlayersTurn ? "Your turn!" : "Waiting for partner"}
      >{`You: ${isCurrentPlayersTurn ? "👩‍💻" : "🕦"}`}</div>
      <input
        className={`text-${selfClass} border-solid rounded-md border-4 border-muted p-4 text-4xl w-[5em] text-center`}
        autoFocus
        value={playerInput}
        onChange={(event) => setPlayerInput(event.target.value)}
      />
      <Button type="submit" variant="outline" disabled={!isCurrentPlayersTurn}>
        Submit
      </Button>
    </form>
  );
  const partnerState = (
    <div className="flex flex-col gap-2">
      <div className="text-2xl">Partner:</div>
      <div
        className={`border-solid rounded-md border-4 p-4 text-4xl text-center min-w-[5em] ${isCurrentPlayersTurn ? `border-${partnerClass}` : "border-muted text-muted"}`}
      >
        {renderInput(lastPartnerInput)}
      </div>
    </div>
  );
  return playerId == game.phase.player1 ? (
    <div className="flex gap-4">
      {playerForm}
      {partnerState}
    </div>
  ) : (
    <div className="flex gap-4">
      {partnerState}
      {playerForm}
    </div>
  );
}

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

function SpectatingGame({
  game,
  playerId,
}: {
  game: Doc<"game">;
  playerId: Id<"player">;
}) {
  const result = useQuery(api.games.spectateGameInputs, {
    gameId: game._id,
    playerId,
  });
  if (result === undefined) {
    return <Skeleton />;
  }
  return <CodeBlock text={makeCodeBlock(result.state.code)} />;
}
export default Game;
