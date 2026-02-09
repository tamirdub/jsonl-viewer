# JSONL Pretty Viewer

> Cursor / VS Code extension that displays `.jsonl` files with **pretty-printing and syntax highlighting**.

Open any `.jsonl` file and it renders as formatted, color-coded JSON — no extra steps. Toggle back to raw text with one click.

## Features

| Feature | Description |
|---|---|
| **Auto-prettify** | `.jsonl` files open formatted by default |
| **Syntax highlighting** | Keys, strings, numbers, booleans, nulls, braces, brackets — all color-coded |
| **Pretty / Raw toggle** | Switch views with a single click |
| **Collapse / Expand** | Per-entry or all-at-once |
| **Search** | Real-time filtering with match highlighting and count |
| **Copy entry** | Hover any entry to copy its prettified JSON |
| **Open as Text** | Fall back to the standard text editor |
| **Lazy loading** | Renders 200 entries at a time for large files |
| **Live refresh** | View updates when the file changes on disk |
| **Error display** | Invalid JSON lines highlighted in red with the parse error |

## Installation

### From OpenVSX / Cursor Marketplace

Search for **JSONL Pretty Viewer** in the Extensions panel (`Cmd+Shift+X`).

### From VSIX

```bash
# Clone the repo
git clone https://github.com/tamirdub/jsonl-viewer.git
cd jsonl-viewer

# Package
npx @vscode/vsce package --allow-missing-repository

# Install into Cursor
"/Applications/Cursor.app/Contents/Resources/app/bin/cursor" --install-extension jsonl-viewer-0.1.0.vsix

# Or install into VS Code
code --install-extension jsonl-viewer-0.1.0.vsix
```

Then reload: `Cmd+Shift+P` → `Developer: Reload Window`.

## Usage

1. **Open any `.jsonl` file** — it opens prettified by default.
2. **Pretty / Raw** — click the toggle in the toolbar.
3. **Collapse / Expand** — click ▶/▼ per entry, or use the toolbar buttons.
4. **Search** — type in the search box; matches highlight in gold.
5. **Copy** — hover an entry → click **Copy**.
6. **Switch to text editor** — click **Open as Text**, or right-click the editor tab → **Reopen Editor With...** → **Text Editor**.

## Color Scheme

Dark theme optimized:

- **Keys** — light blue `#9cdcfe`
- **Strings** — orange `#ce9178`
- **Numbers** — green `#b5cea8`
- **Booleans / null** — blue `#569cd6`
- **Braces `{ }`** — purple `#da70d6`
- **Brackets `[ ]`** — gold `#ffd700`

## Contributing

Issues and PRs welcome. To develop locally:

```bash
git clone https://github.com/tamirdub/jsonl-viewer.git
cd jsonl-viewer
ln -sf "$(pwd)" ~/.cursor/extensions/local.jsonl-viewer-0.1.0
# Reload Cursor, edit extension.js, reload again to test changes
```

## License

[MIT](LICENSE)
