import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./lib/functions";
import { generatePassphrase } from "niceware-ts";
import * as datefns from "date-fns";
import { internal } from "./_generated/api";
import { addPlayerToGame } from "./games";

export const schedule = mutation({
  args: {
    playerId: v.id("player"),
  },
  handler: async (ctx, { playerId }) => {
    const password = generatePassphrase(8).slice(0, 3).join("-");
    return ctx.db.insert("scheduledGame", {
      inviter: playerId,
      invitee: null,
      password,
      kind: "Draft",
      proposedTime: datefns
        .roundToNearestMinutes(Date.now() + 60 * 60 * 1000, {
          roundingMethod: "floor",
        })
        .getTime(),
    });
  },
});

export const get = query({
  args: {
    playerId: v.id("player"),
    scheduledGameId: v.id("scheduledGame"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, { playerId, scheduledGameId, password }) => {
    const scheduledGame = await ctx.db.getX(scheduledGameId);
    const hasAccess =
      scheduledGame.inviter === playerId ||
      scheduledGame.invitee === playerId ||
      scheduledGame.password === password;
    if (!hasAccess) {
      return null;
    }
    const inviterName = (await ctx.db.getX(scheduledGame.inviter)).name;
    const inviteeName =
      scheduledGame.invitee === null
        ? null
        : (await ctx.db.getX(scheduledGame.invitee)).name;
    return { ...scheduledGame, inviteeName, inviterName };
  },
});

export const updatePassword = mutation({
  args: {
    playerId: v.id("player"),
    scheduledGameId: v.id("scheduledGame"),
  },
  handler: async (ctx, { playerId, scheduledGameId }) => {
    const password = generatePassphrase(8).slice(0, 3).join("-");
    const scheduledGame = await ctx.db.getX(scheduledGameId);
    if (scheduledGame.inviter !== playerId) {
      throw new ConvexError("AccessDenied");
    }
    if (scheduledGame.kind !== "Draft") {
      throw new Error("Unexpected phase");
    }
    await ctx.db.patch(scheduledGameId, { password });
  },
});

export const updateTime = mutation({
  args: {
    playerId: v.id("player"),
    scheduledGameId: v.id("scheduledGame"),
    time: v.number(),
    password: v.string(),
  },
  handler: async (ctx, { playerId, scheduledGameId, time, password }) => {
    const scheduledGame = await ctx.db.getX(scheduledGameId);
    console.log(scheduledGame, password, playerId);
    if (scheduledGame.kind === "Draft") {
      if (scheduledGame.inviter !== playerId) {
        throw new ConvexError("AccessDenied");
      }
      await ctx.db.patch(scheduledGameId, {
        proposedTime: datefns
          .roundToNearestMinutes(time, { roundingMethod: "floor" })
          .getTime(),
      });
      return;
    }
    if (scheduledGame.kind === "Proposed") {
      if (scheduledGame.inviter !== playerId) {
        if (
          scheduledGame.invitee === null &&
          scheduledGame.password === password
        ) {
          await ctx.db.patch(scheduledGameId, { invitee: playerId });
        } else if (scheduledGame.invitee !== playerId) {
          throw new ConvexError("AccessDenied");
        }
      }
      await ctx.db.patch(scheduledGameId, {
        proposedTimes: [
          ...scheduledGame.proposedTimes,
          { time, isInviter: scheduledGame.inviter === playerId },
        ],
      });
      return;
    }
    throw new Error("Unexpected phase");
  },
});

export const save = mutation({
  args: {
    playerId: v.id("player"),
    scheduledGameId: v.id("scheduledGame"),
  },
  handler: async (ctx, { playerId, scheduledGameId }) => {
    const scheduledGame = await ctx.db.getX(scheduledGameId);
    if (scheduledGame.inviter !== playerId) {
      throw new ConvexError("AccessDenied");
    }
    if (scheduledGame.kind !== "Draft") {
      throw new Error("Unexpected phase");
    }
    await ctx.db.replace(scheduledGameId, {
      kind: "Proposed",
      proposedTimes: [{ time: scheduledGame.proposedTime, isInviter: true }],
      invitee: scheduledGame.invitee,
      inviter: scheduledGame.inviter,
      password: scheduledGame.password,
    });
  },
});

export const accept = mutation({
  args: {
    playerId: v.id("player"),
    scheduledGameId: v.id("scheduledGame"),
    password: v.string(),
  },
  handler: async (ctx, { playerId, scheduledGameId, password }) => {
    let scheduledGame = await ctx.db.getX(scheduledGameId);
    if (scheduledGame.inviter !== playerId) {
      if (
        scheduledGame.invitee === null &&
        scheduledGame.password === password
      ) {
        await ctx.db.patch(scheduledGameId, { invitee: playerId });
      } else if (scheduledGame.invitee !== playerId) {
        throw new ConvexError("AccessDenied");
      }
    }
    scheduledGame = await ctx.db.getX(scheduledGameId);
    if (scheduledGame.kind !== "Proposed") {
      throw new Error("Unexpected phase");
    }
    const lastTime = scheduledGame.proposedTimes.at(-1)!;
    const canPlayerAccept =
      (lastTime.isInviter && scheduledGame.inviter !== playerId) ||
      (!lastTime.isInviter && scheduledGame.inviter === playerId);
    const canAccept = canPlayerAccept && lastTime.time > Date.now();
    if (!canAccept) {
      throw new Error("Player can't accept");
    }
    const time = scheduledGame.proposedTimes.at(-1)!.time;
    await ctx.db.replace(scheduledGameId, {
      kind: "Accepted",
      time,
      invitee: scheduledGame.invitee,
      inviter: scheduledGame.inviter,
      password: scheduledGame.password,
    });
    await ctx.scheduler.runAt(time, internal.schedule.startGame, {
      scheduledGameId,
    });
  },
});

export const startGame = internalMutation({
  args: {
    scheduledGameId: v.id("scheduledGame"),
  },
  handler: async (ctx, { scheduledGameId }) => {
    const scheduledGame = await ctx.db.getX(scheduledGameId);
    if (scheduledGame.kind !== "Accepted") {
      throw new Error("Unexpected phase");
    }
    if (Math.abs(Date.now() - scheduledGame.time) > 5 * 60 * 1000) {
      throw new Error("Unexpected time skew");
    }
    const gameId = await ctx.db.insert("game", {
      status: "NotStarted",
      player1: scheduledGame.inviter,
      player2: scheduledGame.invitee,
      problemId: null,
    });
    await ctx.db.replace(scheduledGameId, {
      kind: "Started",
      game: gameId,
      invitee: scheduledGame.invitee,
      inviter: scheduledGame.inviter,
      password: scheduledGame.password,
    });
  },
});

// export const schedule = mutation({
//     args: {},
//     handler: async (ctx, args) => {

//     }
// })
