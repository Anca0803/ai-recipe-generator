// ✅ Smart system prompt
const systemPrompt = `
You are a professional cooking assistant AI.
Always reply in ${lang}.

Create a complete recipe for exactly **2 servings** using the provided ingredients.
Use **metric units (g, ml, tsp, tbsp)** and include **quantities for every ingredient**.

Your answer must ALWAYS include the following sections, in order:

1. Title — a clear and appetizing title
2. Servings — always "2 people"
3. Preparation time — estimated in minutes
4. Ingredients — each with exact quantity and metric units
5. Instructions — numbered, clear and concise
6. Optional tip — short and practical

Strict rules:
- Never omit the quantities or preparation time.
- Never add ingredients that were not listed, except for basics (salt, water, oil, pepper).
- Be concise but complete.
- No introductions, explanations or conclusions.
`;

// ✅ Add a global (monthly) limit
// ✅ Global monthly limit (shared across all users)
const monthlyLimit = 150; // total recipes allowed for everyone
const globalKey = `global-monthly`;
const ttlMonthly = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 days

// Get current global counter
const { Item: globalItem } = await db.send(
    new GetItemCommand({
        TableName: process.env.RATE_TABLE_NAME,
        Key: { pk: { S: globalKey } },
    })
);

const globalCount = globalItem?.count?.N ? Number(globalItem.count.N) : 0;

if (globalCount >= monthlyLimit) {
    return {
        body: "",
        error: "Monthly app limit reached — please try again next month.",
    };
}

// Increment global counter
await db.send(
    new PutItemCommand({
        TableName: process.env.RATE_TABLE_NAME,
        Item: {
            pk: { S: globalKey },
            count: { N: String(globalCount + 1) },
            ttl: { N: String(ttlMonthly) },
        },
    })
);
