import { useNavigate, useParams } from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { CodeBlock } from "react-code-blocks";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { useEffect, useState } from "react";

function ProblemEditor() {
  const { problemId } = useParams();
  const problem = useQuery(api.problems.read, {
    id: problemId as Id<"problem">,
  });
  if (problem === undefined) {
    return "Loading...";
  } else if (problem === null) {
    return "Not found!";
  } else {
    return <Inner problem={problem} />;
  }
}

function Inner({ problem }: { problem: Doc<"problem"> }) {
  const player = useCurrentPlayer();
  const [code, setCode] = useState(problem.prompt);
  const [summary, setSummary] = useState(problem.summary);
  const [testCases, setTestCases] = useState(
    JSON.stringify(problem.testCases, null, 2)
  );
  const updateProblem = useMutation(api.problems.update);
  const startGame = useMutation(api.games.startGame);
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <h1>Add a new problem</h1>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          // https://stackoverflow.com/questions/9637517/parsing-relaxed-json-without-eval
          const correctJson = testCases.replace(
            /(['"])?([a-z0-9A-Z_]+)(['"])?:/g,
            '"$2": '
          );
          const parsedTestCases = JSON.parse(correctJson);
          const f = async () => {
            await updateProblem({
              id: problem._id,
              patch: {
                isPublished: true,
                prompt: code,
                summary,
                testCases: parsedTestCases,
              },
            });
            const gameId = await startGame({
              playerId: player._id,
              problemId: problem._id,
            });
            navigate(`/games/${gameId}`);
          };
          void f();
        }}
      >
        <div className="flex gap-2">
          <label>Title:</label>
          <input
            placeholder="E.g. Add numbers"
            value={summary}
            required
            onChange={(e) => {
              setSummary(e.target.value);
            }}
          />
        </div>
        <div>
          <h2>Prompt:</h2>
          <CodeEditor
            value={code}
            language="js"
            onChange={(evn) => setCode(evn.target.value)}
            padding={15}
            style={{
              backgroundColor: "#f5f5f5",
              fontFamily:
                "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
            }}
          />
        </div>
        <div>
          <h2>Test cases:</h2>
          <p>
            Solutions will be scored based on whether they pass these test cases
          </p>
          <CodeEditor
            value={`${testCases}`}
            language="js"
            placeholder="Please enter JS code."
            onChange={(evn) => setTestCases(evn.target.value)}
            padding={15}
            style={{
              backgroundColor: "#f5f5f5",
              fontFamily:
                "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
            }}
          />
        </div>
        <input type="submit" value={"Publish and start game"} />
      </form>
    </div>
  );
}

export default ProblemEditor;
