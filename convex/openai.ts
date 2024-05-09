import { OpenAI } from "openai";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import levenshtein from "js-levenshtein";
import { handleTurn } from "./engine";

function constructPrompt(problemPrompt: string, codeSnippet: string) {
  return `Please finish implementing this JavaScript function based on the following prompt. 
Only include code and do not include explanations.

Prompt:
${problemPrompt}

function solution(a) {
  ${codeSnippet}
}
`;
}

export const takeTurn = internalMutation({
  args: {
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    const problem = await ctx.db.get(game.problemId);
    if (problem === null) {
      throw new Error("Unknown problem");
    }
    const codeDoc = (await ctx.db
      .query("code")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .unique())!;
    const originalCode = codeDoc.code.substring(0, codeDoc.cursorPosition);
    const codeWithoutSpaces = originalCode.replaceAll(/\s+/g, "");
    const answers = await ctx.db
      .query("aiAnswers")
      .withIndex("ByPrompt", (q) => q.eq("prompt", problem.prompt))
      .collect();
    const answer = answers.find((a) => {
      if (a.answer === null) {
        return false;
      }
      if (a.solutionSnippet.startsWith(codeWithoutSpaces)) {
        return true;
      }
      const answerWithoutSpaces = a.answer
        .replaceAll(/\s+/g, "")
        .substring(0, codeWithoutSpaces.length);
      return answerWithoutSpaces.startsWith(codeWithoutSpaces);
    });
    if (answer === undefined) {
      // Ask ChatGPT which will run this once it gets a real answer
      await ctx.scheduler.runAfter(0, internal.openai.askAI, {
        gameId: args.gameId,
        prompt: problem.prompt,
        codeSnippet: originalCode,
      });
      return;
    }
    if (answer.answer === null || answer.answer === "") {
      // ChatGPT couldn't do it, so keep saying space lol
      return handleTurn(ctx, game, game.player2!, " ");
    }
    let nextChar: string | undefined = " ";
    let bestMatch = Number.MAX_VALUE;
    for (let i = 0; i <= answer.answer.length; i += 1) {
      const m = levenshtein(
        answer.answer.substring(0, i).replaceAll(/\s/g, ""),
        codeWithoutSpaces
      );
      if (m < bestMatch) {
        bestMatch = m;
        if (i === answer.answer.length) {
          nextChar = undefined;
        } else {
          nextChar = answer.answer[i];
        }
      }
    }
    console.log(nextChar, bestMatch);
    let nextInput = nextChar === undefined ? "done" : nextChar;
    if (nextChar === "\n") {
      nextInput = "\\n";
    } else if (nextChar === "\t") {
      nextInput = "\\t";
    }
    console.log(nextInput);
    return handleTurn(ctx, game, game.player2!, nextInput);
  },
});

export const askAI = internalAction({
  args: {
    gameId: v.id("game"),
    prompt: v.string(),
    codeSnippet: v.string(),
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI();
    const prompt = constructPrompt(args.prompt, args.codeSnippet);

    const response = await openai.chat.completions.create(
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are implementing JavaScript functions",
          },
          { role: "user", content: prompt },
        ],
      },
      { timeout: 60000 }
    );
    const rawAnswer = response.choices[0].message.content ?? "";
    const answer = parseAIAnswer(rawAnswer, args.codeSnippet);
    console.log(`Raw answer: ${rawAnswer}`);
    console.log(`Parsed answer: ${answer}`);
    console.log(`Snippet: ${args.codeSnippet}`);
    await ctx.runMutation(internal.openai.recordAnswer, {
      prompt: args.prompt,
      codeSnippet: args.codeSnippet,
      answer: answer,
    });
    await ctx.runMutation(internal.openai.takeTurn, { gameId: args.gameId });
  },
});

function parseAIAnswer(rawAnswer: string, codeSnippet: string) {
  let answer = rawAnswer;
  const codeBlockBegin = rawAnswer.indexOf("```javascript");
  const codeBlockEnd = rawAnswer.lastIndexOf("```");
  if (codeBlockBegin !== -1 && codeBlockEnd !== -1) {
    answer = rawAnswer
      .substring(codeBlockBegin + "```javascript".length, codeBlockEnd)
      .trim();
  }
  const funcBegin = answer.indexOf("solution(a) {");
  const funcEnd = answer.lastIndexOf("}");
  if (funcBegin !== -1 && funcEnd !== -1) {
    return answer.substring(funcBegin + "solution(a) {".length, funcEnd).trim();
  }
  if (
    answer.replaceAll(/\s/g, "").startsWith(codeSnippet.replaceAll(/\s/g, ""))
  ) {
    return answer;
  }

  return (codeSnippet + answer).trim();
}

export const recordAnswer = internalMutation({
  args: {
    prompt: v.string(),
    codeSnippet: v.string(),
    answer: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const codeWithoutSpaces = args.codeSnippet.replaceAll(/\s+/g, "");
    await ctx.db.insert("aiAnswers", {
      prompt: args.prompt,
      solutionSnippet: codeWithoutSpaces,
      answer: args.answer,
    });
  },
});
