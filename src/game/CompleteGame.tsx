import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Playback from "./Playback";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { TestResultsDisplay } from "./TestResultsDisplay";

export function CompleteGame({ gameId }: { gameId: Id<"game"> }) {
  const info = useQuery(api.games.infoForPlayback, { gameId });
  if (info === undefined) {
    return <Skeleton />;
  }
  const result = info.testResults;
  const testCases = info.problem.testCases;
  const numPassed = result.results.filter((r) => r.status === "Passed").length;
  const total = testCases.length;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-2 flex flex-col gap-2">
        <CardTitle>
          {numPassed === total
            ? `Result: 🎉 ${numPassed} / ${total}`
            : `Result: 🤷 ${numPassed} / ${total}`}
        </CardTitle>
        <div>Code submitted:</div>
        <Playback
          inputs={info.inputs.flatMap((i) => i.inputs)}
          problemLanguage={info.problem.language ?? "javascript"}
        />
      </Card>
      <CollapsibleCard header="Test cases:" startOpen>
        <TestResultsDisplay results={result.results} testCases={testCases} />
      </CollapsibleCard>
    </div>
  );
}
