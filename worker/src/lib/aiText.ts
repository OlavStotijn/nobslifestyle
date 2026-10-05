import type { Env } from "../types";

// Mistral Small 3.1 (Apache-2.0, no geographic usage restriction) — same
// reasoning as Moondream in ocr.ts/mealScan.ts: Meta Llama's Acceptable Use
// Policy bars use by anyone EU-domiciled, which this Netherlands-based app
// can't assume its users (or owner) aren't.
const MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

// guided_json constrains the model's output to a JSON Schema rather than
// hoping a prompt instruction is followed — much more reliable than the
// regex-extraction fallback the vision models (ocr.ts, mealScan.ts) need,
// since this model's API supports it directly.
export async function generateJson<T>(env: Env, systemPrompt: string, userPrompt: string, schema: object): Promise<T> {
  const output = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    guided_json: schema,
    max_tokens: 1536,
  });

  const text = output.response;
  if (!text) throw new Error("Empty response from text model.");

  try {
    return JSON.parse(text) as T;
  } catch {
    // guided_json should make this unreachable, but the model is still
    // free-form text generation underneath — never trust it blindly.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model response.");
    return JSON.parse(match[0]) as T;
  }
}
