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
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { CodeBlock } from "./components/CodeBlock";
import { Separator } from "@radix-ui/react-separator";
import { Link } from "./components/typography/link";
import { Skeleton } from "./components/ui/skeleton";

const makeCodeBlock = (body: string) => {
  return `function solution(a) {\n\t${body}\n}`;
};

function Game() {
  const player = useCurrentPlayer();
  const joinGame = useMutation(api.games.joinGame);
  const inviteGpt = useMutation(api.games.inviteChatGpt);

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
          {`${gameInfo.player1!.name} ${player._id === gameInfo.player1?._id ? "(You)" : ""}`}
        </div>
        <div>vs.</div>

        {gameInfo.player2 !== null ? (
          <div className="text-secondary">
            {`${gameInfo.player2.name} ${player._id === gameInfo.player2._id ? "(You)" : ""}`}
          </div>
        ) : player._id === gameInfo.player1?._id ? (
          <Button
            onClick={() => {
              void inviteGpt({
                gameId: gameInfo.game._id,
              });
            }}
          >
            Invite ChatGPT
          </Button>
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
          text={`${gameInfo.problem.prompt}\n\n${makeCodeBlock("// your code here")}`}
        />
      </CollapsibleCard>

      <Result
        game={gameInfo.game}
        problem={gameInfo.problem}
        inputs={gameInfo.inputs.flatMap((i) =>
          i.inputs.map((o) => o.operation)
        )}
      />
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

function Playback({ inputs }: { inputs: Array<any> }) {
  const [frame, setFrame] = useState(0);
  const [code, setCode] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const advance = setInterval(() => {
      const input = inputs[frame];
      const codeBeforeCursor = code.substring(0, cursor);
      const codeAfterCursor = code.substring(cursor);
      if (input.kind === "Add") {
        setCode(codeBeforeCursor + input.input + codeAfterCursor);
        setCursor(cursor + 1);
        setFrame(frame + 1);
        return;
      }
      if (input.kind === "Delete") {
        const newCursor =
          input.numDeleted === undefined
            ? Math.max(codeBeforeCursor.lastIndexOf("\n") - 1, 0)
            : cursor - input.numDeleted;
        setCode(codeBeforeCursor.substring(0, newCursor) + codeAfterCursor);
        setCursor(newCursor);
        setFrame(frame + 1);
        return;
      }
      if (input.kind === "MoveCursor") {
        setCursor(input.pos);
        setFrame(frame + 1);
        return;
      }
      if (input.kind === "Finish") {
        setCode("");
        setFrame(0);
        setCursor(0);
        return;
      }
    }, 200);
    return () => clearInterval(advance);
  });
  return <CodeBlock text={makeCodeBlock(code)} />;
}

function Result({
  game,
  problem,
  inputs,
}: {
  game: Doc<"game">;
  problem: Doc<"problem">;
  inputs: Array<any>;
}) {
  const recordResult = useMutation(api.engine.recordResult);
  const [testCasesOpen, setTestCasesOpen] = useState(true);
  const phase = game.phase;
  if (phase.status === "NotStarted") {
    return "Waiting for two players...";
  }
  if (phase.status === "InputDone") {
    return (
      <CollapsibleCard header="Input done!" startOpen={true}>
        <div className="flex flex-col gap-2">
          <div>Code submitted:</div>
          <CodeBlock text={makeCodeBlock(phase.code)} />
          <div>Test cases:</div>
          <CodeBlock
            text={`const testCases = ${JSON.stringify(problem.testCases, null, 2)}`}
          />
          <form
            className="flex flex-col items-start gap 2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = async () => {
                const result = await scoreCode(
                  makeCodeBlock(phase.code),
                  problem.testCases
                );
                await recordResult({
                  gameId: game._id,
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
  if (phase.status === "Inputting") {
    return <InnerGame game={game} />;
  }

  const result = phase.result;
  const testCases = problem.testCases;
  const resultCodeSnippets = result.map((r, idx) => {
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
  const numPassed = result.filter((r) => r.status === "Passed").length;
  const total = testCases.length;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-2 flex flex-col gap-2">
        <CardTitle>
          {numPassed === total
            ? `Result: 🎉🎉🎉 ${numPassed} / ${total}`
            : `Result: 🤷 ${numPassed} / ${total}`}
        </CardTitle>
        <div>Code submitted:</div>
        <Playback inputs={inputs} />
      </Card>
      <CollapsibleCard header="Test cases:" startOpen>
        <CodeBlock text={resultCodeSnippets.join("\n\n")} />
      </CollapsibleCard>
    </div>
  );
}

function InnerGame({ game }: { game: Doc<"game"> }) {
  const player = useCurrentPlayer();
  const isPlaying = game.player1 === player._id || game.player2 === player._id;
  if (isPlaying) {
    return <GameControls game={game} playerId={player._id} />;
  }
  return <SpectatingGame game={game} playerId={player._id} />;
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
  const { isCurrentPlayersTurn, lastPartnerInput } = result;
  if (game.phase.status !== "Inputting") {
    return "";
  }

  const [selfClass, partnerClass] =
    playerId == game.player1
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
        {renderInput(lastPartnerInput?.operation)}
      </div>
    </div>
  );
  return playerId == game.player1 ? (
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

function renderInput(input: any) {
  if (input === undefined) {
    return "(nothing)";
  }
  if (input.kind === "Add") {
    if (input.input === " ") {
      return "space";
    }
    if (input.input === "\n") {
      return "newline";
    }
    if (input.input === "\t") {
      return "tab";
    }
    return input.input;
  }
  if (input.kind === "Delete") {
    return "backspace";
  }
  if (input.kind === "Finished") {
    return "finished";
  }
  if (input.kind === "MoveCursor") {
    return "carriage return";
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
  return <CodeBlock text={makeCodeBlock(result.code)} />;
}
export default Game;
