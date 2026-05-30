import React, { useState, useEffect } from 'react';
import { DATASETS } from '../utils/mockDatabase';

interface DatabaseEditorProps {
  selectedTable: string;
  onTableChange: (id: string) => void;
  customData: Record<string, unknown[]>;
  onDataUpdate: (id: string, updatedData: unknown[]) => void;
  onResetData: () => void;
}

export const DatabaseEditor: React.FC<DatabaseEditorProps> = ({
  selectedTable,
  onTableChange,
  customData,
  onDataUpdate,
  onResetData,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Set current JSON text when table or customData changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const data = customData[selectedTable] || [];
      setJsonText(JSON.stringify(data, null, 2));
      setError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedTable, customData]);

  const handleTextChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        setError('Data must be a valid JSON array of objects.');
        return;
      }
      const allObjects = parsed.every(item => item && typeof item === 'object' && !Array.isArray(item));
      if (!allObjects) {
        setError('Every item in the array must be an object (tabular format).');
        return;
      }
      
      setError(null);
      onDataUpdate(selectedTable, parsed);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(`Invalid JSON syntax: ${e.message}`);
    }
  };

  return (
    <div className="db-editor-container">
      <div className="db-editor-header">
        <h3 className="section-title">Mock Database Tables</h3>
        <div className="db-actions">
          <select
            value={selectedTable}
            onChange={(e) => onTableChange(e.target.value)}
            className="premium-select"
          >
            {Object.values(DATASETS).map(tbl => (
              <option key={tbl.id} value={tbl.id}>{tbl.name}</option>
            ))}
          </select>
          <button onClick={onResetData} className="premium-btn reset-btn">
            Reset to Default
          </button>
        </div>
      </div>
      
      <p className="db-description text-muted">
        {DATASETS[selectedTable]?.description || ''} Edit the JSON database rows below to see how it affects token savings and agent queries in real-time.
      </p>
      
      <div className="editor-wrapper">
        <div className="editor-labels">
          <span className="editor-label">Raw DB Table JSON</span>
          {error ? (
            <span className="error-badge">{error}</span>
          ) : (
            <span className="success-badge">✓ Valid Schema</span>
          )}
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`editor-textarea font-mono ${error ? 'border-error' : ''}`}
          rows={16}
          placeholder="Paste database JSON array of uniform objects here..."
        />
      </div>
      <div className="editor-footer">
        <small className="text-muted">
          Note: Keeping fields identical across rows enables TOON to compress them into highly dense tabular arrays!
        </small>
      </div>
    </div>
  );
};
