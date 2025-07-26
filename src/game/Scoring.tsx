import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreCode, wrapInFunction } from "@/lib/ScoreCode";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CodeBlock } from "@/components/CodeBlock";

export function Scoring({ gameId }: { gameId: Id<"game"> }) {
  const scoringInfo = useQuery(api.games.infoForScoring, { gameId: gameId });
  const recordResult = useMutation(api.engine.recordResult);
  if (scoringInfo === undefined) {
    return <Skeleton />;
  }
  return (
    <CollapsibleCard header="Input done!" startOpen={true}>
      <div className="flex flex-col gap-2">
        <div>Code submitted:</div>
        <CodeBlock text={wrapInFunction(scoringInfo.code, scoringInfo.problem.language || "javascript")} />
        <div>Test cases:</div>
        <CodeBlock
          text={`const testCases = ${JSON.stringify(scoringInfo.problem.testCases, null, 2)}`}
        />
        <form
          className="flex flex-col items-start gap 2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = async () => {
              const language = scoringInfo.problem.language || "javascript";
              const result = await scoreCode(
                wrapInFunction(scoringInfo.code, language),
                scoringInfo.problem.testCases,
                language
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
