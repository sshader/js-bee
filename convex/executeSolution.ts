"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// You can fetch data from and send data to third-party APIs via an action:
export const execute = internalAction({
    // Validators for arguments.
    args: {
        code: v.string(),
        testCases: v.array(v.object({
            args: v.any(),
            expected: v.any()
        })),
        gameId: v.id("game")
    },
  
    handler: async (ctx, args) => {
        let solution: any = null;
        try {
            // https://esbuild.github.io/link/direct-eval
            solution = (0, eval)(`(a) => {${args.code}}`);
        } catch(e) {
            const failure = {
                status: "EvaluationFailed",
                error: extractErrorMessage(e)
            }
            const testCaseResults = Array(args.testCases.length).fill(failure);
            await ctx.runMutation(internal.myFunctions.recordState, { gameId: args.gameId, testCaseResults })
            return

        }
        const testCaseResults = [];
        for (const testCase of args.testCases) {
            try {
                const result = solution(testCase.args)
                if (result !== testCase.expected) {
                    testCaseResults.push({
                        status: "ResultIncorrect",
                        actual: result
                    })
                } else {
                    testCaseResults.push({
                        status: "Passed"
                    })
                }
            } catch(e) {
                testCaseResults.push({
                    status: "ExecutionFailed",
                    error: extractErrorMessage(e)
                })
            }
        }
        await ctx.runMutation(internal.myFunctions.recordState, { gameId: args.gameId, testCaseResults })
        return

    },
  });
  

function extractErrorMessage(e: unknown): string {
    return (e as any).message ?? "Unknown error"
}