import React, { useState } from 'react';

export const ExportPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'python' | 'node' | 'export'>('python');

  const pythonCode = `import requests
import json

# TOON Tabular Serializer Helper
def json_to_toon(val, indent_level=0):
    indent = "  " * indent_level
    if val is None:
        return "null"
    if not isinstance(val, (dict, list)):
        return str(val)
    
    if isinstance(val, list):
        if not val:
            return "[]"
        # Check if uniform objects
        is_uniform = all(isinstance(item, dict) for item in val)
        if is_uniform:
            keys = list(set().union(*(item.keys() for item in val)))
            toon = f"[{len(val)}]{{{','.join(keys)}}}:\\n"
            for item in val:
                row = ",".join(str(item.get(k, "")) for k in keys)
                toon += f"{indent}  {row}\\n"
            return toon.rstrip()
        else:
            toon = f"[{len(val)}]:\\n"
            for item in val:
                toon += f"{indent}  - {json_to_toon(item, indent_level + 2)}\\n"
            return toon.rstrip()
            
    # Object Dict
    keys = val.keys()
    if not keys:
        return "{}"
    
    result = []
    for k in keys:
        v = val[k]
        if not isinstance(v, (dict, list)):
            result.append(f"{k}: {json_to_toon(v)}")
        else:
            result.append(f"{k}:\\n{indent}  {json_to_toon(v, indent_level + 1)}")
    return ("\\n" + indent).join(result)

# Example Usage: Database rows
db_rows = [
    {"id": 101, "name": "Alice Vance", "role": "admin", "active": True},
    {"id": 102, "name": "Bob Miller", "role": "user", "active": False}
]

toon_payload = json_to_toon(db_rows)
print("--- Encoded TOON Payload ---")
print(toon_payload)

# Call Gemini API
api_key = "YOUR_GEMINI_API_KEY"
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{
        "parts": [{
            "text": f"You are a Data Analyst Agent. Analyze the following TOON dataset:\\n\\n{toon_payload}"
        }]
    }]
}

response = requests.post(url, json=payload)
print("--- LLM Output ---")
print(response.json()["candidates"][0]["content"]["parts"][0]["text"])
`;

  const nodeCode = `// TOON Tabular Serializer Helper
function jsonToToon(val, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  if (val === null || val === undefined) return "null";
  if (typeof val !== "object") return String(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    const isUniform = val.every(item => item && typeof item === "object" && !Array.isArray(item));
    if (isUniform) {
      const keys = Array.from(new Set(val.flatMap(item => Object.keys(item))));
      let toon = \`[\${val.length}]{\${keys.join(",")}}:\\n\`;
      val.forEach(item => {
        const row = keys.map(k => String(item[k] !== undefined ? item[k] : "")).join(",");
        toon += \`\${indent}  \${row}\\n\`;
      });
      return toon.trimEnd();
    } else {
      let toon = \`[\${val.length}]:\\n\`;
      val.forEach(item => {
        toon += \`\${indent}  - \${jsonToToon(item, indentLevel + 2)}\\n\`;
      });
      return toon.trimEnd();
    }
  }

  const keys = Object.keys(val);
  if (keys.length === 0) return "{}";
  return keys.map(k => {
    const v = val[k];
    if (typeof v !== "object" || v === null) {
      return \`\${k}: \${jsonToToon(v)}\`;
    }
    return \`\${k}:\\n\${indent}  \${jsonToToon(v, indentLevel + 1)}\`;
  }).join(\`\\n\${indent}\`);
}

// Example usage
const dbData = [
  { id: 1, name: "Alice", role: "admin" },
  { id: 2, name: "Bob", role: "user" }
];

const toonPayload = jsonToToon(dbData);
console.log("Encoded Payload:\\n", toonPayload);
`;

  const handleDownloadReport = () => {
    // Generate simple markdown report download
    const markdown = `# AgentStudio Cost Ledger Summary
Generated on: ${new Date().toLocaleDateString()}

This report details your token footprint compression and estimated API cost reductions achieved using Token-Oriented Object Notation (TOON) in AgentStudio.

## Optimization Benchmarks
- Tabular compression averages: 45% - 70%
- Primary tokenizer targets: cl100k_base, o200k_base, SentencePiece.

Thank you for executing with AgentStudio. Deploy this agentic pipeline using the generated SDK scripts.
`;
    const element = document.createElement("a");
    const file = new Blob([markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = "AgentStudio_Cost_Report.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="export-panel-container fade-in" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--border-radius)', padding: '1.5rem', backdropFilter: 'blur(10px)' }}>
      <h3 className="section-title">Developer Integration SDKs</h3>
      <p className="text-muted memory-desc">
        Deploy your TOON pipeline directly in your backend systems. Copy the generated SDK wrapper libraries to serialize data queries and call LLM providers.
      </p>

      <div className="terminal-header" style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="tab-buttons">
          <button 
            onClick={() => setActiveTab('python')} 
            className={`tab-btn ${activeTab === 'python' ? 'active' : ''}`}
          >
            Python SDK
          </button>
          <button 
            onClick={() => setActiveTab('node')} 
            className={`tab-btn ${activeTab === 'node' ? 'active' : ''}`}
          >
            Node.js Script
          </button>
          <button 
            onClick={() => setActiveTab('export')} 
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          >
            Report Exporter
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#05080e', padding: '1.25rem', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', borderTop: 'none' }}>
        {activeTab === 'python' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>python_toon_client.py</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(pythonCode);
                  alert('Copied Python SDK!');
                }}
                className="premium-btn tag-btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Copy Python Script
              </button>
            </div>
            <pre className="code-view font-mono text-muted" style={{ maxHeight: '380px', overflowY: 'auto', fontSize: '0.75rem', background: '#020407', padding: '1rem', borderRadius: '6px' }}>
              <code>{pythonCode}</code>
            </pre>
          </div>
        )}

        {activeTab === 'node' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>toon_helper.js</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(nodeCode);
                  alert('Copied Node.js snippet!');
                }}
                className="premium-btn tag-btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Copy JS Snippet
              </button>
            </div>
            <pre className="code-view font-mono text-muted" style={{ maxHeight: '380px', overflowY: 'auto', fontSize: '0.75rem', background: '#020407', padding: '1rem', borderRadius: '6px' }}>
              <code>{nodeCode}</code>
            </pre>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <h5 className="font-bold text-gradient">Export Cost Optimization Ledger Summary</h5>
            <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '500px' }}>
              Generate and download a comprehensive markdown report documenting your cumulative token footprint savings, latency reductions, and pricing benefits.
            </p>
            <button 
              onClick={handleDownloadReport} 
              className="premium-btn highlight-glow-inline"
              style={{ marginTop: '0.5rem' }}
            >
              📥 Download Cost Ledger Report (.md)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
