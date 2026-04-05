import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { DownloadIcon, Pencil1Icon, TrashIcon, UploadIcon } from "@radix-ui/react-icons";
import { exportProblems, parseImportFile } from "@/lib/exportImport";
import { useRef } from "react";

const DIFFICULTY_COLORS = {
  easy: "bg-green-600 text-white",
  medium: "bg-yellow-500 text-black",
  hard: "bg-red-600 text-white",
} as const;

function DifficultyBadge({
  difficulty,
}: {
  difficulty: "easy" | "medium" | "hard";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_COLORS[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

export { DifficultyBadge, DIFFICULTY_COLORS };

export function ProblemLibrary({
  mode = "browse",
  onSelect,
}: {
  mode?: "browse" | "select";
  onSelect?: (problemId: Id<"problem">) => void;
}) {
  const problems = useQuery(api.problems.list) ?? [];
  const navigate = useNavigate();
  const deleteProblem = useMutation(api.problems.deleteProblem);
  const createProblem = useMutation(api.problems.create);
  const importProblemsMutation = useMutation(api.problems.importProblems);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  const filtered = problems.filter((p) => {
    const matchesSearch =
      !search ||
      (p.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.tags ?? []).some((t) =>
        t.toLowerCase().includes(search.toLowerCase())
      );
    const matchesDifficulty =
      difficultyFilter === "all" || p.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          placeholder="Search problems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48"
        />
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        {mode === "browse" && (
          <>
            <Button
              onClick={() => {
                const f = async () => {
                  const problem = await createProblem({
                    prompt:
                      "Return the sum of two numbers given as [a, b].",
                    testCases: [{ args: [1, 2], expected: 3 }],
                    isPublished: false,
                  });
                  navigate(`/problems/${problem._id}`);
                };
                void f();
              }}
            >
              New problem
            </Button>
            <Button
              variant="outline"
              onClick={() => exportProblems(problems)}
              disabled={problems.length === 0}
            >
              <DownloadIcon className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="h-4 w-4 mr-1" /> Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const f = async () => {
                  const parsed = await parseImportFile(file);
                  await importProblemsMutation({ problems: parsed });
                };
                void f();
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <ProblemCard
            key={p._id}
            problem={p}
            mode={mode}
            onSelect={onSelect}
            onEdit={() => navigate(`/problems/${p._id}`)}
            onDelete={() => void deleteProblem({ id: p._id })}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No problems found.
        </div>
      )}
    </div>
  );
}

function ProblemCard({
  problem,
  mode,
  onSelect,
  onEdit,
  onDelete,
}: {
  problem: Doc<"problem">;
  mode: "browse" | "select";
  onSelect?: (id: Id<"problem">) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const visibleTests = problem.testCases.filter(
    (tc) => !(tc as any).hidden
  ).length;
  const totalTests = problem.testCases.length;

  return (
    <Card
      className={`p-3 flex flex-col gap-2 ${
        mode === "select"
          ? "hover:border-secondary cursor-pointer"
          : ""
      }`}
      onClick={
        mode === "select" ? () => onSelect?.(problem._id) : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {problem.summary ?? problem.prompt.substring(0, 40)}
          </span>
          {problem.difficulty && (
            <DifficultyBadge difficulty={problem.difficulty} />
          )}
          <span className="text-xs text-muted-foreground">
            {problem.language === "python" ? "Python" : "JS"}
          </span>
        </div>
        {mode === "browse" && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil1Icon className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete problem?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{problem.summary}". This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {problem.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {problem.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(problem.tags ?? []).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {totalTests} test{totalTests !== 1 ? "s" : ""}
          {visibleTests < totalTests &&
            ` (${totalTests - visibleTests} hidden)`}
        </span>
      </div>
    </Card>
  );
}
