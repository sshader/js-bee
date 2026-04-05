import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Badge } from "./ui/badge";
import { CodeBlock } from "./CodeBlock";
import { DifficultyBadge } from "./ProblemLibrary";
import { wrapInFunction } from "@/lib/ScoreCode";

export function ProblemDisplay({
  problemId,
  problemPrompt,
  problemLanguage,
}: {
  problemId: Id<"problem">;
  problemPrompt: string;
  problemLanguage: "javascript" | "python";
}) {
  const problem = useQuery(api.problems.read, { id: problemId });

  const visibleTests = (problem?.testCases ?? []).filter(
    (tc) => !(tc as any).hidden
  );

  return (
    <div className="flex flex-col gap-3">
      {problem && (
        <div className="flex items-center gap-2 flex-wrap">
          {problem.summary && (
            <span className="font-semibold text-lg">{problem.summary}</span>
          )}
          {problem.difficulty && (
            <DifficultyBadge difficulty={problem.difficulty} />
          )}
          {(problem.tags ?? []).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-sm">{problemPrompt}</p>

      {visibleTests.length > 0 && (
        <div>
          <span className="text-sm font-medium">Examples:</span>
          <div className="mt-1 space-y-1">
            {visibleTests.map((tc, i) => (
              <div key={i} className="text-sm font-mono">
                solution({JSON.stringify(tc.args)}) → {JSON.stringify(tc.expected)}
              </div>
            ))}
          </div>
        </div>
      )}

      <CodeBlock
        text={wrapInFunction("// your code here", problemLanguage)}
      />
    </div>
  );
}
