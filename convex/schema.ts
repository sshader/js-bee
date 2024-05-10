// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const problemValidator = {
  summary: v.optional(v.string()),
  prompt: v.string(),
  testCases: v.array(
    v.object({
      args: v.any(),
      expected: v.any(),
    })
  ),
  isPublished: v.optional(v.boolean()),
};

export default defineSchema({
  problem: defineTable(problemValidator),
  game: defineTable({
    problemId: v.id("problem"),
    player1: v.union(v.id("player"), v.null()),
    player2: v.union(v.id("player"), v.null()),
    phase: v.union(
      v.object({ status: v.literal("NotStarted") }),
      v.object({ status: v.literal("Inputting") }),
      v.object({ status: v.literal("InputDone"), code: v.string() }),
      v.object({
        status: v.literal("Done"),
        code: v.string(),
        result: v.array(
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
      })
    ),
  }),
  inputs: defineTable({
    gameId: v.id("game"),
    inputs: v.array(
      v.object({
        isPlayer1: v.boolean(),
        operation: v.union(
          v.object({
            kind: v.literal("Add"),
            input: v.string(),
          }),
          v.object({
            kind: v.literal("Delete"),
            numDeleted: v.optional(v.number()),
          }),
          v.object({
            kind: v.literal("MoveCursor"),
            newPos: v.number(),
          }),
          v.object({
            kind: v.literal("Finish"),
          })
        ),
      })
    ),
    rank: v.number(),
  }).index("ByGame", ["gameId", "rank"]),
  code: defineTable({
    gameId: v.id("game"),
    code: v.string(),
    cursorPosition: v.number(),
    player1Skips: v.number(),
    player2Skips: v.number(),
  }).index("ByGame", ["gameId"]),
  player: defineTable({
    name: v.string(),
    sessionId: v.optional(v.string()),
    botType: v.optional(v.string()),
  }).index("BySession", ["sessionId"]),
  aiAnswers: defineTable({
    prompt: v.string(),
    solutionSnippet: v.string(),
    answer: v.union(v.string(), v.null()),
  }).index("ByPrompt", ["prompt"]),
});
