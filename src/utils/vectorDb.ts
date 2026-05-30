/**
 * Client-Side Vector/Search Indexer
 * Chunks documents and provides term-matching relevance search.
 */

import { estimateTokens } from './tokenizer';

export interface DocumentChunk {
  id: string;
  fileName: string;
  text: string;
  tokens: number;
}

// Global in-memory storage of indexed chunks
let indexedChunks: DocumentChunk[] = [];

// Stop words to filter out for term matching
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'wasnt', 'we', 'were', 'werent', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'you',
  'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Chunks text and adds it to the search index
 */
export function indexDocument(fileName: string, text: string): DocumentChunk[] {
  if (!text) return [];
  
  // Clean paragraphs
  const rawParagraphs = text.split(/\n\s*\n/);
  const newChunks: DocumentChunk[] = [];
  
  let chunkCount = 0;
  rawParagraphs.forEach(p => {
    const trimmed = p.trim();
    if (trimmed.length < 15) return; // skip empty or tiny lines
    
    // If paragraph is very large, split it further by sentences
    if (trimmed.length > 600) {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      let currentGroup = '';
      
      sentences.forEach(s => {
        if ((currentGroup + s).length > 500) {
          if (currentGroup.trim()) {
            chunkCount++;
            newChunks.push({
              id: `${fileName}-chunk-${chunkCount}`,
              fileName,
              text: currentGroup.trim(),
              tokens: estimateTokens(currentGroup.trim(), 'cl100k_base')
            });
          }
          currentGroup = s;
        } else {
          currentGroup += s;
        }
      });
      
      if (currentGroup.trim()) {
        chunkCount++;
        newChunks.push({
          id: `${fileName}-chunk-${chunkCount}`,
          fileName,
          text: currentGroup.trim(),
          tokens: estimateTokens(currentGroup.trim(), 'cl100k_base')
        });
      }
    } else {
      chunkCount++;
      newChunks.push({
        id: `${fileName}-chunk-${chunkCount}`,
        fileName,
        text: trimmed,
        tokens: estimateTokens(trimmed, 'cl100k_base')
      });
    }
  });

  // Append to our active index
  indexedChunks = [...indexedChunks, ...newChunks];
  return newChunks;
}

/**
 * Reset document index
 */
export function clearIndex() {
  indexedChunks = [];
}

/**
 * Get all active indexed chunks
 */
export function getIndexedChunks(): DocumentChunk[] {
  return indexedChunks;
}

/**
 * Search the index using TF-based term relevance ranking
 */
export function searchChunks(query: string, limit = 4): DocumentChunk[] {
  if (!query || indexedChunks.length === 0) return [];
  
  // Parse query keywords
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
    
  if (keywords.length === 0) {
    // Fallback: search raw query strings
    const lowerQuery = query.toLowerCase();
    return indexedChunks
      .filter(c => c.text.toLowerCase().includes(lowerQuery))
      .slice(0, limit);
  }

  // Score each chunk
  const scored = indexedChunks.map(chunk => {
    let score = 0;
    const lowerText = chunk.text.toLowerCase();
    
    keywords.forEach(keyword => {
      // Basic term frequency score
      const occurrences = lowerText.split(keyword).length - 1;
      if (occurrences > 0) {
        score += occurrences * (1 + 1 / keyword.length); // Weight longer keyword matches slightly higher
      }
    });
    
    return { chunk, score };
  });

  // Sort and filter out zero-scores
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.chunk)
    .slice(0, limit);
}
