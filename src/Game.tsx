import { useSessionId } from "convex-helpers/react/sessions";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CodeBlock, dracula } from "react-code-blocks";
import { useCurrentPlayer } from "./lib/PlayerProvider";

const makeCodeBlock = (body: string) => {
  return `const solution = (a) => {\n\t${body}\n}`;
};

function Game() {
  const player = useCurrentPlayer();

  const { gameId } = useParams();
  const gameInfo = useQuery(api.myFunctions.gameInfo, { gameId: gameId! });
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
          {gameInfo.player2 === null
            ? "Waiting for another player..."
            : `Player 2: ${gameInfo.player2.name} ${player._id === gameInfo.player2._id ? "(You)" : ""}`}
        </div>
      </div>
      <h1>Instructions:</h1>
      <div>
        This is a "JavaScript Bee". Two people take turns coding out a solution
        one character at a time. In Type "done" on your turn to finish the
        solution, type "clear" to start from scratch.
      </div>
      <div>
        <h2>Prompt</h2>
        <CodeBlock
          text={gameInfo.prompt}
          language={"js"}
          showLineNumbers={false}
          theme={dracula}
        />
      </div>
      {gameInfo.game.phase.status === "NotStarted" ? (
        <div style={{ fontFamily: "monospace" }}>
          <CodeBlock
            text={makeCodeBlock("// your code here")}
            language={"js"}
            showLineNumbers={false}
            theme={dracula}
          />
        </div>
      ) : null}

      {renderResult(gameInfo.game)}
    </div>
  );
}

function renderResult(game: Doc<"game">) {
  if (game.phase.status === "NotStarted") {
    return "Waiting for two players...";
  }
  if (game.phase.status === "InputDone") {
    return "Scoring...";
  }
  if (game.phase.status === "Inputting") {
    return <InnerGame game={game} />;
  }

  const result = game.phase.result;
  return (
    <div>
      <h2>Done!</h2>
      <div>Code submitted:</div>
      <div className="font-mono">
        <CodeBlock
          text={makeCodeBlock(game.phase.code)}
          language={"js"}
          showLineNumbers={false}
          theme={dracula}
        />
      </div>
      <div>Test cases:</div>
      {...result.map((r) => {
        switch (r.status) {
          case "EvaluationFailed":
            return <div>❌ Evaluation failed</div>;
          case "ExecutionFailed":
            return <div>❌ Execution failed</div>;
          case "ResultIncorrect":
            return (
              <div>{`❌ Result incorrect: Expected {}, Actual ${r.actual}`}</div>
            );
          case "Passed":
            return <div>✅ Passed!</div>;
        }
      })}
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
  const result = useQuery(api.myFunctions.watchGameWhilePlaying, {
    gameId: game._id,
    playerId,
  });
  const [playerInput, setPlayerInput] = useState("");
  const takeTurn = useMutation(api.myFunctions.takeTurn);
  if (result === undefined) {
    return "Loading...";
  }
  const { isCurrentPlayersTurn, lastPartnerInput } = result;
  if (game.phase.status !== "Inputting") {
    return "";
  }
  return (
    <div>
      <div>
        {isCurrentPlayersTurn ? `Your turn!` : `Waiting on other player!`}
      </div>
      <div>{`Your partner last said: ${lastPartnerInput ?? "(nothing)"}`}</div>
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

function SpectatingGame({
  game,
  playerId,
}: {
  game: Doc<"game">;
  playerId: Id<"player">;
}) {
  const result = usePaginatedQuery(
    api.myFunctions.spectateGameInputs,
    { gameId: game._id, playerId },
    { initialNumItems: 10000 }
  );
  if (result === undefined || result.status !== "Exhausted") {
    return "Loading...";
  }
  return (
    <div style={{ fontFamily: "monospace" }}>
      <CodeBlock
        text={makeCodeBlock(result.results.map((r) => r.input).join(""))}
        language={"js"}
        showLineNumbers={false}
        theme={dracula}
      />
    </div>
  );
}
export default Game;
