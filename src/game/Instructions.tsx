import { Link } from "@/components/typography/link";

export function Instructions() {
  return (
    <div className="text-sm">
      <p>
        This is a{" "}
        <Link
          href="https://dropbox.tech/developers/introducing-the-python-bee"
          target="_blank"
        >
          "JavaScript Bee"
        </Link>
        . Two people take turns coding out a solution one character at a time
        without being able to see what you're writing until the end.
      </p>
      <div className="whitespace-pre-line">
        {`
                Special commands:
                  - Type "done" on your turn to finish the solution
                  - Type '\\n' and '\\t' for newline or tab
                  - Type "clearline" to clear the last line (including the newline)
                  - Type "clear N" to clear the last N characters.
                  - Type "pass" if you're stuck and want to skip your turn
                  - In case of emergency, type "skip N" to skip your partner N times`}
      </div>
    </div>
  );
}
