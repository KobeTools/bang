# ReBang Omnibox Redirect (Chrome Extension)

This extension provides client-side `!bang` redirects without replacing your default search engine.

## How it works
1. Search as usual in the address bar.
2. If your query starts with `!` and matches a bang trigger, the extension intercepts early and redirects to that target website search.
3. Built-in bangs are loaded from the repository's full bang dataset (`bangs.json`).
4. If no bang matches, your normal search flow stays unchanged.

## Custom bangs
- Open extension settings from Chrome extensions page (**Details → Extension options**), or via the popup link.
- Add a trigger, name, and URL template containing `%s`.
- Custom bangs override built-in triggers when names collide.

## Local install (unpacked)
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `chrome-extension`.
