import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsonToToon } from '../utils/toonConverter';
import { estimateTokens } from '../utils/tokenizer';
import { callRealLLM } from '../utils/mockDatabase';

interface ApiRagAnalyzerProps {
  useLiveLLM: boolean;
  apiProvider: 'gemini' | 'openai';
  apiKey: string;
}

export const ApiRagAnalyzer: React.FC<ApiRagAnalyzerProps> = ({
  useLiveLLM,
  apiProvider,
  apiKey
}) => {
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/users');
  const [fetchedData, setFetchedData] = useState<unknown[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Query states
  const [query, setQuery] = useState('Summarize the contact details and companies of these users');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Token Metrics
  const [jsonTokens, setJsonTokens] = useState(0);
  const [toonTokens, setToonTokens] = useState(0);

  // Fetch the external API
  const handleFetch = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    setFetchedData([]);
    setAnalysisResult('');
    setAnalysisError(null);
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch API: HTTP ${response.status}`);
      }
      const data = await response.json() as unknown;
      
      let dataArray: unknown[] = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data && typeof data === 'object') {
        const dataObj = data as Record<string, unknown>;
        // If it's a nested object with arrays, try to extract it
        const firstArrayKey = Object.keys(dataObj).find(k => Array.isArray(dataObj[k]));
        if (firstArrayKey) {
          dataArray = dataObj[firstArrayKey] as unknown[];
        } else {
          // Just make it a single object array
          dataArray = [dataObj];
        }
      }
      
      // Limit to 10 items to prevent flooding prompt contexts during demos
      const sliced = dataArray.slice(0, 10);
      setFetchedData(sliced);
      
      // Calculate token metrics
      const jsonStr = JSON.stringify(sliced, null, 2);
      const toonStr = jsonToToon(sliced);
      
      setJsonTokens(estimateTokens(jsonStr, 'cl100k_base'));
      setToonTokens(estimateTokens(toonStr, 'cl100k_base'));
      
    } catch (err: unknown) {
      console.error(err);
      const e = err instanceof Error ? err : new Error(String(err));
      setFetchError(e.message || 'Failed to fetch the URL. Make sure it supports CORS.');
    } finally {
      setIsFetching(false);
    }
  }, [apiUrl]);

  const initialRunRef = useRef(false);
  // Pre-load default data on mount
  useEffect(() => {
    if (!initialRunRef.current) {
      initialRunRef.current = true;
      const timer = setTimeout(() => {
        handleFetch();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [handleFetch]);

  // Run RAG analysis over fetched data
  const handleAnalyze = async () => {
    if (fetchedData.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult('');

    const toonStr = jsonToToon(fetchedData);
    
    // Check if key is available in localStorage
    const useLive = useLiveLLM;
    const provider = apiProvider;
    const key = apiKey;

    try {
      if (useLive && key) {
        // Real LLM call
        const systemPrompt = `You are a professional REST API Analysis Agent.
Analyze the following fetched data, which is formatted in TOON (Token-Oriented Object Notation) to reduce token count.
Address the user's inquiry: "${query}". Keep the answer highly informative and quantitative.`;
        
        const response = await callRealLLM(provider, key, systemPrompt, toonStr);
        setAnalysisResult(response);
      } else {
        // Simulated response based on json data contents
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let answer = '';
        if (apiUrl.includes('users')) {
          answer = `[Simulation Output] I analyzed the ${fetchedData.length} records retrieved from the users API. Here is the summary:
1. Leanne Graham works at Romaguera-Crona. Contact: Sincere@april.biz
2. Ervin Howell works at Deckow-Crist. Contact: Shanna@melissa.tv
3. Clementine Bauch works at Romaguera-Jacobson. Contact: Nathan@yesenia.net
The dataset was compressed into TOON format, saving ${jsonTokens - toonTokens} tokens (${((jsonTokens - toonTokens)/jsonTokens*100).toFixed(0)}% context reduction).`;
        } else {
          answer = `[Simulation Output] Analysed ${fetchedData.length} entries from the live API feed. The records have been successfully converted into TOON tabular format (Size: ${toonTokens} tokens vs JSON: ${jsonTokens} tokens). The agent resolved your query: "${query}" using standard field filtering and object mapping. Setup an API key in settings to query real models!`;
        }
        setAnalysisResult(answer);
      }
    } catch (err: unknown) {
      console.error(err);
      const e = err instanceof Error ? err : new Error(String(err));
      setAnalysisError(e.message || 'RAG analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const savings = jsonTokens > 0 ? ((jsonTokens - toonTokens) / jsonTokens) * 100 : 0;

  return (
    <div className="api-rag-container fade-in">
      <h3 className="section-title">Live REST API Fetch & RAG Analyzer</h3>
      <p className="text-muted api-desc">
        Load your own REST API data directly from the web, compress it to TOON, and run natural language queries over the payload.
      </p>

      {/* Fetch Bar */}
      <div className="query-bar">
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="Enter a public JSON API URL (e.g. JSONPlaceholder, GitHub API, etc.)..."
          className="premium-input"
          disabled={isFetching || isAnalyzing}
        />
        <button 
          onClick={handleFetch} 
          className="premium-btn run-btn"
          disabled={isFetching || isAnalyzing || apiUrl.trim() === ''}
        >
          {isFetching ? 'Fetching...' : 'Fetch API'}
        </button>
      </div>

      {fetchError && (
        <div className="error-banner">
          <strong>Fetch Error: </strong> {fetchError} (Make sure the API supports CORS requests).
        </div>
      )}

      {fetchedData.length > 0 && (
        <div className="api-layout fade-in">
          {/* Compression stats for live fetch */}
          <div className="playground-stats-bar">
            <div className="stat-item">
              <span className="stat-lbl">Live JSON Size</span>
              <strong className="text-red">{jsonTokens} tokens</strong>
            </div>
            <div className="stat-item border-left">
              <span className="stat-lbl">Live TOON Size</span>
              <strong className="text-green">{toonTokens} tokens</strong>
            </div>
            <div className="stat-item border-left highlight-glow-inline">
              <span className="stat-lbl">Context Saving</span>
              <strong className="text-emerald">{savings.toFixed(1)}% Saved</strong>
            </div>
          </div>

          <div className="api-panels-grid">
            {/* TOON view */}
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-title">TOON Compact Payload</span>
              </div>
              <div className="terminal-body font-mono bg-darker text-green">
                <pre className="code-view">
                  {jsonToToon(fetchedData)}
                </pre>
              </div>
            </div>

            {/* Analysis console */}
            <div className="analysis-console-panel">
              <h4 className="font-bold text-gradient" style={{ marginBottom: '0.5rem' }}>Query the Live API Payload:</h4>
              <div className="analysis-query-box">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about this data..."
                  className="premium-input"
                  disabled={isAnalyzing}
                />
                <button
                  onClick={handleAnalyze}
                  className="premium-btn highlight-glow-inline"
                  disabled={isAnalyzing || query.trim() === ''}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Ask Agent'}
                </button>
              </div>

              {analysisError && (
                <div className="error-banner" style={{ marginTop: '1rem' }}>
                  <strong>Analysis Error: </strong> {analysisError}
                </div>
              )}

              {analysisResult && (
                <div className="agent-result-box highlight-glow fade-in" style={{ marginTop: '1rem' }}>
                  <h5 className="result-title text-gradient">Agent Live Synthesis:</h5>
                  <p className="result-content" style={{ fontSize: '0.85rem' }}>{analysisResult}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
