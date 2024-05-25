import { Input, State, getInitialState, applyInput } from "../../common/inputs";
import { useEffect, useState } from "react";
import { ReadOnlyPlayerInputs } from "./PlayerInputs";
import { wrapInFunction } from "@/lib/ScoreCode";
import { CodeBlock } from "@/components/CodeBlock";
import * as Checkbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";

function Playback({ inputs }: { inputs: Array<Input> }) {
  const [frame, setFrame] = useState(0);
  const [gameState, setGameState] = useState<State>(getInitialState());
  const [animate, setAnimate] = useState(true);
  const [showInputs, setShowInputs] = useState(true);
  const endState = inputs.reduce((g, i) => applyInput(g, i), getInitialState());

  useEffect(() => {
    if (!animate) {
      setGameState(endState);
      return;
    }
    console.log(frame, gameState);
    const advance = setInterval(() => {
      let f = frame;
      let input = inputs[f];
      f = (f + 1) % inputs.length;
      setFrame(f);
      setGameState(applyInput(f === 0 ? getInitialState() : gameState, input));
      if (input.operation.kind === "Skipped") {
        input = inputs[f];
        f = (f + 1) % inputs.length;
        setFrame(f);
        setGameState(
          applyInput(f === 0 ? getInitialState() : gameState, input)
        );
      }
    }, 300);
    return () => clearInterval(advance);
  }, [animate, setGameState, frame, setFrame, endState, gameState, inputs]);
  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="flex flex-col gap-2 w-[50%]">
          {showInputs && <ReadOnlyPlayerInputs gameState={gameState} />}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox.Root
              className="w-4 h-4 border-solid border-primary border-2 flex items-center justify-center"
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  setShowInputs(!checked);
                }
              }}
            >
              <Checkbox.Indicator>
                <CheckIcon />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <label className="Label" htmlFor="c1">
              Code only
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox.Root
              className="w-4 h-4 border-solid border-primary border-2 flex items-center justify-center"
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  setAnimate(!checked);
                  if (!checked) {
                    setFrame(0);
                    setGameState(getInitialState());
                  }
                }
              }}
            >
              <Checkbox.Indicator>
                <CheckIcon />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <label className="Label" htmlFor="c1">
              No animation
            </label>
          </div>
        </div>
      </div>
      <CodeBlock text={wrapInFunction(gameState.code)} />
    </div>
  );
}

export default Playback;
