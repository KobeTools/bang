const SEARCH_QUERY_KEYS = ["q", "query", "search", "p", "text", "wd", "keyword", "k", "s"];

let builtInBangMapPromise = null;
let combinedBangMapPromise = null;
const redirectingTabs = new Set();

function parseInput(rawText) {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("!") ? trimmed.slice(1).trimStart() : trimmed;
  if (!normalized) return null;

  const [trigger, ...rest] = normalized.split(/\s+/);
  return {
    trigger: trigger.toLowerCase(),
    query: rest.join(" ").trim()
  };
}

function buildBangUrl(bang, query) {
  const encoded = encodeURIComponent(query || "");
  return bang.urlTemplate.includes("%s")
    ? bang.urlTemplate.replaceAll("%s", encoded)
    : `${bang.urlTemplate}${encoded}`;
}

function extractBangQuery(parsedUrl) {
  for (const key of SEARCH_QUERY_KEYS) {
    const value = parsedUrl.searchParams.get(key);
    if (value && value.trim().startsWith("!")) {
      return value.trim();
    }
  }

  for (const value of parsedUrl.searchParams.values()) {
    if (value && value.trim().startsWith("!")) {
      return value.trim();
    }
  }

  return null;
}

async function loadBuiltInBangMap() {
  if (builtInBangMapPromise) {
    return builtInBangMapPromise;
  }

  builtInBangMapPromise = (async () => {
    const response = await fetch(chrome.runtime.getURL("bangs.json"));
    if (!response.ok) {
      throw new Error(`Failed to load bundled bangs.json (${response.status})`);
    }

    const data = await response.json();
    const map = new Map();

    if (!data || !Array.isArray(data.b)) {
      return map;
    }

    for (const item of data.b) {
      if (!Array.isArray(item) || item.length < 5) continue;

      const [triggersRaw, service, , , urlTemplate] = item;
      if (typeof urlTemplate !== "string") continue;

      const triggers = Array.isArray(triggersRaw) ? triggersRaw : [triggersRaw];
      for (const trigger of triggers) {
        if (typeof trigger !== "string") continue;
        const normalized = trigger.trim().toLowerCase();
        if (!normalized) continue;
        map.set(normalized, { service, urlTemplate });
      }
    }

    return map;
  })();

  return builtInBangMapPromise;
}

async function loadCombinedBangMap() {
  if (combinedBangMapPromise) {
    return combinedBangMapPromise;
  }

  combinedBangMapPromise = (async () => {
    const builtIn = await loadBuiltInBangMap();
    const combined = new Map(builtIn);

    const { customBangs = [] } = await chrome.storage.local.get({ customBangs: [] });
    if (Array.isArray(customBangs)) {
      for (const customBang of customBangs) {
        if (!customBang || typeof customBang !== "object") continue;

        const trigger = String(customBang.trigger || "").trim().toLowerCase();
        const urlTemplate = String(customBang.urlTemplate || "").trim();
        const service = String(customBang.name || "Custom").trim() || "Custom";

        if (!trigger || !urlTemplate) continue;
        combined.set(trigger, { service, urlTemplate });
      }
    }

    return combined;
  })();

  return combinedBangMapPromise;
}

async function resolveBangRedirectUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  const bangQuery = extractBangQuery(parsedUrl);
  if (!bangQuery) {
    return null;
  }

  const parsed = parseInput(bangQuery);
  if (!parsed) {
    return null;
  }

  const bangMap = await loadCombinedBangMap();
  const bang = bangMap.get(parsed.trigger);
  if (!bang) {
    return null;
  }

  return buildBangUrl(bang, parsed.query);
}

async function redirectTabIfNeeded(tabId, url) {
  if (redirectingTabs.has(tabId)) {
    return;
  }

  const targetUrl = await resolveBangRedirectUrl(url);
  if (!targetUrl || targetUrl === url) {
    return;
  }

  redirectingTabs.add(tabId);
  chrome.tabs.update(tabId, { url: targetUrl }, () => {
    if (chrome.runtime.lastError) {
      console.debug(`ReBang redirect failed for tab ${tabId}:`, chrome.runtime.lastError.message);
    }
    setTimeout(() => redirectingTabs.delete(tabId), 250);
  });
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || !details.url) {
    return;
  }

  redirectTabIfNeeded(details.tabId, details.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url || (changeInfo.status !== "loading" && changeInfo.status !== "complete")) {
    return;
  }

  redirectTabIfNeeded(tabId, tab.url);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.customBangs) {
    combinedBangMapPromise = null;
  }
});

async function warmBangCache() {
  try {
    await loadCombinedBangMap();
  } catch (error) {
    console.debug("ReBang cache warm-up failed:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  warmBangCache();
});

chrome.runtime.onStartup.addListener(() => {
  warmBangCache();
});

warmBangCache();
