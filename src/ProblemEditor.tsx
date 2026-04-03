import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { useState } from "react";
import { Skeleton } from "./components/ui/skeleton";
import { SheetTitle } from "./components/ui/sheet";
import { Label } from "@radix-ui/react-label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Checkbox } from "./components/ui/checkbox";
import { Badge } from "./components/ui/badge";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";

function ProblemEditor() {
  const { problemId } = useParams();
  const problem = useQuery(api.problems.read, {
    id: problemId as Id<"problem">,
  });
  if (problem === undefined) {
    return <Skeleton />;
  } else if (problem === null) {
    return "Not found!";
  } else {
    return <Inner problem={problem} />;
  }
}

type TestCase = { args: any; expected: any; hidden?: boolean };

function Inner({ problem }: { problem: Doc<"problem"> }) {
  const [code, setCode] = useState(problem.prompt);
  const [summary, setSummary] = useState(problem.summary);
  const [description, setDescription] = useState(problem.description ?? "");
  const [language, setLanguage] = useState<"javascript" | "python">(
    problem.language || "javascript"
  );
  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard" | ""
  >(problem.difficulty ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(problem.tags ?? []);
  const [timeLimit, setTimeLimit] = useState<string>(
    problem.timeLimit?.toString() ?? ""
  );
  const [testCases, setTestCases] = useState<TestCase[]>(
    problem.testCases.map((tc) => ({
      args: JSON.stringify(tc.args),
      expected: JSON.stringify(tc.expected),
      hidden: (tc as any).hidden ?? false,
    }))
  );
  const updateProblem = useMutation(api.problems.update);
  const navigate = useNavigate();

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCase,
    value: any
  ) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { args: "{}", expected: "", hidden: false }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-5">
      <SheetTitle className="text-center">
        {problem.isPublished ? "Edit problem" : "Add a new problem"}
      </SheetTitle>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const parsedTestCases = testCases.map((tc) => ({
            args: JSON.parse(tc.args as string),
            expected: JSON.parse(tc.expected as string),
            hidden: tc.hidden || undefined,
          }));
          const f = async () => {
            await updateProblem({
              id: problem._id,
              patch: {
                isPublished: true,
                prompt: code,
                summary,
                description: description || undefined,
                language,
                difficulty: difficulty || undefined,
                tags: tags.length > 0 ? tags : undefined,
                timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
                testCases: parsedTestCases,
              },
            });
            navigate(-1);
          };
          void f();
        }}
      >
        <div className="flex gap-2 items-center">
          <Label>Title:</Label>
          <Input
            placeholder="E.g. Add numbers"
            value={summary}
            required
            onChange={(e) => {
              setSummary(e.target.value);
            }}
          />
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2 items-center">
            <Label>Language:</Label>
            <Select
              value={language}
              onValueChange={(value: "javascript" | "python") =>
                setLanguage(value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Label>Difficulty:</Label>
            <Select
              value={difficulty}
              onValueChange={(value: "easy" | "medium" | "hard") =>
                setDifficulty(value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Label>Time limit (s):</Label>
            <Input
              type="number"
              min="0"
              className="w-24"
              placeholder="120"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Tags:</Label>
          <div className="flex gap-2 items-center mt-1">
            <Input
              placeholder="Add a tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <Cross2Icon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Description:</Label>
          <p className="text-xs text-muted-foreground mb-1">
            Prose description of the problem (separate from code prompt)
          </p>
          <Textarea
            placeholder="Describe what the function should do..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <Label>Prompt:</Label>
          <CodeEditor
            value={code}
            language={language === "python" ? "python" : "js"}
            onChange={(evn) => setCode(evn.target.value)}
            padding={15}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <Label>Test cases:</Label>
              <p className="text-xs text-muted-foreground">
                Solutions will be scored based on whether they pass these test
                cases
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTestCase}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Add test
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {testCases.map((tc, index) => (
              <div
                key={index}
                className="border border-border rounded-md p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Test case {index + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={tc.hidden ?? false}
                        onCheckedChange={(checked) =>
                          updateTestCase(index, "hidden", !!checked)
                        }
                      />
                      Hidden
                    </label>
                    {testCases.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTestCase(index)}
                      >
                        <Cross2Icon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Args (JSON):</Label>
                    <Input
                      value={tc.args as string}
                      onChange={(e) =>
                        updateTestCase(index, "args", e.target.value)
                      }
                      placeholder='{"a": 1, "b": 2}'
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Expected (JSON):</Label>
                    <Input
                      value={tc.expected as string}
                      onChange={(e) =>
                        updateTestCase(index, "expected", e.target.value)
                      }
                      placeholder="3"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="m-auto">
          Save
        </Button>
      </form>
    </div>
  );
}

export default ProblemEditor;
