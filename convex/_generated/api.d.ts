/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_botLogic from "../ai/botLogic.js";
import type * as ai_chatgpt from "../ai/chatgpt.js";
import type * as ai_claude from "../ai/claude.js";
import type * as ai_common from "../ai/common.js";
import type * as engine from "../engine.js";
import type * as games from "../games.js";
import type * as lib_assert from "../lib/assert.js";
import type * as lib_functions from "../lib/functions.js";
import type * as migrations from "../migrations.js";
import type * as players from "../players.js";
import type * as problems from "../problems.js";
import type * as schedule from "../schedule.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/botLogic": typeof ai_botLogic;
  "ai/chatgpt": typeof ai_chatgpt;
  "ai/claude": typeof ai_claude;
  "ai/common": typeof ai_common;
  engine: typeof engine;
  games: typeof games;
  "lib/assert": typeof lib_assert;
  "lib/functions": typeof lib_functions;
  migrations: typeof migrations;
  players: typeof players;
  problems: typeof problems;
  schedule: typeof schedule;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
