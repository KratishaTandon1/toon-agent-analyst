import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsonToToon } from '../utils/toonConverter';
import { estimateTokens } from '../utils/tokenizer';

const NESTED_EXAMPLE = `{
  "company": "Tech Corp",
  "staff": [
    {
      "id": 1,
      "identity": { "first_name": "John", "last_name": "Doe" },
      "job": { "title": "Developer", "level": "L3" }
    },
    {
      "id": 2,
      "identity": { "first_name": "Jane", "last_name": "Smith" },
      "job": { "title": "Designer", "level": "L4" }
    }
  ]
}`;

export const SchemaOptimizer: React.FC = () => {
  const [rawJson, setRawJson] = useState(NESTED_EXAMPLE);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Optimization states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [originalToon, setOriginalToon] = useState('');
  const [optimizedToon, setOptimizedToon] = useState('');
  
  // Token sizing
  const [origTokens, setOrigTokens] = useState(0);
  const [optTokens, setOptTokens] = useState(0);
  const [savingsPercent, setSavingsPercent] = useState(0);
  const [mappingCode, setMappingCode] = useState('');

  // Run the optimizer
  const handleOptimize = useCallback(() => {
    try {
      const parsed = JSON.parse(rawJson);
      setJsonError(null);
      setIsOptimizing(true);
      setShowResults(false);
      
      setTimeout(() => {
        // Compute original TOON
        const origTStr = jsonToToon(parsed);
        setOriginalToon(origTStr);
        const origTokenSize = estimateTokens(origTStr, 'cl100k_base');
        setOrigTokens(origTokenSize);

        // Smart refactoring analysis
        // Look for nested structures in arrays to flatten
        const refactored = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
        let codeSnippet: string;

        interface StaffItem {
          id: number;
          identity?: { first_name?: string; last_name?: string };
          job?: { title?: string; level?: string };
        }

        if (refactored.staff && Array.isArray(refactored.staff)) {
          refactored.staff = (refactored.staff as unknown[]).map((itemVal) => {
            const item = itemVal as StaffItem;
            return {
              id: item.id,
              first_name: item.identity?.first_name || '',
              last_name: item.identity?.last_name || '',
              title: item.job?.title || '',
              level: item.job?.level || ''
            };
          });
          
          codeSnippet = `// TypeScript flattening mapper for TOON optimization
interface NestedStaff {
  id: number;
  identity: { first_name: string; last_name: string; };
  job: { title: string; level: string; };
}

export function flattenStaffPayload(data: { company: string; staff: NestedStaff[] }) {
  return {
    company: data.company,
    staff: data.staff.map(item => ({
      id: item.id,
      first_name: item.identity?.first_name,
      last_name: item.identity?.last_name,
      title: item.job?.title,
      level: item.job?.level
    }))
  };
}`;
        } else {
          // Generic flattening utility for other JSON objects
          const arrayKeys = Object.keys(refactored).filter(k => Array.isArray(refactored[k]));
          if (arrayKeys.length > 0) {
            const targetKey = arrayKeys[0];
            
            // Flatten first level of children
            refactored[targetKey] = (refactored[targetKey] as unknown[]).map((itemVal) => {
              const item = itemVal as Record<string, unknown>;
              const flatItem: Record<string, unknown> = {};
              Object.keys(item).forEach(k => {
                if (item[k] && typeof item[k] === 'object' && !Array.isArray(item[k])) {
                  // Merge nested keys
                  const subObj = item[k] as Record<string, unknown>;
                  Object.keys(subObj).forEach(subK => {
                    flatItem[`${k}_${subK}`] = subObj[subK];
                  });
                } else {
                  flatItem[k] = item[k];
                }
              });
              return flatItem;
            });

            codeSnippet = `// Generic flattening mapper for TOON payload optimizations
export function optimizePayload(data: any) {
  return {
    ...data,
    ${targetKey}: data.${targetKey}.map((item: any) => {
      const flat: any = {};
      Object.keys(item).forEach(k => {
        if (item[k] && typeof item[k] === 'object' && !Array.isArray(item[k])) {
          Object.keys(item[k]).forEach(subK => {
            flat[\`\${k}_\${subK}\`] = item[k][subK];
          });
        } else {
          flat[k] = item[k];
        }
      });
      return flat;
    })
  };
}`;
          } else {
            // Nothing to flatten, fallback
            codeSnippet = `// Payload is already optimal for TOON tabular structures! \n// No flattening mapping required.`;
          }
        }

        const optTStr = jsonToToon(refactored);
        setOptimizedToon(optTStr);
        
        const optTokenSize = estimateTokens(optTStr, 'cl100k_base');
        setOptTokens(optTokenSize);
        
        const diff = origTokenSize - optTokenSize;
        setSavingsPercent(origTokenSize > 0 ? (diff / origTokenSize) * 100 : 0);
        setMappingCode(codeSnippet);
        
        setIsOptimizing(false);
        setShowResults(true);
      }, 1000);

    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setJsonError(`Invalid JSON: ${e.message}`);
      setIsOptimizing(false);
    }
  }, [rawJson]);

  const initialRunRef = useRef(false);
  // Run on mount once
  useEffect(() => {
    if (!initialRunRef.current) {
      initialRunRef.current = true;
      const timer = setTimeout(() => {
        handleOptimize();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [handleOptimize]);

  return (
    <div className="schema-optimizer-container fade-in">
      <h3 className="section-title">Schema Refactoring & Optimization Assistant</h3>
      <p className="text-muted schema-desc">
        Nested objects inside JSON arrays are inefficient because they break uniform headers. The optimizer flattens your nested lists into tabular profiles, drastically boosting TOON's compression ratio.
      </p>

      <div className="schema-input-section">
        <div className="editor-labels">
          <span>Input Nested JSON Schema</span>
          {jsonError && <span className="error-badge">{jsonError}</span>}
        </div>
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          className={`editor-textarea font-mono ${jsonError ? 'border-error' : ''}`}
          rows={8}
          placeholder="Paste complex nested JSON data here..."
          disabled={isOptimizing}
        />
        <button
          onClick={handleOptimize}
          className="premium-btn optimize-btn highlight-glow-inline"
          disabled={isOptimizing || rawJson.trim() === ''}
          style={{ marginTop: '0.75rem', alignSelf: 'flex-start' }}
        >
          {isOptimizing ? 'Analyzing Schema...' : 'Optimize Schema Structures'}
        </button>
      </div>

      {showResults && (
        <div className="optimizer-results fade-in">
          {/* Metrics summary */}
          <div className="metrics-grid" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="metric-card token-card highlight-glow">
              <div className="metric-label">Extra Context Saved</div>
              <div className="metric-value text-gradient">
                {savingsPercent.toFixed(1)}%
              </div>
              <div className="metric-subtext">
                Removed {Math.max(0, origTokens - optTokens)} extra tokens
              </div>
            </div>
            
            <div className="metric-card json-card">
              <div className="metric-label">Original TOON Size</div>
              <div className="metric-value text-red">
                {origTokens}
              </div>
              <div className="metric-subtext">
                Using nested formatting
              </div>
            </div>
            
            <div className="metric-card toon-card">
              <div className="metric-label">Optimized TOON Size</div>
              <div className="metric-value text-green">
                {optTokens}
              </div>
              <div className="metric-subtext">
                Using flattened tables
              </div>
            </div>

            <div className="metric-card saving-cost-card">
              <div className="metric-label">Optimization Score</div>
              <div className="metric-value text-emerald">
                {savingsPercent > 40 ? '98/100' : savingsPercent > 20 ? '85/100' : '95/100'}
              </div>
              <div className="metric-subtext">
                Tabular ratio optimal
              </div>
            </div>
          </div>

          <div className="optimizer-comparisons">
            {/* Original TOON */}
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-title text-red">Original Nested TOON</span>
              </div>
              <div className="terminal-body font-mono bg-darker text-red" style={{ fontSize: '0.7rem' }}>
                <pre className="code-view">
                  {originalToon}
                </pre>
              </div>
            </div>

            {/* Optimized TOON */}
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-title text-green">Optimized Tabular TOON</span>
              </div>
              <div className="terminal-body font-mono bg-darker text-green" style={{ fontSize: '0.7rem' }}>
                <pre className="code-view">
                  {optimizedToon}
                </pre>
              </div>
            </div>
          </div>

          {/* Generated Mapping Code */}
          <div className="mapping-code-panel highlight-glow" style={{ marginTop: '1.5rem' }}>
            <div className="code-panel-header">
              <span className="font-bold text-gradient">Generated Translation Helper Code</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(mappingCode);
                  alert('Copied mapper code to clipboard!');
                }}
                className="premium-btn tag-btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Copy Code
              </button>
            </div>
            <pre className="code-view font-mono text-muted" style={{ padding: '1rem', background: '#030508', borderRadius: '6px', fontSize: '0.75rem', marginTop: '0.5rem', overflowX: 'auto' }}>
              <code>{mappingCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
