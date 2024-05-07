import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

export const ongoingGames = query({
  args: {},
  handler: async (ctx, _args) => {
    const allGames = await ctx.db.query("game").collect();
    return allGames.filter((g) => g.phase.status !== "Done");
  },
});

export const startGame = mutation({
  args: {
    playerId: v.id("player"),
    problemId: v.optional(v.id("problem")),
  },
  handler: async (ctx, args) => {
    const problem = args.problemId
      ? await ctx.db.get(args.problemId)
      : await ctx.db.query("problem").first();
    const gameId = await ctx.db.insert("game", {
      problemId: problem!._id,
      player1: args.playerId,
      player2: null,
      phase: { status: "NotStarted" },
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
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    if (game.phase.status !== "NotStarted" || game.player2 !== null) {
      throw new Error("Game is already started or has two players");
    }
    await ctx.db.patch(game._id, {
      player2: args.playerId,
      phase: { status: "Inputting" },
    });
  },
});

export const takeTurn = mutation({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
    input: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(args);
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    if (game.phase.status !== "Inputting") {
      throw new Error("Game isn't in the inputting phase");
    }
    const lastInput = await ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .order("desc")
      .first();
    const isPlayer1Turn = lastInput === null || !lastInput.isPlayer1;
    if (isPlayer1Turn && game.player1 !== args.playerId) {
      throw new Error("Not current player's turn");
    } else if (!isPlayer1Turn && game.player2 !== args.playerId) {
      throw new Error("Not current player's turn");
    }
    if (args.input === "done") {
      const allInputs = await ctx.db
        .query("inputs")
        .withIndex("ByGame", (q) => q.eq("gameId", game._id))
        .collect();
      const code = allInputs.map((i) => i.input).join("");
      await ctx.db.patch(game._id, {
        phase: {
          status: "InputDone",
          code,
        },
      });
      const testCases = (await ctx.db.get(game.problemId))!.testCases;
      await ctx.scheduler.runAfter(0, internal.executeSolution.execute, {
        code,
        testCases,
        gameId: game._id,
      });
      return;
    }
    if (args.input === "clear") {
      const allInputs = await ctx.db
        .query("inputs")
        .withIndex("ByGame", (q) => q.eq("gameId", game._id))
        .collect();
      await Promise.all(allInputs.map((i) => ctx.db.delete(i._id)));
    }

    if (args.input.length !== 1) {
      throw new Error("More than one character!");
    }

    await ctx.db.insert("inputs", {
      gameId: game._id,
      isPlayer1: isPlayer1Turn,
      input: args.input,
    });
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
    const game = await ctx.db.get(normalizedId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    const problem = await ctx.db.get(game.problemId);
    if (problem === null) {
      throw new Error("Unknown problem");
    }
    const player1 =
      game.player1 !== null ? await ctx.db.get(game.player1) : null;
    const player2 =
      game.player2 !== null ? await ctx.db.get(game.player2) : null;
    return {
      game,
      player1,
      player2,
      prompt: problem.prompt,
    };
  },
});

export const watchGameWhilePlaying = query({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    const isPlaying =
      game.player1 === args.playerId || game.player2 === args.playerId;
    if (!isPlaying) {
      throw new Error("Current player is not playing");
    }
    const lastInputs = await ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .order("desc")
      .take(2);
    const lastInput = lastInputs[0] ?? null;
    const isPlayer1Turn = lastInput === null || !lastInput.isPlayer1;
    const isPlayer1 = game.player1 === args.playerId;
    // yes, there's a more compact way to say this, but this makes sense to me in english
    const isCurrentPlayersTurn =
      (isPlayer1 && isPlayer1Turn) || (!isPlayer1 && !isPlayer1Turn);
    const lastPartnerInput =
      lastInputs.find((i) => i.isPlayer1 !== isPlayer1)?.input ?? null;
    return {
      isCurrentPlayersTurn,
      lastPartnerInput,
    };
  },
});

export const spectateGameInputs = query({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    if (game.player1 === args.playerId || game.player2 === args.playerId) {
      throw new Error("Game player cannot spectate");
    }

    return ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", args.gameId))
      .paginate(args.paginationOpts);
  },
});

export const getOrCreatePlayer = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("player")
      .withIndex("BySession", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing !== null) {
      return existing._id;
    }
    const newPlayerId = await ctx.db.insert("player", {
      sessionId: args.sessionId,
      name: args.sessionId,
    });
    return newPlayerId;
  },
});

export const getPlayer = query({
  args: {
    playerId: v.id("player"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (player === null) {
      throw new Error("Unknown player");
    }
    return player;
  },
});

export const recordState = internalMutation({
  args: {
    gameId: v.id("game"),
    testCaseResults: v.any(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    if (game.phase.status === "Done") {
      return;
    }
    if (game.phase.status !== "InputDone") {
      throw new Error("Phase incorrect");
    }
    await ctx.db.patch(args.gameId, {
      phase: {
        status: "Done",
        code: game.phase.code,
        result: args.testCaseResults,
      },
    });
  },
});
