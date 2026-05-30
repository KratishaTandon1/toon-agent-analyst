import React, { useState } from 'react';
import { callRealLLM } from '../utils/mockDatabase';
import { estimateTokens, calculateCost, formatCost } from '../utils/tokenizer';

const SAMPLE_PAYLOAD = `users[3]{id,name,role,status}:
  1,Alice Vance,admin,active
  2,Bob Miller,user,inactive
  3,Charlie Song,developer,active`;

interface PromptPlaygroundProps {
  useLiveLLM: boolean;
  apiProvider: 'gemini' | 'openai';
  apiKey: string;
}

export const PromptPlayground: React.FC<PromptPlaygroundProps> = ({
  useLiveLLM,
  apiProvider,
  apiKey
}) => {
  const [payloadText, setPayloadText] = useState(SAMPLE_PAYLOAD);
  const [promptA, setPromptA] = useState('Summarize these users in 2-3 short bullet points. Be concise.');
  const [promptB, setPromptB] = useState('Write a detailed paragraph explaining who is active and what their roles are. Be descriptive.');
  
  // Results states
  const [isRunning, setIsRunning] = useState(false);
  const [resultA, setResultA] = useState('');
  const [resultB, setResultB] = useState('');
  const [timeA, setTimeA] = useState(0);
  const [timeB, setTimeB] = useState(0);
  const [tokensA, setTokensA] = useState(0);
  const [tokensB, setTokensB] = useState(0);

  const handleABTest = async () => {
    setIsRunning(true);
    setResultA('');
    setResultB('');
    
    const useLive = useLiveLLM;
    const provider = apiProvider;
    const key = apiKey;

    try {
      if (useLive && key) {
        // Run Prompt A
        const startA = performance.now();
        const responseA = await callRealLLM(provider, key, promptA, payloadText);
        const endA = performance.now();
        
        setTimeA(Math.round(endA - startA));
        setResultA(responseA);
        setTokensA(estimateTokens(responseA, 'cl100k_base'));

        // Run Prompt B
        const startB = performance.now();
        const responseB = await callRealLLM(provider, key, promptB, payloadText);
        const endB = performance.now();
        
        setTimeB(Math.round(endB - startB));
        setResultB(responseB);
        setTokensB(estimateTokens(responseB, 'cl100k_base'));
      } else {
        // Simulated runs
        const startA = performance.now();
        await new Promise(resolve => setTimeout(resolve, 800));
        const endA = performance.now();
        setTimeA(Math.round(endA - startA) + 120);
        const resA = `• Alice Vance: Active Admin
• Bob Miller: Inactive User
• Charlie Song: Active Developer`;
        setResultA(resA);
        setTokensA(estimateTokens(resA, 'cl100k_base'));

        const startB = performance.now();
        await new Promise(resolve => setTimeout(resolve, 1400));
        const endB = performance.now();
        setTimeB(Math.round(endB - startB) + 150);
        const resB = `Based on the provided user roster, we have two active employees and one inactive user. Alice Vance serves in the administrative role and is currently active. Charlie Song is an active developer on the team. Meanwhile, Bob Miller is registered as a standard user but is currently inactive in the database logs.`;
        setResultB(resB);
        setTokensB(estimateTokens(resB, 'cl100k_base'));
      }
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      alert(`A/B Test failed: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="prompt-playground-container fade-in">
      <h3 className="section-title">A/B Prompt Engineering Playground</h3>
      <p className="text-muted memory-desc">
        Compare how different system prompts affect model outputs, latencies (response speed), and token footprints using the same TOON database payload.
      </p>

      <div className="playground-split-grid">
        {/* Prompts Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="setting-row-vertical" style={{ gap: '0.4rem' }}>
            <label className="font-bold" style={{ fontSize: '0.8rem' }}>System Prompt A (Variant A):</label>
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              className="editor-textarea"
              rows={3}
              placeholder="e.g. Output details in bullet points..."
              disabled={isRunning}
            />
          </div>

          <div className="setting-row-vertical" style={{ gap: '0.4rem' }}>
            <label className="font-bold" style={{ fontSize: '0.8rem' }}>System Prompt B (Variant B):</label>
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              className="editor-textarea"
              rows={3}
              placeholder="e.g. Write a detailed analysis paragraph..."
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Payload Context */}
        <div className="setting-row-vertical" style={{ gap: '0.4rem' }}>
          <label className="font-bold" style={{ fontSize: '0.8rem' }}>TOON Payload Context (Shared):</label>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="editor-textarea font-mono text-green bg-darker"
            rows={8}
            placeholder="Paste database TOON payload here..."
            disabled={isRunning}
          />
        </div>
      </div>

      <button
        onClick={handleABTest}
        className="premium-btn highlight-glow-inline"
        disabled={isRunning || !promptA || !promptB}
        style={{ marginBottom: '1.5rem' }}
      >
        {isRunning ? 'Executing Prompt A/B Test...' : 'Run Prompt A/B Test'}
      </button>

      {/* Comparisons */}
      {(resultA || resultB || isRunning) && (
        <div className="playground-grid fade-in">
          {/* Output A */}
          <div className="terminal-box" style={{ height: '360px' }}>
            <div className="terminal-header">
              <span className="terminal-title">Output Variant A</span>
              {resultA && (
                <span className="text-green font-mono" style={{ fontSize: '0.7rem' }}>
                  ⚡ {timeA}ms | {tokensA} tokens | {formatCost(calculateCost(tokensA, 0.15))}
                </span>
              )}
            </div>
            <div className="terminal-body bg-darker" style={{ fontSize: '0.8rem', padding: '1.25rem' }}>
              {isRunning && !resultA ? (
                <div className="blink">Awaiting completion A...</div>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{resultA}</p>
              )}
            </div>
          </div>

          {/* Output B */}
          <div className="terminal-box" style={{ height: '360px' }}>
            <div className="terminal-header">
              <span className="terminal-title">Output Variant B</span>
              {resultB && (
                <span className="text-green font-mono" style={{ fontSize: '0.7rem' }}>
                  ⚡ {timeB}ms | {tokensB} tokens | {formatCost(calculateCost(tokensB, 0.15))}
                </span>
              )}
            </div>
            <div className="terminal-body bg-darker" style={{ fontSize: '0.8rem', padding: '1.25rem' }}>
              {isRunning && !resultB ? (
                <div className="blink">Awaiting completion B...</div>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{resultB}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
