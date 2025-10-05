import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

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
      allow.iam(),          // pentru useri neautentificați (guest)
      allow.userPool(),     // pentru useri autentificați
    ])
    .handler(a.handler.custom({
      entry: "./bedrock.js",
      dataSource: "bedrockDS",
    })),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam", // implicit guest access
    userPoolAuthorizationMode: {},   // dacă userul e logat
  },
});
