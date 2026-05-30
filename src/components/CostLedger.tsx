import React from 'react';
import { calculateCost } from '../utils/tokenizer';

export interface RunLog {
  id: string;
  timestamp: string;
  query: string;
  table: string;
  model: string;
  jsonTokens: number;
  toonTokens: number;
}

interface CostLedgerProps {
  logs: RunLog[];
  onClearLogs: () => void;
}

export const CostLedger: React.FC<CostLedgerProps> = ({
  logs,
  onClearLogs
}) => {
  // We will assume a standard benchmark price of GPT-4o ($5.00/1M tokens) to show cost metrics clearly
  const BENCH_COST_RATE = 5.00;

  // Calculate aggregates
  const totalRuns = logs.length;
  
  const totalJsonTokens = logs.reduce((sum, l) => sum + l.jsonTokens, 0);
  const totalToonTokens = logs.reduce((sum, l) => sum + l.toonTokens, 0);
  const totalTokensSaved = Math.max(0, totalJsonTokens - totalToonTokens);
  
  const avgSavingsPercent = totalJsonTokens > 0 
    ? (totalTokensSaved / totalJsonTokens) * 100 
    : 0;

  const totalCostSaved = calculateCost(totalTokensSaved, BENCH_COST_RATE);

  return (
    <div className="ledger-container fade-in">
      <div className="memory-header-row">
        <h3 className="section-title">Session Cost Ledger & Run Logs</h3>
        {logs.length > 0 && (
          <button onClick={onClearLogs} className="premium-btn reset-btn">
            Clear Ledger Database
          </button>
        )}
      </div>

      <p className="text-muted memory-desc">
        All queries executed in your Agent Studio sessions are logged and stored locally. Token statistics are compiled using standard GPT-4/Claude token rates ($5.00 per 1M input tokens).
      </p>

      {/* Aggregate metrics */}
      <div className="metrics-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="metric-card token-card highlight-glow">
          <div className="metric-label">Lifetime Compacted Tokens</div>
          <div className="metric-value text-gradient">
            {totalTokensSaved.toLocaleString()}
          </div>
          <div className="metric-subtext">
            Saved across {totalRuns} runs
          </div>
        </div>

        <div className="metric-card json-card">
          <div className="metric-label">Average Savings</div>
          <div className="metric-value text-red" style={{ color: 'var(--color-green)' }}>
            {avgSavingsPercent.toFixed(1)}%
          </div>
          <div className="metric-subtext">
            Fewer context bytes
          </div>
        </div>

        <div className="metric-card toon-card">
          <div className="metric-label">Lifetime Cost Saved</div>
          <div className="metric-value text-green">
            ${totalCostSaved.toFixed(5)}
          </div>
          <div className="metric-subtext">
            Estimated at $5.00/1M tokens
          </div>
        </div>

        <div className="metric-card saving-cost-card">
          <div className="metric-label">Active Runs</div>
          <div className="metric-value text-emerald">
            {totalRuns}
          </div>
          <div className="metric-subtext">
            Ledger transactions
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="chart-section" style={{ padding: '0' }}>
        <div className="terminal-header" style={{ padding: '0.75rem 1.25rem', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <span className="terminal-title">Persistent Database Records</span>
        </div>
        <div style={{ overflowX: 'auto', backgroundColor: 'rgba(0,0,0,0.15)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          {logs.length === 0 ? (
            <div className="terminal-placeholder" style={{ padding: '2rem', textAlign: 'center' }}>
              &gt; No ledger entries found. Go to the "Agent Team" tab and execute queries to populate the database records.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', opacity: 0.7 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Task Query</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Source</th>
                  <th style={{ padding: '0.75rem 1rem' }}>JSON Tokens</th>
                  <th style={{ padding: '0.75rem 1rem' }}>TOON Tokens</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Saved</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const saved = Math.max(0, log.jsonTokens - log.toonTokens);
                  const pct = log.jsonTokens > 0 ? (saved / log.jsonTokens) * 100 : 0;
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.75rem 1rem', opacity: 0.8 }}>{log.timestamp}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.query}>
                        {log.query}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '700', color: 'var(--brand-primary)' }}>
                        {log.table === 'uploaded_docs' ? 'RAG Index' : log.table}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-red)' }} className="font-mono">{log.jsonTokens}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-green)' }} className="font-mono">{log.toonTokens}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: '700' }} className="font-mono">
                        {saved} ({pct.toFixed(0)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
