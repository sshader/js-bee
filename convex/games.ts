import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./functions";
import { Id } from "./_generated/dataModel";
import { getGameState } from "./engine";
import { getInitialState } from "../common/inputs";

export const ongoingGames = query({
  args: {},
  handler: async (ctx, _args) => {
    const allGames = await ctx.db.query("game").collect();
    const ongoingGames = allGames.filter((g) => g.phase.status !== "Done");
    return Promise.all(
      ongoingGames.map(async (game) => {
        const player1 = await ctx.db.getX(game.phase.player1);

        const player2 =
          game.phase.status !== "NotStarted"
            ? await ctx.db.getX(game.phase.player2)
            : null;
        const problem = await ctx.db.getX(game.problemId);
        return {
          game,
          player1Name: player1.name,
          player2Name: player2?.name,
          problemSummary: problem.summary ?? "",
        };
      })
    );
  },
});

export const startGame = mutation({
  args: {
    playerId: v.id("player"),
    problemId: v.id("problem"),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.getX(args.problemId);
    const gameId = await ctx.db.insert("game", {
      problemId: problem._id,
      phase: { status: "NotStarted", player1: args.playerId },
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

async function addPlayerToGame(
  ctx: MutationCtx,
  gameId: Id<"game">,
  playerId: Id<"player">
) {
  const game = await ctx.db.getX(gameId);
  if (game.phase.status !== "NotStarted") {
    throw new Error("Game is already started or has two players");
  }
  const gameState = await ctx.db.insert("gameState", {
    gameId: game._id,
    state: getInitialState(),
  });
  await ctx.db.patch(game._id, {
    phase: {
      status: "Inputting",
      player1: game.phase.player1,
      player2: playerId,
      gameState,
    },
  });
}

export const inviteChatGpt = mutation({
  args: {
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db.query("player").collect();
    const gptPlayer = players.find((p) => p.botType === "ChatGPT");
    const gptPlayerId =
      gptPlayer === undefined
        ? await ctx.db.insert("player", {
            sessionId: crypto.randomUUID(),
            botType: "ChatGPT",
            name: "ChatGPT",
          })
        : gptPlayer._id;
    return addPlayerToGame(ctx, args.gameId, gptPlayerId);
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
    const game = await ctx.db.getX(normalizedId);
    const problem = await ctx.db.get(game.problemId);
    if (problem === null) {
      throw new Error("Unknown problem");
    }
    const player1 = await ctx.db.getX(game.phase.player1);
    const player2 =
      game.phase.status !== "NotStarted"
        ? await ctx.db.getX(game.phase.player2)
        : null;
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
      problemPrompt: problem.prompt ?? "",
    };
  },
});

export const infoForScoring = query({
  args: {
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.getX(args.gameId);
    if (game.phase.status !== "InputDone") {
      throw new Error("Wrong phase");
    }
    const gameState = await ctx.db.getX(game.phase.gameState);
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
    if (game.phase.status !== "Done") {
      throw new Error("Wrong phase");
    }
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .collect();
    const testResults = await ctx.db.getX(game.phase.testResults);
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
    if (game.phase.status === "NotStarted") {
      return null;
    }
    const isPlaying =
      game.phase.player1 === args.playerId ||
      game.phase.player2 === args.playerId;
    if (!isPlaying) {
      throw new Error("Current player is not playing");
    }
    const gameState = await ctx.db.getX(game.phase.gameState);
    const isPlayer1Turn = !gameState.state.isLastPlayerPlayer1;
    const isPlayer1 = game.phase.player1 === args.playerId;
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
      game.phase.player1 === args.playerId ||
      (game.phase.status !== "NotStarted" &&
        game.phase.player2 === args.playerId);
    if (isPlaying) {
      throw new Error("Current player is playing, not spectating");
    }
    return getGameState(ctx, args.gameId);
  },
});
