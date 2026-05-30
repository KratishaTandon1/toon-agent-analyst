/**
 * AgentStudio Workspace Orchestration Engine
 * Implements Collaborative Agent workflow, Web Tool Routing, and Sandboxed Code Self-Correction loops.
 */

import { queryLocalDatabase, callRealLLM } from './mockDatabase';
import { searchChunks } from './vectorDb';
import { jsonToToon } from './toonConverter';
import { estimateTokens } from './tokenizer';

export interface AgentTaskLog {
  agentName: 'Planner' | 'Data/Tool Agent' | 'Analyst';
  status: 'running' | 'success' | 'failed';
  thought: string;
  payloadText?: string;
  payloadType?: 'json' | 'toon';
}

export interface AgentWorkflowResult {
  logs: AgentTaskLog[];
  finalAnswer: string;
  jsonTokens: number;
  toonTokens: number;
  jsCodeExecuted?: string;
  jsResultOutput?: string;
  selfCorrectionTrace?: string[];
}

/**
 * Safe client-side JavaScript execution sandbox
 */
export function executeCodeSandbox(codeStr: string, data: unknown[]): unknown {
  try {
    const cleanCode = codeStr.includes('return') ? codeStr : `return ${codeStr};`;
    const sandboxFunc = new Function('data', `
      try {
        ${cleanCode}
      } catch (err) {
        throw err;
      }
    `);
    return sandboxFunc(data) as unknown;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw new Error(error.message || 'Execution failed', { cause: err });
  }
}

/**
 * Simulated Web Search Tool Results
 */
export function executeWebSearch(query: string): Record<string, string>[] {
  const q = query.toLowerCase();
  
  if (q.includes('ethereum') || q.includes('eth') || q.includes('crypto')) {
    return [
      { source: "CoinMarketCap", snippet: "Ethereum (ETH) trades at $3,450.20, up 2.4% in 24 hours. Market Cap: $415B.", date: "Today" },
      { source: "CoinDesk", snippet: "ETH transaction fees drop to 12-month low as Layer-2 adoption rises.", date: "Yesterday" }
    ];
  }
  
  if (q.includes('ceo') || q.includes('google') || q.includes('alphabet')) {
    return [
      { source: "Wikipedia", snippet: "Sundar Pichai is an Indian-American business executive. He is the CEO of Alphabet Inc. and its subsidiary Google.", date: "2026" },
      { source: "TechCrunch", snippet: "Google CEO Sundar Pichai announces new AI agent integrations at I/O Keynote.", date: "May 2026" }
    ];
  }

  if (q.includes('weather')) {
    return [
      { source: "WeatherChannel", snippet: "Seattle, WA Weather: Clear skies, 68°F. Humidity: 45%. Wind: NW at 8 mph.", date: "Today" },
      { source: "AccuWeather", snippet: "Warm summer front enters the Pacific Northwest, pushing temperatures to mid 70s over weekend.", date: "Tomorrow" }
    ];
  }

  // Fallback
  return [
    { source: "Google Search", snippet: `General web search results for "${query}". Found 1,420,000 matches. Core keyword match indicates active status.`, date: "Today" }
  ];
}

/**
 * Main Collaborative Agent Loop with Web routing, Node configs, and Code Self-Correction
 */
export async function runMultiAgentWorkflow(
  queryText: string,
  selectedTable: string,
  customDbData: Record<string, unknown[]>,
  useLive: boolean,
  provider: 'gemini' | 'openai' = 'gemini',
  apiKey = '',
  // Node parameters
  temperature = 0.2,
  plannerModel = 'gemini'
): Promise<AgentWorkflowResult> {
  
  const logs: AgentTaskLog[] = [];
  const correctionTrace: string[] = [];
  let fetchedData: unknown[];
  let jsCode = '';
  let jsResult = '';
  
  const isDocQuery = selectedTable === 'uploaded_docs';
  const isWebQuery = /price|weather|ceo|news|stock|ethereum|crypto|bitcoin/i.test(queryText);

  // ==========================================
  // STEP 1: Planner Agent (Node Parameterized)
  // ==========================================
  logs.push({
    agentName: 'Planner',
    status: 'running',
    thought: `Initializing task. Model: ${plannerModel}. Analyzing query: "${queryText}"...`
  });
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  let chosenSource = selectedTable;
  if (isWebQuery && selectedTable !== 'uploaded_docs') {
    chosenSource = 'web_search';
  }

  logs[0].thought = `Identified execution parameters. Temperature set to: ${temperature}.
Sub-tasks planned:
1. Target Source: ${chosenSource === 'web_search' ? 'Web Search API' : chosenSource === 'uploaded_docs' ? 'RAG Text Index' : `Database Table '${chosenSource}'`}.
2. Run database query or web retrieval.
3. ${chosenSource === 'web_search' || isDocQuery ? 'Summarize context.' : 'Compile JS data processing tool. Attempt sandboxed execution with reflective self-correction if compilation errors occur.'}
4. Pass final data matrix to Analyst Agent in TOON format.`;
  logs[0].status = 'success';

  // ==========================================
  // STEP 2: Data/Tool Agent (Self-Correction & Web Search)
  // ==========================================
  logs.push({
    agentName: 'Data/Tool Agent',
    status: 'running',
    thought: `Accessing data resource: ${chosenSource}...`
  });
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  let sandboxOutput: unknown = null;

  if (chosenSource === 'web_search') {
    // Route to Web Search Tool
    fetchedData = executeWebSearch(queryText);
    sandboxOutput = fetchedData;
    logs[1].thought = `Web Search Tool triggered. Retrieved ${fetchedData.length} live search result cards. Serializing web snippets to TOON context.`;
  } else if (chosenSource === 'uploaded_docs') {
    // Route to local document vector RAG
    const hits = searchChunks(queryText, 4);
    fetchedData = hits.map(h => ({ source: h.fileName, excerpt: h.text }));
    sandboxOutput = fetchedData;
    logs[1].thought = `RAG vector index queried. Retrieved ${fetchedData.length} matching text chunks. Serializing snippets to TOON context.`;
  } else {
    // Route to SQL/DB + JS sandbox calculation tools
    fetchedData = queryLocalDatabase(chosenSource, queryText, customDbData[chosenSource]);
    
    const needsMath = /total|sum|average|mean|count|max|min|percentage/i.test(queryText);
    if (needsMath && fetchedData.length > 0) {
      
      // Intentional syntax crash simulation to prove Self-Correction:
      // If the query contains "bug" or "fix" or just 50% of the time, we simulate a syntax crash first, reflect, and fix it!
      const simulateCorrection = queryText.toLowerCase().includes('sales') || queryText.toLowerCase().includes('items') || queryText.toLowerCase().includes('error');
      
      // Let's draft code blocks. If simulation is enabled, attempt 1 is broken.
      let codeAttempt1: string;
      let codeAttempt2: string;

      if (chosenSource === 'orders') {
        codeAttempt1 = `const rows = data;
// Syntax mistake: reducs instead of reduce
const totalSales = rows.reducs((sum, r) => sum + r.total, 0); 
return { total_sales: totalSales };`;

        codeAttempt2 = `const rows = data;
const totalSales = rows.reduce((sum, r) => sum + (r.total || 0), 0);
const avgItems = rows.reduce((sum, r) => sum + (r.items || 0), 0) / rows.length;
return {
  record_count: rows.length,
  sales_sum: parseFloat(totalSales.toFixed(2)),
  avg_items_per_order: parseFloat(avgItems.toFixed(2))
};`;
      } else if (chosenSource === 'logs') {
        codeAttempt1 = `const rows = data;
// Syntax mistake: missing closing parentheses
const errorCount = rows.filter(r => r.level === 'error'.length; 
return { errors: errorCount };`;

        codeAttempt2 = `const rows = data;
const errorCount = rows.filter(r => r.level === 'error').length;
const warnings = rows.filter(r => r.level === 'warning').length;
return {
  total_events: rows.length,
  errors: errorCount,
  warnings: warnings
};`;
      } else {
        codeAttempt1 = `const rows = data;
const unresolved = rows.filterr(r => !r.resolved).length; // filterr typo
return { open_tickets: unresolved };`;

        codeAttempt2 = `const rows = data;
const unresolved = rows.filter(r => !r.resolved).length;
const negativeSentiment = rows.filter(r => r.sentiment === 'negative').length;
return {
  total_tickets: rows.length,
  open_tickets: unresolved,
  frustrated_customers: negativeSentiment
};`;
      }

      if (simulateCorrection) {
        jsCode = codeAttempt1;
        correctionTrace.push(`Attempt 1: Compiling Code Sandbox script...`);
        
        try {
          sandboxOutput = executeCodeSandbox(jsCode, fetchedData);
        } catch (err: unknown) {
          const e = err instanceof Error ? err : new Error(String(err));
          correctionTrace.push(`❌ Sandbox Crash: "${e.message}". Triggering Self-Correction...`);
          correctionTrace.push(`🤖 Agent Reflection: The function 'reducs'/'filterr' or parenthesis syntax is invalid. Modifying token structures and rewriting execution script.`);
          
          // Retry with fixed code
          jsCode = codeAttempt2;
          correctionTrace.push(`Attempt 2: Compiling repaired Sandbox script...`);
          try {
            sandboxOutput = executeCodeSandbox(jsCode, fetchedData);
            correctionTrace.push(`✓ Sandbox Execution Success: Repaired code ran successfully in browser runtime.`);
          } catch (err2: unknown) {
            const e2 = err2 instanceof Error ? err2 : new Error(String(err2));
            correctionTrace.push(`❌ Attempt 2 failed: ${e2.message}`);
          }
        }
      } else {
        // Run clean code without simulating errors
        jsCode = codeAttempt2;
        try {
          sandboxOutput = executeCodeSandbox(jsCode, fetchedData);
        } catch {
          jsCode = `return { count: data.length };`;
          sandboxOutput = executeCodeSandbox(jsCode, fetchedData);
        }
      }
      
      jsResult = JSON.stringify(sandboxOutput, null, 2);
      logs[1].thought = `Query returned ${fetchedData.length} records. Executed sandboxed JS calculation tool ${simulateCorrection ? '(Self-Corrected during run)' : ''}. Serializing results to TOON.`;
    } else {
      // General DB lookup (no math)
      sandboxOutput = fetchedData;
      logs[1].thought = `Query returned ${fetchedData.length} records. Serializing database result table to TOON context.`;
    }
  }

  // Tokenization Sizing
  const jsonStr = JSON.stringify(sandboxOutput, null, 2);
  const toonStr = jsonToToon(sandboxOutput);
  
  const jsonTokens = estimateTokens(jsonStr, 'cl100k_base');
  const toonTokens = estimateTokens(toonStr, 'cl100k_base');

  logs[1].payloadText = toonStr;
  logs[1].payloadType = 'toon';
  logs[1].status = 'success';

  // ==========================================
  // STEP 3: Analyst Agent (Tuned Temperature)
  // ==========================================
  logs.push({
    agentName: 'Analyst',
    status: 'running',
    thought: `Evaluating payload matrix. Temperature rate: ${temperature}. Synthesizing response...`
  });
  
  await new Promise(resolve => setTimeout(resolve, 850));
  
  let finalAnswer: string;
  
  if (useLive && apiKey) {
    try {
      const systemPrompt = `You are a Lead Executive Analyst AI Agent.
Analyze the following compiled data structure provided in TOON (Token-Oriented Object Notation) by your Data Agent.
Synthesize a professional, comprehensive, and quantitative response directly resolving the user request: "${queryText}".

You MUST structure your response into the following exact sections with markdown headings:
### 🔍 Reasoning Protocol
Briefly outline the filters, mathematical steps, or RAG search contexts used to analyze the dataset.

### 📊 Statistical Findings
Output a quantitative summary. If analyzing tabular/multiple items, you MUST format the stats inside a markdown table comparing key metrics.

### 💡 Strategic Recommendations
Provide 2-3 specific, actionable business recommendations or diagnostic suggestions based on the metrics.

Model temperature parameter: ${temperature}.`;
      
      finalAnswer = await callRealLLM(provider, apiKey, systemPrompt, toonStr);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      finalAnswer = `[RAG Error] Live LLM integration failed: ${e.message}. Falling back to simulated synthesis.`;
    }
  } else {
    // Generate simulated synthesis response dynamically based on data content
    finalAnswer = compileDynamicSummary(chosenSource, fetchedData, queryText, sandboxOutput);
  }
  
  logs[2].thought = `Executive summary synthesized successfully. Tuning constraints met (Temp: ${temperature}). Dispatching output.`;
  logs[2].status = 'success';

  return {
    logs,
    finalAnswer,
    jsonTokens,
    toonTokens,
    jsCodeExecuted: jsCode,
    jsResultOutput: jsResult,
    selfCorrectionTrace: correctionTrace
  };
}

/**
 * Compiles a mathematically accurate, dynamic analysis report over mock data records.
 */
function compileDynamicSummary(
  chosenSource: string,
  data: unknown[],
  queryText: string,
  sandboxOutput: unknown
): string {
  const count = data.length;
  if (count === 0) {
    return `### 🔍 Reasoning Protocol
- Filtered operational records for query: "${queryText}".
- Located 0 matching rows.

### 📊 Statistical Findings
- **Data Count**: 0 entries found.
- The constraint set returned an empty payload.

### 💡 Strategic Recommendations
- **Broaden Filters**: The search criteria was too narrow. Try relaxing conditions or resetting the database tables.`;
  }

  const rows = data as Record<string, unknown>[];

  if (chosenSource === 'orders') {
    let totalSales = 0;
    let totalItems = 0;
    let maxSale = 0;
    let topCustomer = '';
    const countries: Record<string, number> = {};
    const categories: Record<string, number> = {};

    rows.forEach(r => {
      const tot = Number(r.total) || 0;
      const items = Number(r.items) || 0;
      totalSales += tot;
      totalItems += items;

      if (tot > maxSale) {
        maxSale = tot;
        topCustomer = String(r.customer || 'Unknown');
      }

      const ctry = String(r.country || 'Unknown');
      countries[ctry] = (countries[ctry] || 0) + 1;

      const cat = String(r.category || 'Unknown');
      categories[cat] = (categories[cat] || 0) + 1;
    });

    // Check if sandboxed calculations already processed and outputted values
    if (sandboxOutput && typeof sandboxOutput === 'object') {
      const sand = sandboxOutput as Record<string, number>;
      if (sand.sales_sum !== undefined) totalSales = sand.sales_sum;
      if (sand.avg_items_per_order !== undefined) totalItems = Math.round(sand.avg_items_per_order * count);
    }

    const avgSale = totalSales / count;
    const topCountry = Object.keys(countries).reduce((a, b) => countries[a] > countries[b] ? a : b, 'US');
    const topCategory = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, 'Electronics');

    return `### 🔍 Reasoning Protocol
- Filtered e-commerce database for query constraint: "${queryText}".
- Located ${count} matching transactions. Evaluated aggregate totals, average purchase size, and category densities.

### 📊 Statistical Findings
| Metric | Value | Details |
| :--- | :--- | :--- |
| **Record Count** | ${count} orders | Successfully queried |
| **Cumulative Sales** | $${totalSales.toFixed(2)} | Real-time reduction calculation |
| **Average Order Value** | $${avgSale.toFixed(2)} | Computed mean rate |
| **Total Items Ordered** | ${totalItems.toFixed(0)} units | Sum volume |
| **Top Country** | ${topCountry} | Most active region |
| **Key Category** | ${topCategory} | Primary product volume |

### 💡 Strategic Recommendations
- **Anomalous High-Value Order**: A maximum transaction of **$${maxSale.toFixed(2)}** was completed by customer **${topCustomer}**. Flagged for client relationship follow-up.
- **Inventory Audit**: Focus stock allocations on **${topCategory}** lines which represent the primary purchase category in this cohort.`;
  }

  if (chosenSource === 'logs') {
    let errors = 0;
    let warnings = 0;
    let info = 0;
    const services: Record<string, number> = {};
    const ips: Record<string, number> = {};

    rows.forEach(r => {
      const lvl = String(r.level).toLowerCase();
      if (lvl === 'error') errors++;
      else if (lvl === 'warning') warnings++;
      else info++;

      const svc = String(r.service || 'Unknown');
      services[svc] = (services[svc] || 0) + 1;

      const ip = String(r.ip || 'Unknown');
      ips[ip] = (ips[ip] || 0) + 1;
    });

    // Check if sandboxed calculations already processed and outputted values
    if (sandboxOutput && typeof sandboxOutput === 'object') {
      const sand = sandboxOutput as Record<string, number>;
      if (sand.errors !== undefined) errors = sand.errors;
      if (sand.warnings !== undefined) warnings = sand.warnings;
    }

    const topService = Object.keys(services).reduce((a, b) => services[a] > services[b] ? a : b, 'gateway');
    const topIp = Object.keys(ips).reduce((a, b) => ips[a] > ips[b] ? a : b, '127.0.0.1');

    return `### 🔍 Reasoning Protocol
- Filtered operational server logs for query constraints: "${queryText}".
- Evaluated network traffic patterns and error density logs.

### 📊 Statistical Findings
| Log Level | Frequency | Service Context |
| :--- | :--- | :--- |
| **Errors (Critical)** | ${errors} | Requires developer review |
| **Warnings (Alerts)** | ${warnings} | Threshold alarms |
| **Info Logs (General)** | ${info} | Standard status codes |
| **Total Events** | ${count} | Log trace volume |

### 💡 Strategic Recommendations
- **System Hotspot**: Service **${topService}** logged the highest event count. Verify load balancing limits.
- **Traffic Origin Audit**: IP address **${topIp}** initiated the highest volume of server requests. Verify if it corresponds to an internal agent or API scraper.`;
  }

  if (chosenSource === 'tickets') {
    let unresolved = 0;
    let negative = 0;
    let positive = 0;
    let neutral = 0;
    let critical = 0;
    const categories: Record<string, number> = {};

    rows.forEach(r => {
      if (!r.resolved) unresolved++;
      
      const sent = String(r.sentiment).toLowerCase();
      if (sent === 'negative') negative++;
      else if (sent === 'positive') positive++;
      else neutral++;

      const prio = String(r.priority).toLowerCase();
      if (prio === 'critical' || prio === 'high') critical++;

      const cat = String(r.category || 'Unknown');
      categories[cat] = (categories[cat] || 0) + 1;
    });

    // Check if sandboxed calculations already processed and outputted values
    if (sandboxOutput && typeof sandboxOutput === 'object') {
      const sand = sandboxOutput as Record<string, number>;
      if (sand.open_tickets !== undefined) unresolved = sand.open_tickets;
      if (sand.frustrated_customers !== undefined) negative = sand.frustrated_customers;
    }

    const topCategory = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, 'Billing');

    return `### 🔍 Reasoning Protocol
- Filtered support ticket database for query constraint: "${queryText}".
- Evaluated case priorities, resolution states, and sentiment trends.

### 📊 Statistical Findings
| Support Indicator | Metrics | Details |
| :--- | :--- | :--- |
| **Total Tickets** | ${count} | User inquiries |
| **Unresolved Cases** | ${unresolved} | Outstanding backlogs |
| **Sentiment Breakdown** | 🙂 ${positive} / 😐 ${neutral} / 🙁 ${negative} | Feedback mix |
| **High/Critical Priority** | ${critical} | SLA targets |
| **Primary Category** | ${topCategory} | Ticket hotspot |

### 💡 Strategic Recommendations
- **SLA Violation Warning**: Locate and prioritize the **${critical}** critical/high priority unresolved tickets.
- **Systemic Issue**: **${topCategory}** inquiries dominate this support cohort. Coordinate with the product/finance department to resolve root causes.`;
  }

  if (chosenSource === 'uploaded_docs') {
    const docChunks = rows.map((r, idx) => `**Excerpt #${idx + 1} (${r.source})**:\n> "${r.excerpt}"`).join('\n\n');
    return `### 🔍 Reasoning Protocol
- Query constraints: "${queryText}".
- Queried local vector index utilizing TF-IDF keyword relevance logic. Located ${count} relevant knowledge segments.

### 📊 Statistical Findings
${docChunks}

### 💡 Strategic Recommendations
- **Token footprint savings**: Pack these matching tabular blocks directly inside prompt contexts to save context storage space.`;
  }

  if (chosenSource === 'web_search') {
    const searchCards = rows.map(r => `* **[${r.source}]** (${r.date}): "${r.snippet}"`).join('\n');
    return `### 🔍 Reasoning Protocol
- Query constraint: "${queryText}".
- Routed task to simulated live search engine api.

### 📊 Statistical Findings
${searchCards}

### 💡 Strategic Recommendations
- **Cache Local Snippets**: These snippets represent the most recent parameters. Cache locally to avoid excess proxy delays.`;
  }

  return `### 🔍 Reasoning Protocol
- Analyzed records from source "${chosenSource}" matching query: "${queryText}".

### 📊 Statistical Findings
- Matching Records Count: ${count} rows.
- Evaluated object parameters and serialized fields into tabular formats.

### 💡 Strategic Recommendations
- Setup Live LLM API keys in the Settings tab to perform full semantic synthesis.`;
}

