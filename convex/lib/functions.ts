import {
  CustomCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import * as VanillaConvex from "../_generated/server";
import { Doc, Id, TableNames } from "../_generated/dataModel";

export type DatbaseReader = VanillaConvex.DatabaseReader & {
  getX: <T extends TableNames>(
    id: Id<T>,
    createError?: (id: Id<T>) => Error
  ) => Promise<Doc<T>>;
};

export type DatabaseWriter = VanillaConvex.DatabaseWriter & DatbaseReader;

export type MutationCtx = CustomCtx<typeof mutation>;
export type QueryCtx = CustomCtx<typeof query>;

export const query = customQuery(VanillaConvex.query, {
  args: {},
  input: async (ctx, _args) => {
    const db = {
      ...ctx.db,
      getX: async <T extends TableNames>(
        id: Id<T>,
        createError?: (id: Id<T>) => Error
      ) => {
        const doc = await ctx.db.get(id);
        if (doc === null) {
          const error =
            createError === undefined
              ? new Error(`Document not found for ID ${id}`)
              : createError(id);
          throw error;
        }
        return doc;
      },
    };
    return { ctx: { db }, args: {} };
  },
});

export const internalQuery = customQuery(VanillaConvex.internalQuery, {
  args: {},
  input: async (ctx, _args) => {
    const db = {
      ...ctx.db,
      getX: async <T extends TableNames>(
        id: Id<T>,
        createError?: (id: Id<T>) => Error
      ) => {
        const doc = await ctx.db.get(id);
        if (doc === null) {
          const error =
            createError === undefined
              ? new Error(`Document not found for ID ${id}`)
              : createError(id);
          throw error;
        }
        return doc;
      },
    };
    return { ctx: { db }, args: {} };
  },
});

export const mutation = customMutation(VanillaConvex.mutation, {
  args: {},
  input: async (ctx, _args) => {
    const db = {
      ...ctx.db,
      getX: async <T extends TableNames>(
        id: Id<T>,
        createError?: (id: Id<T>) => Error
      ) => {
        const doc = await ctx.db.get(id);
        if (doc === null) {
          const error =
            createError === undefined
              ? new Error(`Document not found for ID ${id}`)
              : createError(id);
          throw error;
        }
        return doc;
      },
    };
    return { ctx: { db }, args: {} };
  },
});

export const internalMutation = customMutation(VanillaConvex.internalMutation, {
  args: {},
  input: async (ctx, _args) => {
    const db = {
      ...ctx.db,
      getX: async <T extends TableNames>(
        id: Id<T>,
        createError?: (id: Id<T>) => Error
      ) => {
        const doc = await ctx.db.get(id);
        if (doc === null) {
          const error =
            createError === undefined
              ? new Error(`Document not found for ID ${id}`)
              : createError(id);
          throw error;
        }
        return doc;
      },
    };
    return { ctx: { db }, args: {} };
  },
});
