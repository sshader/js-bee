import { v } from "convex/values";

const commonFields = {
  password: v.string(),
  inviter: v.id("player"),
  invitee: v.union(v.null(), v.id("player")),
};

export const scheduledGameDef = v.union(
  v.object({
    kind: v.literal("Draft"),
    proposedTime: v.number(),
    ...commonFields,
  }),
  v.object({
    kind: v.literal("Proposed"),
    proposedTimes: v.array(
      v.object({ time: v.number(), isInviter: v.boolean() })
    ),
    ...commonFields,
  }),
  v.object({
    kind: v.literal("Accepted"),
    time: v.number(),
    ...commonFields,
  }),
  v.object({
    kind: v.literal("Started"),
    game: v.id("game"),
    ...commonFields,
  })
);
