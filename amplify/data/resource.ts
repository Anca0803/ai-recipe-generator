import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/** Tiny table: 1 item per caller per day */
const rateTable = a.table({
  partitionKey: "pk",                        // e.g. "guest:1.2.3.4:2025-10-05" or "user:<sub>:2025-10-05"
  fields: { pk: a.string(), count: a.integer(), ttl: a.integer() },
  ttl: "ttl",
});

/** Lambda that enforces 5/day and then calls Bedrock */
const askFn = a
  .function({
    name: "askRecipe",
    entry: "../functions/askRecipe/index.mjs",   // we’ll create this file below
    environment: {
      RATE_TABLE_NAME: rateTable.name,
      BEDROCK_REGION: "us-east-1",
    },
    permissions: [
      a.permissions.dynamoDb().write(rateTable),
      // Minimal Bedrock permissions; you can scope to specific model ARN later
      a.policy({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: ["*"],
      }),
    ],
    runtime: 20, // Node.js 20
  });

const schema = a.schema({
  BedrockResponse: a.customType({
    body: a.string(),
    error: a.string(),
  }),

  /** Same field name; now handled by Lambda (IAM + UserPool allowed) */
  askBedrock: a
    .query()
    .arguments({
      ingredients: a.string().array().required(),
      lang: a.string(),               // optional, you can omit if you want auto-language only
    })
    .returns(a.ref("BedrockResponse"))
    .authorization([
      a.allow.iam(),                  // guests (Identity Pool)
      a.allow.userPool(),             // signed-in users
    ])
    .handler(a.handler.function(askFn)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Default IAM so guests work out of the box.
    defaultAuthorizationMode: "iam",
    // If you already have a User Pool via `ampx add auth`, this enables it:
    userPoolAuthorizationMode: {},
  },
  // expose resources so Amplify deploys them
  tables: [rateTable],
  functions: [askFn],
});
