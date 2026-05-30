/**
 * High-Fidelity Multi-Model Token Estimator
 */

export type TokenizerProfile = 'o200k_base' | 'cl100k_base' | 'llama3' | 'gemini';

// Pricing definitions (Cost per 1M tokens)
export interface ModelPricing {
  id: TokenizerProfile;
  name: string;
  inputCostPer1M: number;
}

export const MODELS: ModelPricing[] = [
  { id: 'gemini', name: 'Gemini 1.5 Flash', inputCostPer1M: 0.075 },
  { id: 'o200k_base', name: 'GPT-4o (o200k_base)', inputCostPer1M: 5.00 },
  { id: 'cl100k_base', name: 'GPT-4 (cl100k_base)', inputCostPer1M: 30.00 },
  { id: 'llama3', name: 'Llama 3 (Tiktoken)', inputCostPer1M: 0.15 }
];

/**
 * Estimates token counts based on specific model tokenizer structures.
 */
export function estimateTokens(text: string, profile: TokenizerProfile = 'cl100k_base'): number {
  if (!text) return 0;

  let tokens = 0;
  
  if (profile === 'o200k_base') {
    // o200k_base: Large vocab (200k), merges character bigrams, groups whitespace up to 8 spaces, merges punctuation clusters.
    const regex = /[a-zA-Z0-9_]+|\s+|[^\w\s]+/g;
    const matches = text.match(regex);
    if (!matches) return 0;
    
    matches.forEach(m => {
      if (m.trim() === '') {
        // Groups spaces: up to 8 spaces is 1 token
        tokens += Math.ceil(m.length / 8);
      } else if (/^[^\w\s]+$/.test(m)) {
        // Groups punctuation: every 3 punctuation chars is 1 token
        tokens += Math.ceil(m.length / 3);
      } else {
        // Words: larger vocab means average of 4.2 characters per token
        tokens += Math.max(1, Math.ceil(m.length / 4.2));
      }
    });
  } 
  
  else if (profile === 'cl100k_base') {
    // cl100k_base: Standard GPT-4 BPE, 100k vocab. Individual punctuation symbols, groups spaces up to 4.
    const regex = /[a-zA-Z0-9_]+|\s+|[^\w\s]/g;
    const matches = text.match(regex);
    if (!matches) return 0;
    
    matches.forEach(m => {
      if (m.trim() === '') {
        // up to 4 spaces is 1 token
        tokens += Math.ceil(m.length / 4);
      } else if (/^[^\w\s]$/.test(m)) {
        // Individual punctuation is 1 token
        tokens += 1;
      } else {
        // Words: average of 3.8 characters per token
        tokens += Math.max(1, Math.ceil(m.length / 3.8));
      }
    });
  } 
  
  else if (profile === 'llama3') {
    // Llama 3: 128k vocab, groups whitespaces up to 6 spaces, merges numbers, punctuation counts separate.
    const regex = /[a-zA-Z0-9_]+|\s+|[^\w\s]/g;
    const matches = text.match(regex);
    if (!matches) return 0;
    
    matches.forEach(m => {
      if (m.trim() === '') {
        tokens += Math.ceil(m.length / 6);
      } else if (/^[^\w\s]$/.test(m)) {
        tokens += 1;
      } else {
        // Llama 3 is slightly more compressed than cl100k
        tokens += Math.max(1, Math.ceil(m.length / 4.0));
      }
    });
  } 
  
  else {
    // Gemini: SentencePiece model. Space prefix rule (spaces are attached to words as `_`).
    // Punctuation is separated, and rare symbols are split into bytes (1 token per character).
    const regex = /[a-zA-Z0-9_]+|\s+|[^\w\s]/g;
    const matches = text.match(regex);
    if (!matches) return 0;
    
    matches.forEach(m => {
      if (m.trim() === '') {
        // SentencePiece wraps spaces with the next token. If standalone, it's roughly 1 token per 3 spaces
        tokens += Math.ceil(m.length / 3);
      } else if (/^[^\w\s]$/.test(m)) {
        tokens += 1;
      } else {
        // Words: SentencePiece is slightly less compressed for English on average (3.5 chars/token)
        tokens += Math.max(1, Math.ceil(m.length / 3.5));
      }
    });
  }
  
  return tokens;
}

export function calculateCost(tokens: number, ratePer1M: number): number {
  return (tokens / 1000000) * ratePer1M;
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.00001) return `$${cost.toFixed(8)}`;
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}
