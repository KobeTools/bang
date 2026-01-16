/**
 * ReBang Edge Redirect Worker
 * 
 * Intercepts requests with ?q= parameter and performs instant redirects
 * at the edge. Non-redirect requests are passed through to the origin (Vercel).
 * 
 * Custom bangs (stored in user's localStorage) are NOT handled here - they
 * fall through to the origin where the React app handles them.
 */

import { triggerMap } from './bangs';

interface Env {
  ORIGIN_URL: string;
}

const ORIGIN = 'https://www.rebang.online';

/**
 * Pass request through to Vercel origin
 */
function passToOrigin(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const originUrl = new URL(url.pathname + url.search, ORIGIN);
  
  return fetch(originUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    // No query parameter - pass through to origin for the React app
    if (!query) {
      return passToOrigin(request);
    }

    // Extract bang from query (e.g., "cats !yt" -> "yt")
    const bangMatch = query.match(/!(\S+)/i);
    
    // No bang in query - pass to origin so client can use user's configured default
    if (!bangMatch) {
      return passToOrigin(request);
    }
    
    const bangTrigger = bangMatch[1].toLowerCase();
    
    // Look up bang in our trigger map (O(1) lookup)
    const bang = triggerMap.get(bangTrigger);
    
    if (!bang) {
      // Bang not found in top bangs - fall back to origin
      // This handles: uncommon bangs, custom user bangs, typos
      return passToOrigin(request);
    }

    // Remove bang from query to get clean search term
    const cleanQuery = query.replace(/!\S+\s*/i, '').trim();
    
    // If no search term and just a bang, some bangs should go to homepage
    // For now, use empty string which most search engines handle fine
    const searchTerm = cleanQuery || '';

    // Build the redirect URL
    const redirectUrl = bang.u.replace(/%s/g, encodeURIComponent(searchTerm));

    // Return 302 redirect
    return Response.redirect(redirectUrl, 302);
  },
};
