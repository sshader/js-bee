import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentPlayer } from "@/lib/PlayerProvider";
import { Link2Icon } from "@radix-ui/react-icons";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";

export function Invite({ gameId }: { gameId: Id<"game"> }) {
  const inviteBot = useMutation(api.games.inviteBot);
  return (
    <Card className="flex flex-col gap-4 p-2">
      Waiting for another player. Want to invite one?
      <div className="flex w-full gap-4">
        <Button
          variant="secondary"
          onClick={() => {
            void inviteBot({
              gameId,
              botType: "chatgpt",
            });
          }}
        >
          Invite ChatGPT
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void inviteBot({
              gameId,
              botType: "claude",
            });
          }}
        >
          Invite Claude
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
          }}
        >
          Copy link
          <Link2Icon />
        </Button>
      </div>
    </Card>
  );
}

export function JoinGame({ gameId }: { gameId: Id<"game"> }) {
  const player = useCurrentPlayer();
  const joinGame = useMutation(api.games.joinGame);
  return (
    <Card>
      This game needs another player!
      <Button
        variant="secondary"
        onClick={() => {
          void joinGame({ gameId, playerId: player._id });
        }}
      >
        Join
      </Button>
    </Card>
  );
}
