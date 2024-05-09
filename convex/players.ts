import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
      name: `Player ${Math.ceil(Math.random() * 9999)}`,
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

export const updatePlayer = mutation({
  args: {
    playerId: v.id("player"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, { name: args.name });
  },
});
