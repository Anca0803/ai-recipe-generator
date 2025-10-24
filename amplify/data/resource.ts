// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // Tipul de răspuns al resolverului Bedrock
  BedrockResponse: a.customType({
    body: a.string(),
    error: a.string(),
  }),

  // Query-ul public care cheamă Bedrock prin HTTP datasource-ul "bedrockDS"
  askBedrock: a
    .query()
    .arguments({
      // IMPORTANT: frontend-ul trimite un TEXT, nu un array → folosim string
      ingredients: a.string().required(),
      // opțional – dacă lipsește, bedrock.js detectează automat limba
      lang: a.string(),
    })
    .returns(a.ref("BedrockResponse"))
    // Public access (guest) + permite și autentificat, dacă vei vrea
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(
      a.handler.custom({
        entry: "./bedrock.js",    // resolverul tău HTTP către Bedrock
        dataSource: "bedrockDS",  // definit în amplify/backend.ts
      })
    ),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // IMPORTANT: site public → auth implicit cu API Key
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
