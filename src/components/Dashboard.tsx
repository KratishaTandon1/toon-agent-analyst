import React from 'react';
import { MODELS, estimateTokens, calculateCost, formatCost } from '../utils/tokenizer';

interface DashboardProps {
  jsonText: string;
  toonText: string;
  selectedModelName: string;
  onModelChange: (name: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  jsonText,
  toonText,
  selectedModelName,
  onModelChange,
}) => {
  // If no text, provide default counts
  const hasContent = !!jsonText || !!toonText;
  
  // Benchmark stats for all 4 profiles
  const benchmarks = MODELS.map(model => {
    const jsonTokens = hasContent ? estimateTokens(jsonText, model.id) : 0;
    const toonTokens = hasContent ? estimateTokens(toonText, model.id) : 0;
    const tokensSaved = Math.max(0, jsonTokens - toonTokens);
    const savingsPercent = jsonTokens > 0 ? (tokensSaved / jsonTokens) * 100 : 0;
    
    const jsonCost = calculateCost(jsonTokens, model.inputCostPer1M);
    const toonCost = calculateCost(toonTokens, model.inputCostPer1M);
    const costSaved = Math.max(0, jsonCost - toonCost);
    
    return {
      ...model,
      jsonTokens,
      toonTokens,
      tokensSaved,
      savingsPercent,
      jsonCost,
      toonCost,
      costSaved
    };
  });

  const selectedBenchmark = benchmarks.find(b => b.name === selectedModelName) || benchmarks[0];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h3 className="section-title">Tokenizer Savings & Cost Analyzer</h3>
        <div className="model-selector-wrapper">
          <label htmlFor="model-select">Active Model Rate:</label>
          <select 
            id="model-select"
            value={selectedModelName}
            onChange={(e) => onModelChange(e.target.value)}
            className="premium-select"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.name}>{m.name} (${m.inputCostPer1M}/1M)</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Prime metrics cards for active selected model */}
      <div className="metrics-grid">
        <div className="metric-card token-card highlight-glow">
          <div className="metric-label">Token Footprint Saved</div>
          <div className="metric-value text-gradient">
            {selectedBenchmark.savingsPercent.toFixed(1)}%
          </div>
          <div className="metric-subtext">
            Compacted {selectedBenchmark.tokensSaved.toLocaleString()} tokens
          </div>
        </div>
        
        <div className="metric-card json-card">
          <div className="metric-label">JSON Token Size</div>
          <div className="metric-value text-red">
            {selectedBenchmark.jsonTokens.toLocaleString()}
          </div>
          <div className="metric-subtext">
            Cost: {formatCost(selectedBenchmark.jsonCost)}
          </div>
        </div>
        
        <div className="metric-card toon-card">
          <div className="metric-label">TOON Token Size</div>
          <div className="metric-value text-green">
            {selectedBenchmark.toonTokens.toLocaleString()}
          </div>
          <div className="metric-subtext">
            Cost: {formatCost(selectedBenchmark.toonCost)}
          </div>
        </div>
        
        <div className="metric-card saving-cost-card">
          <div className="metric-label">Financial Savings</div>
          <div className="metric-value text-emerald">
            {formatCost(selectedBenchmark.costSaved)}
          </div>
          <div className="metric-subtext">
            Per payload execution
          </div>
        </div>
      </div>
      
      {/* Benchmark Grid comparing tokenizer algorithms */}
      <div className="chart-section">
        <h4 className="chart-title">Cross-Model Tokenizer Benchmark</h4>
        <div className="benchmark-rows">
          {benchmarks.map(b => (
            <div key={b.id} className="benchmark-comparison-row">
              <div className="benchmark-meta">
                <span className="b-name font-bold">{b.name}</span>
                <span className="b-savings text-green">{b.savingsPercent.toFixed(1)}% Saved</span>
              </div>
              <div className="benchmark-bar-wrapper">
                {/* JSON bar */}
                <div className="b-bar-pair">
                  <span className="b-bar-lbl text-red font-mono">JSON</span>
                  <div className="b-bar-bg">
                    <div 
                      className="b-bar b-json-color"
                      style={{ width: b.jsonTokens > 0 ? '100%' : '15%' }}
                    >
                      {b.jsonTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
                {/* TOON bar */}
                <div className="b-bar-pair">
                  <span className="b-bar-lbl text-green font-mono">TOON</span>
                  <div className="b-bar-bg">
                    <div 
                      className="b-bar b-toon-color"
                      style={{ 
                        width: b.jsonTokens > 0 ? `${(b.toonTokens / b.jsonTokens) * 100}%` : '5%',
                        minWidth: '5%'
                      }}
                    >
                      {b.toonTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
