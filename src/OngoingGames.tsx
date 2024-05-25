import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import { DotIcon } from "@radix-ui/react-icons";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { useNavigate } from "react-router-dom";
import { Id } from "../convex/_generated/dataModel";
import Header from "./Header";
import { ScheduleGameButton, StartGame } from "./game/StartButtons";

function OngoingGames() {
  const player = useCurrentPlayer();
  const recentGames = useQuery(api.games.recentGames) ?? [];

  const joinGame = useMutation(api.games.joinGame);

  const navigate = useNavigate();

  const handleJoinGame = async (gameId: Id<"game">) => {
    await joinGame({
      playerId: player._id,
      gameId,
    });
    navigate(`/games/${gameId}`);
  };
  return (
    <>
      <Header>
        <div className="flex p-2 gap-2 justify-center">
          <StartGame />
          <ScheduleGameButton />
        </div>
      </Header>
      <div className="flex flex-col w-full h-full">
        <div className="flex flex-col flex-1 min-h-0 gap-2 w-full overflow-auto">
          {...recentGames.map(
            ({ game, player2Name, player1Name, problemSummary }) => {
              const participating =
                game.player1 === player._id ||
                (game.status !== "NotStarted" && game.player2 === player._id);
              const canJoin = game.status === "NotStarted" && !participating;
              const summary = (
                <div className="flex gap-2 items-center">
                  <div>{`${player1Name ?? "No one"} and ${player2Name ?? "No one"}`}</div>
                  {problemSummary !== null && (
                    <>
                      <DotIcon />
                      <div>{problemSummary}</div>
                    </>
                  )}
                </div>
              );
              if (canJoin) {
                return (
                  <Card
                    key={game._id}
                    className="flex items-center justify-between gap-4 text-center w-full p-2"
                  >
                    {summary}
                    <Button
                      variant="default"
                      onClick={() => void handleJoinGame(game._id)}
                    >{`Join`}</Button>
                  </Card>
                );
              }
              if (participating) {
                return (
                  <Card
                    key={game._id}
                    className="flex items-center justify-between gap-4 text-center w-full p-2"
                  >
                    {summary}
                    <Button onClick={() => navigate(`/games/${game._id}`)}>
                      {game.status === "Done" ? "Rewatch" : "Rejoin"}
                    </Button>
                  </Card>
                );
              }
              return (
                <Card
                  key={game._id}
                  className="flex items-center justify-between gap-4 text-center w-full p-2"
                >
                  {summary}
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/games/${game._id}`)}
                  >{`Watch`}</Button>
                </Card>
              );
            }
          )}
        </div>
      </div>
    </>
  );
}

export default OngoingGames;
