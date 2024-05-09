import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

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
    await ctx.db.insert("inputs", {
      gameId,
      inputs: [],
      rank: 0,
    });
    await ctx.db.insert("code", {
      gameId,
      code: "",
      cursorPosition: 0,
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

export const inviteChatGpt = mutation({
  args: {
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
    await ctx.db.patch(game._id, {
      player2: gptPlayerId,
      phase: { status: "Inputting" },
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
    let inputs: Array<Doc<"inputs">> = [];
    if (game.phase.status === "Done") {
      inputs = await ctx.db
        .query("inputs")
        .withIndex("ByGame", (q) => q.eq("gameId", game._id))
        .collect();
    }
    return {
      game,
      player1,
      player2,
      problem,
      inputs,
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
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .collect();
    const tail = inputs.at(-1)!;
    const lastInput = tail.inputs.at(-1);
    const isPlayer1Turn = lastInput === undefined || !lastInput.isPlayer1;
    const isPlayer1 = game.player1 === args.playerId;
    // yes, there's a more compact way to say this, but this makes sense to me in english
    const isCurrentPlayersTurn =
      (isPlayer1 && isPlayer1Turn) || (!isPlayer1 && !isPlayer1Turn);
    const lastPartnerInput = isCurrentPlayersTurn
      ? tail.inputs.at(-1)
      : tail.inputs.at(-2);
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
    return (await ctx.db
      .query("code")
      .withIndex("ByGame", (q) => q.eq("gameId", args.gameId))
      .unique())!;
  },
});
