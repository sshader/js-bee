import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { inputDef, stateDef } from "../common/inputs";

export const problemValidator = {
  summary: v.optional(v.string()),
  prompt: v.string(),
  testCases: v.array(
    v.object({
      args: v.any(),
      expected: v.any(),
    })
  ),
  isPublished: v.boolean(),
};

export default defineSchema({
  problem: defineTable(problemValidator),
  game: defineTable({
    problemId: v.id("problem"),
    phase: v.union(
      v.object({ status: v.literal("NotStarted"), player1: v.id("player") }),
      v.object({
        status: v.literal("Inputting"),
        player1: v.id("player"),
        player2: v.id("player"),
        gameState: v.id("gameState"),
      }),
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
    ),
  }),
  inputs: defineTable({
    gameId: v.id("game"),
    inputs: v.array(inputDef),
    rank: v.number(),
  }).index("ByGame", ["gameId", "rank"]),
  gameState: defineTable({
    gameId: v.id("game"),
    state: stateDef,
  }).index("ByGame", ["gameId"]),
  testResults: defineTable({
    gameId: v.id("game"),
    results: v.array(
      v.union(
        v.object({
          status: v.literal("EvaluationFailed"),
          error: v.string(),
        }),
        v.object({
          status: v.literal("ExecutionFailed"),
          error: v.string(),
        }),
        v.object({
          status: v.literal("ResultIncorrect"),
          actual: v.any(),
        }),
        v.object({
          status: v.literal("Passed"),
        })
      )
    ),
  }).index("ByGame", ["gameId"]),
  player: defineTable({
    name: v.string(),
    sessionId: v.string(),
    botType: v.optional(v.string()),
  })
    .index("BySession", ["sessionId"])
    .index("ByBot", ["botType"]),
  aiAnswers: defineTable({
    prompt: v.string(),
    botType: v.optional(v.string()),
    solutionSnippet: v.string(),
    answer: v.union(v.string(), v.null()),
  }).index("ByBotAndPrompt", ["botType", "prompt"]),
});
