import { shouldInterruptAfterDeadline } from "quickjs-emscripten";

export const ensureQuickJsReady = async () => {
  for (let i = 0; i < 10; i += 1) {
    try {
      // @ts-ignore
      const QuickJS = window.__QuickJS;
      const result = QuickJS.evalCode("1 + 1", {
        shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + 1000),
        memoryLimitBytes: 1024 * 1024,
      });
      if (result === 2) return QuickJS;
    } catch (e) {
      console.error(e);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve("success");
        }, 1000);
      });
    }
  }
  throw new Error("QuickJS wasn't ready");
};

export const scoreCode = async (
  funcCode: string,
  testCases: Array<{ args: any; expected: any }>
) => {
  const QuickJS = await ensureQuickJsReady();
  const body = `${funcCode}
  
  const testCases = ${JSON.stringify(testCases)};
  testCases.map(t => {
    try {
      const actual = solution(t.args);
      if (actual === t.expected) {
        return { status: "Passed" }
      } else {
        return { status: "ResultIncorrect", actual: actual === undefined ? "undefined" : actual }
      }
    } catch (e) {
      return { status: "ExecutionFailed", error: e.message ?? "" }
    }
  })
  
`;
  try {
    const result = QuickJS.evalCode(body, {
      shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + 10 * 1000),
      memoryLimitBytes: 1024 * 1024,
    });
    return result;
  } catch (e) {
    return Array(testCases.length).fill({
      status: "EvaluationFailed",
      error: (e as any).message ?? "",
    });
  }
};
