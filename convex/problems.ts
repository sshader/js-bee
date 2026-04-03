import { crud } from "convex-helpers/server";
import { problemValidator } from "./schema";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const { read, update, create } = crud(
  {
    name: "problem",
    withoutSystemFields: problemValidator,
    _id: v.id("problem"),
  },
  query,
  mutation
);

export const list = query({
  args: {},
  handler: async (ctx, _args) => {
    const problems = await ctx.db.query("problem").collect();
    return problems.filter((p) => p.isPublished === true);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx, _args) => {
    return await ctx.db.query("problem").collect();
  },
});

export const deleteProblem = mutation({
  args: { id: v.id("problem") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const importProblems = mutation({
  args: {
    problems: v.array(v.object(problemValidator)),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const problem of args.problems) {
      const id = await ctx.db.insert("problem", problem);
      ids.push(id);
    }
    return ids;
  },
});
