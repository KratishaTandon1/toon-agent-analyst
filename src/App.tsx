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
            Agent Team
          </button>
          <button 
            onClick={() => setActiveTab('prompt_test')} 
            className={`nav-item ${activeTab === 'prompt_test' ? 'active' : ''}`}
          >
            Prompt A/B Tester
          </button>
          <button 
            onClick={() => setActiveTab('dev_sdk')} 
            className={`nav-item ${activeTab === 'dev_sdk' ? 'active' : ''}`}
          >
            Developer SDKs
          </button>
          <button 
            onClick={() => setActiveTab('documents')} 
            className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
          >
            RAG Documents
          </button>
          <button 
            onClick={() => setActiveTab('ledger')} 
            className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            Cost Ledger
          </button>
          <button 
            onClick={() => setActiveTab('r_console')} 
            className={`nav-item ${activeTab === 'r_console' ? 'active' : ''}`}
          >
            RAG Console
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          >
            Chat Memory
          </button>
          <button 
            onClick={() => setActiveTab('api')} 
            className={`nav-item ${activeTab === 'api' ? 'active' : ''}`}
          >
            API Fetcher
          </button>
          <button 
            onClick={() => setActiveTab('optimizer')} 
            className={`nav-item ${activeTab === 'optimizer' ? 'active' : ''}`}
          >
            Schema Optimizer
          </button>
          <button 
            onClick={() => setActiveTab('database')} 
            className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
          >
            Mock DBs
          </button>
          <button 
            onClick={() => setActiveTab('playground')} 
            className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`}
          >
            Playground
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            Settings
          </button>
        </nav>
      </header>

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
