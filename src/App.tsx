import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useCurrentPlayer } from "./lib/PlayerProvider";
import Player from "./Player";

function App() {
  const ongoingGames = useQuery(api.games.ongoingGames) ?? [];
  const joinGame = useMutation(api.games.joinGame);
  const startGame = useMutation(api.games.startGame);
  const problems = useQuery(api.problems.list) ?? [];
  const createProblem = useMutation(api.problems.create);
  const navigate = useNavigate();

  const player = useCurrentPlayer();

  return (
    <main className="container max-w-2xl flex flex-col gap-8">
      <h1>JS Bee</h1>
      <Player />
      <div>
        <h2>Ongoing Games</h2>
        <div className="flex flex-col">
          {...ongoingGames.map((g) => {
            const needsPlayer = g.player2 === null;
            if (needsPlayer) {
              return (
                <div key={g._id}>
                  <Button
                    onClick={() => {
                      const f = async () => {
                        await joinGame({
                          playerId: player._id,
                          gameId: g._id,
                        });
                        navigate(`/games/${g._id}`);
                      };
                      void f();
                    }}
                  >{`Join`}</Button>
                </div>
              );
            } else {
              return (
                <Button
                  variant="secondary"
                  key={g._id}
                  onClick={() => {
                    navigate(`/games/${g._id}`);
                  }}
                >
                  Watch
                </Button>
              );
            }
          })}
        </div>
      </div>

      <div>
        <h2 className="text-md">Problems</h2>
        {...problems.map((p) => {
          return (
            <div className="flex gap-2 items-center" key={p._id}>
              <div className="border-solid border-2 rounded-sm border-slate-500 p-2">
                {p.summary ?? p.prompt.substring(0, 50)}
              </div>
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
                Start new game
              </Button>
            </div>
          );
        })}
        <Button
          onClick={() => {
            const f = async () => {
              const problem = await createProblem({
                prompt:
                  "// Explain your problem here and give an example\nsolution({ a: 1, b: 2 }) // 3",
                testCases: [{ args: { a: 1, b: 2 }, expected: 3 }],
              });
              navigate(`/problems/${problem._id}`);
            };
            void f();
          }}
        >
          New problem
        </Button>
      </div>
    </main>
  );
}

export default App;
