# Privacy Policy – ReBang Omnibox Redirect

Last updated: 2026-04-03

ReBang Omnibox Redirect does not collect, store, transmit, or sell personal data.

## What the extension does
- The extension checks navigated URLs locally in your browser to detect `!bang` search queries and redirect early.
- Built-in bang triggers are loaded from a bundled local `bangs.json` file shipped with the extension.
- You can optionally save custom bangs in extension local storage.
- If no trigger matches, your normal browsing/search behavior continues.

## Data handling
- No account system
- No analytics
- No tracking pixels
- No remote code execution
- No server-side logging by this extension
- Optional custom bangs are stored only in your browser via extension local storage

## Permissions used
- `tabs`: used to read/update tab URL for bang redirection.
- `webNavigation`: used to detect navigation early before full result page load completes.
- `storage`: used only for user-created custom bangs.

## Contact
For questions, open an issue in this repository.
