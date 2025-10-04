// amplify/data/bedrock.js (or wherever your resolver lives)

export function request(ctx) {
    const { ingredients = [], lang } = ctx.args;

    // Minimal, cost-efficient system instruction
    const system = `Reply in ${lang ? lang : "the user's input language"}.
Return only:
- Title (one line)
- Ingredients (bulleted)
- Instructions (numbered)
Be concise; no intro/outro. Use natural units for the language/locale.`;

    // Short user prompt (keeps tokens down)
    const user = `Ingredients: ${ingredients.join(", ")}`;

    return {
        resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`,
        method: "POST",
        params: {
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1000, // keep as-is; lower (e.g., 600) if you want to cut costs further
                // Bedrock Claude supports a top-level `system` string
                system,
                messages: [
                    {
                        role: "user",
                        content: [{ type: "text", text: user }],
                    },
                ],
            }),
        },
    };
}

export function response(ctx) {
    const parsedBody = JSON.parse(ctx.result.body);
    return { body: parsedBody?.content?.[0]?.text ?? "" };
}
