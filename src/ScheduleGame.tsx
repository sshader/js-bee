import {
  Navigate,
  redirect,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { useState } from "react";
import { Skeleton } from "./components/ui/skeleton";
import { Sheet, SheetTitle } from "./components/ui/sheet";
import { Label } from "@radix-ui/react-label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Card } from "./components/ui/card";
import { useToast } from "./components/ui/use-toast";

function ScheduleGame() {
  const player = useCurrentPlayer();
  const { scheduledGameId } = useParams();
  const [searchParams] = useSearchParams();
  const initialPassword = searchParams.get("p") ?? "";
  const [passwordInput, setPasswordInput] = useState(initialPassword);
  const [password, setPassword] = useState(initialPassword);
  const scheduledGame = useQuery(api.schedule.get, {
    scheduledGameId: scheduledGameId as Id<"scheduledGame">,
    playerId: player._id,
    password,
  });
  if (scheduledGame === undefined) {
    return <Skeleton />;
  } else if (scheduledGame === null) {
    return (
      <Card className="whitespace-pre-line p-2 flex flex-col gap-2">
        <div>Someone wants to play JS Bee with you!</div>
        <div>Enter the password they shared with you.</div>
        <div className="flex gap-2 items-center">
          <Label>Password</Label>
          <Input
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setPassword(passwordInput);
                setPasswordInput("");
              }
            }}
            type="text"
            onSubmit={(e) => {
              e.preventDefault();
              setPassword(passwordInput);
              setPasswordInput("");
            }}
          />
          {password !== "" && <div>❌</div>}
        </div>
        <Button
          className="mr-auto"
          onClick={() => {
            setPassword(passwordInput);
            setPasswordInput("");
          }}
        >
          Submit
        </Button>
      </Card>
    );
  } else {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Inner scheduledGame={scheduledGame} />
      </LocalizationProvider>
    );
  }
}

function Inner({
  scheduledGame,
}: {
  scheduledGame: Doc<"scheduledGame"> & {
    inviteeName: string | null;
    inviterName: string;
  };
}) {
  const player = useCurrentPlayer();
  const updatePassword = useMutation(api.schedule.updatePassword);
  const updateTime = useMutation(api.schedule.updateTime);
  const saveDraft = useMutation(api.schedule.save);
  const accept = useMutation(api.schedule.accept);
  const { toast } = useToast();
  const otherName =
    scheduledGame.inviter === player._id
      ? scheduledGame.inviteeName ?? "A player"
      : scheduledGame.inviterName;

  switch (scheduledGame.kind) {
    case "Draft": {
      return (
        <div className="flex flex-col gap-5">
          <SheetTitle className="text-center">Schedule game</SheetTitle>
          <Card className="whitespace-pre-line p-2 flex flex-col gap-2">
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = async () => {
                  await saveDraft({
                    playerId: player._id,
                    scheduledGameId: scheduledGame._id,
                  });
                };
                void f();
              }}
            >
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2 items-center">
                  <div>Password:</div>
                  <div className="border-solid p-2 rounded border-primary border-2">
                    {scheduledGame.password}
                  </div>
                </div>
                <Button
                  className="h-full"
                  onClick={(e) => {
                    e.preventDefault();
                    void updatePassword({
                      playerId: player._id,
                      scheduledGameId: scheduledGame._id,
                    });
                  }}
                >
                  Generate new password
                </Button>
              </div>
              <DateTimePicker
                defaultValue={scheduledGame.proposedTime}
                onAccept={(date) => {
                  if (date !== null) {
                    void updateTime({
                      time: (date as unknown as Date).getTime(),
                      playerId: player._id,
                      scheduledGameId: scheduledGame._id,
                      password: scheduledGame.password,
                    });
                  }
                }}
                label="Pick time"
              />
              <Button type="submit" className="mr-auto">
                Schedule game
              </Button>
            </form>
          </Card>
        </div>
      );
    }
    case "Proposed": {
      const lastProposedTime = scheduledGame.proposedTimes.at(-1)!;
      const url = new URL(
        `https://js-bee.vercel.app/schedule/${scheduledGame._id}`
      );
      url.search = new URLSearchParams({
        p: scheduledGame.password,
      }).toString();
      const content =
        "Play JS Bee with me!\n\n" +
        `When: ${new Date(lastProposedTime.time).toLocaleString()}\n` +
        "What: https://js-bee.vercel.app/\n\n" +
        `Accept or reschedule here:\n${url}\n\n` +
        `Password: ${scheduledGame.password}`;
      const canAccept =
        (lastProposedTime.isInviter && scheduledGame.inviter !== player._id) ||
        (!lastProposedTime.isInviter && scheduledGame.inviter === player._id);
      return (
        <div className="flex flex-col gap-5">
          <SheetTitle className="text-center">Schedule game</SheetTitle>
          {canAccept ? (
            <Card className="whitespace-pre-line p-2 flex flex-col gap-2">
              {`${otherName} wants to play JS Bee with you!

            When: ${new Date(lastProposedTime.time).toLocaleString()}`}

              <div className="flex gap-4 items-center">
                <Button
                  className="h-full"
                  onClick={() => {
                    void accept({
                      playerId: player._id,
                      scheduledGameId: scheduledGame._id,
                      password: scheduledGame.password,
                    });
                  }}
                >
                  Accept
                </Button>
                <DateTimePicker
                  onAccept={(date) => {
                    if (date !== null) {
                      updateTime({
                        time: (date as unknown as Date).getTime(),
                        playerId: player._id,
                        scheduledGameId: scheduledGame._id,
                        password: scheduledGame.password,
                      }).then(() => {
                        toast({ title: "Successfully picked a new time!" });
                      });
                    }
                  }}
                  label="Pick a new time"
                />
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <Card className="whitespace-pre-line p-2 flex flex-col gap-2">
                {content}

                <div className="flex gap-4 items-center">
                  <Button
                    className="h-full"
                    onClick={() => {
                      navigator.clipboard.writeText(content).then(() => {
                        toast({ title: "Copied to clipboard!" });
                      });
                    }}
                  >
                    Copy and share
                  </Button>
                  <DateTimePicker
                    onAccept={(date) => {
                      if (date !== null) {
                        updateTime({
                          time: (date as unknown as Date).getTime(),
                          playerId: player._id,
                          scheduledGameId: scheduledGame._id,
                          password: scheduledGame.password,
                        }).then(() => {
                          toast({ title: "Successfully picked a new time!" });
                        });
                      }
                    }}
                    label="Pick a new time"
                  />
                </div>
              </Card>
            </div>
          )}
        </div>
      );
    }
    case "Accepted": {
      return (
        <Card className="whitespace-pre-line p-2 flex flex-col gap-2">
          {`It's on! Come back later to play your game with ${otherName}!
          
          When: ${new Date(scheduledGame.time).toLocaleString()}
          What: https://js-bee.vercel.app/
          `}
        </Card>
      );
    }
    case "Started":
      return <Navigate to={`/game/${scheduledGame.game}`} />;
    default: {
      const _typecheck: never = scheduledGame;
      return <Navigate to="/" />;
    }
  }
}

export default ScheduleGame;
