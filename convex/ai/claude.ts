import Anthropic from "@anthropic-ai/sdk";
import { BotPlayer, type Language } from "./common";

const askClaude = async (prompt: string, language: Language) => {
  const anthropic = new Anthropic();

  const msg = await anthropic.messages.create({
    system: `You are implementing ${language === "python" ? "Python" : "JavaScript"} functions`,
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    temperature: 0.5,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((m) => m.type === "text").map((m) => m.text).join("");
};

export const { askBot, askBotWrapper } = BotPlayer("claude", askClaude);
