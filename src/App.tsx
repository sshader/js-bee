import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  RouterProvider,
  createBrowserRouter,
  useNavigate,
} from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import Player from "./Player";
import ErrorPage from "./ErrorPage";
import Game from "./Game";
import ProblemEditor from "./ProblemEditor";
import { Sheet, SheetTitle } from "./components/ui/sheet";
import { DotIcon, HomeIcon } from "@radix-ui/react-icons";
import { Id } from "convex/_generated/dataModel";
import { Card } from "./components/ui/card";
import { useEffect } from "react";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
    errorElement: <ErrorPage />,
  },
  {
    path: "games/:gameId",
    element: <Game />,
    errorElement: <ErrorPage />,
  },
  {
    path: "problems/:problemId",
    element: <ProblemEditor />,
    errorElement: <ErrorPage />,
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

function App() {
  useEffect(() => {
    const listener = (event: MediaQueryListEvent) => {
      if (event.matches) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.setAttribute("data-color-mode", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-color-mode", "light");
      }
    };
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", listener);
    return () =>
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", listener);
  });
  return (
    <main className="font-mono flex flex-col gap-8 h-[100vh] w-[100vw] overflow-auto p-10">
      <Sheet>
        <SheetTitle className="flex justify-between">
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => {
                void router.navigate("/");
              }}
            >
              <HomeIcon />
            </Button>
            <div>JS Bee</div>
          </div>
          <Player />
        </SheetTitle>
        <RouterProvider router={router} />
      </Sheet>
    </main>
  );
}

function Index() {
  const recentGames = useQuery(api.games.recentGames) ?? [];
  const joinGame = useMutation(api.games.joinGame);
  const startGame = useMutation(api.games.startGame);
  const problems = useQuery(api.problems.list) ?? [];
  const createProblem = useMutation(api.problems.create);
  const navigate = useNavigate();

  const player = useCurrentPlayer();

  const handleJoinGame = async (gameId: Id<"game">) => {
    await joinGame({
      playerId: player._id,
      gameId,
    });
    navigate(`/games/${gameId}`);
  };

  return (
    <div className="flex gap-4 text-center items-start w-full h-full overflow-hidden">
      <div className="flex flex-col w-full h-full">
        <Sheet>
          <SheetTitle>Ongoing Games</SheetTitle>
          <div className="flex flex-col flex-1 min-h-0 gap-2 w-full overflow-auto">
            {...recentGames.map(
              ({ game, player2Name, player1Name, problemSummary }) => {
                const participating =
                  game.phase.player1 === player._id ||
                  (game.phase.status !== "NotStarted" &&
                    game.phase.player2 === player._id);
                const canJoin =
                  game.phase.status === "NotStarted" && !participating;
                const summary = (
                  <div className="flex gap-2 items-center">
                    <div>{problemSummary}</div>
                    <DotIcon />
                    <div>{`${player1Name ?? "No one"} vs. ${player2Name ?? "No one"}`}</div>
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
                        {game.phase.status === "Done" ? "Rewatch" : "Rejoin"}
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
        </Sheet>
      </div>

      <div className="flex flex-col gap-2 w-full h-full">
        <Sheet>
          <SheetTitle>Problems</SheetTitle>
          <div className="flex flex-col flex-shrink-1 min-h-0 gap-2 overflow-auto">
            {...problems.map((p) => {
              return (
                <Card
                  className="flex gap-2 items-center p-2 w-full justify-between"
                  key={p._id}
                >
                  <div>{p.summary ?? p.prompt.substring(0, 50)}</div>
                  <Button
                    onClick={() => {
                      const f = async () => {
                        const gameId = await startGame({
                          playerId: player._id,
                          problemId: p._id,
                        });
                        navigate(`/games/${gameId}`);
                      };
                      void f();
                    }}
                  >
                    New game
                  </Button>
                </Card>
              );
            })}
          </div>
          <Button
            className="ml-auto mr-auto"
            onClick={() => {
              const f = async () => {
                const problem = await createProblem({
                  prompt:
                    "// Explain your problem here and give an example\nsolution({ a: 1, b: 2 }) // 3",
                  testCases: [{ args: { a: 1, b: 2 }, expected: 3 }],
                  isPublished: false,
                });
                navigate(`/problems/${problem._id}`);
              };
              void f();
            }}
          >
            New problem
          </Button>
        </Sheet>
      </div>
    </div>
  );
}

export default App;
