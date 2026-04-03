# ReBang Omnibox Redirect (Chrome Extension)

This extension provides client-side `!bang` redirects without replacing your default search engine.

## How it works
1. Search as usual in the address bar.
2. If your query starts with `!` and matches a built-in bang, the extension redirects to that target website search.
   - `!g cats`
   - `!gh rebang`
   - `!yt lo-fi`
3. If no bang matches, your normal search flow stays unchanged.

## Local install (unpacked)
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `chrome-extension`.

## Hardcoded bangs
The extension intentionally uses a hardcoded list and does not fetch a remote bang database.
