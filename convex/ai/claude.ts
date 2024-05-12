import Anthropic from "@anthropic-ai/sdk";
import { BotPlayer, SYSTEM_PROMPT } from "./common";

const askClaude = async (prompt: string) => {
  const anthropic = new Anthropic();

  const msg = await anthropic.messages.create({
    system: SYSTEM_PROMPT,
    model: "claude-3-opus-20240229",
    max_tokens: 1000,
    temperature: 0.5,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.map((m) => m.text).join("");
};

export const { askBot, askBotWrapper } = BotPlayer("claude", askClaude);
