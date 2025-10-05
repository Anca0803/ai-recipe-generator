import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

// ✅ Tabela DynamoDB care stochează numărul de cereri
const rateTable = a.table({
  partitionKey: "pk", // ex: "global-month-2025-10"
  fields: {
    pk: a.string(),
    count: a.integer(),
    ttl: a.integer(),
  },
  ttl: "ttl",
});

// ✅ Lambda function care verifică și aplică limita + apelează Bedrock
const askFn = a.function({
  name: "askRecipe",
  entry: "../functions/askRecipe/index.mjs",
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
      resources: ["*"],
    }),
  ],
  runtime: 20, // Node.js 20
});

// ✅ Schema API
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
      allow.iam(), // pentru utilizatori neautentificați (guest)
      allow.userPool(), // pentru utilizatori logați
    ])
    .handler(a.handler.function(askFn)),
});

export type Schema = ClientSchema<typeof schema>;

// ✅ Configurarea backendului
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam",
    userPoolAuthorizationMode: {},
  },
  tables: [rateTable],
  functions: [askFn],
});
