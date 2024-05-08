import { OpenAI } from "openai";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { format } from "prettier";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
// @ts-expect-error
import levenshtein from "js-levenshtein";
import { handleTurn } from "./myFunctions";

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
    const allInputs = await ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .collect();
    const originalCode = allInputs.map((i) => i.input).join("");
    // const code = await format(originalCode, {
    //   parser: "babel",
    //   plugins: [prettierPluginBabel, prettierPluginEstree],
    // });
    const code = originalCode.replaceAll(/[ ]+/g, " ");
    const answers = await ctx.db
      .query("aiAnswers")
      .withIndex("ByPrompt", (q) => q.eq("prompt", problem.prompt))
      .collect();
    const answer = answers.find((a) => a.solutionSnippet.startsWith(code));
    if (answer === undefined) {
      // Ask ChatGPT which will run this once it gets a real answer
      await ctx.scheduler.runAfter(0, internal.openai.askAI, {
        gameId: args.gameId,
        prompt: problem.prompt,
        codeSnippet: code,
      });
      return;
    }
    if (answer.answer === null) {
      // ChatGPT couldn't do it, so keep saying space lol
      return handleTurn(ctx, game, game.player2!, " ");
    }
    let nextChar: string | undefined = " ";
    let bestMatch = Number.MAX_VALUE;
    for (let i = 0; i <= answer.answer.length; i += 1) {
      const m = levenshtein(answer.answer.substring(0, i), originalCode);
      console.log(m, answer.answer.substring(0, i), originalCode);
      if (m < bestMatch) {
        bestMatch = m;
        if (i === answer.answer.length) {
          nextChar = undefined;
        } else {
          nextChar = answer.answer[i];
        }
      }
    }
    let nextInput = nextChar === undefined ? "done" : nextChar;
    if (nextChar === "\n") {
      nextInput = "\\n";
    } else if (nextChar === "\t") {
      nextInput = "\\t";
    }
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
    const answer = response.choices[0].message.content ?? "";
    const begin = answer.indexOf("solution(a) {");
    const end = answer.lastIndexOf("}");
    const implementation =
      begin === -1 || end === -1
        ? args.codeSnippet + answer
        : answer.substring(begin + "solution(a) {".length, end).trim();
    if (implementation === null) {
      console.error("ChatGPT couldn't get a suitable answer");
      console.log(`Raw answer: ${answer}`);
      console.log(`Prompt: ${prompt}`);
    }
    await ctx.runMutation(internal.openai.recordAnswer, {
      prompt: args.prompt,
      codeSnippet: args.codeSnippet,
      answer: implementation ?? null,
    });
    await ctx.runMutation(internal.openai.takeTurn, { gameId: args.gameId });
  },
});

export const recordAnswer = internalMutation({
  args: {
    prompt: v.string(),
    codeSnippet: v.string(),
    answer: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiAnswers", {
      prompt: args.prompt,
      solutionSnippet: args.codeSnippet,
      answer: args.answer,
    });
  },
});
