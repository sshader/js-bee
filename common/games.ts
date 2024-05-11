import { Infer, v } from "convex/values";

const inProgressDef = v.object({
  status: v.literal("Inputting"),
  player1: v.id("player"),
  player2: v.id("player"),
  gameState: v.id("gameState"),
});
export type InProgressGame = Infer<typeof inProgressDef>;
export const gamePhaseDef = v.union(
  v.object({ status: v.literal("NotStarted"), player1: v.id("player") }),
  inProgressDef,
  v.object({
    status: v.literal("InputDone"),
    player1: v.id("player"),
    player2: v.id("player"),
    gameState: v.id("gameState"),
  }),
  v.object({
    status: v.literal("Done"),
    player1: v.id("player"),
    player2: v.id("player"),
    gameState: v.id("gameState"),
    testResults: v.id("testResults"),
  })
);
