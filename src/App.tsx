// src/App.tsx
import { FormEvent, useEffect, useState } from "react";
import { Loader, Placeholder } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./App.css";

import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { getCurrentUser } from "aws-amplify/auth";

// IMPORTANT: NU mai apela Amplify.configure aici. E deja în src/main.tsx.
// import { Amplify } from "aws-amplify";
// import outputs from "../amplify_outputs.json";
// Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Detectează dacă utilizatorul este autentificat (Cognito).
  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setSignedIn(true);
      } catch {
        setSignedIn(false);
      }
    })();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");
    setResult("");
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const ingredientsRaw = formData.get("ingredients")?.toString() ?? "";
      const ingredients = [ingredientsRaw];

      // Alege automat authMode:
      // - "userPool" dacă ești logată prin Cognito (Authenticator)
      // - "iam" dacă nu ai login (folosește semnarea IAM – potrivit pentru dev)
      const authMode = signedIn ? ("userPool" as const) : ("iam" as const);

      const { data, errors } = await client.queries.askBedrock(
        { ingredients },
        { authMode }
      );

      if (errors && errors.length) {
        console.error(errors);
        setErrorMsg(errors.map(e => e.message ?? "Unknown error").join("\n"));
        return;
      }

      setResult(data?.body || "No data returned");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(
        typeof e?.message === "string"
          ? e.message
          : `An unexpected error occurred: ${String(e)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header-container">
        <h1 className="main-header">
          Meet Your Personal
          <br />
          <span className="highlight">Recipe AI</span>
        </h1>
        <p className="description">
          Simply type a few ingredients using the format <em>ingredient1,
            ingredient2, ...</em> and Recipe AI will generate a brand-new recipe
          on demand.
        </p>
      </div>

      <form onSubmit={onSubmit} className="form-container">
        <div className="search-container">
          <input
            type="text"
            className="wide-input"
            id="ingredients"
            name="ingredients"
            placeholder="Ingredient1, Ingredient2, Ingredient3,..."
            required
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>

      <div className="result-container">
        {loading ? (
          <div className="loader-container">
            <p>Loading...</p>
            <Loader size="large" />
            <Placeholder size="large" />
            <Placeholder size="large" />
            <Placeholder size="large" />
          </div>
        ) : errorMsg ? (
          <pre className="error-box">{errorMsg}</pre>
        ) : (
          result && <pre className="result">{result}</pre>
        )}
      </div>
    </div>
  );
}
