# Key Jump

A browser extension that adds keyboard hints to any website. Press a key to reveal hint labels on clickable elements, then type the hint to click. Configure custom selectors on a per-site basis.

## Features

| Shortcut | Action |
|----------|--------|
| `;` | Show hints for left-click (common elements) |
| `Shift+;` | Show hints for right-click (common elements) |
| `Ctrl+;` | Show hints for left-click (ALL elements) |
| `Ctrl+Shift+;` | Show hints for right-click (ALL elements) |
| `Esc` | Cancel hint mode |
| `Backspace` | Delete last typed character |
| Extension icon | Show help popup |

### Two-Tier Hints

- **Common mode** (`;` / `Shift+;`): Shows hints for high-value elements — less clutter
- **All mode** (`Ctrl+;` / `Ctrl+Shift+;`): Shows hints for every clickable element — power user mode

### Per-Site Configuration

Configure custom CSS selectors for any website to hint only the elements you want. Settings are stored per-domain.

### Context-Aware Menus

When a context menu (right-click menu) is open, hints automatically scope to only the menu items. This enables a smooth workflow:

1. `Shift+;` → right-click hint on an element
2. Context menu opens
3. `;` → hints appear only on menu options
4. Type hint → action executes

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime installed

### Build

```bash
bun install
bun run build
```

### Load in Chrome/Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this project folder

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file

## Development

Run the watch mode to auto-rebuild on changes:

```bash
bun run watch
```

After making changes, refresh the extension in your browser's extension page.

## Usage Examples

**Click a link:**
1. Press `;` to show click hints
2. Type the hint on the link

**Right-click menu action:**
1. Press `Shift+;` to show right-click hints
2. Type the hint → context menu opens
3. Press `;` → hints appear on menu items only
4. Type hint for desired action

**Navigate to an element with Ctrl+;:**
1. Press `Ctrl+;` to show all hints (includes links)
2. Type the hint on the element

## Project Structure

```
├── manifest.json      # Extension manifest (v3)
├── src/
│   └── content.ts     # Content script source
├── dist/
│   └── content.js     # Built content script
└── icons/             # Extension icons (generated with Gemini)
```

## License

MIT
