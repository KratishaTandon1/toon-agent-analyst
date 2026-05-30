/**
 * TOON (Token-Oriented Object Notation) Converter
 * Lossless JSON <-> TOON encoder and decoder.
 */

// Helper to escape values in tabular rows (CSV-like escaping)
function escapeTabularValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to unescape tabular values
function unescapeTabularValue(str: string): unknown {
  str = str.trim();
  if (str === '') return null;
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (!isNaN(Number(str)) && str !== '') return Number(str);
  
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1).replace(/""/g, '"');
  }
  return str;
}

// Split a CSV row while respecting quotes
function splitCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Encodes a JSON-serializable value into TOON format
 */
export function jsonToToon(val: unknown, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);
  
  if (val === null || val === undefined) {
    return 'null';
  }
  
  if (typeof val !== 'object') {
    if (typeof val === 'string') {
      // If it's a simple string, return it. If it has newlines or start/ends with whitespace, escape it
      if (val.includes('\n') || val.trim() !== val || val.includes(':')) {
        return `"${val.replace(/"/g, '\\"')}"`;
      }
      return val;
    }
    return String(val);
  }
  
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return '[]';
    }
    
    // Check if it's a uniform array of objects
    const isUniformObjects = val.every(item => 
      item && 
      typeof item === 'object' && 
      !Array.isArray(item)
    );
    
    if (isUniformObjects) {
      // Gather all unique keys across all items to ensure consistent schema
      const keySet = new Set<string>();
      val.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(k => keySet.add(k));
        }
      });
      const keys = Array.from(keySet);
      
      let toon = `[${val.length}]{${keys.join(',')}}:\n`;
      val.forEach(item => {
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const rowVals = keys.map(k => escapeTabularValue(obj[k]));
          toon += `${indent}  ${rowVals.join(',')}\n`;
        }
      });
      return toon.trimEnd();
    } else {
      // List of primitives or mixed items
      let toon = `[${val.length}]:\n`;
      val.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          toon += `${indent}  -\n${jsonToToon(item, indentLevel + 2)}\n`;
        } else {
          toon += `${indent}  - ${jsonToToon(item, 0)}\n`;
        }
      });
      return toon.trimEnd();
    }
  }
  
  // Object
  const keys = Object.keys(val as Record<string, unknown>);
  if (keys.length === 0) {
    return '{}';
  }
  
  let result = '';
  keys.forEach((key, index) => {
    const value = (val as Record<string, unknown>)[key];
    const prefix = index === 0 ? '' : '\n' + indent;
    
    if (value === null || value === undefined) {
      result += `${prefix}${key}: null`;
    } else if (typeof value !== 'object') {
      result += `${prefix}${key}: ${jsonToToon(value, 0)}`;
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result += `${prefix}${key}: []`;
      } else {
        const isUniform = value.every(item => item && typeof item === 'object' && !Array.isArray(item));
        if (isUniform) {
          const itemKeys = Array.from(new Set(value.flatMap(item => Object.keys(item as Record<string, unknown>))));
          result += `${prefix}${key}[${value.length}]{${itemKeys.join(',')}}:\n`;
          value.forEach(item => {
            const obj = item as Record<string, unknown>;
            const rowVals = itemKeys.map(k => escapeTabularValue(obj[k]));
            result += `${indent}  ${rowVals.join(',')}\n`;
          });
          result = result.trimEnd();
        } else {
          result += `${prefix}${key}[${value.length}]:\n`;
          value.forEach(item => {
            if (typeof item === 'object' && item !== null) {
              result += `${indent}  -\n${jsonToToon(item, indentLevel + 2)}\n`;
            } else {
              result += `${indent}  - ${jsonToToon(item, 0)}\n`;
            }
          });
          result = result.trimEnd();
        }
      }
    } else {
      // Nested object
      result += `${prefix}${key}:\n${indent}  ${jsonToToon(value, indentLevel + 1)}`;
    }
  });
  
  return result;
}

/**
 * Decodes a TOON-formatted string back into a standard JS object
 */
export function toonToJson(toonStr: string): unknown {
  const lines = toonStr.split(/\r?\n/);
  
  interface ParseState {
    indentLevel: number;
    target: Record<string, unknown> | unknown[];
    key?: string;
    type: 'object' | 'array' | 'tabular';
    tabularKeys?: string[];
    tabularLength?: number;
  }
  
  const stack: ParseState[] = [];
  let root: unknown = null;
  
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    if (rawLine.trim() === '') {
      i++;
      continue;
    }
    
    // Determine indentation
    const matchIndent = rawLine.match(/^(\s*)/);
    const indent = matchIndent ? matchIndent[1].length : 0;
    const line = rawLine.trim();
    
    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].indentLevel >= indent) {
      stack.pop();
    }
    
    const parent = stack[stack.length - 1];
    
    // Check if line is a list item inside standard array
    if (line.startsWith('-')) {
      if (!parent || parent.type !== 'array') {
        throw new Error(`Syntax Error: List item found outside array context at line ${i + 1}`);
      }
      
      const rest = line.substring(1).trim();
      if (rest === '') {
        // Nested object in array item: look ahead for higher indentation
        const obj: Record<string, unknown> = {};
        (parent.target as unknown[]).push(obj);
        stack.push({
          indentLevel: indent + 2,
          target: obj,
          type: 'object'
        });
      } else {
        (parent.target as unknown[]).push(unescapeTabularValue(rest));
      }
      i++;
      continue;
    }
    
    // Check for tabular array rows
    if (parent && parent.type === 'tabular') {
      const values = splitCsvRow(line).map(unescapeTabularValue);
      const obj: Record<string, unknown> = {};
      parent.tabularKeys!.forEach((k, idx) => {
        obj[k] = values[idx] !== undefined ? values[idx] : null;
      });
      (parent.target as unknown[]).push(obj);
      i++;
      continue;
    }
    
    // Key-value pair, nested object, or nested array declaration
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Syntax Error: Missing colon at line ${i + 1}: "${line}"`);
    }
    
    const keyDecl = line.substring(0, colonIndex).trim();
    const valueDecl = line.substring(colonIndex + 1).trim();
    
    // Parse key names & potential array descriptors
    // format examples: "users[2]{id,name,role}" or "users[2]" or "user"
    const arrayMatch = keyDecl.match(/^([^[]+)\[(\d+)\](?:\{([^}]+)\})?$/);
    
    let key = keyDecl;
    let isArray = false;
    let isTabular = false;
    let arrayLen = 0;
    let tabularKeys: string[] = [];
    
    if (arrayMatch) {
      key = arrayMatch[1];
      isArray = true;
      arrayLen = parseInt(arrayMatch[2], 10);
      if (arrayMatch[3]) {
        isTabular = true;
        tabularKeys = arrayMatch[3].split(',').map(s => s.trim());
      }
    }
    
    let currentVal: unknown;
    let shouldPushToStack = false;
    let newType: 'object' | 'array' | 'tabular' = 'object';
    
    if (valueDecl !== '') {
      // Primitive inline value
      if (valueDecl === '[]') currentVal = [];
      else if (valueDecl === '{}') currentVal = {};
      else currentVal = unescapeTabularValue(valueDecl);
    } else {
      // Nested structure or tabular array
      if (isTabular) {
        currentVal = [];
        newType = 'tabular';
        shouldPushToStack = true;
      } else if (isArray) {
        currentVal = [];
        newType = 'array';
        shouldPushToStack = true;
      } else {
        currentVal = {};
        newType = 'object';
        shouldPushToStack = true;
      }
    }
    
    // Store parsed value in parent or root
    if (!parent) {
      root = currentVal;
    } else {
      if (parent.type === 'object') {
        (parent.target as Record<string, unknown>)[key] = currentVal;
      } else {
        (parent.target as unknown[]).push(currentVal);
      }
    }
    
    if (shouldPushToStack) {
      stack.push({
        indentLevel: indent,
        target: currentVal as Record<string, unknown> | unknown[],
        key: key,
        type: newType,
        tabularKeys,
        tabularLength: arrayLen
      });
    }
    
    i++;
  }
  
  return root;
}
