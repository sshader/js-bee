import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Playback from "./Playback";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { CodeBlock } from "@/components/CodeBlock";

export function CompleteGame({ gameId }: { gameId: Id<"game"> }) {
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
    .join(" ");

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
