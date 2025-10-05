import { FormEvent, useState } from "react";
import { Loader, Placeholder } from "@aws-amplify/ui-react";
import "./App.css";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import "@aws-amplify/ui-react/styles.css";

// Create Amplify client
const client = generateClient<Schema>();

// Helper to handle both guest & logged-in users
async function askBedrock(ingredients: string[], lang?: string) {
  let authMode: "iam" | "userPool" = "iam";
  try {
    await getCurrentUser();
    authMode = "userPool";
  } catch {
    authMode = "iam"; // guest fallback
  }

  const { data, errors } = await client.queries.askBedrock(
    { ingredients, lang },
    { authMode }
  );

  if (errors) throw new Error(errors[0].message);
  return data;
}

function App() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData(event.currentTarget);
      const ingredientsInput =
        formData.get("ingredients")?.toString().trim() || "";
      if (!ingredientsInput) {
        setError("Please enter at least one ingredient.");
        setLoading(false);
        return;
      }

      const ingredients = ingredientsInput
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      const response = await askBedrock(ingredients);
      if (response?.error) {
        setError(response.error);
      } else {
        setResult(response?.body || "No recipe found.");
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header-container">
        <h1 className="main-header">
          Meet Your Personal <br />
          <span className="highlight">Recipe AI</span>
        </h1>
        <p className="description">
          Simply type a few ingredients using commas (ingredient1, ingredient2,
          etc.) and Recipe AI will create a recipe just for you.
        </p>
      </div>

      <form onSubmit={onSubmit} className="form-container">
        <div className="search-container">
          <input
            type="text"
            className="wide-input"
            id="ingredients"
            name="ingredients"
            placeholder="Ingredient1, Ingredient2, Ingredient3..."
          />
          <button type="submit" className="search-button">
            Generate
          </button>
        </div>
      </form>

      <div className="result-container">
        {loading ? (
          <div className="loader-container">
            <p>Generating recipe...</p>
            <Loader size="large" />
            <Placeholder size="large" />
            <Placeholder size="large" />
          </div>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          result && <pre className="result">{result}</pre>
        )}
      </div>
    </div>
  );
}

export default App;
