import { Input, State, getInitialState, applyInput } from "../../common/inputs";
import { useEffect, useState } from "react";
import { ReadOnlyPlayerInputs } from "./PlayerInputs";
import { wrapInFunction } from "@/lib/ScoreCode";
import { CodeBlock } from "@/components/CodeBlock";
import * as Checkbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import { Slider } from "@/components/ui/slider";

function Playback({
  inputs,
  problemLanguage,
}: {
  inputs: Array<Input>;
  problemLanguage: "javascript" | "python";
}) {
  const [frame, setFrame] = useState(0);
  const [gameState, setGameState] = useState<State>(getInitialState());
  const [animate, setAnimate] = useState(true);
  const defaultDuration = inputs.length * 300;
  const [durationMs, setDurationMs] = useState(defaultDuration);
  const [showInputs, setShowInputs] = useState(true);
  const rawDuration =
    inputs.length === 0 ? 1 : inputs.at(-1)?.timeOffsetMs ?? 15 * 1000;
  const speed = durationMs / rawDuration;

  useEffect(() => {
    if (!animate) {
      const endState = inputs.reduce(
        (g, i) => applyInput(g, i),
        getInitialState()
      );
      setGameState(endState);
      return;
    }

    const nextTimeMs =
      frame === 0 ||
      inputs[frame].timeOffsetMs === undefined ||
      inputs[frame - 1].timeOffsetMs === undefined
        ? 600
        : inputs[frame].timeOffsetMs! - inputs[frame - 1].timeOffsetMs!;
    const advance = setTimeout(() => {
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
    }, nextTimeMs * speed);
    return () => clearTimeout(advance);
  }, [animate, setGameState, frame, setFrame, gameState, inputs, speed]);
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
            <label className="Label">Code only</label>
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
            <label className="Label">No animation</label>
          </div>
          <div>
            <label>Speed</label>
            <Slider
              className="w-60 h-4 p-4 rounded border-2 border-solid border-primary disabled:bg-muted"
              defaultValue={[
                (-1 * Math.log(durationMs / defaultDuration)) / Math.log(1.2),
              ]}
              min={-10}
              max={10}
              step={1}
              disabled={animate === false}
              onValueChange={(v) => {
                setDurationMs(defaultDuration * 1.2 ** (-1 * v[0]));
              }}
            ></Slider>
          </div>
        </div>
      </div>
      <CodeBlock text={wrapInFunction(gameState.code, problemLanguage)} />
    </div>
  );
}

export default Playback;
