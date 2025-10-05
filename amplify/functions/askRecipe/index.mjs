import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.BEDROCK_REGION || "us-east-1";
const ddb = new DynamoDBClient({ region: REGION });
const bedrock = new BedrockRuntimeClient({ region: REGION });

const DAILY_LIMIT = 5;         // <= your cap

export const handler = async (event) => {
    try {
        const args = event.arguments ?? {};
        const { ingredients = [], lang } = args;

        // Identify caller: Cognito user → sub; otherwise, guest IP
        const sub = event?.identity?.sub || null;
        const ip =
            event?.request?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
            event?.request?.ip ||
            "unknown";
        const isUser = Boolean(sub);
        const id = isUser ? sub : ip;

        // Daily key (UTC)
        const today = new Date().toISOString().slice(0, 10);
        const pk = `${isUser ? "user" : "guest"}:${id}:${today}`;

        // TTL ≈ +24h
        const ttl = Math.floor((Date.now() + 24 * 3600 * 1000) / 1000);

        // Atomic increment; set TTL on first write
        const upd = new UpdateItemCommand({
            TableName: process.env.RATE_TABLE_NAME,
            Key: { pk: { S: pk } },
            UpdateExpression: "ADD #c :one SET #t = if_not_exists(#t, :ttl)",
            ExpressionAttributeNames: { "#c": "count", "#t": "ttl" },
            ExpressionAttributeValues: { ":one": { N: "1" }, ":ttl": { N: String(ttl) } },
            ReturnValues: "UPDATED_NEW",
        });
        const res = await ddb.send(upd);
        const used = Number(res.Attributes?.count?.N || "1");
        if (used > DAILY_LIMIT) {
            return {
                body: "",
                error: `Daily limit reached (${DAILY_LIMIT}). Create an account to unlock more.`,
            };
        }

        // ——— Bedrock prompt (2 servings, metric, concise but detailed) ———
        const system = `Reply in ${lang ? lang : "the user's input language"}.
Write a clear, compact recipe for EXACTLY 2 servings.
Use METRIC units with abbreviations (g, ml, tsp, tbsp; kg/L only if >999).
Return ONLY:
- Title (one line)
- Servings: 2
- Time: <prep> prep, <cook> cook
- Ingredients (bulleted, "<qty> <unit> <item>")
- Instructions (numbered)
- Tips (1–2 bullets)`;

        const user = `Ingredients: ${ingredients.join(", ")}`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 800,
            system,
            messages: [{ role: "user", content: [{ type: "text", text: user }] }],
        };

        const out = await bedrock.send(
            new InvokeModelCommand({
                modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: Buffer.from(JSON.stringify(body)),
            })
        );

        const payload = JSON.parse(new TextDecoder().decode(out.body));
        return { body: payload?.content?.[0]?.text ?? "", error: "" };
    } catch (err) {
        console.error(err);
        return { body: "", error: "Something went wrong. Please try again later." };
    }
};
