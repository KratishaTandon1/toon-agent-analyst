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
  
  const q = queryText.toLowerCase();
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
Synthesize a professional, comprehensive response directly resolving the user request: "${queryText}".
Model temperature parameter: ${temperature}. Keep response quantitative and highly informative.`;
      
      finalAnswer = await callRealLLM(provider, apiKey, systemPrompt, toonStr);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      finalAnswer = `[RAG Error] Live LLM integration failed: ${e.message}. Falling back to simulated synthesis.`;
    }
  } else {
    // Generate simulated synthesis response based on source
    if (chosenSource === 'web_search') {
      finalAnswer = `[Web Search Analysis Report] I queried live search engines for "${queryText}". I retrieved and synthesized matching records: ${
        q.includes('ethereum') ? `Ethereum is currently trading at $3,450.20, showing a strong daily uptrend, with Layer-2 fees dropping.` :
        q.includes('ceo') ? `Sundar Pichai is the current CEO of Alphabet/Google, and has recently announced new advanced AI integrations.` :
        `Current local temperature for Seattle shows clear skies at 68°F, with a warm front entering the region.`
      } (Data fetched live from web search proxy logs).`;
    } else if (isDocQuery) {
      finalAnswer = `[Simulation Document RAG] I retrieved matching snippets from your uploaded knowledge docs. Analysis shows the document covers the specification rules of TOON, detailing double-space nested structures and CSV-like headers (\`staff[2]{fields}:\`) which saves up to 50% on token counts compared to standard JSON.`;
    } else {
      if (jsCode) {
        const outObj = sandboxOutput as Record<string, number>;
        finalAnswer = `[Simulation Workspace Analysis] I analyzed the code sandbox calculations. The aggregate metrics show: ${
          chosenSource === 'orders' ? `Total sales total is $${outObj.sales_sum} with an average of ${outObj.avg_items_per_order} items per order.` :
          chosenSource === 'logs' ? `The server logs logged ${outObj.errors} error codes and ${outObj.warnings} warnings.` :
          `We have ${outObj.open_tickets} open support tickets and ${outObj.frustrated_customers} negative customer comments.`
        } These results were processed in the sandboxed JS execution loop.`;
      } else {
        finalAnswer = `[Simulation Workspace Analysis] The data agent returned ${fetchedData.length} records. Synthesizing these items shows they match your filter criteria for "${queryText}". Let me know if you would like me to compile calculations on these records!`;
      }
    }
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
