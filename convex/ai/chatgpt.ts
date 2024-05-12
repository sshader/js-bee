import { OpenAI } from "openai";
import { BotPlayer, SYSTEM_PROMPT } from "./common";

const askChatGpt = async (prompt: string) => {
  const openai = new OpenAI();

  const response = await openai.chat.completions.create(
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        { role: "user", content: prompt },
      ],
    },
    { timeout: 60000 }
  );
  const rawAnswer = response.choices[0].message.content ?? "";
  return rawAnswer;
};

export const { askBot, askBotWrapper } = BotPlayer("chatgpt", askChatGpt);
