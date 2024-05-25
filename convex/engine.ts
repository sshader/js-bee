import { v } from "convex/values";
import { mutation, MutationCtx, QueryCtx } from "./lib/functions";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { applyInput, Input, Operation } from "../common/inputs";
import { InProgressGame } from "../common/games";

export const takeTurn = mutation({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
    input: v.string(),
  },
  handler: async (ctx, args) => {
    return handleTurn(ctx, args);
  },
});

export function parseInput(input: string, code: string): Operation {
  if (input === "done") {
    return { kind: "Finish" };
  }
  if (input.startsWith("skip")) {
    const numSkips = parseInt(input.split(" ")[1] ?? "1");
    return { kind: "Skip", numSkips };
  }
  if (input === "clearline") {
    const newCursor = Math.max(code.lastIndexOf("\n") - 1, 0);
    const numDeleted = code.length - newCursor;
    return { kind: "Delete", numDeleted };
  }
  if (input.startsWith("clear")) {
    const numDeleted = parseInt(input.split(" ")[1] ?? "1");
    return { kind: "Delete", numDeleted };
  }
  let char = input;
  if (input === "\\n") {
    char = "\n";
  } else if (input === "\\t") {
    char = "\t";
  } else {
    if (input.length !== 1) {
      throw new Error("More than one character!");
    }
  }
  return { kind: "Add", input: char };
}

export async function getGameState(ctx: QueryCtx, gameId: Id<"game">) {
  const gameState = await ctx.db
    .query("gameState")
    .withIndex("ByGame", (q) => q.eq("gameId", gameId))
    .unique();
  if (gameState === null) {
    throw new Error(`No game state for ${gameId}`);
  }
  return gameState;
}

export async function getLastInput(ctx: QueryCtx, gameId: Id<"game">) {
  const tail = await ctx.db
    .query("inputs")
    .withIndex("ByGame", (q) => q.eq("gameId", gameId))
    .order("desc")
    .first();
  return (tail?.inputs ?? []).at(-1);
}

export async function handleTurn(
  ctx: MutationCtx,
  args: { gameId: Id<"game">; playerId: Id<"player">; input: string }
) {
  const game = await ctx.db.getX(args.gameId);
  if (game.status !== "Inputting") {
    throw new Error("Game isn't in the inputting phase");
  }
  const gameStateBefore = await getGameState(ctx, game._id);
  await _handleTurn(
    ctx,
    game._id,
    game,
    args.playerId,
    parseInput(args.input, gameStateBefore.state.code)
  );

  const gameStateAfter = await getGameState(ctx, game._id);

  if (gameStateAfter.state.isDone) {
    return;
  }
  const nextPlayerId = gameStateAfter.state.isLastPlayerPlayer1
    ? game.player2
    : game.player1;
  const shouldSkip = gameStateAfter.state.isLastPlayerPlayer1
    ? gameStateAfter.state.player2Skips > 0
    : gameStateAfter.state.player1Skips > 0;
  if (shouldSkip) {
    await _handleTurn(ctx, game._id, game, nextPlayerId, { kind: "Skipped" });
    return;
  }
  const nextPlayer = await ctx.db.getX(nextPlayerId);
  if (nextPlayer.botType !== undefined) {
    await ctx.scheduler.runAfter(0, internal.ai.common.takeTurn, {
      gameId: game._id,
      playerId: nextPlayer._id,
      mustAnswer: false,
    });
  }
}

async function _handleTurn(
  ctx: MutationCtx,
  gameId: Id<"game">,
  phase: InProgressGame,
  playerId: Id<"player">,
  input: Operation
) {
  const gameState = await getGameState(ctx, gameId);
  const isPlayer1Turn = !gameState.state.isLastPlayerPlayer1;
  if (isPlayer1Turn && phase.player1 !== playerId) {
    throw new Error("Not current player's turn");
  } else if (!isPlayer1Turn && phase.player2 !== playerId) {
    throw new Error("Not current player's turn");
  }

  await addInput(ctx, gameId, {
    isPlayer1: isPlayer1Turn,
    operation: input,
  });
  const nextState = applyInput(gameState.state, {
    operation: input,
    isPlayer1: isPlayer1Turn,
  });
  await ctx.db.patch(gameState._id, {
    state: nextState,
  });
  if (input.kind === "Finish") {
    await ctx.db.replace(gameId, {
      status: "InputDone",
      player1: phase.player1,
      player2: phase.player2,
      gameState: phase.gameState,
      problemId: phase.problemId,
    });
  }
}

async function addInput(ctx: MutationCtx, gameId: Id<"game">, input: Input) {
  const tail = await ctx.db
    .query("inputs")
    .withIndex("ByGame", (q) => q.eq("gameId", gameId))
    .order("desc")
    .first();
  if (tail === null) {
    await ctx.db.insert("inputs", {
      gameId: gameId,
      inputs: [input],
      rank: 0,
    });
  } else if (tail.inputs.length > 500) {
    await ctx.db.insert("inputs", {
      gameId: gameId,
      inputs: [input],
      rank: tail.rank + 1,
    });
  } else {
    await ctx.db.patch(tail._id, {
      inputs: [...tail.inputs, input],
    });
  }
}

export const recordResult = mutation({
  args: {
    gameId: v.id("game"),
    testCaseResults: v.any(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    if (game.status === "Done") {
      return;
    }
    if (game.status !== "InputDone") {
      throw new Error("Phase incorrect");
    }
    console.log(args.testCaseResults);
    const testResults = await ctx.db.insert("testResults", {
      gameId: game._id,
      results: args.testCaseResults,
    });
    await ctx.db.replace(args.gameId, {
      status: "Done",
      player1: game.player1,
      player2: game.player2,
      gameState: game.gameState,
      testResults: testResults,
      problemId: game.problemId,
    });
  },
});
