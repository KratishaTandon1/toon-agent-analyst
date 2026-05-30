import React, { useState, useEffect } from 'react';
import { indexDocument, getIndexedChunks, clearIndex } from '../utils/vectorDb';
import type { DocumentChunk } from '../utils/vectorDb';

export const DocumentManager: React.FC = () => {
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [activeChunks, setActiveChunks] = useState<DocumentChunk[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch index on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveChunks(getIndexedChunks());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleIndexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (docTitle.trim() === '' || docContent.trim() === '') return;
    
    setIsIndexing(true);
    setSuccessMsg('');
    
    setTimeout(() => {
      const added = indexDocument(docTitle.trim(), docContent.trim());
      setActiveChunks(getIndexedChunks());
      setSuccessMsg(`Successfully indexed "${docTitle.trim()}" into ${added.length} chunks!`);
      setDocTitle('');
      setDocContent('');
      setIsIndexing(false);
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDocTitle(file.name);
      setDocContent(text);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear the entire RAG document index?')) {
      clearIndex();
      setActiveChunks([]);
      setSuccessMsg('Index cleared successfully.');
    }
  };

  const loadExampleDoc = () => {
    setDocTitle('TOON_Specification.txt');
    setDocContent(`TOON (Token-Oriented Object Notation) Specification
Version 1.0.0

TOON is a compact, line-oriented, schema-aware data serialization format designed specifically to optimize prompt space in Large Language Model (LLM) environments.

Features:
1. Object representations remove quotation marks around keys and values, and substitute nested curly braces with double-space indentation.
2. Uniform arrays containing objects that share identical keys are formatted as tabular arrays: users[2]{id,name,role}: followed by values on subsequent lines, separated by commas.
3. This eliminates the duplicate JSON key syntax penalty and standard quotes, shrinking data payloads by 30% to 60% on average.
4. Developers run TOON on their backend prompts as a lossless transportation layer, converting back to JSON inside internal APIs.`);
  };

  // Group chunks by file name
  const filesMap = activeChunks.reduce((acc, c) => {
    acc[c.fileName] = (acc[c.fileName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="doc-manager-container fade-in">
      <div className="memory-header-row">
        <h3 className="section-title">Client-Side RAG Document Manager</h3>
        {activeChunks.length > 0 && (
          <button onClick={handleReset} className="premium-btn reset-btn">
            Clear Document Index
          </button>
        )}
      </div>
      
      <p className="text-muted memory-desc">
        Upload or paste text documents (e.g. system specifications, guides, or logs). The indexer splits the text into paragraph chunks. When you query the Agent Team under the "RAG Document Index" table, the Planner pulls matches and serializes them to TOON.
      </p>

      {successMsg && (
        <div className="error-banner" style={{ backgroundColor: 'var(--color-green-bg)', borderColor: 'var(--color-green-glow)', color: 'var(--color-green)', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      <div className="memory-grid">
        {/* Indexing Panel */}
        <form onSubmit={handleIndexSubmit} className="chat-panel" style={{ height: 'auto', padding: '1.25rem', gap: '1rem' }}>
          <div className="panel-header" style={{ marginBottom: '0.5rem' }}>Upload or Paste Document</div>
          
          <div className="setting-row-vertical" style={{ gap: '0.4rem' }}>
            <label className="font-bold" style={{ fontSize: '0.8rem' }}>File Name / Document Title:</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. prompt_templates.md"
              className="premium-input"
              required
            />
          </div>

          <div className="setting-row-vertical" style={{ gap: '0.4rem' }}>
            <label className="font-bold" style={{ fontSize: '0.8rem' }}>Document Text / Markdown Content:</label>
            <textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Paste text contents here..."
              className="editor-textarea"
              rows={8}
              required
            />
          </div>

          <div className="db-actions" style={{ justifyContent: 'space-between', width: '100%', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label className="premium-btn tag-btn" style={{ cursor: 'pointer' }}>
                📂 Choose Text File
                <input 
                  type="file" 
                  accept=".txt,.md,.json,.html" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
              <button 
                type="button" 
                onClick={loadExampleDoc} 
                className="premium-btn tag-btn"
              >
                💡 Load Example Specification
              </button>
            </div>
            
            <button 
              type="submit" 
              className="premium-btn highlight-glow-inline"
              disabled={isIndexing || !docTitle.trim() || !docContent.trim()}
            >
              {isIndexing ? 'Chunking & Indexing...' : 'Index Document'}
            </button>
          </div>
        </form>

        {/* Index Status Panel */}
        <div className="memory-panel" style={{ height: 'auto', maxHeight: '520px', padding: '1.25rem', gap: '1rem' }}>
          <div className="panel-header">Active Index Status</div>
          
          <div className="index-metrics" style={{ display: 'flex', gap: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
            <div>
              <span className="text-muted">Indexed Files: </span>
              <strong className="text-gradient">{Object.keys(filesMap).length}</strong>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1.5rem' }}>
              <span className="text-muted">Total Chunks: </span>
              <strong className="text-gradient">{activeChunks.length}</strong>
            </div>
          </div>

          {activeChunks.length === 0 ? (
            <div className="terminal-placeholder" style={{ margin: '1rem 0' }}>
              &gt; RAG search index is currently empty. Upload a file or load the example specification on the left to start.
            </div>
          ) : (
            <div className="chunks-list" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, maxHeight: '340px' }}>
              <span className="font-bold" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--brand-primary)', letterSpacing: '0.05em' }}>Indexed Document Segments:</span>
              {activeChunks.map((chunk, idx) => (
                <div key={chunk.id} style={{ border: '1px solid rgba(255,255,255,0.04)', padding: '0.65rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', opacity: 0.7 }}>
                    <span className="font-bold">{chunk.fileName} (Chunk #{idx + 1})</span>
                    <span className="font-mono text-green">{chunk.tokens} tokens</span>
                  </div>
                  <p style={{ opacity: 0.95, lineBreak: 'anywhere' }}>"{chunk.text.substring(0, 150)}..."</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
