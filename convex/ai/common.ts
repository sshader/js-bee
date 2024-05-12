import { makeActionRetrier } from "convex-helpers/server/retries";
import { MutationCtx, internalMutation } from "../functions";
import { Infer, v } from "convex/values";
import { getGameState, getLastInput, handleTurn } from "../engine";
import { FunctionReference, makeFunctionReference } from "convex/server";
import { Operation } from "../../common/inputs";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const SYSTEM_PROMPT = "You are implementing JavaScript functions";

export const { runWithRetries, retry } = makeActionRetrier("ai/common:retry", {
  maxFailures: 5,
});

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

function parseAIAnswer(rawAnswer: string, codeSnippet: string) {
  let answer = rawAnswer;
  const codeBlockBegin = rawAnswer.indexOf("```javascript");
  const codeBlockEnd = rawAnswer.lastIndexOf("```");
  if (codeBlockBegin !== -1 && codeBlockEnd !== -1) {
    answer = rawAnswer
      .substring(codeBlockBegin + "```javascript".length, codeBlockEnd)
      .trim();
  }
  const functionMatch = /function solution\([a-z]+\) {/.exec(answer);
  if (functionMatch !== null) {
    console.log(functionMatch);
    const funcBegin = functionMatch.index + functionMatch[0].length;
    const funcEnd = answer.lastIndexOf("}");
    if (funcBegin !== -1 && funcEnd !== -1) {
      return answer.substring(funcBegin, funcEnd).trim();
    }
  }

  if (
    answer.replaceAll(/\s/g, "").startsWith(codeSnippet.replaceAll(/\s/g, ""))
  ) {
    return answer;
  }

  return "";
}

export const recordAnswer = internalMutation({
  args: {
    prompt: v.string(),
    codeSnippet: v.string(),
    answer: v.string(),
    botType: v.string(),
  },
  handler: async (ctx, args) => {
    const codeWithoutSpaces = args.codeSnippet.replaceAll(/\s+/g, "");
    const existingAnswers = await ctx.db
      .query("aiAnswers")
      .withIndex("ByBotAndPrompt", (q) =>
        q.eq("botType", args.botType).eq("prompt", args.prompt)
      )
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
      botType: args.botType,
    });
  },
});

export const askBotArgs = v.object({
  gameId: v.id("game"),
  playerId: v.id("player"),
  prompt: v.string(),
  codeSnippet: v.string(),
});

export type AskBotArgs = Infer<typeof askBotArgs>;

/**
 * Helper for making a bot able to play this game.
 *
 * These functions assume that `botType` matches the file name,
 * and that the file lives in `convex/ai`.
 *
 * // convex/ai/chatgpt.ts
 * export const { askBot, askBotWrapper } = BotPlayer("chatgpt", ...)
 *
 * @param botType -- This *must* match the filename.
 * @param askBot -- Function that takes in a prompt and returns the response from the chat bot
 * @returns
 */
export const BotPlayer = (
  botType: string,
  askBot: (prompt: string) => Promise<string>
) => {
  const actionName = `ai/${botType}:askBot`;
  const askBotAction = internalAction({
    args: {
      args: askBotArgs,
    },
    handler: async (ctx, { args }) => {
      const prompt = constructPrompt(args.prompt, args.codeSnippet);

      const rawAnswer = await askBot(prompt);
      const answer = parseAIAnswer(rawAnswer, args.codeSnippet);
      console.log(`Raw answer: ${rawAnswer}`);
      console.log(`Parsed answer: ${answer}`);
      console.log(`Snippet: ${args.codeSnippet}`);
      await ctx.runMutation(internal.ai.common.recordAnswer, {
        prompt: args.prompt,
        codeSnippet: args.codeSnippet,
        answer: answer,
        botType,
      });
      await ctx.runMutation(internal.ai.common.takeTurn, {
        gameId: args.gameId,
        playerId: args.playerId,
        mustAnswer: true,
      });
    },
  });
  const askBotWrapper = internalMutation({
    args: {
      args: askBotArgs,
    },
    handler: async (ctx, args) => {
      await runWithRetries(ctx, makeFunctionReference(actionName) as any, args);
    },
  });
  return { askBot: askBotAction, askBotWrapper: askBotWrapper };
};

export const takeTurn = internalMutation({
  args: {
    gameId: v.id("game"),
    playerId: v.id("player"),
    mustAnswer: v.boolean(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    const phase = game.phase;
    if (phase.status !== "Inputting") {
      throw new Error("Game isn't in the inputting phase");
    }
    if (phase.player1 !== args.playerId && phase.player2 !== args.playerId) {
      throw new Error("Bot isn't playing this game");
    }
    const player1 = await ctx.db.getX(phase.player1);
    const player2 = await ctx.db.getX(phase.player2);

    const player = player1._id == args.playerId ? player1 : player2;
    const botType = player.botType;
    if (botType === undefined) {
      throw new Error(`This player isn't a bot`);
    }
    const wrapperName: FunctionReference<
      "mutation",
      "internal",
      { args: AskBotArgs }
    > = makeFunctionReference(`ai/${botType}:askBotWrapper`) as any;
    const problem = await ctx.db.getX(game.problemId);
    const gameState = await getGameState(ctx, game._id);
    const originalCode = gameState.state.code;
    const bothBots =
      player1.botType !== undefined && player2.botType !== undefined;

    if (bothBots) {
      if (originalCode.length >= parseInt(process.env.MAX_BOT_V_BOT ?? "100")) {
        // avoid looping too much for bot vs. bot games
        return handleTurn(ctx, {
          gameId: game._id,
          playerId: args.playerId,
          input: "done",
        });
      }
    }

    const lastInput = await getLastInput(ctx, game._id);
    if (!args.mustAnswer && lastInput?.operation.kind === "Delete") {
      // Ask bot, which will call back into this function once it has an answer
      await ctx.scheduler.runAfter(0, wrapperName, {
        args: {
          gameId: args.gameId,
          playerId: args.playerId,
          prompt: problem.prompt,
          codeSnippet: originalCode,
        },
      });
      return;
    }

    const codeWithoutSpaces = originalCode.replaceAll(/\s+/g, "");
    const answers = await ctx.db
      .query("aiAnswers")
      .withIndex("ByBotAndPrompt", (q) =>
        q.eq("botType", botType).eq("prompt", problem.prompt)
      )
      .collect();
    const answer = answers.find((a) => {
      if (a.answer === null) {
        return false;
      }
      if (bothBots) {
        return a.answer.startsWith(originalCode);
      } else {
        const answerWithoutSpaces = a.answer
          .replaceAll(/\s+/g, "")
          .substring(0, codeWithoutSpaces.length);
        return answerWithoutSpaces.startsWith(codeWithoutSpaces);
      }
    });
    if (answer === undefined) {
      if (args.mustAnswer) {
        // Bot couldn't do it, so keep saying space lol
        console.log("Couldn't find suitable answer");
        return handleTurn(ctx, {
          gameId: game._id,
          playerId: args.playerId,
          input: " ",
        });
      }
      // Ask bot, which will call back into this function once it has an answer
      await ctx.scheduler.runAfter(0, wrapperName, {
        args: {
          gameId: args.gameId,
          playerId: args.playerId,
          prompt: problem.prompt,
          codeSnippet: originalCode,
        },
      });
      return;
    }
    if (answer.answer === null || answer.answer === "") {
      // Bot couldn't do it, so keep saying space lol
      console.log("Couldn't find suitable answer");
      return handleTurn(ctx, {
        gameId: game._id,
        playerId: args.playerId,
        input: " ",
      });
    }
    const nextInput: string = getNextInputString(
      answer.answer,
      originalCode,
      bothBots
    );
    console.log(`Next input: '${nextInput}'`);
    return handleTurn(ctx, {
      gameId: game._id,
      playerId: args.playerId,
      input: nextInput,
    });
  },
});

function getNextInputString(answer: string, code: string, bothBots: boolean) {
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
  let nextChar = undefined;
  const lastChar = code.at(-1);
  for (let j = i + 1; j < answer.length; j += 1) {
    const char = answer[j];

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

export const getOrCreateBotPlayer = async (
  ctx: MutationCtx,
  botType: string,
  name: string
) => {
  const player = await ctx.db
    .query("player")
    .withIndex("ByBot", (q) => q.eq("botType", botType))
    .unique();
  return player === null
    ? await ctx.db.insert("player", {
        sessionId: crypto.randomUUID(),
        botType,
        name,
      })
    : player._id;
};
