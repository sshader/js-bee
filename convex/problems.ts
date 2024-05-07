import { crud } from "convex-helpers/server";
import schema, { problemValidator } from "./schema";
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
