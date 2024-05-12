import { useEffect, useState } from "react";
import {
  CodeBlock as ReactCodeBlock,
  dracula,
  solarizedLight,
} from "react-code-blocks";

export function CodeBlock({ text }: { text: string }) {
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.getAttribute("data-color-mode") === "dark"
  );
  useEffect(() => {
    const listener = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
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
    <div className="font-mono">
      <ReactCodeBlock
        text={text}
        language={"js"}
        showLineNumbers={false}
        theme={isDarkMode ? dracula : solarizedLight}
      />
    </div>
  );
}
