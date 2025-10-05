// amplify/data/bedrock.js

export function request(ctx) {
    const { ingredients = [], lang } = ctx.args;

    // Keep this short to control token cost
    const system = `Reply in ${lang ? lang : "the user's input language"}.
Write a clear, compact recipe for EXACTLY 2 servings.
Use METRIC units with abbreviations (g, ml, tsp, tbsp; use kg/L only if >999 g/ml).
Return ONLY these sections, nothing else:
- Title (one line)
- Servings: 2
- Time: <prep> prep, <cook> cook
- Ingredients (bulleted, each line: "<qty> <unit> <item>")
- Instructions (numbered, short steps)
- Tips (1–2 bullets)
Be practical and precise; assume common pantry items if missing.`;

    // Short user message = fewer tokens
    const user = `Ingredients: ${ingredients.join(", ")}`;

    return {
        resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`,
        method: "POST",
        params: {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1000, // you can lower to ~700 later to save more
                system,
                messages: [
                    { role: "user", content: [{ type: "text", text: user }] }
                ]
            })
        }
    };
}

export function response(ctx) {
    const parsedBody = JSON.parse(ctx.result.body);
    return { body: parsedBody?.content?.[0]?.text ?? "" };
}
