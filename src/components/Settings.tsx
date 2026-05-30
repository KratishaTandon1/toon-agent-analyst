import React, { useState, useEffect } from 'react';

interface SettingsProps {
  useLiveLLM: boolean;
  onUseLiveLLMChange: (val: boolean) => void;
  apiProvider: 'gemini' | 'openai';
  onApiProviderChange: (provider: 'gemini' | 'openai') => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  useLiveLLM,
  onUseLiveLLMChange,
  apiProvider,
  onApiProviderChange,
  apiKey,
  onApiKeyChange,
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyInput(apiKey);
    }, 0);
    return () => clearTimeout(timer);
  }, [apiKey]);

  const handleSave = () => {
    onApiKeyChange(keyInput);
    alert('API key updated!');
  };

  const handleClear = () => {
    setKeyInput('');
    onApiKeyChange('');
    alert('API key cleared!');
  };

  return (
    <div className="settings-container">
      <h3 className="section-title">Agent Settings & LLM Configuration</h3>
      <p className="text-muted settings-desc">
        Configure how the AI agent runs. By default, it operates in a fully functional **Simulation Mode**. Enter your API key below to enable **Live LLM Analysis** sending TOON payloads directly to standard models.
      </p>

      <div className="settings-card">
        {/* Toggle Mode */}
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label font-bold">Execution Mode</span>
            <span className="setting-subinfo text-muted">
              Choose between simulated responses or live requests.
            </span>
          </div>
          <div className="setting-control">
            <button
              onClick={() => onUseLiveLLMChange(false)}
              className={`toggle-btn ${!useLiveLLM ? 'active-sim' : ''}`}
            >
              Simulated Mode
            </button>
            <button
              onClick={() => onUseLiveLLMChange(true)}
              className={`toggle-btn ${useLiveLLM ? 'active-live highlight-glow-inline' : ''}`}
            >
              Live LLM Mode
            </button>
          </div>
        </div>

        {useLiveLLM && (
          <div className="live-settings-section fade-in">
            {/* Provider Selection */}
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label font-bold">LLM API Provider</span>
                <span className="setting-subinfo text-muted">
                  Select which AI model API to query.
                </span>
              </div>
              <div className="setting-control">
                <select
                  value={apiProvider}
                  onChange={(e) => onApiProviderChange(e.target.value as 'gemini' | 'openai')}
                  className="premium-select"
                >
                  <option value="gemini">Gemini API (Google)</option>
                  <option value="openai">OpenAI API (GPT-4o-mini)</option>
                </select>
              </div>
            </div>

            {/* API Key Input */}
            <div className="setting-row-vertical">
              <div className="setting-info">
                <span className="setting-label font-bold">API Key Input</span>
                <span className="setting-subinfo text-muted">
                  Key is saved securely in your browser's local storage and is sent only to the provider endpoint.
                </span>
              </div>
              <div className="key-input-wrapper">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={
                    apiProvider === 'gemini' 
                      ? 'AIzaSy...' 
                      : 'sk-proj-...'
                  }
                  className="premium-input key-input"
                />
                <button onClick={handleSave} className="premium-btn save-btn">
                  Save Key
                </button>
                {apiKey && (
                  <button onClick={handleClear} className="premium-btn clear-btn">
                    Clear Key
                  </button>
                )}
              </div>
              {apiKey ? (
                <small className="text-green status-text font-bold">✓ API Key Configured & Enabled</small>
              ) : (
                <small className="text-red status-text font-bold">✗ Key required for Live LLM Mode</small>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="settings-notice">
        <h5>💡 What does the Agent do in Live LLM Mode?</h5>
        <p className="text-muted">
          When a query is run, the agent fetches database rows, serializes them to **TOON**, injects it into a system prompt that explains the TOON schema, and calls your selected provider API. This proves that LLMs can perfectly parse, aggregate, and reason over TOON-serialized payloads!
        </p>
      </div>
    </div>
  );
};
