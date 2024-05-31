import { Infer, v } from "convex/values";

const inProgressDef = v.object({
  status: v.literal("Inputting"),
  player1: v.id("player"),
  player2: v.id("player"),
  gameState: v.id("gameState"),
  problemId: v.id("problem"),
  startTimeMs: v.optional(v.number()),
});
export type InProgressGame = Infer<typeof inProgressDef>;
export const gameDef = v.union(
  inProgressDef,
  v.object({
    status: v.literal("NotStarted"),
    player1: v.id("player"),
    player2: v.union(v.id("player"), v.null()),
    problemId: v.union(v.id("problem"), v.null()),
  }),
  v.object({
    status: v.literal("Inputting"),
    player1: v.id("player"),
    player2: v.id("player"),
    gameState: v.id("gameState"),
    problemId: v.id("problem"),
  }),
  v.object({
    status: v.literal("InputDone"),
    player1: v.id("player"),
    player2: v.id("player"),
    gameState: v.id("gameState"),
    problemId: v.id("problem"),
  }),
  v.object({
    status: v.literal("Done"),
    player1: v.id("player"),
    player2: v.id("player"),
    gameState: v.id("gameState"),
    testResults: v.id("testResults"),
    problemId: v.id("problem"),
  })
);
