/**
 * Generate bang data for the Cloudflare Worker
 * 
 * Reads the top bangs from src/bangs-top.ts and generates a TypeScript file
 * with a trigger map for O(1) lookups at the edge.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the bangs-top.ts file
const bangsTopPath = join(__dirname, '../src/bangs-top.ts');
const content = readFileSync(bangsTopPath, 'utf-8');

// Extract the array content (everything between the first [ and last ])
const arrayMatch = content.match(/export const topBangs[^=]*=\s*(\[[\s\S]*\]);?\s*$/);
if (!arrayMatch) {
  console.error('Could not find topBangs array in bangs-top.ts');
  process.exit(1);
}

// Parse the array (it's valid JSON-ish, just need to handle trailing commas)
let arrayStr = arrayMatch[1];
// Remove trailing commas before ] or }
arrayStr = arrayStr.replace(/,(\s*[}\]])/g, '$1');

let bangs;
try {
  bangs = JSON.parse(arrayStr);
} catch (e) {
  console.error('Failed to parse bangs array:', e.message);
  process.exit(1);
}

console.log(`Parsed ${bangs.length} bangs from bangs-top.ts`);

// Generate the TypeScript file for the worker
const output = `/**
 * Auto-generated bang data for the Cloudflare Worker
 * Generated from src/bangs-top.ts
 * 
 * DO NOT EDIT MANUALLY - run \`node scripts/generate-worker-bangs.js\`
 */

export interface Bang {
  t: string | string[];  // trigger(s)
  s: string;             // service name
  u: string;             // URL template with %s
  r: number;             // relevance
}

export const bangs: Bang[] = ${JSON.stringify(bangs, null, 2)};

// Build trigger map for O(1) lookups
export const triggerMap = new Map<string, Bang>();

for (const bang of bangs) {
  const triggers = Array.isArray(bang.t) ? bang.t : [bang.t];
  for (const trigger of triggers) {
    triggerMap.set(trigger.toLowerCase(), bang);
  }
}

console.log(\`Loaded \${bangs.length} bangs with \${triggerMap.size} triggers\`);
`;

const outputPath = join(__dirname, '../worker/src/bangs.ts');
writeFileSync(outputPath, output);
console.log(`Generated ${outputPath}`);
console.log(`Total triggers: ${bangs.reduce((acc, b) => acc + (Array.isArray(b.t) ? b.t.length : 1), 0)}`);
