import { Doc } from "../../convex/_generated/dataModel";

const EXPORT_VERSION = 1;

type ExportedProblem = Omit<Doc<"problem">, "_id" | "_creationTime">;

interface ExportData {
  version: number;
  exportedAt: string;
  problems: ExportedProblem[];
}

export function exportProblems(problems: Doc<"problem">[]) {
  const data: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    problems: problems.map(({ _id, _creationTime, ...rest }) => rest),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `js-bee-problems-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<ExportedProblem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        if (!data.version || !Array.isArray(data.problems)) {
          throw new Error("Invalid export file format");
        }
        resolve(data.problems);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
