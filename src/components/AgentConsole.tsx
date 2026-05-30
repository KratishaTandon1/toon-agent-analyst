import React, { useState } from 'react';

interface AgentStep {
  title: string;
  detail: string;
  status: 'pending' | 'success' | 'running';
}

interface AgentConsoleProps {
  query: string;
  onQueryChange: (q: string) => void;
  onRunQuery: () => void;
  isLoading: boolean;
  steps: AgentStep[];
  toonOutput: string;
  jsonOutput: string;
  finalAnswer: string;
  errorMessage: string | null;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  query,
  onQueryChange,
  onRunQuery,
  isLoading,
  steps,
  toonOutput,
  jsonOutput,
  finalAnswer,
  errorMessage,
}) => {
  const [activePayloadTab, setActivePayloadTab] = useState<'toon' | 'json' | 'none'>('toon');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && query.trim() !== '') {
      onRunQuery();
    }
  };

  return (
    <div className="console-container">
      <h3 className="section-title">Agent Execution Console</h3>
      
      {/* Query Bar */}
      <div className="query-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the Agent (e.g., 'Find orders total > 500', 'List database warnings', etc.)..."
          className="premium-input"
          disabled={isLoading}
        />
        <button
          onClick={onRunQuery}
          className="premium-btn run-btn"
          disabled={isLoading || query.trim() === ''}
        >
          {isLoading ? (
            <span className="spinner-wrapper">
              <span className="spinner"></span> Running...
            </span>
          ) : (
            'Run Agent Query'
          )}
        </button>
      </div>

      <div className="console-layout">
        {/* Step Tracer */}
        <div className="terminal-box log-tracer-panel">
          <div className="terminal-header">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
            <span className="terminal-title">Agent Process Logs</span>
          </div>
          <div className="terminal-body font-mono">
            {steps.length === 0 && !isLoading && (
              <div className="terminal-placeholder">
                &gt; Waiting for agent execution query... Try typing a query above or click a suggestion below.
              </div>
            )}
            
            {steps.map((step, idx) => (
              <div key={idx} className={`terminal-log-line log-${step.status}`}>
                <span className="log-icon">
                  {step.status === 'success' && '✓'}
                  {step.status === 'running' && '⚡'}
                  {step.status === 'pending' && '○'}
                </span>
                <div className="log-content">
                  <div className="log-title font-bold">{step.title}</div>
                  <div className="log-detail text-muted">{step.detail}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="terminal-log-line log-running blink">
                <span className="log-icon">⚡</span>
                <div className="log-content">
                  <div className="log-title font-bold">Synthesizing data model...</div>
                  <div className="log-detail text-muted">Running queries and estimating token savings.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payload Preview */}
        <div className="terminal-box payload-preview-panel">
          <div className="terminal-header">
            <span className="terminal-title">Context Payload Sent to LLM</span>
            <div className="tab-buttons">
              <button 
                onClick={() => setActivePayloadTab('toon')} 
                className={`tab-btn ${activePayloadTab === 'toon' ? 'active' : ''}`}
              >
                TOON payload
              </button>
              <button 
                onClick={() => setActivePayloadTab('json')} 
                className={`tab-btn ${activePayloadTab === 'json' ? 'active' : ''}`}
              >
                JSON payload
              </button>
            </div>
          </div>
          <div className="terminal-body payload-body font-mono">
            {activePayloadTab === 'toon' && (
              <pre className="code-view text-green">
                {toonOutput || '# TOON output will appear here after query execution.'}
              </pre>
            )}
            {activePayloadTab === 'json' && (
              <pre className="code-view text-red">
                {jsonOutput || '// JSON output will appear here after query execution.'}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="error-banner">
          <strong>Error: </strong> {errorMessage}
        </div>
      )}

      {/* Agent Response */}
      {finalAnswer && (
        <div className="agent-result-box highlight-glow">
          <h4 className="result-title text-gradient">Agent Synthesis & Final Answer:</h4>
          <p className="result-content">{finalAnswer}</p>
        </div>
      )}
    </div>
  );
};
