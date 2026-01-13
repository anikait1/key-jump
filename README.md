# YouTube Music Macros

A browser extension that adds Vimium-style keyboard navigation to YouTube Music. Press a key to reveal hint labels on all clickable elements, then type the hint to click.

## Features

| Shortcut | Action |
|----------|--------|
| `f` | Show hints for left-click (common elements) |
| `Shift+F` | Show hints for right-click (common elements) |
| `Ctrl+f` | Show hints for left-click (ALL elements) |
| `Ctrl+Shift+F` | Show hints for right-click (ALL elements) |
| `Esc` | Cancel hint mode |
| `Backspace` | Delete last typed character |
| Extension icon | Show help popup |

### Two-Tier Hints

- **Common mode** (`f` / `Shift+F`): Shows hints only for songs, player controls, and menu items — less clutter
- **All mode** (`Ctrl+f` / `Ctrl+Shift+F`): Shows hints for every clickable element — power user mode

### Context-Aware Menus

When a context menu (right-click menu) is open, hints automatically scope to only the menu items. This enables a smooth workflow:

1. `Shift+F` → right-click hint on a song
2. Context menu opens
3. `f` → hints appear only on menu options
4. Type hint → action executes (e.g., "Add to queue")

### How it works

1. Press `f` to enter hint mode
2. Yellow labels appear on all clickable elements
3. Type the hint letters to click that element
4. For context menus (e.g., "Add to queue"), use `Shift+F` instead

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

**Add a song to queue:**
1. Press `Shift+F` to show right-click hints
2. Type the hint on the song → context menu opens
3. Press `f` → hints appear on menu items only
4. Type hint for "Add to queue"

**Like the current song:**
1. Press `f` to show click hints
2. Type the hint on the thumbs-up button in the player bar

**Navigate to an artist:**
1. Press `Ctrl+f` to show all hints (includes links)
2. Type the hint on the artist name

## Project Structure

```
├── manifest.json      # Extension manifest (v3)
├── src/
│   └── content.ts     # Content script source
├── dist/
│   └── content.js     # Built content script
└── icons/             # Extension icons (optional)
```

## License

MIT
