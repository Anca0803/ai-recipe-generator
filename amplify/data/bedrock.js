// amplify/data/bedrock.js

// --- Utils ---
function normalizeIngredients(val) {
    if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
    if (typeof val === "string") return val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    return [];
}

// Heuristică simplă pentru limba română + câteva limbi comune
function detectLangFromText(text) {
    const t = String(text || "").toLowerCase();

    // Română – diacritice + cuvinte frecvente
    const hasRoDiacritics = /[ăâîșşțţ]/i.test(t);
    const roWords = ["și", "sau", "cu", "de", "ouă", "unt", "făină", "lapte", "zahăr", "prune", "sare", "piper"];
    const hasRoWords = roWords.some((w) => t.includes(w));
    if (hasRoDiacritics || hasRoWords) return "Romanian";

    // Alte câteva detecții ușoare (opțional extinde)
    if (/[ñáéíóúü]/i.test(t)) return "Spanish";
    if (/[àâçéèêëîïôûùüÿœ]/i.test(t)) return "French";
    if (/[äöüß]/i.test(t)) return "German";
    if (/italiano|parmigiano|olio|pomodoro/.test(t)) return "Italian";

    return "English";
}

// Extrage textul în mod robust din răspunsul Bedrock (Claude)
function extractText(parsed) {
    if (parsed?.content?.[0]?.text) return parsed.content[0].text;
    if (parsed?.output_text) return parsed.output_text;
    if (Array.isArray(parsed?.content)) {
        const maybe = parsed.content.find((c) => typeof c?.text === "string");
        if (maybe?.text) return maybe.text;
    }
    return "";
}

// --- Resolverul HTTP către Bedrock ---
export function request(ctx) {
    // Acceptă ingredients ca array sau string; lang este opțional
    const ingRaw = ctx.args?.ingredients ?? "";
    const langArg = ctx.args?.lang;
    const ingredients = normalizeIngredients(ingRaw);

    // Dacă nu primim lang, încercăm să-l ghicim din text/ingrediente
    const joined = Array.isArray(ingRaw) ? ingRaw.join(", ") : String(ingRaw || "");
    const finalLang = langArg ? String(langArg) : detectLangFromText(joined);

    // Prompt compact, 2 porții, unități metrice, răspuns în limba detectată/aleasă
    const system = `
You are a professional cooking assistant.
Always reply in ${finalLang}.
Write a recipe for EXACTLY 2 servings.
Use METRIC units with abbreviations (g, ml, tsp, tbsp; use kg/L only if >999 g/ml).
Return ONLY these sections:
1) Title (one line)
2) Servings: 2
3) Time: <prep> prep, <cook> cook
4) Ingredients (bulleted; each line "<qty> <unit> <item>")
5) Instructions (numbered; short steps)
6) Tip (one short bullet)
No small talk. No extras.
`.trim();

    const user = `Ingredients: ${ingredients.join(", ")}`;

    return {
        resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`,
        method: "POST",
        params: {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 900,
                system,
                messages: [{ role: "user", content: [{ type: "text", text: user }] }],
            }),
        },
    };
}

export function response(ctx) {
    try {
        const parsed = JSON.parse(ctx.result.body || "{}");
        const text = extractText(parsed);
        return { body: text || "", error: "" };
    } catch (e) {
        return { body: "", error: `Bedrock parse error: ${e?.message || String(e)}` };
    }
}
