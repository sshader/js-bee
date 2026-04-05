import { OpenAI } from "openai";
import { BotPlayer, type Language } from "./common";

const askChatGpt = async (prompt: string, language: Language) => {
  const openai = new OpenAI();

  const response = await openai.chat.completions.create(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are implementing ${language === "python" ? "Python" : "JavaScript"} functions`,
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
