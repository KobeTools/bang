#!/usr/bin/env node

/**
 * Benchmark: ReBang vs Unduck
 * Tests redirect latency for various bangs
 */

import https from 'https';
import http from 'http';

const ITERATIONS = 50;

const SERVICES = [
  { name: 'ReBang', url: 'https://rebang.online/' },
  { name: 'Unduck', url: 'https://unduck.link/' },
];

const QUERIES = [
  { query: 'cats !yt', name: '!yt (YouTube)' },
  { query: 'hello !g', name: '!g (Google)' },
  { query: 'rust !gh', name: '!gh (GitHub)' },
  { query: 'climate !w', name: '!w (Wikipedia)' },
  { query: 'react !npm', name: '!npm (NPM)' },
  { query: 'movie !imdb', name: '!imdb (IMDB)' },
  { query: 'pizza !gm', name: '!gm (Maps)' },
  { query: 'error !so', name: '!so (StackOverflow)' },
  { query: 'song !sp', name: '!sp (Spotify)' },
  { query: 'news !r', name: '!r (Reddit)' },
];

function measureRequest(url) {
  return new Promise((resolve) => {
    const start = performance.now();
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      // Consume response
      res.on('data', () => {});
      res.on('end', () => {
        const elapsed = performance.now() - start;
        resolve(elapsed);
      });
    });
    
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function benchmark(baseUrl, query, iterations) {
  const url = `${baseUrl}?q=${encodeURIComponent(query)}`;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const time = await measureRequest(url);
    if (time !== null) times.push(time);
  }
  
  if (times.length === 0) return null;
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return { avg, min, max };
}

async function main() {
  console.log('==============================================');
  console.log('  ReBang vs Unduck vs Unduckified Benchmark');
  console.log('==============================================');
  console.log('');
  console.log(`Iterations per query: ${ITERATIONS}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');
  
  const results = [];
  
  for (const { query, name } of QUERIES) {
    process.stdout.write(`Testing ${name}... `);
    
    const serviceResults = {};
    for (const service of SERVICES) {
      const result = await benchmark(service.url, query, ITERATIONS);
      serviceResults[service.name] = result ? result.avg : null;
    }
    
    if (serviceResults.ReBang) {
      const line = SERVICES.map(s => {
        const val = serviceResults[s.name];
        return val ? `${s.name}: ${val.toFixed(0)}ms` : `${s.name}: err`;
      }).join(' | ');
      console.log(line);
      results.push({ name, ...serviceResults });
    } else {
      console.log('Error measuring');
    }
  }
  
  console.log('');
  console.log('==============================================');
  console.log('                   SUMMARY');
  console.log('==============================================');
  console.log('');
  
  const header = ['Bang', ...SERVICES.map(s => s.name), 'Fastest'].map(h => h.padStart(12)).join(' ');
  console.log(header);
  console.log('─'.repeat(header.length));
  
  const totals = {};
  SERVICES.forEach(s => totals[s.name] = 0);
  
  for (const r of results) {
    const values = SERVICES.map(s => r[s.name]);
    const min = Math.min(...values.filter(v => v));
    const fastest = SERVICES.find(s => r[s.name] === min)?.name || '-';
    
    SERVICES.forEach(s => totals[s.name] += r[s.name] || 0);
    
    const row = [
      r.name.padStart(12),
      ...SERVICES.map(s => r[s.name] ? `${r[s.name].toFixed(0)}ms`.padStart(12) : 'err'.padStart(12)),
      fastest.padStart(12)
    ].join(' ');
    console.log(row);
  }
  
  const avgRow = [
    'AVERAGE'.padStart(12),
    ...SERVICES.map(s => `${(totals[s.name] / results.length).toFixed(0)}ms`.padStart(12)),
    ''
  ].join(' ');
  console.log('');
  console.log(avgRow);
  
  console.log('');
  console.log('==============================================');
  
  // Output markdown table for README
  const avgRebang = totals.ReBang / results.length;
  console.log('');
  console.log('Markdown table for README:');
  console.log('');
  console.log(`| Bang | ${SERVICES.map(s => s.name).join(' | ')} |`);
  console.log(`|------|${SERVICES.map(() => '--------').join('|')}|`);
  for (const r of results) {
    const cols = SERVICES.map(s => `${r[s.name]?.toFixed(0) || 'err'}ms`);
    console.log(`| ${r.name} | ${cols.join(' | ')} |`);
  }
  const avgCols = SERVICES.map(s => `**${(totals[s.name] / results.length).toFixed(0)}ms**`);
  console.log(`| **Average** | ${avgCols.join(' | ')} |`);
  
  // Speedup summary
  console.log('');
  console.log('Speedup vs ReBang:');
  for (const s of SERVICES.slice(1)) {
    const speedup = (totals[s.name] / results.length) / avgRebang;
    console.log(`  ${s.name}: ${speedup.toFixed(2)}x slower`);
  }
}

main().catch(console.error);
