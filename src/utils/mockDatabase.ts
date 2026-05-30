/**
 * Mock Database & LLM Query Engine
 */

export interface DatasetTable {
  id: string;
  name: string;
  description: string;
  data: Record<string, unknown>[];
}

export const DATASETS: Record<string, DatasetTable> = {
  orders: {
    id: 'orders',
    name: 'E-Commerce Orders',
    description: 'Tabular customer orders, transaction totals, and payment status.',
    data: [
      { id: 1001, customer: "Alice Vance", total: 129.50, items: 3, status: "completed", country: "US", category: "Electronics" },
      { id: 1002, customer: "Bob Miller", total: 45.00, items: 1, status: "pending", country: "CA", category: "Home" },
      { id: 1003, customer: "Charlie Song", total: 850.00, items: 5, status: "completed", country: "UK", category: "Electronics" },
      { id: 1004, customer: "Diana Prince", total: 320.00, items: 2, status: "completed", country: "US", category: "Apparel" },
      { id: 1005, customer: "Evan Wright", total: 15.99, items: 1, status: "refunded", country: "AU", category: "Books" },
      { id: 1006, customer: "Fiona Gallagher", total: 540.00, items: 4, status: "completed", country: "US", category: "Furniture" },
      { id: 1007, customer: "George Clark", total: 95.50, items: 2, status: "completed", country: "DE", category: "Apparel" },
      { id: 1008, customer: "Hannah Abbott", total: 12.50, items: 1, status: "completed", country: "UK", category: "Books" },
      { id: 1009, customer: "Ian Malcolm", total: 1100.00, items: 6, status: "completed", country: "US", category: "Electronics" },
      { id: 1010, customer: "Julia Roberts", total: 250.00, items: 3, status: "pending", country: "FR", category: "Home" },
      { id: 1011, customer: "Kevin Hart", total: 89.99, items: 2, status: "completed", country: "US", category: "Apparel" },
      { id: 1012, customer: "Laura Croft", total: 720.00, items: 4, status: "completed", country: "UK", category: "Furniture" },
      { id: 1013, customer: "Matt Murdock", total: 35.00, items: 1, status: "completed", country: "US", category: "Books" },
      { id: 1014, customer: "Nina Simone", total: 150.00, items: 3, status: "completed", country: "FR", category: "Apparel" },
      { id: 1015, customer: "Oscar Wilde", total: 420.00, items: 2, status: "refunded", country: "IE", category: "Books" }
    ]
  },
  logs: {
    id: 'logs',
    name: 'Application Server Logs',
    description: 'High-density system operational logs, status codes, and service sources.',
    data: [
      { timestamp: "15:40:01", service: "auth-svc", level: "info", message: "User login successful", code: 200, ip: "192.168.1.45" },
      { timestamp: "15:40:05", service: "db-svc", level: "info", message: "Connection pool refreshed", code: 200, ip: "10.0.0.12" },
      { timestamp: "15:40:12", service: "payment-svc", level: "error", message: "Stripe API timeout", code: 504, ip: "192.168.1.12" },
      { timestamp: "15:40:15", service: "gateway", level: "warning", message: "Rate limit threshold reached for IP", code: 429, ip: "85.23.41.99" },
      { timestamp: "15:40:22", service: "auth-svc", level: "warning", message: "Invalid password attempt", code: 401, ip: "203.45.1.22" },
      { timestamp: "15:40:30", service: "cart-svc", level: "info", message: "Item added to checkout", code: 200, ip: "192.168.1.88" },
      { timestamp: "15:40:35", service: "payment-svc", level: "error", message: "Card decryption failed", code: 400, ip: "192.168.1.12" },
      { timestamp: "15:40:42", service: "notification-svc", level: "info", message: "SMS dispatch queued", code: 202, ip: "10.0.0.15" },
      { timestamp: "15:40:50", service: "db-svc", level: "error", message: "Deadlock detected on txn_table", code: 500, ip: "10.0.0.12" },
      { timestamp: "15:40:55", service: "gateway", level: "info", message: "Ping healthcheck complete", code: 200, ip: "127.0.0.1" },
      { timestamp: "15:41:02", service: "auth-svc", level: "info", message: "JWT token rotated", code: 200, ip: "192.168.1.55" },
      { timestamp: "15:41:09", service: "payment-svc", level: "info", message: "Invoice webhook processed", code: 200, ip: "192.168.1.12" }
    ]
  },
  tickets: {
    id: 'tickets',
    name: 'Customer Tickets',
    description: 'Support tickets involving user sentiment, priority, and resolution status.',
    data: [
      { id: 401, customer: "John Doe", category: "Billing", priority: "high", sentiment: "negative", resolved: false },
      { id: 402, customer: "Jane Smith", category: "Technical", priority: "medium", sentiment: "neutral", resolved: true },
      { id: 403, customer: "Alice Johnson", category: "Feature", priority: "low", sentiment: "positive", resolved: false },
      { id: 404, customer: "Bob Brown", category: "Billing", priority: "high", sentiment: "negative", resolved: true },
      { id: 405, customer: "Charlie Green", category: "Technical", priority: "critical", sentiment: "negative", resolved: false },
      { id: 406, customer: "Dave White", category: "Access", priority: "medium", sentiment: "neutral", resolved: true },
      { id: 407, customer: "Eve Black", category: "Feature", priority: "low", sentiment: "neutral", resolved: false },
      { id: 408, customer: "Frank Gray", category: "Billing", priority: "medium", sentiment: "negative", resolved: false },
      { id: 409, customer: "Grace Gold", category: "Technical", priority: "high", sentiment: "negative", resolved: true },
      { id: 410, customer: "Heidi Silver", category: "Access", priority: "high", sentiment: "positive", resolved: true }
    ]
  }
};

export interface DatabaseRow {
  id?: number;
  customer?: string;
  total?: number;
  items?: number;
  status?: string;
  country?: string;
  category?: string;
  timestamp?: string;
  service?: string;
  level?: string;
  message?: string;
  code?: number;
  ip?: string;
  priority?: string;
  sentiment?: string;
  resolved?: boolean;
}

/**
 * Runs a simple SQL-like JS query filter based on the text.
 */
export function queryLocalDatabase(datasetId: string, queryText: string, customData?: unknown[]): Record<string, unknown>[] {
  const data = ((customData as DatabaseRow[]) || (DATASETS[datasetId]?.data as DatabaseRow[]) || []) as DatabaseRow[];
  const q = queryText.toLowerCase();
  
  // Basic smart matching for E-Commerce Orders
  if (datasetId === 'orders') {
    if (q.includes('completed')) return data.filter(d => d.status === 'completed') as Record<string, unknown>[];
    if (q.includes('pending')) return data.filter(d => d.status === 'pending') as Record<string, unknown>[];
    if (q.includes('refunded')) return data.filter(d => d.status === 'refunded') as Record<string, unknown>[];
    if (q.includes('electronics')) return data.filter(d => d.category === 'Electronics') as Record<string, unknown>[];
    if (q.includes('apparel')) return data.filter(d => d.category === 'Apparel') as Record<string, unknown>[];
    if (q.includes('books')) return data.filter(d => d.category === 'Books') as Record<string, unknown>[];
    if (q.includes('greater than 500') || q.includes('> 500') || q.includes('>500')) {
      return data.filter(d => ((d.total as number) || 0) > 500) as Record<string, unknown>[];
    }
    if (q.includes('greater than 100') || q.includes('> 100') || q.includes('>100')) {
      return data.filter(d => ((d.total as number) || 0) > 100) as Record<string, unknown>[];
    }
  }
  
  // Basic smart matching for Server Logs
  if (datasetId === 'logs') {
    if (q.includes('error')) return data.filter(d => d.level === 'error') as Record<string, unknown>[];
    if (q.includes('warning')) return data.filter(d => d.level === 'warning') as Record<string, unknown>[];
    if (q.includes('info')) return data.filter(d => d.level === 'info') as Record<string, unknown>[];
    if (q.includes('payment')) return data.filter(d => d.service === 'payment-svc') as Record<string, unknown>[];
    if (q.includes('auth')) return data.filter(d => d.service === 'auth-svc') as Record<string, unknown>[];
    if (q.includes('db') || q.includes('database')) return data.filter(d => d.service === 'db-svc') as Record<string, unknown>[];
    if (q.includes('500') || q.includes('status 500')) return data.filter(d => d.code === 500) as Record<string, unknown>[];
  }
  
  // Basic smart matching for Support Tickets
  if (datasetId === 'tickets') {
    if (q.includes('negative')) return data.filter(d => d.sentiment === 'negative') as Record<string, unknown>[];
    if (q.includes('positive')) return data.filter(d => d.sentiment === 'positive') as Record<string, unknown>[];
    if (q.includes('billing')) return data.filter(d => d.category === 'Billing') as Record<string, unknown>[];
    if (q.includes('technical')) return data.filter(d => d.category === 'Technical') as Record<string, unknown>[];
    if (q.includes('unresolved') || q.includes('not resolved') || q.includes('open')) {
      return data.filter(d => !d.resolved) as Record<string, unknown>[];
    }
    if (q.includes('resolved') || q.includes('closed')) {
      return data.filter(d => d.resolved) as Record<string, unknown>[];
    }
    if (q.includes('critical') || q.includes('high priority')) {
      return data.filter(d => d.priority === 'critical' || d.priority === 'high') as Record<string, unknown>[];
    }
  }

  // Fallback default: return first 8 rows if query is generic
  return data.slice(0, 8) as Record<string, unknown>[];
}

/**
 * Simulates the Agent reasoning and response path.
 */
export function getSimulatedAgentSteps(datasetId: string, queryText: string, dataCount: number): {
  steps: { title: string; detail: string; status: 'pending' | 'success' | 'running' }[];
  finalAnswer: string;
} {
  const steps: { title: string; detail: string; status: 'pending' | 'success' | 'running' }[] = [
    {
      title: 'Analyze Query',
      detail: `Received query: "${queryText}". Scanning database schema for "${datasetId}" table...`,
      status: 'success'
    },
    {
      title: 'Execute Database Query',
      detail: `Generated SQL tool call: SELECT * FROM ${datasetId} WHERE Matches("${queryText}"). Retrieved ${dataCount} rows.`,
      status: 'success'
    },
    {
      title: 'Perform TOON Serialization',
      detail: `Serializing DB payload to TOON. Compacted table structure to save LLM context.`,
      status: 'success'
    },
    {
      title: 'Run Context Synthesis & Analysis',
      detail: `Feeding TOON context to LLM. Running aggregations, filtering, and summary synthesis.`,
      status: 'success'
    }
  ];

  let finalAnswer: string;
  
  if (datasetId === 'orders') {
    finalAnswer = `Based on the e-commerce sales records, I analyzed ${dataCount} matching orders. The total sales volume of these records is $${(dataCount * 185.40).toFixed(2)}. The top customer in this segment is Charlie Song (US) who spent $850.00. Most orders originate from the US and UK. All items have been processed successfully with no outstanding shipping failures.`;
  } else if (datasetId === 'logs') {
    finalAnswer = `Diagnostic analysis of the server logs retrieved ${dataCount} events. We observed multiple incidents in the 'payment-svc' and 'db-svc' services. The database service logged a deadlock error (Code 500) from IP 10.0.0.12, while the payment service failed due to a Stripe API timeout (Code 504). I recommend inspecting the transaction index on 'txn_table' and verifying payment gateway status.`;
  } else {
    finalAnswer = `The support tickets query retrieved ${dataCount} cases. There are unresolved high/critical issues, primarily centered around billing and access permission issues. Customer sentiment is predominantly negative, highlighting user frustration. Recommendation: Escalate Ticket #405 (Critical, Technical) immediately to the operations team and assign billing issues to finance.`;
  }

  return { steps, finalAnswer };
}

/**
 * Call real LLMs (Gemini or OpenAI) with TOON data.
 */
export async function callRealLLM(
  provider: 'gemini' | 'openai',
  apiKey: string,
  systemPrompt: string,
  toonPrompt: string,
  modelName?: string
): Promise<string> {
  if (provider === 'gemini') {
    let model = modelName || 'gemini-2.0-flash';
    const cleanModel = model.toLowerCase();
    
    // Automatically map retired 1.5 models to active 2.0-flash models
    if (cleanModel.includes('1.5') || cleanModel.includes('flash')) {
      model = 'gemini-2.0-flash';
    } else if (cleanModel.includes('pro')) {
      model = 'gemini-2.0-pro-exp';
    }
    
    if (!model.startsWith('gemini-')) {
      model = 'gemini-2.0-flash';
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${systemPrompt}\n\nHere is the dataset in TOON (Token-Oriented Object Notation) format:\n\n${toonPrompt}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800
            }
          })
        }
      );
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Gemini API Error');
      }
      
      const json = await response.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } catch (err: unknown) {
      console.error(err);
      const error = err instanceof Error ? err : new Error(String(err));
      throw new Error(`Gemini API Error: ${error.message}`, { cause: err });
    }
  } else {
    // OpenAI
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here is the dataset in TOON (Token-Oriented Object Notation) format:\n\n${toonPrompt}` }
          ],
          temperature: 0.2,
          max_tokens: 800
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'OpenAI API Error');
      }
      
      const json = await response.json();
      return json.choices?.[0]?.message?.content || 'No response generated.';
    } catch (err: unknown) {
      console.error(err);
      const error = err instanceof Error ? err : new Error(String(err));
      throw new Error(`OpenAI API Error: ${error.message}`, { cause: err });
    }
  }
}
