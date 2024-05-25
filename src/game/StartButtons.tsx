import { Button } from "@/components/ui/button";
import { useCurrentPlayer } from "@/lib/PlayerProvider";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link, useNavigate } from "react-router-dom";

export function StartGame() {
  const player = useCurrentPlayer();

  const startGame = useMutation(api.games.startGame);

  const navigate = useNavigate();

  return (
    <Button
      onClick={(e) => {
        const f = async () => {
          const gameId = await startGame({
            playerId: player._id,
          });
          navigate(`/games/${gameId}`);
        };
        void f();
      }}
    >
      Start game
    </Button>
  );
}

export function ScheduleGameButton() {
  const player = useCurrentPlayer();

  const scheduleGame = useMutation(api.schedule.schedule);

  const navigate = useNavigate();

  return (
    <Button
      onClick={(e) => {
        const f = async () => {
          const scheduledGameId = await scheduleGame({
            playerId: player._id,
          });
          navigate(`/schedule/${scheduledGameId}`);
        };
        void f();
      }}
    >
      Schedule game
    </Button>
  );
}

export function SeeOngoingGames() {
  return (
    <Link to="/ongoing">
      <Button>See ongoing games</Button>
    </Link>
  );
}
