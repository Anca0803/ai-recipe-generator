import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/** Tiny table: 1 item per caller per day */
const rateTable = a.table({
  partitionKey: "pk", // e.g. "guest:1.2.3.4:2025-10-05" or "user:<sub>:2025-10-05"
  fields: {
    pk: a.string(),
    count: a.integer(),
    ttl: a.integer(),
  },
  ttl: "ttl",
});

/** Lambda that enforces 5/day and then calls Bedrock */
const askFn = a.function({
  name: "askRecipe",
  entry: "../functions/askRecipe/index.mjs", // Lambda path (we’ll create below)
  environment: {
    RATE_TABLE_NAME: rateTable.name,
    BEDROCK_REGION: "us-east-1",
  },
  permissions: [
    a.permissions.dynamoDb().write(rateTable),
    a.policy({
      actions: [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
      ],
      resources: ["*"], // You can restrict later
    }),
  ],
  runtime: 20, // Node.js 20
});

const schema = a.schema({
  BedrockResponse: a.customType({
    body: a.string(),
    error: a.string(),
  }),

  askBedrock: a
    .query()
    .arguments({
      ingredients: a.string().array().required(),
      lang: a.string(),
    })
    .returns(a.ref("BedrockResponse"))
    .authorization((allow) => [
      allow.iam(), // guests
      allow.userPool(), // signed-in users
    ])
    .handler(a.handler.function(askFn)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam", // guest default
    userPoolAuthorizationMode: {},
  },
  tables: [rateTable],
  functions: [askFn],
});
