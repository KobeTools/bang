const BANGS = [
  { triggers: ["g", "google"], service: "Google", urlTemplate: "https://www.google.com/search?q=%s" },
  { triggers: ["gh", "github"], service: "GitHub", urlTemplate: "https://github.com/search?q=%s" },
  { triggers: ["yt", "youtube"], service: "YouTube", urlTemplate: "https://www.youtube.com/results?search_query=%s" },
  { triggers: ["w", "wiki", "wikipedia"], service: "Wikipedia", urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search=%s" },
  { triggers: ["r", "reddit"], service: "Reddit", urlTemplate: "https://www.reddit.com/search/?q=%s" },
  { triggers: ["so", "stackoverflow"], service: "Stack Overflow", urlTemplate: "https://stackoverflow.com/search?q=%s" },
  { triggers: ["mdn"], service: "MDN", urlTemplate: "https://developer.mozilla.org/en-US/search?q=%s" },
  { triggers: ["npm"], service: "npm", urlTemplate: "https://www.npmjs.com/search?q=%s" },
  { triggers: ["amz", "amazon"], service: "Amazon", urlTemplate: "https://www.amazon.com/s?k=%s" },
  { triggers: ["x", "twitter"], service: "X", urlTemplate: "https://x.com/search?q=%s" }
];

const BANG_MAP = new Map();
for (const bang of BANGS) {
  for (const trigger of bang.triggers) {
    BANG_MAP.set(trigger.toLowerCase(), bang);
  }
}

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

function redirectIfBang(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  const queryValue =
    parsedUrl.searchParams.get("q") ??
    parsedUrl.searchParams.get("query") ??
    parsedUrl.searchParams.get("search") ??
    parsedUrl.searchParams.get("p") ??
    parsedUrl.searchParams.get("text");

  if (!queryValue) {
    return null;
  }

  const trimmedQuery = queryValue.trim();
  if (!trimmedQuery.startsWith("!")) {
    return null;
  }

  const parsed = parseInput(trimmedQuery);
  if (!parsed) {
    return null;
  }

  const bang = BANG_MAP.get(parsed.trigger);
  if (!bang) {
    return null;
  }

  return buildBangUrl(bang, parsed.query);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  const targetUrl = redirectIfBang(tab.url);
  if (!targetUrl || targetUrl === tab.url) {
    return;
  }

  chrome.tabs.update(tabId, { url: targetUrl }, () => {
    if (chrome.runtime.lastError) {
      console.debug(`ReBang redirect failed for tab ${tabId}:`, chrome.runtime.lastError.message);
      return;
    }
  });
});
