import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import Game, { GameState, Prompt } from "./Game";
import ProblemEditor from "./ProblemEditor";
import ScheduleGame from "./ScheduleGame";
import { Sheet } from "./components/ui/sheet";
import { DotIcon } from "@radix-ui/react-icons";
import { useEffect } from "react";
import Header from "./Header";
import {
  ScheduleGameButton,
  StartGame,
  SeeOngoingGames,
} from "./game/StartButtons";
import { CollapsibleCard } from "./components/CollapsibleCard";
import { Instructions } from "./game/Instructions";
import { Skeleton } from "./components/ui/skeleton";
import { Link } from "./components/typography/link";
import OngoingGames from "./OngoingGames";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/ongoing",
    element: <OngoingGames />,
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
    path: "schedule/:scheduledGameId",
    element: <ScheduleGame />,
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
        <RouterProvider router={router} />
      </Sheet>
    </main>
  );
}

function Index() {
  const gameInfo = useQuery(api.games.featureGameInfo);

  return (
    <div>
      <Header>
        <div className="flex p-2 gap-2 justify-center">
          <StartGame />
          <ScheduleGameButton />
          <SeeOngoingGames />
        </div>
      </Header>
      {gameInfo === undefined ? (
        <Skeleton />
      ) : (
        <div className="flex flex-col w-full h-full">
          <div className="flex flex-1 min-w-0 flex-col gap-4">
            <CollapsibleCard header={"How to play:"} startOpen>
              <Instructions />
            </CollapsibleCard>

            <GameState game={gameInfo.game} />

            <Prompt
              problemPrompt={gameInfo.problemPrompt}
              startOpen
              game={gameInfo.game}
            />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 right-0 bg-background p-2">
        <div className="flex gap-2 items-center">
          <div>
            Made by{" "}
            <Link href="https://github.com/sshader/" target="_blank">
              Sarah Shader
            </Link>
          </div>
          <DotIcon />
          <div>
            Powered by{" "}
            <Link href="https://www.convex.dev/" target="_blank">
              Convex
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
