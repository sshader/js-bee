import { api } from "../convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CodeBlock, dracula } from "react-code-blocks";
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

const makeCodeBlock = (body: string) => {
  return `function solution(a) {\n\t${body}\n}`;
};

function Game() {
  const player = useCurrentPlayer();
  const joinGame = useMutation(api.games.joinGame);
  const inviteGpt = useMutation(api.games.inviteChatGpt);

  const { gameId } = useParams();
  const gameInfo = useQuery(api.games.gameInfo, { gameId: gameId! });
  if (gameInfo === undefined) {
    return "Loading...";
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          {`Player 1: ${gameInfo.player1!.name} ${player._id === gameInfo.player1?._id ? "(You)" : ""}`}
        </div>
        <div>
          {gameInfo.player2 !== null ? (
            `Player 2: ${gameInfo.player2.name} ${player._id === gameInfo.player2._id ? "(You)" : ""}`
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
      </div>
      <Instructions />

      <div>
        <h2>Prompt</h2>
        <div style={{ fontFamily: "monospace" }}>
          <CodeBlock
            text={`${gameInfo.problem.prompt}\n\n${makeCodeBlock("// your code here")}`}
            language={"js"}
            showLineNumbers={false}
            theme={dracula}
          />
        </div>
      </div>

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

function Instructions() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Collapsible open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <CollapsibleTrigger>
        <Button variant="default">
          <CardTitle>How to play: </CardTitle>
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div>
          <p>
            This is a "JavaScript Bee". Two people take turns coding out a
            solution one character at a time.
          </p>
          <div>
            Special commands:
            <ul>
              <li>Type "done" on your turn to finish the solution</li>
              <li>Type "clear" to clear the last line.</li>
            </ul>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
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
  return (
    <div className="font-mono">
      <CodeBlock
        text={makeCodeBlock(code)}
        language={"js"}
        showLineNumbers={false}
        theme={dracula}
      />
    </div>
  );
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
      <div className="flex flex-col gap-2">
        <h2>Input done!</h2>
        <div>Code submitted:</div>
        <div className="font-mono">
          <CodeBlock
            text={makeCodeBlock(phase.code)}
            language={"js"}
            showLineNumbers={false}
            theme={dracula}
          />
        </div>
        <div>Test cases:</div>
        <div className="font-mono">
          <CodeBlock
            text={`const testCases = ${JSON.stringify(problem.testCases, null, 2)}`}
            language={"js"}
            showLineNumbers={false}
            theme={dracula}
          />
        </div>
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
    <div>
      <h2>Done!</h2>
      <Collapsible
        open={testCasesOpen}
        onOpenChange={(open) => setTestCasesOpen(open)}
      >
        <CollapsibleTrigger>
          <Button variant="default">
            <div>Test cases:</div>
            <div>
              {numPassed === total
                ? `🎉🎉🎉 ${numPassed} / ${total}`
                : `🤷 ${numPassed} / ${total}`}
            </div>
            {testCasesOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="font-mono">
            <CodeBlock
              text={resultCodeSnippets.join("\n\n")}
              language={"js"}
              showLineNumbers={false}
              theme={dracula}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div>Code submitted:</div>
      <Playback inputs={inputs} />
    </div>
  );
}

function InnerGame({ game }: { game: Doc<"game"> }) {
  const player = useCurrentPlayer();
  const isPlaying = game.player1 === player._id || game.player2 === player._id;
  if (isPlaying) {
    return <PlayingGame game={game} playerId={player._id} />;
  }
  return <SpectatingGame game={game} playerId={player._id} />;
}

function PlayingGame({
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
    return "Loading...";
  }
  const { isCurrentPlayersTurn, lastPartnerInput } = result;
  if (game.phase.status !== "Inputting") {
    return "";
  }
  return (
    <div className="text-xl">
      <div>
        {isCurrentPlayersTurn ? `Your turn!` : `Waiting on other player!`}
      </div>
      <div>{`Your partner last said: ${renderInput(lastPartnerInput?.operation)}`}</div>
      <form
        style={{ display: "flex", gap: "5px" }}
        onSubmit={(e) => {
          e.preventDefault();
          void takeTurn({
            gameId: game._id,
            playerId,
            input: playerInput,
          }).finally(() => setPlayerInput(""));
        }}
      >
        <input
          autoFocus
          value={playerInput}
          onChange={(event) => setPlayerInput(event.target.value)}
          placeholder="Next character..."
        />
        <input type="submit" value="Submit" disabled={!isCurrentPlayersTurn} />
      </form>
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
    return "Loading...";
  }
  return (
    <div style={{ fontFamily: "monospace" }}>
      <CodeBlock
        text={makeCodeBlock(result.code)}
        language={"js"}
        showLineNumbers={false}
        theme={dracula}
      />
    </div>
  );
}
export default Game;
