import { useNavigate, useParams } from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { useState } from "react";
import { Skeleton } from "./components/ui/skeleton";
import { SheetTitle } from "./components/ui/sheet";
import { Label } from "@radix-ui/react-label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";

function ProblemEditor() {
  const { problemId } = useParams();
  const problem = useQuery(api.problems.read, {
    id: problemId as Id<"problem">,
  });
  if (problem === undefined) {
    return <Skeleton />;
  } else if (problem === null) {
    return "Not found!";
  } else {
    return <Inner problem={problem} />;
  }
}

function Inner({ problem }: { problem: Doc<"problem"> }) {
  const [code, setCode] = useState(problem.prompt);
  const [summary, setSummary] = useState(problem.summary);
  const [testCases, setTestCases] = useState(
    JSON.stringify(problem.testCases, null, 2)
  );
  const updateProblem = useMutation(api.problems.update);
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <SheetTitle className="text-center">Add a new problem</SheetTitle>
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
            navigate(-1);
          };
          void f();
        }}
      >
        <div className="flex gap-2 items-center">
          <Label>Title:</Label>
          <Input
            placeholder="E.g. Add numbers"
            value={summary}
            required
            onChange={(e) => {
              setSummary(e.target.value);
            }}
          />
        </div>
        <div>
          <Label>Prompt:</Label>
          <CodeEditor
            value={code}
            language="js"
            onChange={(evn) => setCode(evn.target.value)}
            padding={15}
          />
        </div>
        <div>
          <Label>Test cases:</Label>
          <p className="text-xs">
            Solutions will be scored based on whether they pass these test cases
          </p>
          <CodeEditor
            value={`${testCases}`}
            language="js"
            placeholder="Please enter JS code."
            onChange={(evn) => setTestCases(evn.target.value)}
            padding={15}
          />
        </div>
        <Button type="submit" className="m-auto">
          Save
        </Button>
      </form>
    </div>
  );
}

export default ProblemEditor;
