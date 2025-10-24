import { useState } from "react";
import type { FormEvent } from "react";
import { Loader, Placeholder } from "@aws-amplify/ui-react";
import "./App.css";

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

// NU seta userPool aici – lăsăm implicit și forțăm API Key per apel
const client = generateClient<Schema>();

function App() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const ingredients = formData.get("ingredients")?.toString().trim() ?? "";
      const lang =
        navigator.language?.slice(0, 2) || (navigator as any).userLanguage || "en";

      const { data, errors } = await client.queries.askBedrock(
        // ❗ schema așteaptă STRING, nu array
        { ingredients, lang },
        // ❗ forțăm API Key ca să nu mai ceară login/JWT
        { authMode: "apiKey" }
      );

      if (errors?.length) {
        console.error(errors);
        alert(errors[0].message || "Unknown error");
      } else {
        // răspunsul e în data.askBedrock.body
        setResult(data?.body || "No data returned");
      }
    } catch (e: any) {
      alert(`An error occurred: ${e?.message || e}`);
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
          Simply type a few ingredients using the format ingredient1, ingredient2, etc., and Recipe AI will generate an all-new recipe on
          demand...
        </p>
      </div>

      <form onSubmit={onSubmit} className="form-container">
        <div className="search-container">
          <input
            type="text"
            className="wide-input"
            id="ingredients"
            name="ingredients"
            placeholder="Ingredient1, Ingredient2, Ingredient3,...etc"
          />
          <button type="submit" className="search-button">
            Generate
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
        ) : (
          result && <p className="result">{result}</p>
        )}
      </div>
    </div>
  );
}

export default App;
