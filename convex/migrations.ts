import { makeMigration } from "convex-helpers/server/migrations";
import { internalMutation } from "./_generated/server";

const migration = makeMigration(internalMutation, {
  migrationTable: "migrations",
});

export const myMigration3 = migration({
  table: "game",
  migrateOne: async (ctx, doc) => {
    // @ts-ignore
    await ctx.db.patch(doc._id, {
      // @ts-ignore
      ...doc.phase,
      // @ts-ignore
      player2: doc.phase.player2 ?? null,
      phase: undefined,
    });
  },
});
