import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const takeTurn = mutation({
  args: {
    playerId: v.id("player"),
    gameId: v.id("game"),
    input: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    const nextPlayerId = await handleTurn(ctx, game, args.playerId, args.input);
    if (nextPlayerId === null) {
      return;
    }
    const nextPlayer = await ctx.db.get(nextPlayerId);
    const codeDoc = (await ctx.db
      .query("code")
      .withIndex("ByGame", (q) => q.eq("gameId", game._id))
      .unique())!;
    const shouldSkip =
      (nextPlayerId === game.player1 && codeDoc.player1Skips > 0) ||
      codeDoc.player2Skips > 0;
    if (shouldSkip) {
      await handleTurn(ctx, game, nextPlayerId, "");
      return;
    }
    if (nextPlayer?.name === "ChatGPT") {
      await ctx.scheduler.runAfter(0, internal.openai.takeTurn, {
        gameId: game._id,
      });
    }
  },
});

export async function handleTurn(
  ctx: MutationCtx,
  game: Doc<"game">,
  playerId: Id<"player">,
  input: string
) {
  if (game.phase.status !== "Inputting") {
    throw new Error("Game isn't in the inputting phase");
  }
  const inputs = await ctx.db
    .query("inputs")
    .withIndex("ByGame", (q) => q.eq("gameId", game._id))
    .collect();
  const tail = inputs.at(-1)!;
  const lastInput = tail.inputs.at(-1);
  const isPlayer1Turn = lastInput === undefined || !lastInput.isPlayer1;
  const nextPlayer = isPlayer1Turn ? game.player2 : game.player1;
  if (isPlayer1Turn && game.player1 !== playerId) {
    throw new Error("Not current player's turn");
  } else if (!isPlayer1Turn && game.player2 !== playerId) {
    throw new Error("Not current player's turn");
  }
  const codeDoc = (await ctx.db
    .query("code")
    .withIndex("ByGame", (q) => q.eq("gameId", game._id))
    .unique())!;
  if (input === "done") {
    await addInput(ctx, tail, {
      isPlayer1: isPlayer1Turn,
      operation: { kind: "Finish" },
    });
    await ctx.db.patch(game._id, {
      phase: {
        status: "InputDone",
        code: codeDoc.code,
      },
    });
    return null;
  }
  const codeBeforeCursor = codeDoc.code.substring(0, codeDoc.cursorPosition);
  const codeAfterCurser = codeDoc.code.substring(codeDoc.cursorPosition);
  if (input === "\\r") {
    const newCursor = Math.max(codeBeforeCursor.lastIndexOf("\n"), 0);
    await addInput(ctx, tail, {
      isPlayer1: isPlayer1Turn,
      operation: { kind: "MoveCursor", newPos: newCursor },
    });
    await ctx.db.patch(codeDoc._id, {
      cursorPosition: newCursor,
    });
    return nextPlayer;
  }
  if (input.startsWith("skip")) {
    const numSkips = parseInt(input.split(" ")[1] ?? "5");
    await addInput(ctx, tail, {
      isPlayer1: isPlayer1Turn,
      operation: { kind: "Add", input: "" },
    });
    await ctx.db.patch(
      codeDoc._id,
      isPlayer1Turn
        ? {
            player2Skips: numSkips,
          }
        : { player1Skips: numSkips }
    );
    return nextPlayer;
  }
  // skip
  if (input === "") {
    await addInput(ctx, tail, {
      isPlayer1: isPlayer1Turn,
      operation: { kind: "Add", input: "" },
    });
    await ctx.db.patch(
      codeDoc._id,
      isPlayer1Turn
        ? {
            player1Skips: (codeDoc.player1Skips ?? 1) - 1,
          }
        : {
            player2Skips: (codeDoc.player2Skips ?? 1) - 1,
          }
    );
    return nextPlayer;
  }
  if (input === "clearline") {
    const newCursor = Math.max(codeBeforeCursor.lastIndexOf("\n") - 1, 0);
    const numDeleted = codeDoc.cursorPosition - newCursor;
    await addInput(ctx, tail, {
      isPlayer1: isPlayer1Turn,
      operation: { kind: "Delete", numDeleted },
    });
    await ctx.db.patch(codeDoc._id, {
      code: codeBeforeCursor.substring(0, newCursor) + codeAfterCurser,
      cursorPosition: newCursor,
    });
    return nextPlayer;
  }
  if (input.startsWith("clear")) {
    const numDeleted = parseInt(input.split(" ")[1] ?? "1");
    const newCursor = codeDoc.cursorPosition - numDeleted;
    await addInput(ctx, tail, {
      isPlayer1: isPlayer1Turn,
      operation: { kind: "Delete", numDeleted },
    });
    await ctx.db.patch(codeDoc._id, {
      code: codeBeforeCursor.substring(0, newCursor) + codeAfterCurser,
      cursorPosition: newCursor,
    });
    return nextPlayer;
  }
  let char = input;
  if (input === "\\n") {
    char = "\n";
  } else if (input === "\\t") {
    char = "\t";
  } else {
    if (input.length !== 1) {
      throw new Error("More than one character!");
    }
  }
  await addInput(ctx, tail, {
    isPlayer1: isPlayer1Turn,
    operation: { kind: "Add", input: char },
  });
  await ctx.db.patch(codeDoc._id, {
    code: codeBeforeCursor + char + codeAfterCurser,
    cursorPosition: codeDoc.cursorPosition + 1,
  });
  return nextPlayer;
}

async function addInput(
  ctx: MutationCtx,
  tail: Doc<"inputs">,
  input: Doc<"inputs">["inputs"]["0"]
) {
  if (tail.inputs.length > 500) {
    await ctx.db.insert("inputs", {
      gameId: tail.gameId,
      inputs: [input],
      rank: tail.rank + 1,
    });
  } else {
    await ctx.db.patch(tail._id, {
      inputs: [...tail.inputs, input],
    });
  }
}

export const recordResult = mutation({
  args: {
    gameId: v.id("game"),
    testCaseResults: v.any(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Unknown game");
    }
    if (game.phase.status === "Done") {
      return;
    }
    if (game.phase.status !== "InputDone") {
      throw new Error("Phase incorrect");
    }
    await ctx.db.patch(args.gameId, {
      phase: {
        status: "Done",
        code: game.phase.code,
        result: args.testCaseResults,
      },
    });
  },
});
