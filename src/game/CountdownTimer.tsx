import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  PlayIcon,
  PauseIcon,
  ResetIcon,
} from "@radix-ui/react-icons";

export function CountdownTimer({
  durationSeconds = 120,
}: {
  durationSeconds?: number;
}) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [running, remaining, clearTimer]);

  const toggle = () => {
    if (remaining === 0) return;
    setRunning((r) => !r);
  };

  const reset = () => {
    clearTimer();
    setRunning(false);
    setRemaining(durationSeconds);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining > 0 && remaining <= 30;
  const isExpired = remaining === 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`font-mono text-2xl font-bold tabular-nums ${
          isExpired
            ? "text-red-500"
            : isWarning
              ? "text-yellow-500 animate-pulse"
              : ""
        }`}
      >
        {isExpired
          ? "TIME'S UP"
          : `${minutes}:${seconds.toString().padStart(2, "0")}`}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={toggle} disabled={isExpired}>
          {running ? (
            <PauseIcon className="h-4 w-4" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <ResetIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
