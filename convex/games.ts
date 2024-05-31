import { ConvexError, v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./lib/functions";
import { Id } from "./_generated/dataModel";
import { getGameState } from "./engine";
import { getInitialState } from "../common/inputs";
import { getOrCreateBotPlayer } from "./ai/common";
import { internal } from "./_generated/api";

export const recentGames = query({
  args: {},
  handler: async (ctx, _args) => {
    const allGames = await ctx.db.query("game").order("desc").take(10);
    return Promise.all(
      allGames.map(async (game) => {
        const player1 = await ctx.db.getX(game.player1);

        const player2 =
          game.status !== "NotStarted" ? await ctx.db.getX(game.player2) : null;
        const problem =
          game.problemId === null ? null : await ctx.db.getX(game.problemId);
        return {
          game,
          player1Name: player1.name,
          player2Name: player2?.name,
          problemSummary: problem?.summary ?? null,
        };
      })
    );
  },
});

export const startGame = mutation({
  args: {
    playerId: v.id("player"),
  },
  handler: async (ctx, args) => {
    const gameId = await ctx.db.insert("game", {
      status: "NotStarted",
      player1: args.playerId,
      player2: null,
      problemId: null,
    });
    return gameId;
  },
});

export const startBotGame = mutation({
  args: {
    bot1: v.string(),
    bot2: v.string(),
    problemId: v.id("problem"),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.getX(args.problemId);
    const bot1 = await getOrCreateBotPlayer(ctx, args.bot1, args.bot1);
    const bot2 = await getOrCreateBotPlayer(ctx, args.bot2, args.bot2);
    const gameId = await ctx.db.insert("game", {
      status: "NotStarted",
      player1: bot1,
      player2: null,
      problemId: problem._id,
    });
    await joinGame(ctx, { gameId, playerId: bot2 });
    await ctx.scheduler.runAfter(0, internal.ai.common.takeTurn, {
      gameId,
      playerId: bot1,
      mustAnswer: false,
    });
    return gameId;
  },
});

export const joinGame = mutation({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    return addPlayerToGame(ctx, args.gameId, args.playerId);
  },
});

export async function addPlayerToGame(
  ctx: MutationCtx,
  gameId: Id<"game">,
  playerId: Id<"player">
) {
  const game = await ctx.db.getX(gameId);
  if (game.status !== "NotStarted") {
    throw new Error("Game is already started or has two players");
  }
  if (game.problemId === null) {
    await ctx.db.replace(game._id, {
      status: "NotStarted",
      player1: game.player1,
      player2: playerId,
      problemId: null,
    });
    return;
  }
  const gameState = await ctx.db.insert("gameState", {
    gameId: game._id,
    state: getInitialState(),
  });
  await ctx.db.replace(game._id, {
    status: "Inputting",
    player1: game.player1,
    player2: playerId,
    gameState,
    problemId: game.problemId,
    startTimeMs: Date.now(),
  });
}

export const selectProblem = mutation({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
    problemId: v.id("problem"),
  },
  handler: async (ctx, { gameId, playerId, problemId }) => {
    const game = await ctx.db.getX(gameId);
    if (game.status !== "NotStarted") {
      throw new Error("Unexpected state");
    }
    if (game.player2 === null) {
      await ctx.db.replace(game._id, {
        status: "NotStarted",
        player1: game.player1,
        player2: null,
        problemId,
      });
      return;
    }
    const gameState = await ctx.db.insert("gameState", {
      gameId: game._id,
      state: getInitialState(),
    });
    if (!(game.player1 === playerId || game.player2 === playerId)) {
      throw new ConvexError("AccessDenied");
    }
    await ctx.db.replace(game._id, {
      status: "Inputting",
      player1: game.player1,
      player2: game.player2,
      gameState,
      problemId: problemId,
      startTimeMs: Date.now(),
    });
  },
});

export const inviteBot = mutation({
  args: {
    gameId: v.id("game"),
    botType: v.string(),
  },
  handler: async (ctx, args) => {
    const playerId = await getOrCreateBotPlayer(
      ctx,
      args.botType,
      args.botType
    );
    return addPlayerToGame(ctx, args.gameId, playerId);
  },
});

export const gameInfo = query({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedId = ctx.db.normalizeId("game", args.gameId);
    if (normalizedId === null) {
      throw new Error("Unknown game");
    }
    return getGameInfo(ctx, normalizedId);
  },
});

export const featureGameInfo = query({
  args: {},
  handler: async (ctx, args) => {
    const featureGameId =
      (process.env.FEATURE_GAME_ID as Id<"game">) ??
      (await ctx.db
        .query("game")
        .filter((q) => q.eq(q.field("status"), "Done"))
        .first())!._id;
    return getGameInfo(ctx, featureGameId);
  },
});

async function getGameInfo(ctx: QueryCtx, gameId: Id<"game">) {
  const game = await ctx.db.getX(gameId);
  const problemId = game.problemId;
  const problem = problemId === null ? null : await ctx.db.getX(problemId);
  const player1 = await ctx.db.getX(game.player1);
  const player2 =
    game.player2 !== null ? await ctx.db.getX(game.player2) : null;
  return {
    game,
    player1: {
      ...player1,
      sessionId: undefined,
    },
    player2:
      player2 === null
        ? null
        : {
            ...player2,
            sessionId: undefined,
          },
    problemPrompt: problem?.prompt ?? null,
  };
}

export const infoForScoring = query({
  args: {
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    if (game.status !== "InputDone") {
      throw new Error("Wrong phase");
    }
    const gameState = await ctx.db.getX(game.gameState);
    const problem = await ctx.db.getX(game.problemId);
    return {
      code: gameState.state.code,
      problem,
    };
  },
});

export const infoForPlayback = query({
  args: {
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    if (game.status !== "Done") {
      throw new Error("Wrong phase");
    }
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .collect();
    const testResults = await ctx.db.getX(game.testResults);
    const problem = await ctx.db.getX(game.problemId);
    return { inputs, testResults, problem };
  },
});

export const watchGameWhilePlaying = query({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    if (game.status === "NotStarted") {
      return null;
    }
    const isPlaying =
      game.player1 === args.playerId || game.player2 === args.playerId;
    if (!isPlaying) {
      throw new Error("Current player is not playing");
    }
    const gameState = await ctx.db.getX(game.gameState);
    const isPlayer1Turn = !gameState.state.isLastPlayerPlayer1;
    const isPlayer1 = game.player1 === args.playerId;
    // yes, there's a more compact way to say this, but this makes sense to me in english
    const isCurrentPlayersTurn =
      (isPlayer1 && isPlayer1Turn) || (!isPlayer1 && !isPlayer1Turn);
    const lastPartnerInput = isPlayer1
      ? gameState.state.lastPlayer2Input
      : gameState.state.lastPlayer1Input;
    return {
      isCurrentPlayersTurn,
      lastPartnerInput: lastPartnerInput ?? null,
    };
  },
});

export const spectateGameInputs = query({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    const isPlaying =
      game.player1 === args.playerId || game.player2 === args.playerId;
    if (isPlaying) {
      throw new Error("Current player is playing, not spectating");
    }
    return getGameState(ctx, args.gameId);
  },
});
