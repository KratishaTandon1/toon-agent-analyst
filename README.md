# 🤖 AgentStudio: Multi-Agent RAG & Code Execution Workspace

**AgentStudio** is a production-grade, collaborative multi-agent workspace built in **React + TypeScript + Vite** for translating, analyzing, and optimizing large database context structures using **TOON (Token-Oriented Object Notation)**. It operates fully client-side in the browser, offering a complete developer dashboard to benchmark prompt engineering, run sandboxed calculations with self-healing capabilities, and audit token metrics.

---

## 🚀 Key Features

### 1. Collaborative Multi-Agent Pipeline
* **Planner Agent:** Analyzes user instructions, assigns target database tables, and selects execution configurations.
* **Data/Tool Agent:** Queries mock databases, compiles custom JavaScript data-processing tools, and maps output arrays to compact TOON tables.
* **Analyst Agent:** Synthesizes final reports based on customized model temperature and context parameters.

### 2. Self-Healing Code Sandbox (Self-Correction Loop)
* Runs generated data calculations (sums, averages, filters) in a secure browser-based JS sandbox.
* Catch exceptions (syntax or runtime errors), logs trace messages, and sends feedback to the agent to dynamically heal and re-execute the corrected script (supports up to 3 iterations).

### 3. Client-Side Document Indexer & RAG
* Parses text inputs or uploaded files via `FileReader`.
* Segments data into overlapping **500-character windows** and builds a client-side TF-IDF index.
* Queries the index, retrieves relevant chunks, and formats the excerpts as clean TOON tabular payloads.

### 4. Multi-Source Tool Router & Web Search
* Evaluates queries to dynamically route tasks:
  * Redirects queries matching external keywords (like weather, stocks, crypto prices, CEO search) to a simulated Web Search proxy.
  * Routes standard data inquiries to localized database tables.
  * Directs document-centric questions to the RAG Vector Index.

### 5. A/B Prompt Engineering Playground
* Benchmark variant system prompts side-by-side.
* Compares completions, latencies (ms), output token lengths, and transaction costs dynamically.

### 6. Developer SDK Code Exporter
* Automatically generates copy-pasteable **Python** and **Node.js** integration scripts mapping the TOON parsing and executor sandboxing pipeline.
* Downloads summaries as Markdown files, or exports datasets as JSON or `.toon` documents.

### 7. Persistent Savings Ledger
* Records all transaction logs locally (synchronized using local storage).
* Visualizes real-time metrics showing aggregate tokens parsed, percentage context footprint reduction, and cumulative USD saved.

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

## 🧪 Operational Testing Manual

### 1. Visual Orchestration & Sandbox Testing
* Go to the **Agent Team** tab. Select **Orders DB** as your source table.
* Type a request requiring calculations: `"Find the sum of all orders where status is completed."`
* Click **Execute Loop** and review the agent terminal block. You will see the sandbox code compile, execute, output green TOON arrays, and feed the final report to the Analyst.
* If you query `"Calculate sales total (simulate error test)"`, you can watch the Data/Tool agent catch a simulated syntax error, reflect, compile a repaired script, and successfully complete the execution loop.

### 2. Document Vector RAG Testing
* Go to the **RAG Documents** tab.
* Click **💡 Load Example Specification** (or copy/paste a markdown specification or `.txt` file) and click **Index Document**.
* Navigate back to the **Agent Team** tab, select **RAG Document Index** as your source table, type: `"Explain array structures in TOON."`
* Click **Execute Loop** to see the Vector index pull matching snippets and analyze them.

### 3. A/B Prompts Comparison
* Go to the **Prompt A/B Tester** tab.
* Type two different instructions (e.g. Prompt A: *"List items in simple markdown bullets"* and Prompt B: *"Synthesize a long descriptive evaluation"*).
* Click **Run Prompt A/B Test** and audit response speeds, token footprints, and cost variances.

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

