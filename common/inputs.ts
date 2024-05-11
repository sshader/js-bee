import { Infer, v } from "convex/values";

const operationDef = v.union(
  v.object({
    kind: v.literal("Add"),
    input: v.string(),
  }),
  v.object({
    kind: v.literal("Delete"),
    numDeleted: v.number(),
  }),
  v.object({
    kind: v.literal("Skip"),
    numSkips: v.number(),
  }),
  v.object({
    kind: v.literal("Finish"),
  }),
  v.object({
    kind: v.literal("Skipped"),
  })
);

export const inputDef = v.object({
  isPlayer1: v.boolean(),
  operation: operationDef,
});
export type Input = Infer<typeof inputDef>;
export type Operation = Input["operation"];

export const stateDef = v.object({
  code: v.string(),
  isLastPlayerPlayer1: v.boolean(),
  lastPlayer1Input: v.union(operationDef, v.null()),
  lastPlayer2Input: v.union(operationDef, v.null()),
  isDone: v.boolean(),
  player1Skips: v.number(),
  player2Skips: v.number(),
  lastUpdated: v.number(),
});

export type State = Infer<typeof stateDef>;

export const getInitialState = (): State => {
  return {
    isLastPlayerPlayer1: false,
    player1Skips: 0,
    player2Skips: 0,
    lastPlayer1Input: null,
    lastPlayer2Input: null,
    code: "",
    isDone: false,
    lastUpdated: Date.now(),
  };
};

export function applyInput(state: State, input: Input) {
  const nextState = {
    ...state,
    ...(input.isPlayer1
      ? { lastPlayer1Input: input.operation }
      : { lastPlayer2Input: input.operation }),
    isLastPlayerPlayer1: input.isPlayer1,
    lastUpdated: Date.now(),
  };
  switch (input.operation.kind) {
    case "Add": {
      return {
        ...nextState,
        code: state.code + input.operation.input,
      };
    }
    case "Skipped": {
      return {
        ...nextState,
        ...(input.isPlayer1
          ? { player1Skips: Math.max(state.player1Skips - 1, 0) }
          : { player2Skips: Math.max(state.player2Skips - 1, 0) }),
      };
    }
    case "Delete": {
      return {
        ...nextState,
        code: state.code.substring(
          0,
          state.code.length - (input.operation.numDeleted ?? 1)
        ),
      };
    }
    case "Finish":
      return nextState;
    case "Skip":
      return {
        ...nextState,
        ...(input.isPlayer1
          ? { player2Skips: state.player2Skips + input.operation.numSkips }
          : { player1Skips: state.player1Skips + input.operation.numSkips }),
      };
    default: {
      const _typeCheck: never = input.operation;
      throw new Error("Unexpected input type");
    }
  }
}
