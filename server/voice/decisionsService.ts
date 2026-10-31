import type OpenAI from "openai";
import { MOODS } from "./context.js";
export async function decideMood(
  client: OpenAI,
  model: string,
  text: string,
  direction: "user" | "assistant",
  phase: string,
  signal: AbortSignal,
) {
  const result = await client.decisions.create(
    {
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                短い会話: text.slice(-500),
                話者: direction,
                ゲームの状態: phase,
              }),
            },
          ],
        },
      ],
      questions: [
        {
          type: "choice",
          name: "listening_expression",
          instructions:
            "会話の聞き手として取る控えめな表情を選ぶ。話者の本当の感情を推定しない。操作はしない。",
          choices: MOODS.map((value) => ({
            value,
            description: {
              watching: "静かに聞く",
              thinking: "考えながら聞く",
              surprised: "発見に軽く驚く",
              happy: "一緒に喜ぶ",
              resting: "落ち着いて休む",
            }[value],
          })),
        },
      ],
    },
    { signal, timeout: 5000, maxRetries: 0 },
  );
  const answer = result.answers[0];
  return {
    usage: result.usage,
    mood:
      answer?.type === "choice" &&
      typeof answer.choice === "string" &&
      MOODS.includes(answer.choice as (typeof MOODS)[number])
        ? (answer.choice as (typeof MOODS)[number])
        : undefined,
  };
}
