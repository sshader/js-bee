import { describe, expect, it } from "vitest";
import {
  constructPrompt,
  parseAIAnswer,
  detectBaseIndent,
  getNextInputString,
} from "./botLogic";
import { applyInput, getInitialState, type State } from "../../common/inputs";

// Helper: simulate the bot taking multiple turns, returning the sequence of
// inputs it would emit (like "a", "\\n", "\\t", "done").
// `humanInputs` is an optional array of inputs the human makes between bot turns.
function simulateBotTurns(
  answer: string,
  language: "javascript" | "python",
  maxTurns = 200,
  humanInputs: string[] = []
): string[] {
  const inputs: string[] = [];
  let state = getInitialState();
  let humanIdx = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    // Optionally apply a human input first
    if (humanIdx < humanInputs.length) {
      const humanInput = humanInputs[humanIdx];
      humanIdx++;
      state = applyInput(state, {
        isPlayer1: true,
        operation: parseInputOp(humanInput, state.code),
      });
    }

    const input = getNextInputString(answer, state.code, false, language);
    inputs.push(input);
    if (input === "done") break;

    // Apply the bot's input to the state (simulating applyInput)
    state = applyInput(state, {
      isPlayer1: false,
      operation: parseInputOp(input, state.code),
    });
  }
  return inputs;
}

// Minimal parseInput for test purposes (mirrors engine.ts parseInput)
function parseInputOp(input: string, code: string) {
  if (input === "done") return { kind: "Finish" as const };
  if (input === "\\n") return { kind: "Add" as const, input: "\n" };
  if (input === "\\t") return { kind: "Add" as const, input: "\t" };
  if (input === " ") return { kind: "Add" as const, input: " " };
  return { kind: "Add" as const, input };
}

// Helper to reconstruct code from a sequence of inputs
function codeFromInputs(inputs: string[], language: "javascript" | "python") {
  let state = getInitialState();
  for (const input of inputs) {
    if (input === "done") break;
    state = applyInput(state, {
      isPlayer1: false,
      operation: parseInputOp(input, state.code),
    });
  }
  return state.code;
}

describe("detectBaseIndent", () => {
  it("detects 4-space indent", () => {
    expect(detectBaseIndent("c = 0\n    for x in a:")).toBe("    ");
  });

  it("detects 2-space indent", () => {
    expect(detectBaseIndent("x = 1\n  return x")).toBe("  ");
  });

  it("defaults to 4 spaces when no indentation", () => {
    expect(detectBaseIndent("return a + b")).toBe("    ");
  });
});

describe("parseAIAnswer", () => {
  it("extracts JS function body from markdown", () => {
    const raw = '```javascript\nfunction solution(a) {\n  return a + 1;\n}\n```';
    expect(parseAIAnswer(raw, "", "javascript")).toBe("return a + 1;");
  });

  it("extracts Python function body and dedents", () => {
    const raw =
      "```python\ndef solution(a):\n    c = 0\n    for x in a:\n        c += x\n    return c\n```";
    const result = parseAIAnswer(raw, "", "python");
    expect(result).toBe("c = 0\nfor x in a:\n    c += x\nreturn c");
  });

  it("handles Python with tab indentation", () => {
    const raw =
      "```python\ndef solution(a):\n\treturn a + 1\n```";
    expect(parseAIAnswer(raw, "", "python")).toBe("return a + 1");
  });
});

describe("constructPrompt", () => {
  it("wraps JS code in function", () => {
    const result = constructPrompt("Add one", "return a + 1;", "javascript");
    expect(result).toContain("function solution(a)");
    expect(result).toContain("return a + 1;");
    expect(result).toContain("JavaScript");
  });

  it("wraps Python code in def", () => {
    const result = constructPrompt("Add one", "return a + 1", "python");
    expect(result).toContain("def solution(a):");
    expect(result).toContain("return a + 1");
    expect(result).toContain("Python");
  });
});

describe("getNextInputString", () => {
  describe("JavaScript (human vs bot)", () => {
    it("emits first character when code is empty", () => {
      expect(
        getNextInputString("return a + 1", "", false, "javascript")
      ).toBe("r");
    });

    it("emits next non-whitespace char", () => {
      // code "r" (stripped: "r"), answer "return a + 1"
      // position lands on "r", next is "e"
      expect(
        getNextInputString("return a + 1", "r", false, "javascript")
      ).toBe("e");
    });

    it("skips whitespace after whitespace in code", () => {
      // code ends with \n\t, answer has \nreturn — skip whitespace, emit r
      expect(
        getNextInputString("a\n  return b", "a\n\t", false, "javascript")
      ).toBe("r");
    });

    it("emits space between tokens when code doesn't end with whitespace", () => {
      expect(
        getNextInputString("return a + 1", "return", false, "javascript")
      ).toBe(" ");
    });

    it("emits done when answer is exhausted", () => {
      expect(
        getNextInputString("return a", "return a", false, "javascript")
      ).toBe("done");
    });

    it("can simulate full JS answer", () => {
      const answer = "return a + 1";
      const inputs = simulateBotTurns(answer, "javascript");
      expect(inputs[inputs.length - 1]).toBe("done");
      const code = codeFromInputs(inputs, "javascript");
      // Code won't match exactly (whitespace differences) but non-whitespace should match
      expect(code.replaceAll(/\s+/g, "")).toBe(answer.replaceAll(/\s+/g, ""));
    });
  });

  describe("Python (human vs bot)", () => {
    it("emits first char when code is empty", () => {
      expect(
        getNextInputString(
          "c = 0\nfor x in a:\n    if x:",
          "",
          false,
          "python"
        )
      ).toBe("c");
    });

    it("emits space between tokens", () => {
      // After "for", should emit space before "x"
      const answer = "for x in a:\n    pass";
      // Simulate: code has been built up to "for"
      // stripped code: "for", answer stripped starts with "forxina:pass"
      // position at "r" in answer, next char is " " (space before x)
      // lastChar of code is "r" (not whitespace), so space is emitted
      expect(
        getNextInputString(answer, "for", false, "python")
      ).toBe(" ");
    });

    it("skips base indent after newline", () => {
      // answer: "c = 0\nfor x in a:", base indent = 4 spaces (from \n before "for"? No...)
      // Actually: "c = 0\nfor x in a:" — "for" is NOT indented
      // Let's use an answer with actual indentation
      const answer = "for x in a:\n    c += x\nreturn c";
      // code is "for x in a:\n\t" (applyInput added \t after \n)
      // The base indent is 4 spaces. Bot should skip the 4 spaces and emit "c"
      expect(
        getNextInputString(answer, "for x in a:\n\t", false, "python")
      ).toBe("c");
    });

    it("emits tab for extra indent level", () => {
      const answer =
        "for x in a:\n    if x == 0:\n        c += 1\nreturn c";
      // Code is at the point after "if x == 0:" and newline
      // applyInput gives \n\t. Bot needs to emit \t for the extra indent.
      expect(
        getNextInputString(
          answer,
          "for x in a:\n\tif x == 0:\n\t",
          false,
          "python"
        )
      ).toBe("\\t");
    });

    it("emits code char after extra indent tab has been applied", () => {
      const answer =
        "for x in a:\n    if x == 0:\n        c += 1\nreturn c";
      // After bot emitted \t, code now ends with \n\t\t
      // Now should emit "c" (the actual code after 8 spaces of indent)
      expect(
        getNextInputString(
          answer,
          "for x in a:\n\tif x == 0:\n\t\t",
          false,
          "python"
        )
      ).toBe("c");
    });

    it("handles dedent correctly (back to base level)", () => {
      const answer =
        "for x in a:\n    c += x\nreturn c";
      // After finishing "c += x", newline back to base level
      // code: "for x in a:\n\tc += x\n\t" — the \t is auto-added by applyInput
      // Bot should skip the base indent and emit "r" for "return"
      expect(
        getNextInputString(
          answer,
          "for x in a:\n\tc += x\n\t",
          false,
          "python"
        )
      ).toBe("r");
    });

    it("can simulate a full Python answer with nested indentation", () => {
      const answer =
        "c = 0\nfor x in a:\n    if x == 0:\n        c += 1\nreturn c";
      const inputs = simulateBotTurns(answer, "python");
      expect(inputs[inputs.length - 1]).toBe("done");
      const code = codeFromInputs(inputs, "python");
      // Check non-whitespace matches
      expect(code.replaceAll(/\s+/g, "")).toBe(
        answer.replaceAll(/\s+/g, "")
      );
    });

    it("can simulate the parens-checking answer from the logs", () => {
      const answer =
        "c = 0\nfor x in a:\n    if x == '(':\n        c += 1\n    elif x == ')':\n        c -= 1\n        if c < 0:\n            return False\nreturn c == 0";
      const inputs = simulateBotTurns(answer, "python");
      expect(inputs[inputs.length - 1]).toBe("done");
      const code = codeFromInputs(inputs, "python");
      expect(code.replaceAll(/\s+/g, "")).toBe(
        answer.replaceAll(/\s+/g, "")
      );
    });

    it("does not get stuck in infinite loop emitting tabs", () => {
      const answer =
        "for x in a:\n    if x == 0:\n        c += 1\nreturn c";
      const inputs = simulateBotTurns(answer, "python", 500);
      // Should finish, not hit 500 turns
      expect(inputs[inputs.length - 1]).toBe("done");
      expect(inputs.length).toBeLessThan(200);
    });
  });

  describe("mixed human + bot turns (Python)", () => {
    it("handles human typing first chars, bot continuing", () => {
      const answer = "return a + 1";
      // Human types "r", "t" — but bot answer has "return"
      // After human types "r", bot should continue with "e"
      const result = getNextInputString(answer, "r", false, "python");
      expect(result).toBe("e");
    });
  });
});
