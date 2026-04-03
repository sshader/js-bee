import { Card } from "@/components/ui/card";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";

type TestResult =
  | { status: "Passed" }
  | { status: "ResultIncorrect"; actual: any }
  | { status: "ExecutionFailed"; error: string }
  | { status: "EvaluationFailed"; error: string };

type TestCase = { args: any; expected: any; hidden?: boolean };

export function TestResultsDisplay({
  results,
  testCases,
}: {
  results: TestResult[];
  testCases: TestCase[];
}) {
  const numPassed = results.filter((r) => r.status === "Passed").length;
  const total = results.length;
  const allPassed = numPassed === total;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex items-center gap-2 text-lg font-semibold ${
          allPassed ? "text-green-500" : "text-red-500"
        }`}
      >
        {allPassed ? (
          <CheckCircledIcon className="h-5 w-5" />
        ) : (
          <CrossCircledIcon className="h-5 w-5" />
        )}
        {numPassed}/{total} passed
      </div>

      <div className="flex flex-col gap-2">
        {results.map((r, idx) => {
          const testCase = testCases[idx];
          const isHidden = testCase?.hidden;
          const passed = r.status === "Passed";

          return (
            <Card key={idx} className="p-3">
              <div className="flex items-center gap-2">
                {passed ? (
                  <CheckCircledIcon className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <CrossCircledIcon className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className="font-medium text-sm">
                  Test {idx + 1}
                  {isHidden ? " (hidden)" : ""}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {r.status === "Passed"
                    ? "Passed"
                    : r.status === "ResultIncorrect"
                      ? "Wrong answer"
                      : r.status === "ExecutionFailed"
                        ? "Runtime error"
                        : "Evaluation error"}
                </span>
              </div>

              {!passed && !isHidden && (
                <div className="mt-2 text-sm font-mono space-y-1 pl-6">
                  <div>
                    <span className="text-muted-foreground">Args: </span>
                    {JSON.stringify(testCase?.args)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected: </span>
                    {JSON.stringify(testCase?.expected)}
                  </div>
                  {r.status === "ResultIncorrect" && (
                    <div className="text-red-500">
                      <span className="text-muted-foreground">Actual: </span>
                      {JSON.stringify(r.actual)}
                    </div>
                  )}
                  {(r.status === "ExecutionFailed" ||
                    r.status === "EvaluationFailed") && (
                    <div className="text-red-500">
                      <span className="text-muted-foreground">Error: </span>
                      {r.error}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
