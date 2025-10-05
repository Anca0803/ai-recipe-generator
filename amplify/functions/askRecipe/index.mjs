import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const db = new DynamoDBClient({});
const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION });

export const handler = async (event) => {
    try {
        const { arguments: args, identity } = event;
        const ingredients = args.ingredients || [];
        const lang = args.lang || "English";

        // Identify user or guest
        const id = identity?.sub || identity?.sourceIp?.[0] || "guest";
        const today = new Date().toISOString().split("T")[0];
        const pk = `${id}:${today}`;
        const ttl = Math.floor(Date.now() / 1000) + 86400;

        // 1️⃣ Enforce 5/day rate limit
        const { Item } = await db.send(
            new GetItemCommand({
                TableName: process.env.RATE_TABLE_NAME,
                Key: { pk: { S: pk } },
            })
        );

        const count = Item?.count?.N ? Number(Item.count.N) : 0;
        if (count >= 5) {
            return {
                body: "",
                error: "You’ve reached the daily limit of 5 recipe requests. Try again tomorrow.",
            };
        }

        await db.send(
            new PutItemCommand({
                TableName: process.env.RATE_TABLE_NAME,
                Item: {
                    pk: { S: pk },
                    count: { N: String(count + 1) },
                    ttl: { N: String(ttl) },
                },
            })
        );

        // 2️⃣ Build smarter Bedrock prompt
        const systemPrompt = `
You are a professional cooking assistant. Reply in ${lang}.
Write a recipe for exactly 2 servings.
Use standard metric units (g, ml, tsp, tbsp).
Always include:

1. Title
2. Servings (always 2 people)
3. Preparation time (minutes)
4. Ingredients (with exact quantities and clear units)
5. Instructions (numbered, clear and concise)
6. Optional tip for better flavor or presentation.

Keep your tone warm and informative, like a chef explaining confidently. No introductions or outros — only the recipe.`;

        const userPrompt = `Create a recipe using only these ingredients: ${ingredients.join(", ")}.`;

        const response = await bedrock.send(
            new InvokeModelCommand({
                modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 900,
                    system: systemPrompt,
                    messages: [
                        { role: "user", content: [{ type: "text", text: userPrompt }] },
                    ],
                }),
                contentType: "application/json",
                accept: "application/json",
            })
        );

        const raw = Buffer.from(response.body).toString("utf-8");
        const parsed = JSON.parse(raw);
        console.log("RAW:", raw); // 🔍 vezi ce primești efectiv
        const text = parsed?.content?.[0]?.text || "";

        return { body: text, error: "" };
    } catch (err) {
        console.error(err);
        return { body: "", error: err.message || "Internal error" };
    }
};
