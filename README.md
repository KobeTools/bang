# !ReBang

[![Live Site](https://img.shields.io/badge/Live_Site-rebang.online-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://rebang.online)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

The fastest web-based bang redirector. Set `https://rebang.online/?q=%s` as your default search engine to use [DuckDuckGo-style bangs](https://duckduckgo.com/bangs) from any browser.

![ReBang Interface](public/rebang_screenshot.png)

## Why ReBang?

| | DuckDuckGo | unduck | ReBang |
|---|------------|--------|--------|
| **Redirect latency** | 300-600ms | ~120ms | **~60ms** |
| **Approach** | Server-side | Client-side JS | Edge worker |
| **Bang sources** | DDG only | DDG only | DDG + Kagi |
| **Total bangs** | 13,566 | 13,566 | 13,296 unique × 16,190 triggers |
| **Custom bangs** | No | No | Yes |
| **Autocomplete** | Yes | No | Yes |

[unduck](https://github.com/t3dotgg/unduck) by Theo pioneered client-side bang redirects. ReBang takes it further by handling redirects at Cloudflare's edge network—the 302 redirect returns before any HTML or JavaScript loads.

## How It's Fast

```
User: "cats !yt"  ──►  Cloudflare Edge  ──►  302 redirect to YouTube
                       (nearest PoP)         (~60ms globally)
```

For the top 1,297 bangs, a Cloudflare Worker returns a redirect immediately. No origin server, no JS parsing. Rare bangs and custom bangs fall through to the client app.

## Bang Database

ReBang merges bangs from DuckDuckGo and Kagi, deduplicating by URL:

| Source | Count |
|--------|-------|
| DuckDuckGo | 13,566 |
| Kagi | 10,895 |
| Combined (raw) | 24,461 |
| **After deduplication** | **13,296** |

DDG stores each trigger as a separate entry (`!g`, `!google`, `!goog` = 3 entries). ReBang merges these into one bang with multiple triggers. Triggers aren't lost—they're consolidated.

## Features

- **Custom bangs** — Create personal shortcuts stored in localStorage
- **Autocomplete** — Type `!` to search the full database
- **Configurable default** — Set your preferred search engine for queries without a bang
- **Monthly updates** — GitHub Actions fetches fresh bangs from DDG and Kagi

## Setup

Add as your default search engine:

**Chrome:** Settings → Search engine → Manage → Add  
**Firefox:** Visit rebang.online, click `+` in address bar  
**URL:** `https://rebang.online/?q=%s`

---

## Architecture

```
┌─────────────────────────────────────┐
│   Cloudflare Edge (300+ locations)  │
│   • 1,297 bangs embedded            │
│   • O(1) hashmap lookup             │
└──────────────────┬──────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
  Known bang               Unknown/custom bang
      │                    or no bang
      ▼                         │
 302 Redirect                   ▼
                          Origin (Vercel)
                          React app handles
                          full database +
                          user settings
```

### Edge Worker

```typescript
// Simplified from worker/src/index.ts
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    const bangMatch = query?.match(/!(\S+)/i);
    if (!bangMatch) return passToOrigin(request);
    
    const bang = triggerMap.get(bangMatch[1].toLowerCase());
    if (!bang) return passToOrigin(request);
    
    const cleanQuery = query.replace(/!\S+\s*/i, '').trim();
    return Response.redirect(bang.u.replace(/%s/g, encodeURIComponent(cleanQuery)), 302);
  },
};
```

### Data Pipeline

```
DuckDuckGo bang.js ──┐
                     ├──► merge + dedupe ──► bangs.json
Kagi bangs.json ─────┘           │
                                 ├──► src/bangs-top.ts (client bundle)
                                 ├──► public/bangs.[hash].json (lazy-loaded full DB)
                                 └──► worker/src/bangs.ts (edge worker)
```

## Development

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run update-bangs # Fetch + merge bangs from sources
bun run build        # Production build

cd worker
bun install          # Worker dependencies  
bun run dev          # Local worker
bun run deploy       # Deploy to Cloudflare
```

## Privacy

- **Edge:** Query parsed at Cloudflare, redirected. No logging.
- **Client:** Runs in browser. No tracking.
- **Settings:** Stored in localStorage, never transmitted.

## Credits

- [unduck](https://github.com/t3dotgg/unduck) by Theo — Original client-side bang redirect
- [Kagi Bangs](https://github.com/kagisearch/bangs) — Open-source bang database
- [DuckDuckGo](https://duckduckgo.com/bangs) — The original bang search

## License

MIT
