import React, { useState } from 'react';
import { jsonToToon } from '../utils/toonConverter';
import { estimateTokens } from '../utils/tokenizer';

const DEFAULT_JSON = `{
  "agent_config": {
    "name": "DataAnalyst",
    "version": "1.2.0",
    "capabilities": ["sql_query", "toon_serializer", "synthesis"]
  },
  "database_meta": {
    "host": "localhost",
    "port": 5432,
    "dialect": "postgresql"
  },
  "metrics": [
    { "latency_ms": 120, "tokens": 450, "status": "success" },
    { "latency_ms": 340, "tokens": 1200, "status": "success" },
    { "latency_ms": 95, "tokens": 400, "status": "error" }
  ]
}`;

export const Playground: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  
  // Calculate metrics and TOON output directly during rendering (no useEffect needed)
  let toonOutput = '';
  let error: string | null = null;
  let jsonTokens = 0;
  let toonTokens = 0;

  try {
    const parsed = JSON.parse(jsonInput);
    toonOutput = jsonToToon(parsed);
    jsonTokens = estimateTokens(jsonInput);
    toonTokens = estimateTokens(toonOutput);
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    error = `Invalid JSON: ${e.message}`;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const loadExample = (type: string) => {
    if (type === 'nested') {
      setJsonInput(DEFAULT_JSON);
    } else if (type === 'tabular') {
      setJsonInput(JSON.stringify({
        "products": [
          { "sku": "ELEC-100", "name": "Wireless Mouse", "price": 29.99, "stock": 140 },
          { "sku": "ELEC-200", "name": "Mechanical Keyboard", "price": 89.99, "stock": 45 },
          { "sku": "ELEC-300", "name": "USB-C Hub adapter", "price": 19.99, "stock": 250 },
          { "sku": "ELEC-400", "name": "Noise Cancelling Headset", "price": 149.99, "stock": 12 }
        ]
      }, null, 2));
    } else {
      setJsonInput(JSON.stringify({
        "status": "online",
        "uptime": 86400,
        "load_avg": [0.12, 0.08, 0.05]
      }, null, 2));
    }
  };

  const savings = jsonTokens > 0 ? ((jsonTokens - toonTokens) / jsonTokens) * 100 : 0;

  return (
    <div className="playground-container">
      <div className="playground-header">
        <h3 className="section-title">TOON Playground & Code Generation</h3>
        <div className="example-buttons">
          <span>Load Example:</span>
          <button onClick={() => loadExample('nested')} className="premium-btn tag-btn">Nested Config</button>
          <button onClick={() => loadExample('tabular')} className="premium-btn tag-btn">Tabular Array</button>
          <button onClick={() => loadExample('simple')} className="premium-btn tag-btn">Simple Status</button>
        </div>
      </div>
      
      <p className="text-muted playground-desc">
        Experiment with JSON objects, configurations, and arrays to see how TOON simplifies structures, reduces keys, and compresses payloads for LLM injection.
      </p>

      {/* Token Comparison Bar */}
      <div className="playground-stats-bar">
        <div className="stat-item">
          <span className="stat-lbl">JSON Tokens</span>
          <strong className="text-red">{jsonTokens}</strong>
        </div>
        <div className="stat-item border-left">
          <span className="stat-lbl">TOON Tokens</span>
          <strong className="text-green">{toonTokens}</strong>
        </div>
        <div className="stat-item border-left highlight-glow-inline">
          <span className="stat-lbl">Payload Reduction</span>
          <strong className="text-emerald">{savings.toFixed(1)}% Saved</strong>
        </div>
      </div>

      <div className="playground-grid">
        {/* Input */}
        <div className="editor-panel">
          <div className="panel-header">
            <span>Input JSON Object</span>
            {error && <span className="badge-error">{error}</span>}
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="playground-textarea font-mono"
            rows={12}
            placeholder="Type JSON here..."
          />
          <button 
            onClick={() => copyToClipboard(jsonInput)} 
            className="premium-btn copy-btn"
            disabled={!!error}
          >
            Copy JSON
          </button>
        </div>

        {/* Output */}
        <div className="editor-panel">
          <div className="panel-header text-green">
            <span>Output TOON Payload</span>
          </div>
          <textarea
            value={toonOutput}
            readOnly
            className="playground-textarea font-mono bg-darker text-green"
            rows={12}
            placeholder="TOON output will appear here..."
          />
          <button 
            onClick={() => copyToClipboard(toonOutput)} 
            className="premium-btn copy-btn"
            disabled={!toonOutput}
          >
            Copy TOON
          </button>
        </div>
      </div>
    </div>
  );
};
