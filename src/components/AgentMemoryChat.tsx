import React, { useState, useRef, useEffect } from 'react';
import { estimateTokens } from '../utils/tokenizer';
import { jsonToToon } from '../utils/toonConverter';

interface ChatMessage {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  tokens: number;
}

interface Fact {
  topic: string;
  detail: string;
  importance: 'high' | 'medium' | 'low';
}

export const AgentMemoryChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: 'agent', text: "Hello! I am your Memory-Aware Assistant. As we talk, I maintain a short-term conversation thread. Watch the context thermometer above fill up!", tokens: 45 },
  ]);
  const [input, setInput] = useState('');
  const [facts, setFacts] = useState<Fact[]>([
    { topic: 'Core Role', detail: 'Agent is context-aware coordinator', importance: 'high' }
  ]);
  const [isCompressing, setIsCompressing] = useState(false);
  const msgIdRef = useRef(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Context calculations
  const CONTEXT_LIMIT = 1500;
  
  // Calculate total tokens in current short-term conversation
  const rawConversationText = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
  const rawMemoryText = jsonToToon(facts);
  
  const conversationTokens = estimateTokens(rawConversationText, 'cl100k_base');
  const memoryTokens = estimateTokens(rawMemoryText, 'cl100k_base');
  const totalTokens = conversationTokens + memoryTokens;
  
  const fillPercent = Math.min(100, (totalTokens / CONTEXT_LIMIT) * 100);

  const cleanTechnologyName = (rawTech: string): string => {
    const clean = rawTech.toLowerCase().trim();
    const TECH_MAP: Record<string, string> = {
      'react': 'React',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'python': 'Python',
      'node': 'Node.js',
      'express': 'Express',
      'fastapi': 'FastAPI',
      'c++': 'C++',
      'cpp': 'C++',
      'java': 'Java',
      'rust': 'Rust',
      'go': 'Go',
      'ruby': 'Ruby',
      'html': 'HTML',
      'css': 'CSS',
      'sql': 'SQL'
    };

    const matches: { key: string; index: number }[] = [];
    for (const key of Object.keys(TECH_MAP)) {
      const idx = clean.indexOf(key);
      if (idx !== -1) {
        matches.push({ key, index: idx });
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => {
        if (a.index !== b.index) {
          return a.index - b.index;
        }
        return b.key.length - a.key.length;
      });
      return TECH_MAP[matches[0].key];
    }

    const words = rawTech.trim().split(/\s+/).slice(0, 2).join(' ');
    return words.replace(/\b\w/g, c => c.toUpperCase());
  };

  const cleanLocationName = (rawLoc: string): string => {
    const clean = rawLoc.replace(/,/g, ' ').trim();
    const cutoffWords = ['currently', 'now', 'temporary', 'temporarily', 'lately', 'with', 'at', 'near', 'since', 'for'];
    let words = clean.split(/\s+/).filter(Boolean);
    
    const cutoffIdx = words.findIndex(w => cutoffWords.includes(w.toLowerCase()));
    if (cutoffIdx !== -1) {
      words = words.slice(0, cutoffIdx);
    }

    const filtered = words.slice(0, 2).join(' ');
    return filtered.replace(/\b\w/g, c => c.toUpperCase());
  };

  // Simulate Agent memory extraction logic
  const getSimulatedAgentResponse = (q: string): string => {
    const qLower = q.toLowerCase();
    
    // Match "I live in <Location>" or "I am from <Location>" or location matches
    const locationMatch = q.match(/(?:i\s+live\s+in|i\s+am\s+from|lives\s+in)\s+([a-zA-Z0-9,\s-]+)/i);
    if (locationMatch && locationMatch[1]) {
      const loc = cleanLocationName(locationMatch[1]);
      return `Interesting location context! I've noted that you are located in "${loc}" and added it to my long-term memory. Knowing your geography allows me to optimize server request routing.`;
    }

    // Match "My name is <Name>" or "I am <Name>"
    const nameMatch = q.match(/(?:my\s+name\s+is|i\s+am\s+called)\s+([a-zA-Z\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
      return `Nice to meet you, ${name}! I have updated your profile name in my long-term database memory.`;
    }

    if (qLower.includes('developer') || qLower.includes('role') || qLower.includes('job')) {
      return "Got it! I've logged your developer profile into my persistent memory vault. You are tuning the agent pipeline. I'll make sure future responses are more technical.";
    }
    
    if (qLower.includes('toon') || qLower.includes('token') || qLower.includes('notation')) {
      return "Indeed! TOON enables highly efficient data-passing. I've noted that in my memory. We will emphasize token savings in our work.";
    }
    
    // Match general technologies like React, Node, Python, Python/FastAPI, etc.
    const techMatch = q.match(/(?:i\s+use|i\s+develop\s+in|i\s+write|coding\s+in)\s+([a-zA-Z0-9/#.+\s]+)/i);
    if (techMatch && techMatch[1]) {
      const tech = cleanTechnologyName(techMatch[1]);
      return `Excellent technology choice! I've logged that you work with "${tech}". I'll align our pipeline logic with ${tech} templates.`;
    }
    
    return "Understood. I am tracking our statements and maintaining your profile statistics. Tell me more about your design philosophies or interests!";
  };

  const handleSend = () => {
    if (input.trim() === '') return;
    
    const userMsgText = input.trim();
    const userTokens = estimateTokens(`user: ${userMsgText}`, 'cl100k_base');
    msgIdRef.current += 1;
    const userMsg: ChatMessage = {
      id: msgIdRef.current,
      sender: 'user',
      text: userMsgText,
      tokens: userTokens
    };
    
    setInput('');
    setMessages(prev => [...prev, userMsg]);

    // Simulate Agent Thinking and Response
    setTimeout(() => {
      const agentText = getSimulatedAgentResponse(userMsgText);
      const agentTokens = estimateTokens(`agent: ${agentText}`, 'cl100k_base');
      msgIdRef.current += 1;
      const agentMsg: ChatMessage = {
        id: msgIdRef.current,
        sender: 'agent',
        text: agentText,
        tokens: agentTokens
      };
      setMessages(prev => [...prev, agentMsg]);
      
      // Auto-extract facts behind the scenes to show agent intelligence
      extractSimulatedFacts(userMsgText);
    }, 800);
  };

  const extractSimulatedFacts = (userText: string) => {
    const q = userText.toLowerCase();
    const newFacts: Fact[] = [];
    
    // Match location
    const locationMatch = userText.match(/(?:i\s+live\s+in|i\s+am\s+from|lives\s+in)\s+([a-zA-Z0-9,\s-]+)/i);
    if (locationMatch && locationMatch[1]) {
      const loc = cleanLocationName(locationMatch[1]);
      newFacts.push({ topic: 'Location', detail: `Lives in ${loc}`, importance: 'medium' });
    }

    // Match name
    const nameMatch = userText.match(/(?:my\s+name\s+is|i\s+am\s+called)\s+([a-zA-Z\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
      newFacts.push({ topic: 'User Profile', detail: `Name is ${name}`, importance: 'high' });
    }

    // Match generic tech stack
    const techMatch = userText.match(/(?:i\s+use|i\s+develop\s+in|i\s+write|coding\s+in)\s+([a-zA-Z0-9/#.+\s]+)/i);
    if (techMatch && techMatch[1]) {
      const tech = cleanTechnologyName(techMatch[1]);
      newFacts.push({ topic: 'Tech Stack', detail: `Uses ${tech}`, importance: 'high' });
    }

    // Fallbacks for keywords if no regex matches
    if (newFacts.every(f => f.topic !== 'Tech Stack')) {
      if (q.includes('react') || q.includes('typescript') || q.includes('code')) {
        newFacts.push({ topic: 'Tech Stack', detail: 'Uses React/TS', importance: 'high' });
      } else if (q.includes('express') || q.includes('node')) {
        newFacts.push({ topic: 'Tech Stack', detail: 'Prefers Node/Express', importance: 'medium' });
      } else if (q.includes('fastapi') || q.includes('python')) {
        newFacts.push({ topic: 'Tech Stack', detail: 'Prefers Python/FastAPI', importance: 'medium' });
      }
    }

    if (newFacts.every(f => f.topic !== 'Location')) {
      if (q.includes('seattle')) {
        newFacts.push({ topic: 'Location', detail: 'Lives in Seattle', importance: 'low' });
      } else if (q.includes('san francisco') || q.includes('sf')) {
        newFacts.push({ topic: 'Location', detail: 'Lives in San Francisco', importance: 'low' });
      } else if (q.includes('london')) {
        newFacts.push({ topic: 'Location', detail: 'Lives in London', importance: 'low' });
      }
    }

    if (q.includes('developer') || q.includes('role') || q.includes('job')) {
      newFacts.push({ topic: 'User Role', detail: 'User acts as Lead developer / agent system tuner', importance: 'high' });
    }
    
    if (q.includes('toon') || q.includes('token') || q.includes('notation')) {
      newFacts.push({ topic: 'Project Context', detail: 'System utilizes TOON for state serialization', importance: 'medium' });
    }

    if (newFacts.length > 0) {
      setFacts(prev => {
        // filter out duplicate topics
        const filtered = prev.filter(f => !newFacts.some(nf => nf.topic === f.topic));
        return [...filtered, ...newFacts];
      });
    }
  };

  // Perform Memory Sweep and Serialization into TOON
  const compressMemory = () => {
    setIsCompressing(true);
    
    setTimeout(() => {
      // 1. Condense short term chat history. Keep only the last turn.
      const lastTurn = messages.slice(-2);
      
      // 2. Add structural facts summarizing what was said in intermediate steps
      setFacts(prev => {
        const hasTech = prev.some(f => f.topic === 'Frontend Tech');
        const updated = [...prev];
        if (!hasTech && rawConversationText.toLowerCase().includes('react')) {
          updated.push({ topic: 'Frontend Tech', detail: 'Uses React & TypeScript', importance: 'high' });
        }
        return updated;
      });

      setMessages([
        { id: Date.now(), sender: 'agent', text: "⚡ [Memory Sweep Executed]: Context compressed! I archived our conversation history into a structured TOON memory block. Our context size has dropped.", tokens: 35 },
        ...lastTurn
      ]);
      
      setIsCompressing(false);
    }, 1200);
  };

  return (
    <div className="agent-memory-container fade-in">
      <div className="memory-header-row">
        <h3 className="section-title">Infinite Context Chat Sandbox</h3>
        <button 
          onClick={compressMemory} 
          className="premium-btn reset-btn highlight-glow-inline"
          disabled={isCompressing || messages.length <= 2}
        >
          {isCompressing ? 'Archiving Context...' : 'Compress Conversation History'}
        </button>
      </div>
      
      <p className="text-muted memory-desc">
        Simulate multi-turn chatbot conversation. As the conversation history accumulates, the context thermometer rises. Compress the history to serialize facts into a compact TOON memory schema.
      </p>

      {/* Context Thermometer */}
      <div className="thermometer-section">
        <div className="thermometer-labels">
          <span className="thermometer-title font-bold">Agent Context Window Consumption</span>
          <span className="thermometer-value font-mono">
            {totalTokens} / {CONTEXT_LIMIT} tokens ({fillPercent.toFixed(0)}%)
          </span>
        </div>
        <div className="thermometer-track">
          <div 
            className={`thermometer-bar ${fillPercent > 80 ? 'bg-danger' : fillPercent > 50 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${fillPercent}%` }}
          ></div>
        </div>
        <div className="thermometer-footer">
          <span className="text-muted">Short-Term Chat: {conversationTokens} tokens</span>
          <span className="text-muted">Long-Term Memory: {memoryTokens} tokens</span>
        </div>
      </div>

      <div className="memory-grid">
        {/* Chat window */}
        <div className="chat-panel">
          <div className="panel-header">Short-Term Conversation History</div>
          <div className="chat-messages-box">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}-wrapper`}>
                <div className={`chat-bubble ${msg.sender}-bubble`}>
                  <p>{msg.text}</p>
                  <small className="bubble-tokens font-mono">{msg.tokens} tokens</small>
                </div>
              </div>
            ))}
            {isCompressing && (
              <div className="chat-bubble-wrapper agent-wrapper blink">
                <div className="chat-bubble agent-bubble">
                  <p>Running memory compression pipeline...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-bar">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type about your tech stacks, location, e.g., 'I live in Seattle and write React'..."
              className="premium-input"
              disabled={isCompressing}
            />
            <button 
              onClick={handleSend} 
              className="premium-btn"
              disabled={isCompressing || input.trim() === ''}
            >
              Send
            </button>
          </div>
        </div>

        {/* Memory Panel */}
        <div className="memory-panel">
          <div className="panel-header text-green">Archived TOON Long-Term Memory</div>
          <div className="memory-content font-mono bg-darker text-green">
            <pre className="code-view">
              {jsonToToon(facts) || '# No facts compressed yet.'}
            </pre>
          </div>
          <div className="panel-desc">
            <p>
              * In database form, facts are saved as a tabular array where schema fields (`topic`, `detail`, `importance`) are declared only once. This keeps the long-term context highly compressed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
