export const wrapInPythonFunction = (body: string) => {
  return `def solution(a):\n\t${body}`;
};

export const ensurePyodideReady = async () => {
  for (let i = 0; i < 10; i += 1) {
    try {
      // @ts-ignore
      const pyodide = window.__Pyodide;
      if (pyodide) {
        const result = pyodide.runPython("1 + 1");
        if (result === 2) return pyodide;
      }
    } catch (e) {
      console.error(e);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve("success");
        }, 1000);
      });
    }
  }
  throw new Error("Pyodide wasn't ready");
};

export const scorePythonCode = async (
  funcCode: string,
  testCases: Array<{ args: any; expected: any }>
) => {
  const pyodide = await ensurePyodideReady();
  const pythonTestCode = `
${funcCode}

import json
test_cases_str = '${JSON.stringify(testCases)}'
test_cases = json.loads(test_cases_str)
results = []
print(test_cases)

for test_case in test_cases:
    try:
        actual = solution(test_case['args'])
        if actual == test_case['expected']:
            results.append({"status": "Passed"})
        else:
            results.append({"status": "ResultIncorrect", "actual": actual if actual is not None else "None"})
    except Exception as e:
        results.append({"status": "ExecutionFailed", "error": str(e)})

results
`;

  try {
    const result = pyodide.runPython(pythonTestCode);
    console.log(result);
    const resultJs = result.toJs();
    return resultJs.map((r: any) => ({
      status: r.status,
      error: r.error,
      actual: r.actual,
    }));
  } catch (e) {
    return Array(testCases.length).fill({
      status: "EvaluationFailed",
      error: (e as any).message ?? "",
    });
  }
};
