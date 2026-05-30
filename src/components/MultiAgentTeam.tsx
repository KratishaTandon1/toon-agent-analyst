import React, { useState } from 'react';
import { runMultiAgentWorkflow } from '../utils/agentEngine';
import type { AgentTaskLog } from '../utils/agentEngine';
import { getIndexedChunks } from '../utils/vectorDb';

interface MultiAgentTeamProps {
  customDbData: Record<string, unknown[]>;
  onLogSaved: (log: {
    id: string;
    timestamp: string;
    query: string;
    table: string;
    model: string;
    jsonTokens: number;
    toonTokens: number;
  }) => void;
  useLiveLLM: boolean;
  apiProvider: 'gemini' | 'openai';
  apiKey: string;
}

export const MultiAgentTeam: React.FC<MultiAgentTeamProps> = ({
  customDbData,
  onLogSaved,
  useLiveLLM,
  apiProvider,
  apiKey
}) => {
  const [query, setQuery] = useState('Calculate the total E-Commerce sales and average items ordered');
  const [selectedSource, setSelectedSource] = useState('orders'); // orders, logs, tickets, uploaded_docs
  const [isLoading, setIsLoading] = useState(false);
  
  // Node parameters tuner state
  const [plannerModel, setPlannerModel] = useState('Gemini 1.5 Flash');
  const [temperature, setTemperature] = useState(0.2);

  // Workflow logs
  const [taskLogs, setTaskLogs] = useState<AgentTaskLog[]>([]);
  const [currentNode, setCurrentNode] = useState<'none' | 'Planner' | 'Data Extractor' | 'Analyst'>('none');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [codeExecuted, setCodeExecuted] = useState('');
  const [sandboxResult, setSandboxResult] = useState('');
  const [tokenMetrics, setTokenMetrics] = useState<{ json: number; toon: number } | null>(null);
  
  // Self-Correction debug log
  const [selfCorrectionTrace, setSelfCorrectionTrace] = useState<string[]>([]);

  const handleRunWorkflow = async () => {
    setIsLoading(true);
    setTaskLogs([]);
    setFinalAnswer('');
    setCodeExecuted('');
    setSandboxResult('');
    setTokenMetrics(null);
    setSelfCorrectionTrace([]);

    const useLive = useLiveLLM;
    const provider = apiProvider;
    const key = apiKey;

    // Check RAG
    if (selectedSource === 'uploaded_docs' && getIndexedChunks().length === 0) {
      alert('Your RAG Document index is empty! Please upload a document in the Document Manager tab first.');
      setIsLoading(false);
      return;
    }

    try {
      // Step-by-step UI updates
      setCurrentNode('Planner');
      setTaskLogs([{
        agentName: 'Planner',
        status: 'running',
        thought: `Planner node starting (Configured Model: ${plannerModel}). Analyzing query: "${query}"...`
      }]);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setCurrentNode('Data Extractor');
      setTaskLogs(prev => {
        const copy = [...prev];
        copy[0].status = 'success';
        copy[0].thought = `Identified data query parameters. Running sub-tasks:
1. Load matching records from source.
2. Compile data processing script. Sandbox JS execution is enabled.
3. Serialize metrics to TOON.`;
        return [...copy, {
          agentName: 'Data/Tool Agent',
          status: 'running',
          thought: 'Querying tables and compiling code sandbox scripts...'
        }];
      });

      // Run loop in orchestrator
      const result = await runMultiAgentWorkflow(
        query,
        selectedSource,
        customDbData,
        useLive,
        provider,
        key,
        temperature,
        plannerModel
      );

      // Bind logs trace
      setSelfCorrectionTrace(result.selfCorrectionTrace || []);

      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentNode('Analyst');
      setTaskLogs(prev => {
        const copy = [...prev];
        copy[1].status = 'success';
        copy[1].thought = result.logs[1].thought;
        copy[1].payloadText = result.logs[1].payloadText;
        copy[1].payloadType = 'toon';
        return [...copy, {
          agentName: 'Analyst',
          status: 'running',
          thought: `Analyst node executing (Configured Temperature: ${temperature}). Compiling final report summary...`
        }];
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentNode('none');
      setTaskLogs(prev => {
        const copy = [...prev];
        copy[2].status = 'success';
        copy[2].thought = result.logs[2].thought;
        return copy;
      });

      setFinalAnswer(result.finalAnswer);
      setCodeExecuted(result.jsCodeExecuted || '');
      setSandboxResult(result.jsResultOutput || '');
      setTokenMetrics({ json: result.jsonTokens, toon: result.toonTokens });

      // Save log to database
      onLogSaved({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        query,
        table: selectedSource,
        model: useLive ? `${provider === 'gemini' ? 'Gemini' : 'OpenAI'}` : 'Simulation',
        jsonTokens: result.jsonTokens,
        toonTokens: result.toonTokens
      });

    } catch (e) {
      console.error(e);
      alert('Workflow execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-team-container fade-in">
      <h3 className="section-title">Collaborative Multi-Agent Workspace</h3>
      <p className="text-muted memory-desc">
        Watch a planner, database query tool, and analyst collaborate in a pipeline. The query tool compiles custom JS scripts to run mathematical calculations in a sandbox, then feeds compressed TOON to the analyst.
      </p>

      {/* Query Bar */}
      <div className="query-bar">
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="premium-select"
          disabled={isLoading}
          style={{ minWidth: '150px' }}
        >
          <option value="orders">🛒 E-Commerce DB</option>
          <option value="logs">🖥️ Server Logs DB</option>
          <option value="tickets">🎟️ Tickets DB</option>
          <option value="uploaded_docs">📄 RAG Document Index</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a task (e.g. 'Sum orders total', 'Count warning server logs', 'Summarize tickets')..."
          className="premium-input"
          disabled={isLoading}
        />
        <button
          onClick={handleRunWorkflow}
          className="premium-btn run-btn highlight-glow-inline"
          disabled={isLoading || query.trim() === ''}
        >
          {isLoading ? 'Running Loop...' : 'Execute Loop'}
        </button>
      </div>

      {/* Visual Agent Graph Diagram with Tuner Sliders */}
      <div className="agent-graph-diagram" style={{ display: 'flex', gap: '1rem', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '1.5rem' }}>
        
        <span className="font-bold text-gradient" style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Interactive Node Configurator:</span>
        
        <div className="nodes-container">
          
          {/* Planner Node Tuner */}
          <div className={`agent-node ${currentNode === 'Planner' ? 'active-node highlight-glow' : ''}`} style={{ minWidth: '160px' }}>
            <div className="node-icon" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: currentNode === 'Planner' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🧠</div>
            <span className="node-lbl font-bold" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>1. Planner Agent</span>
            
            {/* Tuner Controls */}
            <div className="node-tuner-box" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
              <select
                value={plannerModel}
                onChange={(e) => setPlannerModel(e.target.value)}
                className="premium-select"
                style={{ fontSize: '0.65rem', padding: '0.2rem', width: '100%' }}
                disabled={isLoading}
              >
                <option value="Gemini 1.5 Flash">Gemini Flash</option>
                <option value="GPT-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
          </div>

          {/* Connector 1 -> 2 */}
          <div className="node-connector">
            <svg viewBox="0 0 50 24" className={`connector-arrow-svg ${currentNode === 'Data Extractor' ? 'speed-flow' : ''}`}>
              <path d="M0 12H44M44 12L38 6M44 12L38 18" fill="none" />
            </svg>
          </div>

          {/* Executor Node Tuner */}
          <div className={`agent-node ${currentNode === 'Data Extractor' ? 'active-node highlight-glow' : ''}`} style={{ minWidth: '160px' }}>
            <div className="node-icon" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: currentNode === 'Data Extractor' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🔧</div>
            <span className="node-lbl font-bold" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>2. Data/Tool Agent</span>
            
            <div className="node-tuner-box" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', alignItems: 'center' }}>
              <span className="success-badge font-mono" style={{ fontSize: '0.65rem' }}>JS Interpreter: ACTIVE</span>
            </div>
          </div>

          {/* Connector 2 -> 3 */}
          <div className="node-connector">
            <svg viewBox="0 0 50 24" className={`connector-arrow-svg ${currentNode === 'Analyst' ? 'speed-flow' : ''}`}>
              <path d="M0 12H44M44 12L38 6M44 12L38 18" fill="none" />
            </svg>
          </div>

          {/* Analyst Node Tuner */}
          <div className={`agent-node ${currentNode === 'Analyst' ? 'active-node highlight-glow' : ''}`} style={{ minWidth: '160px' }}>
            <div className="node-icon" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: currentNode === 'Analyst' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>📊</div>
            <span className="node-lbl font-bold" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>3. Analyst Agent</span>
            
            {/* Tuner Controls */}
            <div className="node-tuner-box" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', fontSize: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                <span>Temp:</span>
                <span>{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-primary)' }}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Self-Correction Debug Log */}
      {selfCorrectionTrace.length > 0 && (
        <div className="error-banner fade-in" style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.3)', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span className="font-bold text-gradient" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>⚡ Agentic Self-Correction Trace:</span>
          <div className="font-mono" style={{ fontSize: '0.75rem', opacity: 0.9 }}>
            {selfCorrectionTrace.map((trace, idx) => (
              <div key={idx} style={{ marginTop: '0.2rem' }}>
                &gt; {trace}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="console-layout">
        {/* Logs terminal */}
        <div className="terminal-box">
          <div className="terminal-header">
            <span className="terminal-title">Sequential Handoff Logs</span>
          </div>
          <div className="terminal-body font-mono">
            {taskLogs.length === 0 && !isLoading && (
              <div className="terminal-placeholder">
                &gt; Awaiting loop execution trigger...
              </div>
            )}

            {taskLogs.map((log, idx) => (
              <div key={idx} className={`terminal-log-line log-${log.status}`}>
                <span className="log-icon">
                  {log.status === 'success' && '✓'}
                  {log.status === 'running' && '⚡'}
                </span>
                <div className="log-content">
                  <div className="log-title font-bold">[{log.agentName}] Task</div>
                  <div className="log-detail text-muted" style={{ whiteSpace: 'pre-wrap' }}>{log.thought}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="terminal-log-line log-running blink">
                <span className="log-icon">⚡</span>
                <div className="log-content">
                  <div className="log-title font-bold">Node routing in progress...</div>
                  <div className="log-detail text-muted">Running queries and checking code interpreter sandbox.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sandbox Tool Execution Tracer */}
        <div className="terminal-box">
          <div className="terminal-header">
            <span className="terminal-title">Code Interpreter Tool Sandbox</span>
            {tokenMetrics && (
              <span className="text-green font-mono" style={{ fontSize: '0.7rem' }}>
                -{((tokenMetrics.json - tokenMetrics.toon)/tokenMetrics.json*100).toFixed(0)}% TOON payload
              </span>
            )}
          </div>
          <div className="terminal-body bg-darker" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
            {codeExecuted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
                <span className="font-bold text-gradient" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Compiled JS Math Tool:</span>
                <pre className="code-view font-mono text-muted" style={{ padding: '0.65rem', background: '#020407', borderRadius: '4px', fontSize: '0.7rem', overflowX: 'auto' }}>
                  <code>{codeExecuted}</code>
                </pre>
                
                <span className="font-bold text-green" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginTop: '0.25rem' }}>Evaluated TOON Result:</span>
                <pre className="code-view font-mono text-green" style={{ padding: '0.65rem', background: '#020407', borderRadius: '4px', fontSize: '0.7rem', flex: 1, overflowY: 'auto' }}>
                  <code>{taskLogs[1]?.payloadText || sandboxResult || 'null'}</code>
                </pre>
              </div>
            ) : (
              <div className="terminal-placeholder">
                &gt; If the query implies math (e.g. sum, count, average), the tool agent will compile and execute JS calculations in this sandbox and return the values.
              </div>
            )}
          </div>
        </div>
      </div>

      {finalAnswer && (
        <div className="agent-result-box highlight-glow fade-in">
          <h4 className="result-title text-gradient">Analyst Executive Summary:</h4>
          <p className="result-content">{finalAnswer}</p>
        </div>
      )}
    </div>
  );
};
