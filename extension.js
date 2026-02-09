const vscode = require('vscode');

const VIEW_TYPE = 'jsonlViewer.prettyView';

function activate(context) {
  const provider = new JsonlEditorProvider(context);
  const registration = vscode.window.registerCustomEditorProvider(
    VIEW_TYPE,
    provider,
    {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }
  );
  context.subscriptions.push(registration);

  const openCmd = vscode.commands.registerCommand(
    'jsonlViewer.openPretty',
    openPrettyCommand
  );
  context.subscriptions.push(openCmd);
}

function deactivate() {}

async function openPrettyCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Open a .jsonl file first.');
    return;
  }
  const uri = editor.document.uri;
  if (!uri.fsPath.endsWith('.jsonl')) {
    vscode.window.showWarningMessage('Active file is not a .jsonl file.');
    return;
  }
  await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE);
}

class JsonlEditorProvider {
  constructor(context) {
    this.context = context;
  }

  async resolveCustomTextEditor(document, webviewPanel, _token) {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = getWebviewHtml(document.uri.fsPath);

    // Send initial content after webview is ready
    const sendContent = () => {
      webviewPanel.webview.postMessage({
        type: 'setContent',
        content: document.getText(),
      });
    };

    // The webview will ask for initial content when ready
    const messageHandler = webviewPanel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'ready') {
        sendContent();
        return;
      }
      if (msg.type === 'openInTextEditor') {
        vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
        return;
      }
      if (msg.type === 'copyEntry') {
        vscode.env.clipboard.writeText(msg.text);
        vscode.window.showInformationMessage('Copied entry to clipboard');
      }
    });

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({
          type: 'setContent',
          content: e.document.getText(),
        });
      }
    });

    webviewPanel.onDidDispose(() => {
      messageHandler.dispose();
      changeSubscription.dispose();
    });
  }
}

function getWebviewHtml(filePath) {
  const fileName = escapeHtml(filePath.split('/').pop());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <style>
    :root {
      --bg: #1e1e1e;
      --bg-card: #252526;
      --bg-hover: rgba(255,255,255,0.03);
      --border: #333;
      --text: #d4d4d4;
      --text-muted: #808080;
      --accent: #569cd6;
      --btn-bg: #2d2d2d;
      --btn-hover: #3c3c3c;
      --btn-active-bg: #264f78;
      --btn-active-text: #fff;
      --scrollbar-bg: #2a2a2a;
      --scrollbar-thumb: #555;
      --json-key: #9cdcfe;
      --json-string: #ce9178;
      --json-number: #b5cea8;
      --json-bool: #569cd6;
      --json-null: #569cd6;
      --json-bracket: #ffd700;
      --json-brace: #da70d6;
      --json-colon: #d4d4d4;
      --json-comma: #d4d4d4;
      --json-error-bg: #3c1f1f;
      --json-error-border: #f44747;
      --json-error-text: #f48771;
      --json-line-num: #5a5a5a;
      --separator: #2a2a2a;
      --highlight-bg: rgba(255,215,0,0.3);
      --highlight-current: rgba(255,165,0,0.55);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .toolbar-title {
      font-weight: 600;
      font-size: 13px;
      margin-right: 8px;
    }

    .toolbar-stats {
      font-size: 12px;
      color: var(--text-muted);
      margin-right: auto;
    }

    .toolbar button {
      font-family: inherit;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--btn-bg);
      color: var(--text);
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .toolbar button:hover { background: var(--btn-hover); }
    .toolbar button.active {
      background: var(--btn-active-bg);
      color: var(--btn-active-text);
      border-color: var(--accent);
    }

    .toggle-group {
      display: flex;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .toggle-group button {
      border: none;
      border-radius: 0;
      padding: 4px 14px;
    }
    .toggle-group button + button { border-left: 1px solid var(--border); }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .search-bar input {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      width: 180px;
      outline: none;
    }
    .search-bar input:focus { border-color: var(--accent); }
    .search-count { font-size: 11px; color: var(--text-muted); min-width: 55px; }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }
    .content::-webkit-scrollbar { width: 10px; }
    .content::-webkit-scrollbar-track { background: var(--scrollbar-bg); }
    .content::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 5px; }

    .json-entry {
      padding: 4px 16px 4px 0;
      border-bottom: 1px solid var(--separator);
      position: relative;
    }
    .json-entry:hover { background: var(--bg-hover); }

    .entry-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 0 2px 8px;
    }

    .entry-idx {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: var(--json-line-num);
      min-width: 40px;
      text-align: right;
      user-select: none;
    }

    .cbtn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
      padding: 0 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      line-height: 1;
    }
    .cbtn:hover { color: var(--text); }

    .copy-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
      padding: 0 4px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .json-entry:hover .copy-btn { opacity: 1; }
    .copy-btn:hover { color: var(--text); }

    .json-block {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre;
      padding-left: 56px;
      overflow-x: auto;
    }

    .json-block.collapsed {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-height: 1.6em;
      color: var(--text-muted);
    }

    .json-entry.error {
      background: var(--json-error-bg);
      border-left: 3px solid var(--json-error-border);
    }
    .json-entry.error .json-block { color: var(--json-error-text); }
    .error-label { font-size: 11px; color: var(--json-error-border); font-weight: 600; }

    .jk { color: var(--json-key); }
    .js { color: var(--json-string); }
    .jn { color: var(--json-number); }
    .jb { color: var(--json-bool); font-weight: 600; }
    .jl { color: var(--json-null); font-style: italic; }
    .jp { color: var(--json-bracket); }
    .jc { color: var(--json-brace); }
    .jx { color: var(--json-colon); }
    .jm { color: var(--json-comma); }

    .raw-view {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      line-height: 1.5;
      padding: 12px 0;
      white-space: pre;
    }
    .raw-line { display: flex; padding: 0 16px; }
    .raw-line:hover { background: var(--bg-hover); }
    .raw-ln {
      color: var(--json-line-num);
      min-width: 48px;
      text-align: right;
      padding-right: 16px;
      user-select: none;
      flex-shrink: 0;
    }
    .raw-lt { flex: 1; overflow-x: auto; }

    .sh { background: var(--highlight-bg); border-radius: 2px; }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-muted);
      font-size: 14px;
    }

    .load-more {
      padding: 12px;
      text-align: center;
    }
    .load-more button {
      font-family: inherit;
      font-size: 13px;
      padding: 6px 24px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--btn-bg);
      color: var(--text);
      cursor: pointer;
    }
    .load-more button:hover { background: var(--btn-hover); }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">${fileName}</span>
    <span class="toolbar-stats" id="stats">Loading...</span>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Search..." />
      <span class="search-count" id="searchCount"></span>
    </div>
    <div class="toggle-group">
      <button id="btnPretty" class="active">Pretty</button>
      <button id="btnRaw">Raw</button>
    </div>
    <button id="btnCollapseAll">Collapse All</button>
    <button id="btnExpandAll">Expand All</button>
    <button id="btnOpenText">Open as Text</button>
  </div>
  <div class="content" id="content"></div>

<script>
(function() {
  var vscodeApi = acquireVsCodeApi();

  var entries = [];
  var currentView = 'pretty';
  var collapsed = {};
  var searchTerm = '';
  var BATCH_SIZE = 200;
  var renderedCount = 0;

  // --- DOM refs ---
  var contentEl = document.getElementById('content');
  var statsEl = document.getElementById('stats');
  var searchInput = document.getElementById('searchInput');
  var searchCountEl = document.getElementById('searchCount');
  var btnPretty = document.getElementById('btnPretty');
  var btnRaw = document.getElementById('btnRaw');

  // --- Event listeners ---
  btnPretty.addEventListener('click', function() { switchView('pretty'); });
  btnRaw.addEventListener('click', function() { switchView('raw'); });
  document.getElementById('btnCollapseAll').addEventListener('click', collapseAll);
  document.getElementById('btnExpandAll').addEventListener('click', expandAll);
  document.getElementById('btnOpenText').addEventListener('click', function() {
    vscodeApi.postMessage({ type: 'openInTextEditor' });
  });
  searchInput.addEventListener('input', onSearch);

  window.addEventListener('message', function(ev) {
    var msg = ev.data;
    if (msg && msg.type === 'setContent') {
      parseAndRender(msg.content);
    }
  });

  // Tell extension we are ready
  vscodeApi.postMessage({ type: 'ready' });

  // --- Core ---

  function parseAndRender(text) {
    entries = [];
    collapsed = {};
    var lines = text.split('\\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line === '') continue;
      try {
        var obj = JSON.parse(line);
        entries.push({ idx: entries.length, raw: line, parsed: obj, err: null });
      } catch (e) {
        entries.push({ idx: entries.length, raw: line, parsed: null, err: e.message });
      }
    }
    updateStats();
    render();
  }

  function updateStats() {
    var errCount = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].err) errCount++;
    }
    var s = entries.length + ' entries';
    if (errCount > 0) s += ' (' + errCount + ' invalid)';
    statsEl.textContent = s;
  }

  function switchView(v) {
    currentView = v;
    btnPretty.classList.toggle('active', v === 'pretty');
    btnRaw.classList.toggle('active', v === 'raw');
    render();
  }

  function collapseAll() {
    for (var i = 0; i < entries.length; i++) collapsed[i] = true;
    render();
  }

  function expandAll() {
    collapsed = {};
    render();
  }

  function toggleEntry(idx) {
    if (collapsed[idx]) {
      delete collapsed[idx];
    } else {
      collapsed[idx] = true;
    }
    var el = contentEl.querySelector('[data-idx="' + idx + '"]');
    if (el) refreshEntry(el, entries[idx]);
  }

  function copyEntry(idx) {
    var e = entries[idx];
    var text = e.parsed ? JSON.stringify(e.parsed, null, 2) : e.raw;
    vscodeApi.postMessage({ type: 'copyEntry', text: text });
  }

  // Expose to onclick handlers in generated HTML
  window.jsonlToggleEntry = toggleEntry;
  window.jsonlCopyEntry = copyEntry;

  // --- Rendering ---

  function render() {
    if (entries.length === 0) {
      contentEl.innerHTML = '<div class="empty-state">No JSONL entries found</div>';
      return;
    }
    contentEl.innerHTML = '';
    renderedCount = 0;
    if (currentView === 'raw') {
      renderRaw();
    } else {
      renderBatch();
    }
  }

  function renderBatch() {
    var frag = document.createDocumentFragment();
    var end = Math.min(renderedCount + BATCH_SIZE, entries.length);
    for (var i = renderedCount; i < end; i++) {
      var div = document.createElement('div');
      div.className = 'json-entry' + (entries[i].err ? ' error' : '');
      div.setAttribute('data-idx', i);
      refreshEntry(div, entries[i]);
      frag.appendChild(div);
    }
    // Remove existing load-more button
    var existing = contentEl.querySelector('.load-more');
    if (existing) existing.remove();

    contentEl.appendChild(frag);
    renderedCount = end;

    if (renderedCount < entries.length) {
      var lm = document.createElement('div');
      lm.className = 'load-more';
      var remaining = entries.length - renderedCount;
      lm.innerHTML = '<button onclick="window.jsonlLoadMore()">Load ' + Math.min(BATCH_SIZE, remaining) + ' more (' + remaining + ' remaining)</button>';
      contentEl.appendChild(lm);
    }
  }

  window.jsonlLoadMore = function() { renderBatch(); };

  function refreshEntry(div, entry) {
    var i = entry.idx;
    var isCol = !!collapsed[i];
    var arrow = isCol ? '\\u25B6' : '\\u25BC';

    var h = '<div class="entry-header">';
    h += '<span class="entry-idx">' + (i + 1) + '</span>';
    if (!entry.err) {
      h += '<span class="cbtn" onclick="window.jsonlToggleEntry(' + i + ')">' + arrow + '</span>';
    }
    if (entry.err) {
      h += '<span class="error-label">Parse Error: ' + esc(entry.err) + '</span>';
    }
    h += '<span class="copy-btn" onclick="window.jsonlCopyEntry(' + i + ')" title="Copy entry">\\u2398 Copy</span>';
    h += '</div>';

    var block;
    if (entry.err) {
      block = '<div class="json-block">' + applySearch(esc(entry.raw)) + '</div>';
    } else if (isCol) {
      var preview = JSON.stringify(entry.parsed);
      if (preview.length > 220) preview = preview.substring(0, 220) + '\\u2026';
      block = '<div class="json-block collapsed">' + applySearch(esc(preview)) + '</div>';
    } else {
      block = '<div class="json-block">' + colorize(entry.parsed, 0) + '</div>';
    }

    div.innerHTML = h + block;
  }

  function renderRaw() {
    var h = '<div class="raw-view">';
    for (var i = 0; i < entries.length; i++) {
      h += '<div class="raw-line">';
      h += '<span class="raw-ln">' + (i + 1) + '</span>';
      h += '<span class="raw-lt">' + applySearch(esc(entries[i].raw)) + '</span>';
      h += '</div>';
    }
    h += '</div>';
    contentEl.innerHTML = h;
  }

  // --- Syntax Coloring (jq style) ---

  function colorize(val, depth) {
    if (val === null) return applySearch('<span class="jl">null</span>');
    if (typeof val === 'boolean') return applySearch('<span class="jb">' + val + '</span>');
    if (typeof val === 'number') return applySearch('<span class="jn">' + val + '</span>');
    if (typeof val === 'string') return applySearch('<span class="js">"' + esc(val) + '"</span>');
    if (Array.isArray(val)) return colorizeArr(val, depth);
    if (typeof val === 'object') return colorizeObj(val, depth);
    return applySearch(esc(String(val)));
  }

  function colorizeObj(obj, depth) {
    var keys = Object.keys(obj);
    if (keys.length === 0) return '<span class="jc">{}</span>';
    var ind = indent(depth + 1);
    var cind = indent(depth);
    var out = '<span class="jc">{</span>\\n';
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      out += ind;
      out += applySearch('<span class="jk">"' + esc(k) + '"</span>');
      out += '<span class="jx">: </span>';
      out += colorize(obj[k], depth + 1);
      if (i < keys.length - 1) out += '<span class="jm">,</span>';
      out += '\\n';
    }
    out += cind + '<span class="jc">}</span>';
    return out;
  }

  function colorizeArr(arr, depth) {
    if (arr.length === 0) return '<span class="jp">[]</span>';
    // Compact small primitive arrays
    if (arr.length <= 6) {
      var allPrim = true;
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] !== null && typeof arr[j] === 'object') { allPrim = false; break; }
      }
      if (allPrim) {
        var items = [];
        for (var j = 0; j < arr.length; j++) items.push(colorize(arr[j], depth));
        return '<span class="jp">[</span>' + items.join('<span class="jm">, </span>') + '<span class="jp">]</span>';
      }
    }
    var ind = indent(depth + 1);
    var cind = indent(depth);
    var out = '<span class="jp">[</span>\\n';
    for (var i = 0; i < arr.length; i++) {
      out += ind;
      out += colorize(arr[i], depth + 1);
      if (i < arr.length - 1) out += '<span class="jm">,</span>';
      out += '\\n';
    }
    out += cind + '<span class="jp">]</span>';
    return out;
  }

  function indent(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '  ';
    return s;
  }

  // --- Search ---

  function onSearch() {
    searchTerm = searchInput.value;
    render();
    if (searchTerm) {
      var allText = '';
      for (var i = 0; i < entries.length; i++) allText += entries[i].raw + '\\n';
      var rx = new RegExp(escRx(searchTerm), 'gi');
      var m = allText.match(rx);
      searchCountEl.textContent = (m ? m.length : 0) + ' matches';
    } else {
      searchCountEl.textContent = '';
    }
  }

  function applySearch(html) {
    if (!searchTerm) return html;
    var rx = new RegExp('(' + escRx(searchTerm) + ')', 'gi');
    return html.replace(/>([^<]*)</g, function(full, text) {
      return '>' + text.replace(rx, '<span class="sh">$1</span>') + '<';
    });
  }

  function escRx(s) {
    return s.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
  }

  // --- Util ---

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
</script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { activate, deactivate };
