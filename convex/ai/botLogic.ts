export type Language = "javascript" | "python";

export function constructPrompt(
  problemPrompt: string,
  codeSnippet: string,
  language: Language
) {
  const langName = language === "python" ? "Python" : "JavaScript";
  const functionWrapper =
    language === "python"
      ? `def solution(a):\n  ${codeSnippet}`
      : `function solution(a) {\n  ${codeSnippet}\n}`;

  return `Please finish implementing this ${langName} function based on the following prompt.
Please include code for the full function and do not include explanations.

Prompt:
${problemPrompt}

${functionWrapper}
`;
}

export function parseAIAnswer(
  rawAnswer: string,
  codeSnippet: string,
  language: Language
) {
  let answer = rawAnswer;

  // Extract from markdown code block
  const codeBlockLang = language === "python" ? "python" : "javascript";
  const codeBlockBegin = rawAnswer.indexOf("```" + codeBlockLang);
  const codeBlockEnd = rawAnswer.lastIndexOf("```");
  if (
    codeBlockBegin !== -1 &&
    codeBlockEnd !== -1 &&
    codeBlockBegin !== codeBlockEnd
  ) {
    answer = rawAnswer
      .substring(codeBlockBegin + ("```" + codeBlockLang).length, codeBlockEnd)
      .trim();
  }

  // Extract function body
  if (language === "python") {
    const functionMatch = /def solution\([a-z]+\):/.exec(answer);
    if (functionMatch !== null) {
      const funcBegin = functionMatch.index + functionMatch[0].length;
      // For Python, take everything after the def line and dedent one level
      const body = answer.substring(funcBegin);
      const lines = body.split("\n");
      // Skip the first empty line if present, then dedent
      const bodyLines = lines
        .filter((_, i) => i > 0 || _.trim() !== "")
        .map((line) => {
          if (line.startsWith("    ")) return line.substring(4);
          if (line.startsWith("\t")) return line.substring(1);
          return line;
        });
      const result = bodyLines.join("\n").trim();
      if (result) return result;
    }
  } else {
    const functionMatch = /function solution\([a-z]+\) {/.exec(answer);
    if (functionMatch !== null) {
      const funcBegin = functionMatch.index + functionMatch[0].length;
      const funcEnd = answer.lastIndexOf("}");
      if (funcBegin !== -1 && funcEnd !== -1) {
        return answer.substring(funcBegin, funcEnd).trim();
      }
    }
  }

  if (
    answer.replaceAll(/\s/g, "").startsWith(codeSnippet.replaceAll(/\s/g, ""))
  ) {
    return answer;
  }

  return "";
}

/**
 * Detect the base indentation unit in the answer (e.g. 4 spaces),
 * which corresponds to the first indent level that applyInput provides
 * automatically via \n\t.
 */
export function detectBaseIndent(answer: string): string {
  const match = /\n([ \t]+)\S/.exec(answer);
  return match ? match[1] : "    ";
}

export function getNextInputString(
  answer: string,
  code: string,
  bothBots: boolean,
  language: Language
) {
  const codePrefix = bothBots ? code : code.replaceAll(/\s+/g, "");
  let answerPrefix = "";
  let i = 0;
  while (i < answer.length) {
    if (codePrefix === "") {
      i = -1;
      break;
    }
    const char = answer[i];
    if (bothBots) {
      answerPrefix += char;
    } else if (!char.match(/\s/)) {
      answerPrefix += char;
    }
    if (answerPrefix === codePrefix) {
      break;
    }
    i += 1;
  }

  const baseIndent =
    !bothBots && language === "python" ? detectBaseIndent(answer) : null;

  // For Python: count how many \t characters are on the current line of
  // the code. Each tab corresponds to one indent level that's already
  // been applied (the first is from applyInput's auto-insert, any extras
  // were emitted by the bot on previous turns).
  let codeTabsOnCurrentLine = 0;
  if (baseIndent !== null) {
    const codeLineStart = code.lastIndexOf("\n") + 1;
    for (let k = codeLineStart; k < code.length; k++) {
      if (code[k] === "\t") codeTabsOnCurrentLine++;
      else break;
    }
  }

  let nextChar = undefined;
  const lastChar = code.at(-1);
  for (let j = i + 1; j < answer.length; j += 1) {
    const char = answer[j];

    // For Python: handle leading indentation at the start of a line.
    // Skip indent chars that are already represented by \t in the code,
    // and emit \t for additional indent levels.
    if (baseIndent !== null) {
      const lineStart = answer.lastIndexOf("\n", j) + 1;
      const posInLine = j - lineStart;
      const isLeadingWhitespace =
        (char === " " || char === "\t") &&
        answer.substring(lineStart, j).trim() === "";
      if (isLeadingWhitespace) {
        // How many chars of indentation are covered by tabs already in the code
        const charsAlreadyCovered = codeTabsOnCurrentLine * baseIndent.length;
        if (posInLine < charsAlreadyCovered) {
          // Already represented by a \t in the code — skip
          continue;
        }
        // There's more indentation in the answer — emit \t for the next level
        const extraPos = posInLine - charsAlreadyCovered;
        if (extraPos % baseIndent.length === 0) {
          nextChar = "\t";
          break;
        }
        // Mid-indent-unit space — skip
        continue;
      }
    }

    // Don't follow whitespace with whitespace
    if (!bothBots && lastChar && lastChar.match(/\s/)) {
      if (!char.match(/\s/)) {
        nextChar = char;
        break;
      }
    } else {
      nextChar = char;
      break;
    }
  }
  let nextInput: string = " ";
  if (nextChar === undefined) {
    nextInput = "done";
  } else if (nextChar === "\n") {
    nextInput = "\\n";
  } else if (nextChar === "\t") {
    nextInput = "\\t";
  } else {
    nextInput = nextChar;
  }
  return nextInput;
}
