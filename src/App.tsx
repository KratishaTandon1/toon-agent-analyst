import { useState, useEffect } from 'react';
import { DATASETS } from './utils/mockDatabase';
import { jsonToToon } from './utils/toonConverter';
import { estimateTokens } from './utils/tokenizer';
import { Dashboard } from './components/Dashboard';
import { AgentConsole } from './components/AgentConsole';
import { DatabaseEditor } from './components/DatabaseEditor';
import { Playground } from './components/Playground';
import { Settings } from './components/Settings';
import { AgentMemoryChat } from './components/AgentMemoryChat';
import { ApiRagAnalyzer } from './components/ApiRagAnalyzer';
import { SchemaOptimizer } from './components/SchemaOptimizer';
import { MultiAgentTeam } from './components/MultiAgentTeam';
import { DocumentManager } from './components/DocumentManager';
import { CostLedger } from './components/CostLedger';
import type { RunLog } from './components/CostLedger';
import { PromptPlayground } from './components/PromptPlayground';
import { ExportPanel } from './components/ExportPanel';
import { getSimulatedAgentSteps, queryLocalDatabase, callRealLLM } from './utils/mockDatabase';

interface AgentStep {
  title: string;
  detail: string;
  status: 'pending' | 'success' | 'running';
}

function App() {
  // Navigation Tabs: agent, chat, api, optimizer, prompt_test, dev_sdk, database, documents, ledger, playground, settings
  const [activeTab, setActiveTab] = useState<'agent' | 'r_console' | 'chat' | 'api' | 'optimizer' | 'prompt_test' | 'dev_sdk' | 'database' | 'documents' | 'ledger' | 'playground' | 'settings'>('agent');
  
  // Database States
  const [selectedTable, setSelectedTable] = useState<string>('orders');
  const [customData, setCustomData] = useState<Record<string, unknown[]>>({
    orders: [...DATASETS.orders.data],
    logs: [...DATASETS.logs.data],
    tickets: [...DATASETS.tickets.data],
  });

  // Basic Console States
  const [query, setQuery] = useState<string>('Find E-Commerce orders greater than 100');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [toonOutput, setToonOutput] = useState<string>('');
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [finalAnswer, setFinalAnswer] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Token Metrics
  const [pricingModel, setPricingModel] = useState<string>('Gemini 1.5 Flash');

  // Settings
  const [useLiveLLM, setUseLiveLLM] = useState<boolean>(false);
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState<string>('');

  // Persistent Ledger Logs State
  const [ledgerLogs, setLedgerLogs] = useState<RunLog[]>([]);

  // Guide Toggle State
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(true);

  // Load settings and ledger from localStorage
  useEffect(() => {
    const localUseLive = localStorage.getItem('toon_use_live');
    const savedUseLive = localUseLive !== null 
      ? localUseLive === 'true' 
      : import.meta.env.VITE_USE_LIVE === 'true';

    const savedProvider = (localStorage.getItem('toon_provider') || 
      import.meta.env.VITE_API_PROVIDER || 
      'gemini') as 'gemini' | 'openai';

    const savedKey = localStorage.getItem('toon_api_key') || 
      import.meta.env.VITE_API_KEY || 
      '';
    
    // Load ledger logs
    const savedLogs = localStorage.getItem('toon_ledger_logs');
    let parsedLogs: RunLog[] = [];
    if (savedLogs) {
      try {
        parsedLogs = JSON.parse(savedLogs) as RunLog[];
      } catch (e) {
        console.error(e);
      }
    }
    
    const timer = setTimeout(() => {
      if (parsedLogs.length > 0) {
        setLedgerLogs(parsedLogs);
      }
      setUseLiveLLM(savedUseLive);
      setApiProvider(savedProvider);
      setApiKey(savedKey);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleUseLiveLLMChange = (val: boolean) => {
    setUseLiveLLM(val);
    localStorage.setItem('toon_use_live', String(val));
  };

  const handleApiProviderChange = (val: 'gemini' | 'openai') => {
    setApiProvider(val);
    localStorage.setItem('toon_provider', val);
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('toon_api_key', val);
  };

  const handleDataUpdate = (tableId: string, updatedData: unknown[]) => {
    setCustomData(prev => ({
      ...prev,
      [tableId]: updatedData
    }));
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all databases to their default values?')) {
      setCustomData({
        orders: [...DATASETS.orders.data],
        logs: [...DATASETS.logs.data],
        tickets: [...DATASETS.tickets.data],
      });
    }
  };

  // Callback to append a new log entry
  const handleLogSaved = (newLog: RunLog) => {
    setLedgerLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('toon_ledger_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearLedger = () => {
    if (window.confirm('Are you sure you want to delete all historical logs?')) {
      setLedgerLogs([]);
      localStorage.removeItem('toon_ledger_logs');
    }
  };

  // Run the basic Single-Agent RAG Console
  const runAgentQuery = async () => {
    setIsLoading(true);
    setError(null);
    setFinalAnswer('');
    setSteps([]);
    
    try {
      // 1. Fetch matching records from the database
      const records = queryLocalDatabase(selectedTable, query, customData[selectedTable]);
      
      // 2. Perform formats conversion & token estimations
      const toonStr = jsonToToon(records);
      const jsonStr = JSON.stringify(records, null, 2);
      
      setToonOutput(toonStr);
      setJsonOutput(jsonStr);

      // 3. Execution flow
      if (!useLiveLLM || !apiKey) {
        // Run Simulated Mode
        const sim = getSimulatedAgentSteps(selectedTable, query, records.length);
        
        // Stagger logs to look like real-time agent execution
        for (let i = 0; i < sim.steps.length; i++) {
          const currentStep = sim.steps[i];
          setSteps(prev => [...prev, { ...currentStep, status: 'running' }]);
          await new Promise(resolve => setTimeout(resolve, 850));
          setSteps(prev => {
            const copy = [...prev];
            copy[copy.length - 1].status = 'success';
            return copy;
          });
        }
        
        setFinalAnswer(sim.finalAnswer);
      } else {
        // Run Live LLM Mode
        setSteps([
          { title: 'Parse Query Parameters', detail: `Extracting table filters for query: "${query}"`, status: 'success' },
          { title: 'Execute DB Lookup', detail: `Query tool fetched ${records.length} records from table '${selectedTable}'`, status: 'running' }
        ]);
        
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const jt = estimateTokens(jsonStr, 'cl100k_base');
        const tt = estimateTokens(toonStr, 'cl100k_base');
        
        setSteps(prev => {
          const copy = [...prev];
          copy[1].status = 'success';
          return [...copy, { title: 'TOON Translation Layer', detail: `Converting payload JSON -> TOON. JSON Size: ${jt} tokens | TOON Size: ${tt} tokens`, status: 'running' }];
        });
        
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setSteps(prev => {
          const copy = [...prev];
          copy[2].status = 'success';
          return [...copy, { title: 'LLM Stream Integration', detail: `Invoking model using compacted TOON format...`, status: 'running' }];
        });

        const systemPrompt = `You are a professional Database Analyst AI Agent.
Analyze the following database data, which is formatted in TOON (Token-Oriented Object Notation) to reduce token count.
TOON uses indentation to replace curly braces, and tabular layouts for lists of items (headers declared once inside curly braces like {id,name}, followed by rows of comma-separated values).

Synthesize a comprehensive, factual, and quantitative answer addressing the user's inquiry: "${query}".`;

        const responseText = await callRealLLM(apiProvider, apiKey, systemPrompt, toonStr);
        
        setSteps(prev => {
          const copy = [...prev];
          copy[3].status = 'success';
          return copy;
        });
        
        setFinalAnswer(responseText);
        
        // Save to cost ledger
        handleLogSaved({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          query,
          table: selectedTable,
          model: `${apiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}`,
          jsonTokens: jt,
          toonTokens: tt
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message || 'An unexpected error occurred during execution.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (tableId: string, suggestionQuery: string) => {
    setSelectedTable(tableId);
    setQuery(suggestionQuery);
    setActiveTab('r_console');
  };

  return (
    <div className="app-wrapper">
      {/* Premium Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo highlight-glow-inline">AgentStudio</div>
          <div className="brand-texts">
            <h1 className="brand-title">AgentStudio Workspace</h1>
            <p className="brand-subtitle text-muted">Production-Grade Multi-Agent Collaborative Environment</p>
          </div>
        </div>
        <nav className="header-nav">
          <button 
            onClick={() => setActiveTab('agent')} 
            className={`nav-item ${activeTab === 'agent' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            Agent Team
          </button>
          <button 
            onClick={() => setActiveTab('prompt_test')} 
            className={`nav-item ${activeTab === 'prompt_test' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
            Prompt A/B Tester
          </button>
          <button 
            onClick={() => setActiveTab('dev_sdk')} 
            className={`nav-item ${activeTab === 'dev_sdk' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Developer SDKs
          </button>
          <button 
            onClick={() => setActiveTab('documents')} 
            className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            RAG Documents
          </button>
          <button 
            onClick={() => setActiveTab('ledger')} 
            className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Cost Ledger
          </button>
          <button 
            onClick={() => setActiveTab('r_console')} 
            className={`nav-item ${activeTab === 'r_console' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m7 8 3 3-3 3"/><path d="M12 14h4"/></svg>
            RAG Console
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat Memory
          </button>
          <button 
            onClick={() => setActiveTab('api')} 
            className={`nav-item ${activeTab === 'api' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><path d="M5 12h14"/><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            API Fetcher
          </button>
          <button 
            onClick={() => setActiveTab('optimizer')} 
            className={`nav-item ${activeTab === 'optimizer' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><path d="M3 3h18v18H3z"/><path d="M21 9H3M21 15H3M12 3v18"/></svg>
            Schema Optimizer
          </button>
          <button 
            onClick={() => setActiveTab('database')} 
            className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
            Mock DBs
          </button>
          <button 
            onClick={() => setActiveTab('playground')} 
            className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Playground
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-svg"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </button>
        </nav>
      </header>

      {/* Dynamic Status & Quick Guide Bar */}
      <div className="status-guide-bar">
        <div className="status-left">
          {useLiveLLM ? (
            <div className="mode-badge mode-live highlight-glow-inline">
              <span className="dot dot-live"></span>
              <strong>Live LLM Mode Active</strong>
              <span className="desc">({apiProvider === 'gemini' ? 'Gemini API' : 'GPT-4o-mini'})</span>
            </div>
          ) : (
            <div className="mode-badge mode-sim">
              <span className="dot dot-sim"></span>
              <strong>Simulation Mode Active</strong>
              <span className="desc">(No API Key required - Offline mode)</span>
            </div>
          )}
          <button onClick={() => setActiveTab('settings')} className="change-mode-link">
            Change mode in Settings ➜
          </button>
        </div>
        <button 
          onClick={() => setShowHelpGuide(prev => !prev)} 
          className={`guide-toggle-btn ${showHelpGuide ? 'active' : ''}`}
        >
          {showHelpGuide ? '✕ Hide Quick Start Guide' : '❓ Quick Start Guide'}
        </button>
      </div>

      {showHelpGuide && (
        <div className="quick-help-guide fade-in">
          <h4 className="guide-header text-gradient">Welcome to AgentStudio Workspace! 🚀</h4>
          <p className="guide-intro text-muted">
            This collaborative workspace is designed to test how **TOON (Token-Oriented Object Notation)** can compress API payloads, saving up to 50% on LLM context windows. Here is a quick guide to what you can do:
          </p>
          <div className="guide-grid">
            <div className="guide-card" onClick={() => { setActiveTab('agent'); setShowHelpGuide(false); }}>
              <h5>🤖 Agent Team (Start Here)</h5>
              <p>Tune and run a 3-agent orchestration workflow (Planner ➔ Data Agent ➔ Analyst) with a sandboxed coding loop that automatically corrects its own syntax errors!</p>
            </div>
            <div className="guide-card" onClick={() => { setActiveTab('prompt_test'); setShowHelpGuide(false); }}>
              <h5>⚔️ Prompt A/B Tester</h5>
              <p>Benchmark two variant prompts side-by-side to compare latency (ms), token footprint, and transaction costs.</p>
            </div>
            <div className="guide-card" onClick={() => { setActiveTab('documents'); setShowHelpGuide(false); }}>
              <h5>📄 RAG Documents</h5>
              <p>Paste text files, build a local TF-IDF vector index, and run RAG document search query loops.</p>
            </div>
            <div className="guide-card" onClick={() => { setActiveTab('api'); setShowHelpGuide(false); }}>
              <h5>🔌 API Fetcher</h5>
              <p>Fetch real JSON data from public URL endpoints, serialize it to TOON tabular structure, and run queries.</p>
            </div>
            <div className="guide-card" onClick={() => { setActiveTab('optimizer'); setShowHelpGuide(false); }}>
              <h5>📐 Schema Optimizer</h5>
              <p>Detect nested arrays in your JSON structures and flatten them to increase TOON's compression ratio.</p>
            </div>
            <div className="guide-card" onClick={() => { setActiveTab('ledger'); setShowHelpGuide(false); }}>
              <h5>📊 Cost Ledger</h5>
              <p>Review the aggregate token savings dashboard tracking lifetime cost savings from using TOON vs JSON.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="app-main">
        {activeTab === 'agent' && (
          <div className="fade-in">
            <MultiAgentTeam
              customDbData={customData}
              onLogSaved={handleLogSaved}
              useLiveLLM={useLiveLLM}
              apiProvider={apiProvider}
              apiKey={apiKey}
            />
          </div>
        )}

        {activeTab === 'prompt_test' && (
          <div className="fade-in">
            <PromptPlayground
              useLiveLLM={useLiveLLM}
              apiProvider={apiProvider}
              apiKey={apiKey}
            />
          </div>
        )}

        {activeTab === 'dev_sdk' && (
          <div className="fade-in">
            <ExportPanel />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="fade-in">
            <DocumentManager />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="fade-in">
            <CostLedger
              logs={ledgerLogs}
              onClearLogs={handleClearLedger}
            />
          </div>
        )}

        {activeTab === 'r_console' && (
          <div className="agent-dashboard-layout fade-in">
            {/* Analytics Dashboard */}
            <Dashboard
              jsonText={jsonOutput}
              toonText={toonOutput}
              selectedModelName={pricingModel}
              onModelChange={setPricingModel}
            />
            
            {/* Agent terminal */}
            <AgentConsole
              query={query}
              onQueryChange={setQuery}
              onRunQuery={runAgentQuery}
              isLoading={isLoading}
              steps={steps}
              toonOutput={toonOutput}
              jsonOutput={jsonOutput}
              finalAnswer={finalAnswer}
              errorMessage={error}
            />

            {/* Quick suggestions */}
            <div className="suggestions-container">
              <h4 className="suggestions-title text-muted">Quick Demo Queries:</h4>
              <div className="suggestions-grid">
                <button 
                  onClick={() => handleSuggestionClick('orders', 'Find E-Commerce orders greater than 100')}
                  className="suggestion-card"
                >
                  <span className="s-table">Orders</span>
                  <span className="s-query">"Find orders total &gt; 100"</span>
                </button>
                <button 
                  onClick={() => handleSuggestionClick('logs', 'Find logs with level error')}
                  className="suggestion-card"
                >
                  <span className="s-table">Server Logs</span>
                  <span className="s-query">"Find logs with level error"</span>
                </button>
                <button 
                  onClick={() => handleSuggestionClick('tickets', 'billing tickets with negative sentiment')}
                  className="suggestion-card"
                >
                  <span className="s-table">Tickets</span>
                  <span className="s-query">"Billing tickets with negative sentiment"</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="fade-in">
            <AgentMemoryChat />
          </div>
        )}

        {activeTab === 'api' && (
          <div className="fade-in">
            <ApiRagAnalyzer
              useLiveLLM={useLiveLLM}
              apiProvider={apiProvider}
              apiKey={apiKey}
            />
          </div>
        )}

        {activeTab === 'optimizer' && (
          <div className="fade-in">
            <SchemaOptimizer />
          </div>
        )}

        {activeTab === 'database' && (
          <div className="fade-in">
            <DatabaseEditor
              selectedTable={selectedTable}
              onTableChange={setSelectedTable}
              customData={customData}
              onDataUpdate={handleDataUpdate}
              onResetData={handleResetData}
            />
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="fade-in">
            <Playground />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="fade-in">
            <Settings
              useLiveLLM={useLiveLLM}
              onUseLiveLLMChange={handleUseLiveLLMChange}
              apiProvider={apiProvider}
              onApiProviderChange={handleApiProviderChange}
              apiKey={apiKey}
              onApiKeyChange={handleApiKeyChange}
            />
          </div>
        )}
      </main>

      {/* Modern footer */}
      <footer className="app-footer">
        <p>Built as a showcase for Token-Oriented Object Notation (TOON) & AI Agent Optimization.</p>
      </footer>
    </div>
  );
}

export default App;
