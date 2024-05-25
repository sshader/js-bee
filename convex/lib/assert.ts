export const assert = (condition: boolean, errorMessage: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${errorMessage}`);
  }
};
