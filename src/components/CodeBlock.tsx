import { CodeBlock as ReactCodeBlock, dracula } from "react-code-blocks";
export function CodeBlock({ text }: { text: string }) {
  return (
    <div className="font-mono">
      <ReactCodeBlock
        text={text}
        language={"js"}
        showLineNumbers={false}
        theme={dracula}
      />
    </div>
  );
}
