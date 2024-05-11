import { OpenAI } from "openai";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getGameState, getLastInput, handleTurn } from "./engine";
import { internalMutation } from "./functions";
import { Operation } from "../common/inputs";
import { makeActionRetrier } from "convex-helpers/server/retries";

function constructPrompt(problemPrompt: string, codeSnippet: string) {
  return `Please finish implementing this JavaScript function based on the following prompt. 
Please include code for the full function and do not include explanations.

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
    mustAnswer: v.boolean(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    const phase = game.phase;
    if (phase.status !== "Inputting") {
      throw new Error("Game isn't in the inputting phase");
    }
    const problem = await ctx.db.getX(game.problemId);
    const gameState = await getGameState(ctx, game._id);
    const originalCode = gameState.state.code;

    const lastInput = await getLastInput(ctx, game._id);
    if (
      !args.mustAnswer &&
      lastInput?.operation.kind === "Delete" &&
      lastInput.operation.numDeleted === 1
    ) {
      // Ask ChatGPT which will run this once it gets a real answer
      await ctx.scheduler.runAfter(0, internal.openai.askAIWrapper, {
        gameId: args.gameId,
        prompt: problem.prompt,
        codeSnippet: originalCode,
      });
      return;
    }

    const codeWithoutSpaces = originalCode.replaceAll(/\s+/g, "");
    const answers = await ctx.db
      .query("aiAnswers")
      .withIndex("ByPrompt", (q) => q.eq("prompt", problem.prompt))
      .collect();
    const answer = answers.find((a) => {
      if (a.answer === null) {
        return false;
      }
      const answerWithoutSpaces = a.answer
        .replaceAll(/\s+/g, "")
        .substring(0, codeWithoutSpaces.length);
      return answerWithoutSpaces.startsWith(codeWithoutSpaces);
    });
    if (answer === undefined) {
      if (args.mustAnswer) {
        // ChatGPT couldn't do it, so keep saying space lol
        return handleTurn(ctx, game._id, phase, phase.player2, {
          kind: "Add",
          input: " ",
        });
      }
      // Ask ChatGPT which will run this once it gets a real answer
      await ctx.scheduler.runAfter(0, internal.openai.askAIWrapper, {
        gameId: args.gameId,
        prompt: problem.prompt,
        codeSnippet: originalCode,
      });
      return;
    }
    if (answer.answer === null || answer.answer === "") {
      // ChatGPT couldn't do it, so keep saying space lol
      return handleTurn(ctx, game._id, phase, phase.player2, {
        kind: "Add",
        input: " ",
      });
    }
    let answerWithoutSpaces = "";
    let i = 0;
    while (i < answer.answer.length) {
      if (codeWithoutSpaces === "") {
        i = -1;
        break;
      }
      const char = answer.answer[i];
      if (!char.match(/\s/)) {
        answerWithoutSpaces += answer.answer[i];
      }
      if (answerWithoutSpaces === codeWithoutSpaces) {
        break;
      }
      i += 1;
    }
    let nextChar = undefined;
    const lastChar = originalCode.at(-1);
    console.log(i, answer.answer, codeWithoutSpaces);
    for (let j = i + 1; j < answer.answer.length; j += 1) {
      const char = answer.answer[j];

      if (lastChar && lastChar.match(/\s/)) {
        if (char !== lastChar) {
          nextChar = char;
          break;
        }
      } else {
        nextChar = char;
        break;
      }
    }
    const nextInput: Operation =
      nextChar === undefined
        ? { kind: "Finish" }
        : { kind: "Add", input: nextChar };
    console.log(`Next input: ${JSON.stringify(nextInput)}`);
    return handleTurn(ctx, game._id, phase, phase.player2, nextInput);
  },
});

export const { runWithRetries, retry } = makeActionRetrier("openai:retry", {
  maxFailures: 5,
});

export const askAIWrapper = internalMutation({
  args: { gameId: v.id("game"), prompt: v.string(), codeSnippet: v.string() },
  handler: async (ctx, args) => {
    await runWithRetries(ctx, internal.openai.askAI, args);
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
    await ctx.runMutation(internal.openai.takeTurn, {
      gameId: args.gameId,
      mustAnswer: true,
    });
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
    const existingAnswers = await ctx.db
      .query("aiAnswers")
      .withIndex("ByPrompt", (q) => q.eq("prompt", args.prompt))
      .collect();
    for (const e of existingAnswers) {
      if (e.solutionSnippet === codeWithoutSpaces) {
        await ctx.db.delete(e._id);
      }
    }
    await ctx.db.insert("aiAnswers", {
      prompt: args.prompt,
      solutionSnippet: codeWithoutSpaces,
      answer: args.answer,
    });
  },
});
