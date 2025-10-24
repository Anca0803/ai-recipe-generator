// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";

// 1) Configure Amplify with the committed outputs
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json"; // <= file at repo root
Amplify.configure(outputs);

// 2) Amplify UI (Authenticator) styles
import "@aws-amplify/ui-react/styles.css";

import App from "./App"; // use "./App.tsx" if your file is TS
import "./index.css";

// import { Authenticator } from "@aws-amplify/ui-react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

