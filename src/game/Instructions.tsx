import { Link } from "@/components/typography/link";

export function Instructions() {
  return (
    <div>
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
                  - Type "clearline" to clear the last line (including the newline)
                  - Type "clear N" to clear the last N characters.
                  - In case of emergency, type "skip N" to skip your partner N times`}
      </div>
    </div>
  );
}
