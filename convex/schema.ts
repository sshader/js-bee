import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { inputDef, stateDef } from "../common/inputs";
import { gameDef } from "../common/games";
import { scheduledGameDef } from "../common/scheduledGames";
import { migrationsTable } from "convex-helpers/server/migrations";

export const problemValidator = {
  summary: v.optional(v.string()),
  prompt: v.string(),
  language: v.optional(v.union(v.literal("javascript"), v.literal("python"))),
  testCases: v.array(
    v.object({
      args: v.any(),
      expected: v.any(),
      hidden: v.optional(v.boolean()),
    })
  ),
  isPublished: v.boolean(),
  difficulty: v.optional(
    v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))
  ),
  tags: v.optional(v.array(v.string())),
  timeLimit: v.optional(v.number()),
  description: v.optional(v.string()),
  starterCode: v.optional(v.string()),
};

export default defineSchema(
  {
    migrations: migrationsTable,
    problem: defineTable(problemValidator),
    game: defineTable(gameDef),
    inputs: defineTable({
      gameId: v.id("game"),
      inputs: v.array(inputDef),
      rank: v.number(),
    }).index("ByGame", ["gameId", "rank"]),
    gameState: defineTable({
      gameId: v.id("game"),
      state: stateDef,
    }).index("ByGame", ["gameId"]),
    scheduledGame: defineTable(scheduledGameDef),
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
  },
  { schemaValidation: true }
);
