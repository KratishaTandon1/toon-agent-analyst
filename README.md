# 🤖 AgentStudio: Multi-Agent RAG & Code Execution Workspace

**AgentStudio** is a production-grade, collaborative multi-agent workspace built in **React + TypeScript + Vite** for translating, analyzing, and optimizing database context structures using **TOON (Token-Oriented Object Notation)**. It operates fully client-side in the browser, offering a complete developer dashboard to benchmark prompt engineering, run sandboxed calculations with self-healing capabilities, and audit token metrics.

---

## 🚀 The 12 Features & Capabilities

### 1. Collaborative Multi-Agent Team (Main View)
* **What it is**: Orchestrates a 3-agent pipeline: **Planner** (node model-parameterized) ➔ **Data/Tool Agent** (compiles sandboxed calculations) ➔ **Analyst** (tuned temperature reports).
* **Advanced Features**: 
  - **Animated Pipeline Flow**: Neon arrows connect the nodes. The path preceding the active node lights up and flows 3x faster during execution.
  - **Self-Correction Sandbox**: If the compiled JavaScript fails, the agent reflections log catches the syntax error, corrects it, and retries inside the browser sandbox.
* **How to Test**:
  1. Select `🛒 E-Commerce DB` from the source dropdown.
  2. Input query: `"Calculate the total E-Commerce sales and average items ordered"`.
  3. Click **Execute Loop** and watch the arrows animate as steps proceed.
  4. Review the self-correction log indicating the sandbox typo repair.

### 2. Prompt A/B Tester
* **What it is**: A side-by-side prompt benchmarking playground to compare how different system instructions affect response latency, token count, and API cost.
* **Advanced Features**: Uses the [PromptPlayground](file:///C:/Users/pc/.gemini/antigravity-ide/scratch/toon-agent-analyst/src/components/PromptPlayground.tsx) split grid which stacks responsively on mobile.
* **How to Test**:
  1. Go to the **Prompt A/B Tester** tab.
  2. Enter System Prompt A (concise) and System Prompt B (verbose).
  3. Click **Run Prompt A/B Test** and compare completion latency (ms) and cost charts side-by-side.

### 3. Developer SDKs
* **What it is**: Code-generation panel that provides developers copy-pasteable client wrappers to serialize data and call APIs using TOON.
* **Advanced Features**: Includes a markdown report exporter that generates cost efficiency summaries dynamically.
* **How to Test**:
  1. Go to the **Developer SDKs** tab.
  2. Click **Python SDK** or **Node.js Script** and copy the serializing functions.
  3. Go to **Report Exporter** and click **Download Cost Ledger Report** to download `.md` files directly.

### 4. RAG Documents
* **What it is**: Client-side document indexer that chunks text files or markdown guides into a search index.
* **Advanced Features**: Upgraded RAG chunk matching in [vectorDb.ts](file:///C:/Users/pc/.gemini/antigravity-ide/scratch/toon-agent-analyst/src/utils/vectorDb.ts) from simple text matching to a **TF-IDF relevance engine**.
* **How to Test**:
  1. Go to **RAG Documents**, click **💡 Load Example Specification**, and click **Index Document**.
  2. Go back to the **Agent Team** tab, choose `📄 RAG Document Index` from the source dropdown.
  3. Ask: `"Explain how TOON handles nested arrays"` and execute the loop.

### 5. Cost Ledger
* **What it is**: Persistent session tracker mapping aggregate token compression metrics and financial savings.
* **How to Test**:
  1. Run several agent query loops under **Agent Team** or **RAG Console**.
  2. Navigate to **Cost Ledger** to view lifetime tokens saved, cost reductions, and row records.

### 6. RAG Console
* **What it is**: Single-Agent console to compare raw JSON payloads and compacted TOON payloads side-by-side with token count bar charts.
* **How to Test**:
  1. Go to **RAG Console**, choose suggestions like `"Billing tickets with negative sentiment"`.
  2. Click **Run Agent Query** and inspect the token savings bar.

### 7. Chat Memory
* **What it is**: Chatbot sandbox showcasing memory compression (sweeping short-term history into TOON tables).
* **Advanced Features**: Integrates a dynamic context thermometer that displays memory fill percentages.
* **How to Test**:
  1. Type several messages about your profile (e.g. `"I write React in Seattle"`).
  2. Click **Compress Conversation History** and inspect the archived facts in the TOON panel on the right.

### 8. API Fetcher
* **What it is**: Fetcher to load live public REST API JSON endpoints, translate them to TOON context, and run queries over the live feed.
* **How to Test**:
  1. Keep the default URL (`https://jsonplaceholder.typicode.com/users`) and click **Fetch API**.
  2. Input query: `"Summarize contact details"` and click **Ask Agent**.

### 9. Schema Optimizer
* **What it is**: Optimizer that flattens nested JSON structures to increase TOON's tabular compression ratio.
* **How to Test**:
  1. Paste a nested JSON structure (or keep the default).
  2. Click **Optimize Schema Structures** to view the original vs. flattened TOON outputs and review the generated TypeScript translation mapper helper code.

### 10. Mock DBs
* **What it is**: Real-time database editor in [DatabaseEditor.tsx](file:///C:/Users/pc/.gemini/antigravity-ide/scratch/toon-agent-analyst/src/components/DatabaseEditor.tsx) allowing you to inspect and modify mock values.
* **Advanced Features**: Integrated with the Simulated Agent Engine. Modifying rows here updates the simulated reports immediately.
* **How to Test**:
  1. Go to **Mock DBs**, select `E-Commerce Orders`, and double the `"total"` cost of the first row (change `129.50` to `500.00`).
  2. Go to **Agent Team** and ask `"Sum orders total"`.
  3. Verify the final Analyst report reflects your exact updated sum!

### 11. Playground
* **What it is**: General sandbox to paste custom JSON strings and check their converted TOON formats instantly.
* **How to Test**:
  1. Paste any custom JSON object on the left, check the right panel to inspect layout indentation and keys.

### 12. Settings
* **What it is**: Configuration panel in [Settings.tsx](file:///C:/Users/pc/.gemini/antigravity-ide/scratch/toon-agent-analyst/src/components/Settings.tsx) to switch between simulation and live API environments.
* **How to Test**:
  1. Click **Live LLM Mode**, choose **Gemini API** or **OpenAI API**, input your API key, and click **Save Key**.
  2. All analysis steps will now query real model completions!

---

## 🛠️ Installation & Local Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KratishaTandon1/toon-agent-analyst.git
   cd toon-agent-analyst
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

4. **Verify Lints & Builds:**
   ```bash
   # Run ESLint validation
   npm run lint

   # Compile and build production files
   npm run build
   ```

---

## 🌐 Production Deployment Configurations

### 1. Pre-configured Environment Variables
You can bake environment configurations directly into your hosting builds to enable pre-configured live LLM analysis. Copy `.env.example` to `.env` or `.env.production` and configure your parameters:

```env
# Enable live LLM queries instead of simulations by default
VITE_USE_LIVE=true

# Default LLM provider ('gemini' or 'openai')
VITE_API_PROVIDER=gemini

# Default API Key (Vite will bind this during compile time)
VITE_API_KEY=AIzaSyYourSecretGeminiApiKeyHere
```

### 2. Render Deploy (Static Site)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + ➔ Static Site**.
2. Connect your GitHub repository `toon-agent-analyst`.
3. Configure the build parameters:
   * **Build Command:** `npm run build`
   * **Publish Directory:** `dist`
4. Under **Advanced Settings**, add the environment keys (`VITE_USE_LIVE`, `VITE_API_PROVIDER`, and `VITE_API_KEY`) to run the live model out-of-the-box!

---

## 📄 License
This project is licensed under the MIT License.
