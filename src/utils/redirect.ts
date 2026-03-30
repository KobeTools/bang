import { loadSettings } from "./settings";

import { BangItem } from "../types/BangItem";
import { getParametersFromUrl, validateRedirectUrl, getBaseDomain } from "./urlUtils"; 
import { determineBangCandidate, determineBangUsed, getBangFirstTrigger, ensureFullDatabase, hasFullDatabaseLoaded } from "./bangCoreUtil";
import { findDefaultBangFromSettings } from "./bangSettingsUtil";
import { debugError, debugLog, debugWarn } from "./debug";

/**
 * Result object for bang redirect operations
 */
export type BangRedirectResult = {
  success: boolean;
  url?: string;
  error?: string;
  bangUsed?: string;
};


/**
 * Get the redirect URL based on the bang and query
 * Refresh settings each time to ensure we have the latest
 */
async function getRedirect(urlParams: URLSearchParams): Promise<BangRedirectResult> {
  try {
    const query = urlParams.get("q") || "";
    if (!query) return { success: false, error: "No query parameter found" };

    const settings = loadSettings();

    //Easily the fastest call here. Just a single lookup.
    const defaultBang = findDefaultBangFromSettings();
    const defaultBangTrigger = getBangFirstTrigger(defaultBang);

    debugLog("redirect:start", {
      origin: typeof window !== "undefined" ? window.location.origin : null,
      href: typeof window !== "undefined" ? window.location.href : null,
      query,
      defaultBang: defaultBangTrigger,
      customBangsCount: settings.customBangs.length,
      fullDatabaseLoaded: hasFullDatabaseLoaded(),
    });

    //This function is fast. It's just a regex to extract the bang trigger.
    const bangCandidate: string = determineBangCandidate(query, defaultBang);
    
    // First attempt: Try with current loaded bangs (Top 500)
    let selectedBang: BangItem = determineBangUsed(bangCandidate, defaultBang);
    
    // Check if we actually found the requested bang
    // We need to check if the candidate matches ANY of the bang's triggers, not just the first one
    const selectedTriggers = Array.isArray(selectedBang.t) ? selectedBang.t : [selectedBang.t];
    const foundRequestedBang = selectedTriggers.some(t => t.toLowerCase() === bangCandidate.toLowerCase());

    debugLog("redirect:bang-selected", {
      bangCandidate,
      selectedBang: getBangFirstTrigger(selectedBang),
      foundRequestedBang,
      usedDefaultBang: !foundRequestedBang && bangCandidate === defaultBangTrigger,
    });

    // If we didn't find the specific bang the user asked for, load the full database
    if (!foundRequestedBang) {
        debugWarn("redirect:loading-full-database", {
          bangCandidate,
          selectedBang: getBangFirstTrigger(selectedBang),
        });
        await ensureFullDatabase();
        
        // Retry with full database
        selectedBang = determineBangUsed(bangCandidate, defaultBang);

        debugLog("redirect:full-database-loaded", {
          bangCandidate,
          selectedBang: getBangFirstTrigger(selectedBang),
          fullDatabaseLoaded: hasFullDatabaseLoaded(),
        });
    }

    const bangName = getBangFirstTrigger(selectedBang);

    // Remove the first bang from the query
    const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

    //There used to be a check here for a specific setting that defaulted to true.
    //But I couldnt find a case where anyone would want it off, so I removed it.
    //There wasnt even a way to set it in the settings page.
    if (cleanQuery === "") {
      const baseDomain = getBaseDomain(selectedBang.u);
        debugLog("redirect:empty-search-term", {
          bangUsed: bangName,
          targetUrl: baseDomain ?? "https://www.google.com",
        });
        return { 
          success: true, 
          url: baseDomain ?? "https://www.google.com",
          bangUsed: bangName
        };
    }

    // Format the search URL, replacing template parameters
    // Supports %s (our format), {{{s}}} (DDG legacy), and {searchTerms} (OpenSearch)
    const searchUrl = selectedBang.u.replace(
      /%s|\{\{\{s\}\}\}|\{searchTerms\}/g,
      encodeURIComponent(cleanQuery)
    );
    
    // Validate the URL is safe to redirect to
    if (!searchUrl || !validateRedirectUrl(searchUrl)) {
      debugWarn("redirect:invalid-url", {
        bangUsed: bangName,
        bangCandidate,
        cleanQuery,
        searchUrl,
      });
      return { 
        success: false, 
        error: "Invalid redirect URL generated",
        bangUsed: bangName
      };
    }

    debugLog("redirect:resolved", {
      bangUsed: bangName,
      bangCandidate,
      cleanQuery,
      targetUrl: searchUrl,
    });
    
    return { 
      success: true, 
      url: searchUrl,
      bangUsed: bangName
    };
  } catch (error) {
    debugError("redirect:generate-failed", error, {
      href: typeof window !== "undefined" ? window.location.href : null,
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Redirect the browser to the appropriate search URL
 * This is the main function that should be used to redirect the user.
 */
export async function performRedirect(): Promise<boolean> {
  try {
    const urlParams = getParametersFromUrl(window.location.href);

    const redirect = await getRedirect(urlParams);

    if (!redirect.success || !redirect.url) {
      debugWarn("redirect:perform-failed", {
        href: window.location.href,
        bangUsed: redirect.bangUsed ?? null,
        error: redirect.error ?? null,
      });
      return false;
    }

    const url = redirect.url;
    
    // Benchmark: Calculate time from navigation start to now
    const now = performance.now();
    debugLog("redirect:navigate", {
      origin: window.location.origin,
      currentUrl: window.location.href,
      targetUrl: url,
      bangUsed: redirect.bangUsed ?? null,
      elapsedMs: Number(now.toFixed(2)),
    });
    
    window.location.replace(url);
    
    return true;
  } catch (error) {
    debugError("redirect:perform-crashed", error, {
      href: window.location.href,
    });
    return false;
  }
}
