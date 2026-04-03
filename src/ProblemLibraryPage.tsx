import Header from "./Header";
import { ProblemLibrary } from "./components/ProblemLibrary";

export function ProblemLibraryPage() {
  return (
    <>
      <Header>
        <span className="text-sm font-normal">Problem Library</span>
      </Header>
      <ProblemLibrary mode="browse" />
    </>
  );
}
