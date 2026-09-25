/*
 * Critic Layer — injectable review + markup + live-edit overlay
 * ------------------------------------------------------------
 * Injected into a live page via claude-in-chrome's javascript_tool. The designer
 * works in one of three modes, all driven from a single on-page HUD:
 *
 *   • Pick  — click any element to pin a sticky NOTE (anchored to the DOM node).
 *   • Draw  — freehand / arrow / shape MARKUP drawn over the page (like circling
 *             something on a printout). Vector strokes, undo/redo, colors.
 *   • Edit  — click an element to open a live EDIT panel (text / style / attrs /
 *             html). Edits mutate the real DOM (WYSIWYG) AND record an exact
 *             before→after diff, so the change survives as a precise directive.
 *
 * Everything is read back on demand with:
 *   JSON.stringify(window.__CRITIC__.export())
 * which returns { notes, drawings, edits, ... } for the synthesis pipeline.
 *
 * Design constraints (unchanged from the notes-only overlay):
 *  - Idempotent: re-injection re-uses the existing instance, never duplicates.
 *  - Never calls window.prompt/alert/confirm (they freeze the browser bridge).
 *    All text entry is inline DOM inputs.
 *  - All overlay nodes are id/class-namespaced so they never pick themselves and
 *    cleanup stays a one-liner.
 *  - Pins re-anchor to their element on scroll/resize/re-render; drawings re-anchor/reposition on scroll/resize/re-render.
 *  - Export is versioned + self-describing (schemaVersion, url, viewport, timestamp, notes) and reachable three ways: the API, the HUD Export button (clipboard), and a console dump — so notes survive losing the MCP bridge.
 */
(function () {
  'use strict';
  var PREFIX = '__critic__';
  var Z = 2147480000; // above almost everything, below nothing sane

  // Idempotency: if already booted AND our DOM is still attached, re-show and
  // bail. If the page tore our nodes out (aggressive SPA re-render, document
  // rewrite) the old instance is a zombie: salvage its notes, tear down its
  // listeners, and rebuild fresh so re-injection always yields a working HUD.
  var salvagedCapture = null;
  var salvagedNotes = null;
  var salvagedSeq = 0;
  if (window.__CRITIC__ && window.__CRITIC__.__booted) {
    if (document.getElementById(PREFIX + 'root')) {
      window.__CRITIC__.show();
      return '__CRITIC__ already active: ' + window.__CRITIC__.notes.length + ' note(s)';
    }
    try {
      salvagedCapture = window.__CRITIC__.export();
      salvagedNotes = window.__CRITIC__.notes.slice();
      salvagedNotes.forEach(function (n) {
        var m = /^note_(\d+)$/.exec(n.id || '');
        if (m) salvagedSeq = Math.max(salvagedSeq, +m[1]);
      });
    } catch (e) { salvagedNotes = null; salvagedSeq = 0; }
    try { window.__CRITIC__.destroy(); } catch (e) { try { window.__CRITIC__ = undefined; } catch (e2) {} }
  }

  var CATEGORIES = ['layout', 'typography', 'spacing', 'color', 'hierarchy',
    'interaction', 'copy', 'performance', 'bug', 'accessibility'];
  var SEVERITIES = ['low', 'medium', 'high', 'blocker'];
  var SEV_COLOR = { low: '#8a8a8a', medium: '#d8a200', high: '#ff5b45', blocker: '#c1121f' };

  var DRAW_TOOLS = ['pen', 'arrow', 'line', 'rect', 'ellipse'];
  var DRAW_COLORS = ['#ff5b45', '#d8a200', '#2ea3ff', '#28c76f', '#111111'];

  // Inline style properties the Edit panel exposes, in panel order. Each maps a
  // friendly label to a CSS property read from computed style and written inline.
  var STYLE_FIELDS = [
    { key: 'color', label: 'Text color', css: 'color' },
    { key: 'backgroundColor', label: 'Background', css: 'background-color' },
    { key: 'fontSize', label: 'Font size', css: 'font-size' },
    { key: 'fontWeight', label: 'Weight', css: 'font-weight' },
    { key: 'textAlign', label: 'Align', css: 'text-align' },
    { key: 'padding', label: 'Padding', css: 'padding' },
    { key: 'margin', label: 'Margin', css: 'margin' },
    { key: 'borderRadius', label: 'Radius', css: 'border-radius' },
    { key: 'border', label: 'Border', css: 'border' },
  ];

  var state = {
    notes: salvagedNotes || [],
    drawings: [],       // committed vector strokes {id,tool,color,width,pts[],label}
    drawRedo: [],       // undo/redo stack for drawings
    edits: [],          // live edits with before→after diffs
    seq: salvagedSeq,
    drawSeq: 0,
    editSeq: 0,
    mode: 'pick',       // 'pick' | 'draw' | 'edit' | 'off'
    picking: true,
    drawTool: 'pen',
    drawColor: '#ff5b45',
    drawWidth: 3,
    viewport: null,
  };

  // ---- DOM helpers -------------------------------------------------------
  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function own(node) {
    return !!(node && node.nodeType === 1 &&
      (String(node.id).indexOf(PREFIX) === 0 || (node.closest && node.closest('[id^="' + PREFIX + '"]'))));
  }
  function pickable(node) {
    if (!node || node.nodeType !== 1) return false;
    if (own(node)) return false;
    var t = node.tagName;
    if (t === 'HTML' || t === 'BODY' || t === 'SCRIPT' || t === 'STYLE') return false;
    var r = node.getBoundingClientRect();
    return r.width >= 16 && r.height >= 16;
  }
  // A robust-ish element identity that survives re-renders: id-first, then
  // tag+classes, then tag+text snippet. Mirrors the anchor-snapshot strategy.
  function anchorSnapshot(node) {
    return {
      tag: node.tagName.toLowerCase(),
      id: node.id || '',
      classes: Array.prototype.slice.call(node.classList || []),
      text: (node.textContent || '').trim().slice(0, 120),
      selector: cssPath(node),
    };
  }
  function cssPath(node) {
    if (node.id) return '#' + CSS.escape(node.id);
    var parts = [];
    var cur = node;
    while (cur && cur.nodeType === 1 && parts.length < 5 && cur.tagName !== 'BODY') {
      var sel = cur.tagName.toLowerCase();
      if (cur.classList && cur.classList.length) {
        sel += '.' + Array.prototype.slice.call(cur.classList).slice(0, 2).map(function (c) { return CSS.escape(c); }).join('.');
      }
      var parent = cur.parentNode;
      if (parent && parent.children) {
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === cur.tagName; });
        if (same.length > 1) sel += ':nth-of-type(' + (Array.prototype.indexOf.call(same, cur) + 1) + ')';
      }
      parts.unshift(sel);
      cur = cur.parentNode;
    }
    return parts.join(' > ');
  }
  // Re-find an element from its snapshot (best-effort, for re-anchoring).
  function anchorResult(snap) {
    if (!snap || !snap.tag) return { status: 'missing', node: null };
    function matches(n) {
      return !own(n) && n.tagName.toLowerCase() === snap.tag &&
        (!snap.text || (n.textContent || '').trim().slice(0, 120) === snap.text);
    }
    try {
      var candidates = [];
      if (snap.id) candidates = Array.from(document.querySelectorAll('#' + CSS.escape(snap.id))).filter(matches);
      if (!candidates.length && snap.selector) candidates = Array.from(document.querySelectorAll(snap.selector)).filter(matches);
      if (!candidates.length && snap.classes && snap.classes.length) candidates = Array.from(document.querySelectorAll(snap.tag + '.' + snap.classes.map(function(c) { return CSS.escape(c); }).join('.'))).filter(matches);
      if (candidates.length === 1) return { status: 'matched', node: candidates[0] };
      return { status: candidates.length > 1 ? 'ambiguous' : 'missing', node: null };
    } catch (error) { return { status: 'missing', node: null }; }
  }
  function resolveAnchor(snap) { return anchorResult(snap).node; }
  function descOf(node) {
    var s = node.tagName.toLowerCase();
    if (node.id) s += '#' + node.id;
    if (node.classList && node.classList.length) s += '.' + Array.prototype.slice.call(node.classList).slice(0, 2).join('.');
    return s;
  }

  // ---- Overlay roots -----------------------------------------------------
  var root = el('div', 'position:fixed;inset:0;pointer-events:none;z-index:' + Z + ';');
  root.id = PREFIX + 'root';
  var highlight = el('div', 'position:fixed;pointer-events:none;border:2px solid #ff5b45;background:rgba(255,91,69,0.08);display:none;z-index:' + (Z + 1) + ';box-sizing:border-box;');
  highlight.id = PREFIX + 'hl';
  var tip = el('div', 'position:fixed;pointer-events:none;background:#111;color:#fff;font:11px/1.4 ui-monospace,Menlo,monospace;padding:3px 7px;border-radius:5px;display:none;z-index:' + (Z + 2) + ';white-space:nowrap;');
  tip.id = PREFIX + 'tip';
  // SVG markup layer. pointer-events toggles to 'auto' only in draw mode so it
  // never eats clicks meant for the page or for picking/editing.
  var drawSvg = svgEl('svg', { id: PREFIX + 'draw' });
  drawSvg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (Z + 2) + ';overflow:visible;';
  var pinLayer = el('div', 'position:fixed;inset:0;pointer-events:none;z-index:' + (Z + 3) + ';');
  pinLayer.id = PREFIX + 'pins';
  // A faint persistent outline marks elements the designer has live-edited.
  var styleTag = el('style');
  styleTag.id = PREFIX + 'style';
  styleTag.textContent = '.' + PREFIX + 'edited{outline:1.5px dashed rgba(46,163,255,0.9)!important;outline-offset:1px;}';

  // ---- HUD -----------------------------------------------------------------
  // Single-row rounded pill: brand mark, mode segments, count chips.
  var ICONS = {
    mark: '<svg width="11" height="11" viewBox="0 0 11 11"><path d="M8.5 0.5L2.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
    pick: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    draw: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 14l1-3.2L10.5 3.3a1.4 1.4 0 012 0l.2.2a1.4 1.4 0 010 2L5.2 13 2 14z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    edit: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 13.5H14M2.5 13.5l.3-2.4 6.7-6.7a1.3 1.3 0 011.9 0l.9.9a1.3 1.3 0 010 1.9l-6.7 6.7-2.4.3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    notes: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 3.5h12M2 8h12M2 12.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    exp: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 4.5L8 1.5l3 3M2.5 9.5v3a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clear: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4.5 4.5l.6 8.5a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    undo: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 4L2.5 7 6 10M2.8 7H10a3.5 3.5 0 010 7H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    redo: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 4l3.5 3L10 10M13.2 7H6a3.5 3.5 0 000 7h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  var hud = el('div', 'position:fixed;top:12px;right:12px;pointer-events:auto;z-index:' + (Z + 5) + ';display:flex;align-items:stretch;gap:1px;background:rgba(15,15,15,0.94);backdrop-filter:blur(8px);color:#fff;font:12px/1.4 Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,0.08);border-radius:999px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,0.45);');
  hud.id = PREFIX + 'hud';

  var markChip = el('div', 'display:flex;align-items:center;justify-content:center;width:26px;color:#ff5b45;flex-shrink:0;');
  markChip.innerHTML = ICONS.mark;
  markChip.title = 'Critic Layer';
  hud.appendChild(markChip);
  hud.appendChild(divider());

  function segBtnCss() {
    return 'display:flex;align-items:center;gap:5px;padding:6px 12px;background:transparent;color:#fff;border:0;border-radius:999px;font:12px Inter,system-ui,sans-serif;white-space:nowrap;cursor:pointer;';
  }
  function divider() { return el('div', 'width:1px;align-self:center;height:16px;background:rgba(255,255,255,0.1);'); }
  function iconBtn(icon, label) {
    var b = el('button', segBtnCss());
    var i = el('span', 'display:inline-flex;flex-shrink:0;'); i.innerHTML = icon;
    b.appendChild(i);
    if (label != null) b.appendChild(el('span', '', label));
    return b;
  }

  // Three mode toggles. Clicking a mode activates it (and deactivates the rest);
  // clicking the active mode turns everything off (mode 'off' = inert overlay).
  var pickBtn = iconBtn(ICONS.pick, 'Pick');
  var drawBtn = iconBtn(ICONS.draw, 'Draw');
  var editBtn = iconBtn(ICONS.edit, 'Edit');
  var listBtn = iconBtn(ICONS.notes, 'Notes');
  var exportBtn = iconBtn(ICONS.exp, 'Export');
  exportBtn.title = 'Copy all notes as JSON (also logged to the console)';
  var clearBtn = iconBtn(ICONS.clear, 'Clear all');
  clearBtn.style.color = '#8a8a8a';
  hud.appendChild(pickBtn); hud.appendChild(divider());
  hud.appendChild(drawBtn); hud.appendChild(divider());
  hud.appendChild(editBtn); hud.appendChild(divider());
  hud.appendChild(listBtn); hud.appendChild(divider());
  hud.appendChild(exportBtn); hud.appendChild(divider());
  hud.appendChild(clearBtn); hud.appendChild(divider());

  var countBadge = el('span', 'display:flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;font:11px ui-monospace,Menlo,monospace;font-weight:700;color:#fff;background:#ff5b45;border-radius:999px;margin:2px 2px 2px 0;box-shadow:0 0 0 1px rgba(0,0,0,0.3);', '0');
  countBadge.title = 'notes · drawings · edits';
  hud.appendChild(countBadge);

  var hint = el('div', 'position:fixed;top:44px;right:12px;pointer-events:none;color:#eee;font:11px Inter,system-ui,sans-serif;background:rgba(15,15,15,0.94);padding:4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.08);opacity:0;transition:opacity .15s;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:' + (Z + 5) + ';');
  hint.id = PREFIX + 'hint';

  // ---- Draw sub-toolbar (visible only in Draw mode) ----------------------
  var drawBar = el('div', 'position:fixed;top:44px;right:12px;pointer-events:auto;z-index:' + (Z + 5) + ';display:none;align-items:center;gap:8px;background:rgba(15,15,15,0.94);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.08);border-radius:999px;padding:5px 8px;box-shadow:0 8px 24px rgba(0,0,0,0.45);');
  drawBar.id = PREFIX + 'drawbar';
  var toolBtns = {};
  DRAW_TOOLS.forEach(function (t) {
    var b = el('button', 'display:flex;align-items:center;justify-content:center;width:26px;height:24px;background:transparent;color:#fff;border:0;border-radius:7px;cursor:pointer;font:11px Inter,system-ui,sans-serif;');
    b.textContent = ({ pen: '✎', arrow: '↗', line: '／', rect: '▭', ellipse: '◯' })[t];
    b.title = t;
    b.addEventListener('click', function (e) { e.stopPropagation(); state.drawTool = t; syncDrawBar(); });
    toolBtns[t] = b;
    drawBar.appendChild(b);
  });
  drawBar.appendChild(divider());
  var colorBtns = {};
  DRAW_COLORS.forEach(function (c) {
    var b = el('button', 'width:18px;height:18px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;');
    b.style.background = c;
    b.addEventListener('click', function (e) { e.stopPropagation(); state.drawColor = c; syncDrawBar(); });
    colorBtns[c] = b;
    drawBar.appendChild(b);
  });
  drawBar.appendChild(divider());
  var undoBtn = iconBtn(ICONS.undo, null); undoBtn.style.padding = '5px 7px';
  var redoBtn = iconBtn(ICONS.redo, null); redoBtn.style.padding = '5px 7px';
  undoBtn.title = 'Undo stroke'; redoBtn.title = 'Redo stroke';
  undoBtn.addEventListener('click', function (e) { e.stopPropagation(); undoDraw(); });
  redoBtn.addEventListener('click', function (e) { e.stopPropagation(); redoDraw(); });
  drawBar.appendChild(undoBtn);
  drawBar.appendChild(redoBtn);
  drawBar.appendChild(divider());
  // Optional label attached to the most recent stroke (the "annotate what I drew"
  // input). Enter commits the label onto the last drawing.
  var drawLabel = el('input', 'width:150px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:999px;outline:0;font:11px Inter,system-ui,sans-serif;padding:4px 10px;');
  drawLabel.type = 'text';
  drawLabel.placeholder = 'Label last mark…';
  drawLabel.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var last = state.drawings[state.drawings.length - 1];
      if (last) { last.label = drawLabel.value.trim(); drawLabel.value = ''; showHint('Labeled.', 1200); }
    } else e.stopPropagation();
  });
  ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) {
    drawLabel.addEventListener(ev, function (e) { e.stopPropagation(); }, false);
  });
  drawBar.appendChild(drawLabel);
  function syncDrawBar() {
    DRAW_TOOLS.forEach(function (t) {
      toolBtns[t].style.background = state.drawTool === t ? 'rgba(255,255,255,0.16)' : 'transparent';
    });
    DRAW_COLORS.forEach(function (c) {
      colorBtns[c].style.borderColor = state.drawColor === c ? '#fff' : 'transparent';
    });
    undoBtn.style.opacity = state.drawings.length ? '1' : '0.4';
    redoBtn.style.opacity = state.drawRedo.length ? '1' : '0.4';
  }

  stop(hud); // clicks on the HUD never fall through to the page
  stop(drawBar);

  // ---- Wiring ------------------------------------------------------------
  // Bubble-phase, not capture: a capture-phase stopPropagation on an ancestor
  // (hud/editor) would stop the event before it ever reaches a descendant
  // button/select, silently killing every click handler inside. Bubble phase
  // lets the target's own listener fire first, then keeps the click from
  // escaping the overlay afterward.
  function stop(node) {
    ['pointerdown', 'mousedown', 'click', 'pointerup', 'focusin'].forEach(function (ev) {
      node.addEventListener(ev, function (e) { e.stopPropagation(); }, false);
    });
  }

  // Hover highlight applies in Pick and Edit modes (both target an element).
  function onMove(e) {
    var hovering = (state.mode === 'pick' || state.mode === 'edit') && editingNoteId == null;
    if (!hovering) { highlight.style.display = 'none'; tip.style.display = 'none'; return; }
    var t = document.elementFromPoint(e.clientX, e.clientY);
    if (!pickable(t)) { highlight.style.display = 'none'; tip.style.display = 'none'; return; }
    var r = t.getBoundingClientRect();
    var accent = state.mode === 'edit' ? '#2ea3ff' : '#ff5b45';
    highlight.style.borderColor = accent;
    highlight.style.background = state.mode === 'edit' ? 'rgba(46,163,255,0.08)' : 'rgba(255,91,69,0.08)';
    highlight.style.display = 'block';
    highlight.style.top = r.top + 'px'; highlight.style.left = r.left + 'px';
    highlight.style.width = r.width + 'px'; highlight.style.height = r.height + 'px';
    tip.style.display = 'block';
    tip.textContent = descOf(t);
    tip.style.top = Math.max(0, r.top - 18) + 'px';
    tip.style.left = r.left + 'px';
  }
  function onClick(e) {
    // Click-away dismisses an open note editor instead of falling through.
    if (editingNoteId != null && !own(document.elementFromPoint(e.clientX, e.clientY))) {
      e.preventDefault(); e.stopPropagation();
      closeNoteEditor();
      return;
    }
    if (state.mode === 'pick') return onPickClick(e);
    if (state.mode === 'edit') return onEditClick(e);
  }
  function onPickClick(e) {
    var t = document.elementFromPoint(e.clientX, e.clientY);
    if (!pickable(t)) return;
    e.preventDefault(); e.stopPropagation();
    var r = t.getBoundingClientRect();
    var note = {
      id: 'note_' + String(++state.seq).padStart(3, '0'),
      url: location.pathname,
      viewport: state.viewport || (window.innerWidth + 'x' + window.innerHeight),
      x: +((e.clientX - r.left) / Math.max(1, r.width)).toFixed(3),  // element-local, normalized
      y: +((e.clientY - r.top) / Math.max(1, r.height)).toFixed(3),
      pageX: Math.round(e.clientX + window.scrollX),
      pageY: Math.round(e.clientY + window.scrollY),
      anchor: anchorSnapshot(t),
      element_label: descOf(t),
      category: 'hierarchy',
      severity: 'medium',
      note: '',
      desired_change: '',
      authoredBy: 'user',
      status: 'open',
      createdAt: Date.now(),
    };
    state.notes.push(note);
    openNoteEditor(note);
  }

  // ---- Pins + note editor (unchanged behavior) ---------------------------
  function pinPos(note) {
    var node = resolveAnchor(note.anchor);
    if (node) {
      var r = node.getBoundingClientRect();
      return { x: r.left + note.x * r.width, y: r.top + note.y * r.height, live: true };
    }
    return { x: note.pageX - window.scrollX, y: note.pageY - window.scrollY, live: false };
  }
  // A note pin is just a 14px dot until you click it — no card, no header.
  // Clicking opens a slender inline bar next to the dot (single-line input,
  // compact category/severity; Enter/blur/Escape all commit, except Escape on
  // a still-empty note discards the accidental pin); fields it doesn't need
  // stay hidden entirely instead of an empty shell.
  function render() {
    updateCounts();
    pinLayer.innerHTML = '';
    state.notes.forEach(function (note, i) {
      pinLayer.appendChild(buildPin(note, i));
    });
    renderDraw();
    syncDrawBar();
  }
  // Scroll/resize fire on any nested scrollable/pannable ancestor (capture
  // phase catches those even though 'scroll' doesn't bubble) — potentially
  // many times a second while dragging a board. A full render() would tear
  // down and rebuild every pin's DOM, including the one currently focused
  // for text entry, firing blur -> auto-close-and-discard mid-keystroke.
  // Reposition-only: move existing wraps, never touch their children/focus.
  // rAF-coalesced: resolveAnchor runs querySelector per note, so raw scroll
  // events on a heavy page would otherwise burn a frame budget for nothing.
  function updateCounts() {
    countBadge.textContent = state.notes.length + ' · ' + state.drawings.length + ' · ' + state.edits.length;
  }
  // Reposition-only: move existing wraps + redraw the vector layer, never touch
  // children/focus (a full render() mid-keystroke blurs the focused input).
  function reposition() {
    for (var i = 0; i < pinLayer.children.length; i++) {
      var wrap = pinLayer.children[i];
      var note = null;
      for (var j = 0; j < state.notes.length; j++) {
        if (state.notes[j].id === wrap.dataset.noteId) { note = state.notes[j]; break; }
      }
      if (!note) continue;
      var p = pinPos(note);
      wrap.style.left = p.x + 'px';
      wrap.style.top = p.y + 'px';
      wrap.style.display = pinVisible(note, p) ? 'flex' : 'none';
    }
    renderDraw();
  }
  var repositionQueued = false;
  function scheduleReposition() {
    if (repositionQueued) return;
    repositionQueued = true;
    requestAnimationFrame(function () { repositionQueued = false; reposition(); });
  }
  // A dead-anchored pin from a *different* SPA route is pure noise on the
  // current one (its pageX/pageY fallback points at the old page's layout) —
  // hide it instead of drawing a misleading dot. It comes back if the user
  // navigates back and the anchor resolves, and it always stays in the export.
  function pinVisible(note, p) {
    if (editingNoteId === note.id) return true;
    return p.live || note.url === location.pathname;
  }
  function onRouteChange() { render(); }

  function buildPin(note, i) {
    var p = pinPos(note);
    var editing = editingNoteId === note.id;
    var wrap = el('div', 'position:fixed;pointer-events:auto;display:flex;align-items:flex-start;gap:6px;touch-action:none;transform:translate(-7px,-7px);z-index:' + (Z + (editing ? 6 : 3)) + ';');
    wrap.style.left = p.x + 'px'; wrap.style.top = p.y + 'px';
    if (!pinVisible(note, p)) wrap.style.display = 'none';
    wrap.dataset.noteId = note.id;

    var dot = el('div', 'width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);flex-shrink:0;cursor:grab;');
    dot.style.background = SEV_COLOR[note.severity] || '#ff5b45';
    dot.style.opacity = p.live ? '1' : '0.5';
    dot.title = '#' + (i + 1) + ' ' + note.category + ' / ' + note.severity + (note.note ? ' — ' + note.note : '');
    wrap.appendChild(dot);

    if (editing) {
      wrap.appendChild(buildEditingBar(note));
      stop(wrap);
    } else {
      if (note.note) {
        wrap.appendChild(el('div', 'background:rgba(17,17,17,0.97);color:#fff;font:12px/1.4 Inter,system-ui,sans-serif;padding:4px 9px;border-radius:8px;margin-top:-2px;max-width:220px;pointer-events:none;white-space:pre-wrap;word-break:break-word;box-shadow:0 3px 10px rgba(0,0,0,0.35);', note.note));
      }
      wireDrag(wrap, dot, note);
    }
    return wrap;
  }

  function updateNoteFromScreenPos(note, sx, sy) {
    var node = resolveAnchor(note.anchor);
    if (node) {
      var r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        note.x = +((sx - r.left) / r.width).toFixed(3);
        note.y = +((sy - r.top) / r.height).toFixed(3);
      }
    }
    note.pageX = Math.round(sx + window.scrollX);
    note.pageY = Math.round(sy + window.scrollY);
  }
  function wireDrag(wrap, dot, note) {
    dot.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      if (e.button) return;
      var startX = e.clientX, startY = e.clientY;
      var p0 = pinPos(note);
      var dragging = false;
      try { dot.setPointerCapture(e.pointerId); } catch (err) {}
      function onMove(ev) {
        var dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 4) { dragging = true; dot.style.cursor = 'grabbing'; }
        if (!dragging) return;
        wrap.style.left = (p0.x + dx) + 'px'; wrap.style.top = (p0.y + dy) + 'px';
      }
      function onUp(ev) {
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        dot.style.cursor = 'grab';
        if (dragging) {
          updateNoteFromScreenPos(note, p0.x + (ev.clientX - startX), p0.y + (ev.clientY - startY));
          render();
        } else {
          openNoteEditor(note);
        }
      }
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
    }, false);
  }

  var editingNoteId = null;
  var justOpenedNoteId = null;
  function showHint(text, autoHideMs) {
    hint.textContent = text;
    hint.style.opacity = '1';
    if (showHint.__t) clearTimeout(showHint.__t);
    if (autoHideMs) showHint.__t = setTimeout(function () { hint.style.opacity = '0'; }, autoHideMs);
  }
  function setPicking(on) {
    state.picking = on;
    pickBtn.lastChild.textContent = 'Picking: ' + (on ? 'ON' : 'OFF');
    pickBtn.style.background = on ? '#ff5b45' : 'transparent';
    if (!on) { highlight.style.display = 'none'; tip.style.display = 'none'; }
  }
  // Editing a note suppresses element picking/editing (via the editingNoteId gate
  // in onMove/onClick) so reading context around the page doesn't stamp/select.
  function closeEditor() { closeNoteEditor(); }
  function closeNoteEditor() {
    editingNoteId = null;
    render();
  }
  function openNoteEditor(note) {
    editingNoteId = note.id;
    justOpenedNoteId = note.id;
    highlight.style.display = 'none'; tip.style.display = 'none';
    render();
    requestAnimationFrame(function () {
      var input = pinLayer.querySelector('[data-note-id="' + note.id + '"] input[data-role="note-text"]');
      if (input) input.focus();
    });
  }
  function buildEditingBar(note) {
    var animate = justOpenedNoteId === note.id;
    justOpenedNoteId = null;
    var box = el('div', 'display:flex;flex-direction:column;gap:7px;background:rgba(17,17,17,0.97);backdrop-filter:blur(8px);color:#fff;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:9px 10px;margin-top:-2px;min-width:220px;max-width:280px;box-shadow:0 10px 28px rgba(0,0,0,0.5);transition:opacity .14s ease-out,transform .14s ease-out;' +
      (animate ? 'opacity:0;transform:translateY(-2px) scale(0.98);' : 'opacity:1;transform:none;'));
    if (animate) {
      requestAnimationFrame(function () { box.style.opacity = '1'; box.style.transform = 'translateY(0) scale(1)'; });
    }

    function commitAndClose(e) { if (e) { e.preventDefault(); e.stopPropagation(); } closeEditor(); }
    // Escape on a note with no text yet = an accidental pin; discard it so
    // stray clicks don't leave empty notes polluting the export.
    function editorKeydown(e) {
      if (e.key === 'Enter') { commitAndClose(e); return; }
      if (e.key === 'Escape') {
        if (!note.note && !note.desired_change) removeNote(note);
        commitAndClose(e);
        return;
      }
      e.stopPropagation();
    }

    var row1 = el('div', 'display:flex;align-items:center;gap:6px;');
    var input = el('input', 'flex:1;min-width:0;background:transparent;color:#fff;border:0;outline:0;font:12px Inter,system-ui,sans-serif;padding:2px 0;');
    input.type = 'text';
    input.placeholder = "What's wrong here?";
    input.value = note.note;
    input.setAttribute('data-role', 'note-text');
    input.addEventListener('input', function () { note.note = input.value; });
    input.addEventListener('keydown', editorKeydown);
    input.addEventListener('blur', function () {
      setTimeout(function () { if (editingNoteId === note.id && !box.contains(document.activeElement)) closeNoteEditor(); }, 100);
    });
    ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) {
      input.addEventListener(ev, function (e) { e.stopPropagation(); }, false);
    });
    row1.appendChild(input);

    var closeBtn = el('button', 'flex-shrink:0;width:18px;height:18px;line-height:16px;text-align:center;background:transparent;color:#8a8a8a;border:0;border-radius:999px;cursor:pointer;font:13px monospace;padding:0;', '×');
    closeBtn.title = 'Delete this note';
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); removeNote(note); closeEditor(); });
    row1.appendChild(closeBtn);
    box.appendChild(row1);

    var row2 = el('div', 'display:flex;gap:6px;');
    row2.appendChild(miniSelect(SEVERITIES, note.severity, function (v) { note.severity = v; render(); }));
    row2.appendChild(miniSelect(CATEGORIES, note.category, function (v) { note.category = v; render(); }));
    box.appendChild(row2);

    var dc = el('input', 'background:transparent;color:#8a8a8a;border:0;border-top:1px solid rgba(255,255,255,0.08);outline:0;font:11px Inter,system-ui,sans-serif;padding:6px 0 0;');
    dc.type = 'text';
    dc.placeholder = 'Desired change (optional)';
    dc.value = note.desired_change;
    dc.addEventListener('input', function () { note.desired_change = dc.value; });
    dc.addEventListener('keydown', editorKeydown);
    ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) {
      dc.addEventListener(ev, function (e) { e.stopPropagation(); }, false);
    });
    box.appendChild(dc);

    return box;
  }
  function miniSelect(opts, val, onChange) {
    var s = el('select', 'flex:1;min-width:0;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:4px 8px;font:10px Inter,system-ui,sans-serif;cursor:pointer;');
    opts.forEach(function (o) {
      var opt = el('option', '', o); opt.value = o; if (o === val) opt.selected = true; s.appendChild(opt);
    });
    stop(s);
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }
  function removeNote(note) {
    var i = state.notes.indexOf(note);
    if (i >= 0) state.notes.splice(i, 1);
    render();
  }

  // ==== DRAW MODE =========================================================
  // Strokes are stored in PAGE coordinates so they stay glued to content on
  // scroll; renderDraw() projects them to screen space each frame.
  var drawing = null; // in-progress stroke while the pointer is down
  function pageToScreen(pt) { return { x: pt.px - window.scrollX, y: pt.py - window.scrollY }; }
  function screenToPage(x, y) { return { px: x + window.scrollX, py: y + window.scrollY }; }

  function onDrawDown(e) {
    if (state.mode !== 'draw' || e.button) return;
    e.preventDefault(); e.stopPropagation();
    var start = screenToPage(e.clientX, e.clientY);
    drawing = {
      id: 'draw_' + String(++state.drawSeq).padStart(3, '0'),
      tool: state.drawTool,
      color: state.drawColor,
      width: state.drawWidth,
      pts: [start],
      label: '',
      viewport: state.viewport || (window.innerWidth + 'x' + window.innerHeight),
      url: location.pathname,
      createdAt: Date.now(),
    };
    try { drawSvg.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onDrawMove(e) {
    if (!drawing) return;
    var p = screenToPage(e.clientX, e.clientY);
    if (drawing.tool === 'pen') drawing.pts.push(p);
    else drawing.pts[1] = p; // shapes/lines/arrows use start+current
    renderDraw();
  }
  function onDrawUp(e) {
    if (!drawing) return;
    // Discard a zero-length tap so a stray click doesn't leave a dot artifact.
    var meaningful = drawing.tool === 'pen'
      ? drawing.pts.length > 2
      : (drawing.pts[1] && Math.hypot(drawing.pts[1].px - drawing.pts[0].px, drawing.pts[1].py - drawing.pts[0].py) > 6);
    if (meaningful) { state.drawings.push(drawing); state.drawRedo.length = 0; }
    drawing = null;
    render();
  }
  function undoDraw() {
    if (!state.drawings.length) return;
    state.drawRedo.push(state.drawings.pop());
    render();
  }
  function redoDraw() {
    if (!state.drawRedo.length) return;
    state.drawings.push(state.drawRedo.pop());
    render();
  }
  function pathFromStroke(s) {
    var pts = s.pts.map(pageToScreen);
    if (!pts.length) return null;
    var g = svgEl('g');
    var common = { stroke: s.color, 'stroke-width': s.width, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    if (s.tool === 'pen') {
      var d = 'M' + pts[0].x + ' ' + pts[0].y + pts.slice(1).map(function (p) { return 'L' + p.x + ' ' + p.y; }).join('');
      g.appendChild(svgEl('path', Object.assign({ d: d }, common)));
    } else if (pts.length >= 2) {
      var a = pts[0], b = pts[1];
      if (s.tool === 'line' || s.tool === 'arrow') {
        g.appendChild(svgEl('line', Object.assign({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, common)));
        if (s.tool === 'arrow') {
          var ang = Math.atan2(b.y - a.y, b.x - a.x), len = 12;
          var p1x = b.x - len * Math.cos(ang - Math.PI / 7), p1y = b.y - len * Math.sin(ang - Math.PI / 7);
          var p2x = b.x - len * Math.cos(ang + Math.PI / 7), p2y = b.y - len * Math.sin(ang + Math.PI / 7);
          g.appendChild(svgEl('path', Object.assign({ d: 'M' + p1x + ' ' + p1y + 'L' + b.x + ' ' + b.y + 'L' + p2x + ' ' + p2y }, common)));
        }
      } else if (s.tool === 'rect') {
        g.appendChild(svgEl('rect', Object.assign({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), rx: 4 }, common)));
      } else if (s.tool === 'ellipse') {
        g.appendChild(svgEl('ellipse', Object.assign({ cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, rx: Math.abs(b.x - a.x) / 2, ry: Math.abs(b.y - a.y) / 2 }, common)));
      }
    }
    // A drawn label rides at the stroke's end/last point.
    if (s.label) {
      var lp = pts[pts.length - 1];
      var t = svgEl('text', { x: lp.x + 6, y: lp.y - 6, fill: s.color, 'font-family': 'Inter,system-ui,sans-serif', 'font-size': 12, 'font-weight': 600, 'paint-order': 'stroke', stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 3 });
      t.textContent = s.label;
      g.appendChild(t);
    }
    return g;
  }
  function renderDraw() {
    while (drawSvg.firstChild) drawSvg.removeChild(drawSvg.firstChild);
    state.drawings.forEach(function (s) { var g = pathFromStroke(s); if (g) drawSvg.appendChild(g); });
    if (drawing) { var g2 = pathFromStroke(drawing); if (g2) drawSvg.appendChild(g2); }
  }

  // ==== EDIT MODE =========================================================
  // Live edit + capture. Selecting an element snapshots `before`; every field
  // mutates the real DOM immediately and updates `after`; the entry lands in
  // state.edits so the exact diff survives into the manifest. One entry per
  // element (tracked by reference) — re-selecting updates it, never duplicates.
  var editRegistry = new WeakMap(); // element -> edit entry
  var editEl = null;                // currently selected element
  var editPanel = null;             // floating panel node
  var editPanelPos = null;          // {left,top} once dragged

  function styleSnapshot(node) {
    var cs = getComputedStyle(node), out = {};
    STYLE_FIELDS.forEach(function (f) { out[f.key] = cs.getPropertyValue(f.css).trim(); });
    return out;
  }
  // What the designer explicitly set inline. Change detection keys off THIS (not
  // computed) so editing `color` doesn't cascade a spurious `border` diff via
  // currentColor — only properties actually authored count as changes.
  function inlineSnapshot(node) {
    var out = {};
    STYLE_FIELDS.forEach(function (f) { out[f.key] = node.style.getPropertyValue(f.css).trim(); });
    return out;
  }
  function attrSnapshot(node) {
    var out = {};
    Array.prototype.forEach.call(node.attributes, function (a) {
      if (a.name === 'class' && a.value.indexOf(PREFIX + 'edited') >= 0) {
        out[a.name] = a.value.replace(PREFIX + 'edited', '').trim();
      } else out[a.name] = a.value;
    });
    return out;
  }
  function onEditClick(e) {
    var t = document.elementFromPoint(e.clientX, e.clientY);
    if (!pickable(t)) return;
    e.preventDefault(); e.stopPropagation();
    selectForEdit(t);
  }
  function selectForEdit(node) {
    editEl = node;
    var entry = editRegistry.get(node);
    if (!entry) {
      entry = {
        id: 'edit_' + String(++state.editSeq).padStart(3, '0'),
        anchor: anchorSnapshot(node),
        element_label: descOf(node),
        selector: cssPath(node),
        viewport: state.viewport || (window.innerWidth + 'x' + window.innerHeight),
        url: location.pathname,
        before: { html: node.outerHTML, text: node.textContent, style: styleSnapshot(node), inline: inlineSnapshot(node), attrs: attrSnapshot(node) },
        after: null,
        changes: [],
        authoredBy: 'user',
        createdAt: Date.now(),
      };
      editRegistry.set(node, entry);
      state.edits.push(entry);
    }
    node.classList.add(PREFIX + 'edited');
    highlight.style.display = 'none'; tip.style.display = 'none';
    openEditPanel(entry);
  }
  // Recompute after-state + the concrete change list from the live element.
  function captureEdit(entry) {
    if (!editEl || !entry || !entry.before) return;
    var cleanHtml = editEl.outerHTML.replace(new RegExp('\\s*' + PREFIX + 'edited', 'g'), '');
    entry.after = { html: cleanHtml, text: editEl.textContent, style: styleSnapshot(editEl), inline: inlineSnapshot(editEl), attrs: attrSnapshot(editEl) };
    var ch = [];
    if (entry.before.text !== entry.after.text && (editEl.children.length === 0)) {
      ch.push({ kind: 'text', from: entry.before.text, to: entry.after.text });
    }
    // Detect via inline intent; report computed values (more readable for the agent).
    STYLE_FIELDS.forEach(function (f) {
      if (entry.before.inline[f.key] === entry.after.inline[f.key]) return;
      ch.push({ kind: 'style', prop: f.css, from: entry.before.style[f.key], to: entry.after.style[f.key] });
    });
    var keys = {};
    Object.keys(entry.before.attrs).concat(Object.keys(entry.after.attrs)).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (k === 'style') return; // style edits are already reported as `style` changes above
      var a = entry.before.attrs[k], b = entry.after.attrs[k];
      if (a !== b) ch.push({ kind: 'attr', prop: k, from: a == null ? null : a, to: b == null ? null : b });
    });
    entry.changes = ch;
    updateCounts();
  }
  function tabBtn(label, active) {
    var b = el('button', 'flex:1;padding:5px 4px;background:' + (active ? 'rgba(46,163,255,0.18)' : 'transparent') + ';color:#fff;border:0;border-bottom:2px solid ' + (active ? '#2ea3ff' : 'transparent') + ';font:11px Inter,system-ui,sans-serif;cursor:pointer;', label);
    return b;
  }
  function fieldRow(label, valueNode) {
    var row = el('div', 'display:flex;align-items:center;gap:8px;');
    var l = el('div', 'width:78px;flex-shrink:0;color:#9aa;font:10px Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.03em;', label);
    row.appendChild(l); row.appendChild(valueNode);
    return row;
  }
  function textInput(value, ph) {
    var i = el('input', 'flex:1;min-width:0;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:6px;outline:0;font:11px ui-monospace,Menlo,monospace;padding:5px 7px;');
    i.type = 'text'; i.value = value == null ? '' : value; if (ph) i.placeholder = ph;
    ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) { i.addEventListener(ev, function (e) { e.stopPropagation(); }, false); });
    i.addEventListener('keydown', function (e) { if (e.key !== 'Escape') e.stopPropagation(); });
    return i;
  }
  var editTab = 'style';
  function openEditPanel(entry) {
    editTab = editTab || 'style';
    buildEditPanel(entry);
  }
  function buildEditPanel(entry) {
    if (editPanel) editPanel.remove();
    editPanel = el('div', 'position:fixed;z-index:' + (Z + 7) + ';width:300px;max-height:80vh;overflow:auto;display:flex;flex-direction:column;background:rgba(17,17,17,0.98);backdrop-filter:blur(10px);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:12px;box-shadow:0 16px 44px rgba(0,0,0,0.55);pointer-events:auto;');
    editPanel.id = PREFIX + 'editpanel';
    var pos = editPanelPos || { left: 16, top: 56 };
    editPanel.style.left = pos.left + 'px'; editPanel.style.top = pos.top + 'px';

    // Titlebar (drag handle + label + close)
    var bar = el('div', 'display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.08);cursor:grab;');
    var handle = el('div', 'color:#667;flex-shrink:0;', '⋮⋮');
    var title = el('div', 'flex:1;min-width:0;font:12px Inter,system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', entry.element_label);
    var close = el('button', 'flex-shrink:0;width:20px;height:20px;background:transparent;color:#8a8a8a;border:0;cursor:pointer;font:14px monospace;', '×');
    close.addEventListener('click', function (e) { e.stopPropagation(); closeEditPanel(); });
    bar.appendChild(handle); bar.appendChild(title); bar.appendChild(close);
    wiretPanelDrag(bar);
    editPanel.appendChild(bar);

    // Tabs
    var tabs = el('div', 'display:flex;border-bottom:1px solid rgba(255,255,255,0.08);');
    ['text', 'style', 'attrs', 'html'].forEach(function (name) {
      var b = tabBtn(({ text: 'Text', style: 'Style', attrs: 'Attrs', html: 'HTML' })[name], editTab === name);
      b.addEventListener('click', function (e) { e.stopPropagation(); editTab = name; buildEditPanel(entry); });
      tabs.appendChild(b);
    });
    editPanel.appendChild(tabs);

    var body = el('div', 'display:flex;flex-direction:column;gap:8px;padding:11px;');
    editPanel.appendChild(body);

    if (editTab === 'text') buildTextTab(body, entry);
    else if (editTab === 'style') buildStyleTab(body, entry);
    else if (editTab === 'attrs') buildAttrsTab(body, entry);
    else buildHtmlTab(body, entry);

    // Footer: change count + revert
    var footer = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border-top:1px solid rgba(255,255,255,0.08);');
    var cnt = el('div', 'color:#9aa;font:10px ui-monospace,Menlo,monospace;', (entry.changes.length) + ' change' + (entry.changes.length === 1 ? '' : 's') + ' captured');
    var revert = el('button', 'background:transparent;color:#ff5b45;border:1px solid rgba(255,91,69,0.4);border-radius:7px;padding:4px 10px;font:11px Inter,system-ui,sans-serif;cursor:pointer;', 'Revert');
    revert.addEventListener('click', function (e) { e.stopPropagation(); revertEdit(entry); });
    footer.appendChild(cnt); footer.appendChild(revert);
    editPanel.appendChild(footer);

    stop(editPanel);
    root.parentNode.appendChild(editPanel); // documentElement — above everything
  }
  function refreshFooter(entry) {
    // Cheap: rebuild only the footer count without tearing the whole panel.
    captureEdit(entry);
    var footer = editPanel && editPanel.lastChild;
    if (footer && footer.firstChild) footer.firstChild.textContent = entry.changes.length + ' change' + (entry.changes.length === 1 ? '' : 's') + ' captured';
  }
  function buildTextTab(body, entry) {
    if (editEl.children.length > 0) {
      body.appendChild(el('div', 'color:#c98;font:10px Inter,system-ui,sans-serif;line-height:1.5;', 'This element has child elements. Editing text here replaces all of its content — use the HTML tab for structural edits.'));
    }
    var ta = el('textarea', 'width:100%;min-height:70px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:7px;outline:0;font:12px Inter,system-ui,sans-serif;padding:7px;resize:vertical;box-sizing:border-box;');
    ta.value = editEl.textContent;
    ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) { ta.addEventListener(ev, function (e) { e.stopPropagation(); }, false); });
    ta.addEventListener('keydown', function (e) { if (e.key !== 'Escape') e.stopPropagation(); });
    ta.addEventListener('input', function () { editEl.textContent = ta.value; refreshFooter(entry); });
    body.appendChild(fieldRow('Text', ta));
  }
  function buildStyleTab(body, entry) {
    STYLE_FIELDS.forEach(function (f) {
      var cur = getComputedStyle(editEl).getPropertyValue(f.css).trim();
      var inp = textInput(cur, f.css);
      inp.addEventListener('input', function () {
        editEl.style.setProperty(f.css, inp.value);
        refreshFooter(entry);
      });
      body.appendChild(fieldRow(f.label, inp));
    });
  }
  function buildAttrsTab(body, entry) {
    body.appendChild(el('div', 'color:#9aa;font:10px Inter,system-ui,sans-serif;line-height:1.5;', 'Edit attributes as JSON. Apply writes them to the element (class/style/href/src/alt/aria-*…).'));
    var ta = el('textarea', 'width:100%;min-height:120px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:7px;outline:0;font:11px ui-monospace,Menlo,monospace;padding:7px;resize:vertical;box-sizing:border-box;');
    ta.value = JSON.stringify(attrSnapshot(editEl), null, 2);
    ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) { ta.addEventListener(ev, function (e) { e.stopPropagation(); }, false); });
    ta.addEventListener('keydown', function (e) { e.stopPropagation(); });
    body.appendChild(ta);
    var apply = el('button', 'align-self:flex-start;background:#2ea3ff;color:#fff;border:0;border-radius:7px;padding:6px 12px;font:11px Inter,system-ui,sans-serif;cursor:pointer;', 'Apply Attributes');
    var err = el('div', 'color:#ff5b45;font:10px Inter,system-ui,sans-serif;');
    apply.addEventListener('click', function (e) {
      e.stopPropagation();
      var obj; try { obj = JSON.parse(ta.value); } catch (ex) { err.textContent = 'Invalid JSON.'; return; }
      err.textContent = '';
      // Remove attributes no longer present, then set the rest. Keep our marker.
      Array.prototype.slice.call(editEl.attributes).forEach(function (a) {
        if (a.name !== 'class' && !(a.name in obj)) editEl.removeAttribute(a.name);
      });
      Object.keys(obj).forEach(function (k) {
        if (k === 'class') editEl.setAttribute('class', obj[k] + ' ' + PREFIX + 'edited');
        else editEl.setAttribute(k, obj[k]);
      });
      if (!editEl.classList.contains(PREFIX + 'edited')) editEl.classList.add(PREFIX + 'edited');
      refreshFooter(entry);
      showHint('Attributes applied.', 1200);
    });
    body.appendChild(apply); body.appendChild(err);
  }
  function buildHtmlTab(body, entry) {
    body.appendChild(el('div', 'color:#9aa;font:10px Inter,system-ui,sans-serif;line-height:1.5;', "Full element HTML. Apply replaces the element in place (the panel re-targets the new node)."));
    var ta = el('textarea', 'width:100%;min-height:150px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:7px;outline:0;font:11px ui-monospace,Menlo,monospace;padding:7px;resize:vertical;box-sizing:border-box;');
    // Show HTML without our edit marker so the designer sees clean source.
    ta.value = editEl.outerHTML.replace(new RegExp('\\s*' + PREFIX + 'edited', 'g'), '');
    ['pointerdown', 'mousedown', 'click', 'pointerup'].forEach(function (ev) { ta.addEventListener(ev, function (e) { e.stopPropagation(); }, false); });
    ta.addEventListener('keydown', function (e) { e.stopPropagation(); });
    body.appendChild(ta);
    var apply = el('button', 'align-self:flex-start;background:#2ea3ff;color:#fff;border:0;border-radius:7px;padding:6px 12px;font:11px Inter,system-ui,sans-serif;cursor:pointer;', 'Apply HTML');
    var err = el('div', 'color:#ff5b45;font:10px Inter,system-ui,sans-serif;');
    apply.addEventListener('click', function (e) {
      e.stopPropagation();
      var tmp = document.createElement('div');
      try { tmp.innerHTML = ta.value.trim(); } catch (ex) { err.textContent = 'Invalid HTML.'; return; }
      var next = tmp.firstElementChild;
      if (!next) { err.textContent = 'HTML must contain one root element.'; return; }
      err.textContent = '';
      editEl.replaceWith(next);
      // Re-target the edit entry to the new node while preserving `before`.
      editRegistry.delete(editEl);
      editEl = next;
      editEl.classList.add(PREFIX + 'edited');
      editRegistry.set(editEl, entry);
      entry.anchor = anchorSnapshot(editEl);
      entry.selector = cssPath(editEl);
      entry.element_label = descOf(editEl);
      refreshFooter(entry);
      buildEditPanel(entry); // rebuild so tabs read the new node
      showHint('HTML applied.', 1200);
    });
    body.appendChild(apply); body.appendChild(err);
  }
  function revertEdit(entry) {
    if (!editEl) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = entry.before.html.replace(new RegExp('\\s*' + PREFIX + 'edited', 'g'), '');
    var orig = tmp.firstElementChild;
    if (orig) {
      editEl.replaceWith(orig);
      editRegistry.delete(editEl);
      editEl = orig;
    }
    // Drop the edit entry entirely — a full revert means "no change".
    var i = state.edits.indexOf(entry);
    if (i >= 0) state.edits.splice(i, 1);
    closeEditPanel();
    showHint('Reverted.', 1200);
  }
  function closeEditPanel() {
    if (editEl) captureEdit(editRegistry.get(editEl) || {});
    if (editPanel) { editPanel.remove(); editPanel = null; }
    editEl = null;
    render();
  }
  function wiretPanelDrag(bar) {
    bar.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      e.stopPropagation();
      var sx = e.clientX, sy = e.clientY;
      var r = editPanel.getBoundingClientRect();
      var l0 = r.left, t0 = r.top;
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
      function mv(ev) {
        var nl = Math.max(4, Math.min(window.innerWidth - 60, l0 + ev.clientX - sx));
        var nt = Math.max(4, Math.min(window.innerHeight - 40, t0 + ev.clientY - sy));
        editPanelPos = { left: nl, top: nt };
        editPanel.style.left = nl + 'px'; editPanel.style.top = nt + 'px';
      }
      function up() { bar.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); }
      bar.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
    });
  }

  // ---- Mode switching ----------------------------------------------------
  function setMode(m) {
    // Leaving edit mode captures & closes the open panel first.
    if (state.mode === 'edit' && m !== 'edit' && editPanel) closeEditPanel();
    state.mode = m;
    drawSvg.style.pointerEvents = (m === 'draw') ? 'auto' : 'none';
    drawSvg.style.cursor = (m === 'draw') ? 'crosshair' : '';
    drawBar.style.display = (m === 'draw') ? 'flex' : 'none';
    if (m !== 'pick' && m !== 'edit') { highlight.style.display = 'none'; tip.style.display = 'none'; }
    [['pick', pickBtn], ['draw', drawBtn], ['edit', editBtn]].forEach(function (pair) {
      var on = state.mode === pair[0];
      var accent = pair[0] === 'edit' ? '#2ea3ff' : (pair[0] === 'draw' ? '#28c76f' : '#ff5b45');
      pair[1].style.background = on ? accent : 'transparent';
    });
    syncDrawBar();
  }
  function toggleMode(m) { setMode(state.mode === m ? 'off' : m); }

  // ---- HUD actions -------------------------------------------------------
  pickBtn.addEventListener('click', function (e) { e.stopPropagation(); closeNoteEditor(); toggleMode('pick'); });
  drawBtn.addEventListener('click', function (e) { e.stopPropagation(); closeNoteEditor(); toggleMode('draw'); });
  editBtn.addEventListener('click', function (e) { e.stopPropagation(); closeNoteEditor(); toggleMode('edit'); });
  listBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var parts = [];
    if (state.notes.length) parts.push(state.notes.map(function (n, i) { return (i + 1) + '. [' + n.severity + '] ' + (n.note || n.element_label); }).join('  |  '));
    if (state.edits.length) parts.push(state.edits.length + ' live edit(s): ' + state.edits.map(function (ed) { return ed.element_label + ' (' + ed.changes.length + ')'; }).join(', '));
    if (state.drawings.length) parts.push(state.drawings.length + ' drawing(s)');
    showHint(parts.length ? parts.join('   ·   ') : 'Nothing captured yet.', 5000);
  });
  // Escape hatch: the designer can always get their notes out of the page
  // themselves — clipboard via this button, console via the dump — even if
  // the MCP bridge has lost the tab and the skill can't call export().
  exportBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var json = exportJSONString();
    try { console.log('__CRITIC_EXPORT__\n' + json); } catch (err) {}
    function done(copied) {
      showHint(copied
        ? state.notes.length + ' note(s) copied to clipboard as JSON (also in the console).'
        : 'Clipboard blocked — export logged to the console (look for __CRITIC_EXPORT__).', 4000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () { done(true); }, function () { done(legacyCopy(json)); });
    } else {
      done(legacyCopy(json));
    }
  });
  function legacyCopy(text) {
    var ta = el('textarea', 'position:fixed;left:-9999px;top:0;');
    ta.id = PREFIX + 'copybuf';
    ta.value = text;
    document.documentElement.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) {}
    ta.remove();
    return ok;
  }
  function exportJSONString() { return JSON.stringify(api.export(), null, 2); }
  clearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (clearBtn.__armed) {
      state.notes = []; state.drawings = []; state.drawRedo = []; state.edits = [];
      // Keep sequence counters so cleared IDs are never reused.
      editRegistry = new WeakMap();
      if (editPanel) { editPanel.remove(); editPanel = null; editEl = null; }
      Array.prototype.forEach.call(document.querySelectorAll('.' + PREFIX + 'edited'), function (n) { n.classList.remove(PREFIX + 'edited'); });
      render(); closeNoteEditor(); showHint('Cleared notes, drawings, and edit records (live DOM edits stay applied).', 2600); clearBtn.__armed = false; return;
    }
    showHint('Click "Clear all" again within 3s to confirm.', 3000);
    clearBtn.__armed = true;
    setTimeout(function () { clearBtn.__armed = false; }, 3000);
  });

  // Tab-local recovery. Imported edits remain records; never replay HTML.
  var sessionId = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));
  var storageKey = '__critic_capture_v1__:' + location.href;
  var recoveryStatus = 'ready';
  var recoveryEnabled = true;
  var recoveryTimer;
  var lastSaved = '';
  var recoveryKeys = new Set([storageKey]);
  var recoveryLabel = el('span', 'font:10px system-ui;color:#aaa;margin-left:8px;', 'Preview only · recovery ready');
  hud.appendChild(recoveryLabel);
  hud.style.maxWidth = 'calc(100vw - 24px)';
  hud.style.flexWrap = 'wrap';
  recoveryLabel.style.flexBasis = '100%';
  recoveryLabel.style.padding = '2px 8px';
  function updateRecoveryLabel() {
    recoveryLabel.textContent = 'Preview only · recovery ' + recoveryStatus;
    var below = (hud.getBoundingClientRect().bottom + 6) + 'px';
    drawBar.style.top = below; hint.style.top = below;
  }
  function saveCapture() {
    if (!recoveryEnabled || !api) return;
    try {
      var capture = api.export();
      delete capture.capturedAt; delete capture.recovery;
      var raw = JSON.stringify(capture);
      storageKey = '__critic_capture_v1__:' + location.href;
      recoveryKeys.add(storageKey);
      if (raw !== lastSaved) { sessionStorage.setItem(storageKey, raw); lastSaved = raw; }
      recoveryStatus = 'saved in this tab';
    } catch (e) { recoveryStatus = 'unavailable — export now'; }
    updateRecoveryLabel();
  }
  function importCapture(input) {
    var capture = typeof input === 'string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input));
    if (!capture || capture.schemaVersion !== 1 || capture.tool !== 'critic-layer' || capture.url !== location.href) throw new Error('Capture must be version 1 for this exact page URL');
    var ids = new Set();
    ['notes', 'drawings', 'edits'].forEach(function(key) {
      if (!Array.isArray(capture[key]) || capture[key].length > 10000) throw new Error('Invalid capture collection');
      var prefix = {notes:'note', drawings:'draw', edits:'edit'}[key];
      capture[key].forEach(function(item) {
        if (!item || typeof item.id !== 'string' || !(new RegExp('^' + prefix + '_[0-9]+$')).test(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate capture ID');
        ids.add(item.id);
        if (key === 'drawings' && (!Array.isArray(item.points) || !item.points.length || item.points.length > 100000 || !item.points.every(function(p) { return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite); }))) throw new Error('Invalid drawing points');
        if (key !== 'drawings' && (!item.anchor || typeof item.anchor.tag !== 'string')) throw new Error('Missing element identity');
      });
    });
    closeEditPanel(); closeNoteEditor();
    state.notes = capture.notes;
    state.drawings = capture.drawings.map(function(d) { return Object.assign({}, d, {pts:d.points.map(function(p) { return {px:p[0],py:p[1]}; })}); });
    state.edits = capture.edits;
    state.drawRedo = [];
    editRegistry = new WeakMap();
    function maxId(items) { return items.reduce(function(max,item) { return Math.max(max, Number(item.id.split('_').pop())); }, 0); }
    state.seq = maxId(state.notes); state.drawSeq = maxId(state.drawings); state.editSeq = maxId(state.edits);
    if (capture.sequences) {
      ['note', 'draw', 'edit'].forEach(function(key) {
        var value = capture.sequences[key];
        if (Number.isSafeInteger(value) && value >= 0) {
          var field = {note:'seq', draw:'drawSeq', edit:'editSeq'}[key];
          state[field] = Math.max(state[field], value);
        }
      });
    }
    sessionId = typeof capture.sessionId === 'string' && capture.sessionId ? capture.sessionId : sessionId;
    state.viewport = capture.viewport;
    render();
    recoveryStatus = 'restored; edits are records only'; updateRecoveryLabel();
    return {notes:state.notes.length, drawings:state.drawings.length, edits:state.edits.length, appliedEdits:false};
  }

  // ---- Public API --------------------------------------------------------
  var api = {
    __booted: true,
    notes: state.notes,
    drawings: state.drawings,
    edits: state.edits,
    // Versioned, self-describing capture: downstream tools key on
    // schemaVersion + tool, so only make additive changes at version 1.
    export: function () {
      // Finalize the open edit before exporting so its diff is current.
      if (editEl) captureEdit(editRegistry.get(editEl) || {});
      return {
        schemaVersion: 1,
        sessionId: sessionId,
        sequences: {note:state.seq, draw:state.drawSeq, edit:state.editSeq},
        previewOnly: true,
        recovery: recoveryStatus,
        tool: 'critic-layer',
        url: location.href,
        path: location.pathname,
        title: document.title,
        viewport: state.viewport || (window.innerWidth + 'x' + window.innerHeight),
        viewportSize: { width: window.innerWidth, height: window.innerHeight },
        capturedAt: new Date().toISOString(),
        counts: { notes: state.notes.length, drawings: state.drawings.length, edits: state.edits.length },
        notes: state.notes.map(function (n) {
          return Object.assign({}, n, { issueId: sessionId + ':' + n.id, anchorLive: !!resolveAnchor(n.anchor), anchorStatus: anchorResult(n.anchor).status });
        }),
        drawings: state.drawings.map(function (d) {
          return {
            id: d.id, issueId: sessionId + ':' + d.id, tool: d.tool, color: d.color, width: d.width, label: d.label || '',
            viewport: d.viewport, url: d.url,
            points: d.pts.map(function (p) { return [p.px, p.py]; }),
            bbox: bboxOf(d),
          };
        }),
        edits: state.edits.map(function (ed) {
          return {
            id: ed.id, issueId: sessionId + ':' + ed.id, previewOnly: true, anchorStatus: anchorResult(ed.anchor).status, element_label: ed.element_label, selector: ed.selector,
            anchor: ed.anchor, anchorLive: !!resolveAnchor(ed.anchor), viewport: ed.viewport, url: ed.url,
            authoredBy: ed.authoredBy, changes: ed.changes,
            before: ed.before, after: ed.after,
          };
        }),
      };
    },
    dump: function () {
      var json = JSON.stringify(api.export(), null, 2);
      try { console.log('__CRITIC_EXPORT__\n' + json); } catch (e) {}
      return json;
    },
    setViewport: function (name) { state.viewport = name; render(); return name; },
    setMode: function (m) { setMode(m); return m; },
    show: function () { [root, drawSvg, pinLayer, hud, hint, drawBar].forEach(function (n) { n.style.display = ''; }); setMode(state.mode); if (editPanel) editPanel.style.display = ''; },
    hide: function () { [root, highlight, tip, drawSvg, pinLayer, hud, hint, drawBar].forEach(function (n) { n.style.display = 'none'; }); if (editPanel) editPanel.style.display = 'none'; },
    clear: function () { closeEditPanel(); closeNoteEditor(); state.notes.length = 0; state.drawings.length = 0; state.edits.length = 0; state.drawRedo = []; editRegistry = new WeakMap(); render(); saveCapture(); },
    import: function (capture) { return importCapture(capture); },
    save: function () { saveCapture(); return recoveryStatus; },
    forgetRecovery: function () { recoveryEnabled = false; recoveryKeys.forEach(function(key) { try { sessionStorage.removeItem(key); } catch (e) {} }); recoveryStatus = 'disabled'; updateRecoveryLabel(); },
    resolveAnchor: function (snapshot) { return anchorResult(snapshot).status; },
    destroy: function () {
      saveCapture();
      clearInterval(recoveryTimer);
      window.removeEventListener('pagehide', saveCapture);

      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', scheduleReposition, true);
      window.removeEventListener('resize', scheduleReposition, true);
      window.removeEventListener('popstate', onRouteChange, false);
      window.removeEventListener('hashchange', onRouteChange, false);
      document.removeEventListener('keydown', onKeydown, true);
      drawSvg.removeEventListener('pointerdown', onDrawDown);
      drawSvg.removeEventListener('pointermove', onDrawMove);
      drawSvg.removeEventListener('pointerup', onDrawUp);
      Array.prototype.forEach.call(document.querySelectorAll('.' + PREFIX + 'edited'), function (n) { n.classList.remove(PREFIX + 'edited'); });
      [root, highlight, tip, drawSvg, pinLayer, hud, hint, drawBar, styleTag, editPanel].forEach(function (n) { if (n && n.remove) n.remove(); });
      try { delete window.__CRITIC__; } catch (e) { window.__CRITIC__ = undefined; }
    },
  };
  // Live arrays for read-back convenience.
  Object.defineProperty(api, 'notes', { get: function () { return state.notes; } });
  Object.defineProperty(api, 'drawings', { get: function () { return state.drawings; } });
  Object.defineProperty(api, 'edits', { get: function () { return state.edits; } });

  function bboxOf(d) {
    var xs = d.pts.map(function (p) { return p.px; }), ys = d.pts.map(function (p) { return p.py; });
    return { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys), w: Math.max.apply(null, xs) - Math.min.apply(null, xs), h: Math.max.apply(null, ys) - Math.min.apply(null, ys) };
  }

  // Escape: close an open note editor / edit panel first, else drop to 'off'.
  function onKeydown(e) {
    if (e.key !== 'Escape') return;
    if (editingNoteId != null) { closeNoteEditor(); return; }
    if (editPanel) { closeEditPanel(); return; }
    if (state.mode !== 'off') setMode('off');
  }

  // ---- Boot --------------------------------------------------------------
  [root, highlight, tip, drawSvg, pinLayer, hud, hint, drawBar, styleTag].forEach(function (n) { document.documentElement.appendChild(n); });
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition, true);
  // SPA route changes: re-evaluate which pins belong on the current path.
  window.addEventListener('popstate', onRouteChange, false);
  window.addEventListener('hashchange', onRouteChange, false);
  drawSvg.addEventListener('pointerdown', onDrawDown);
  drawSvg.addEventListener('pointermove', onDrawMove);
  drawSvg.addEventListener('pointerup', onDrawUp);
  window.__CRITIC__ = api;
  try {
    var stored = salvagedCapture || sessionStorage.getItem(storageKey);
    if (stored) importCapture(stored);
  } catch (error) { recoveryStatus = 'restore failed — original capture retained'; updateRecoveryLabel(); recoveryEnabled = false; }
  recoveryTimer = setInterval(saveCapture, 1000);
  window.addEventListener('pagehide', saveCapture);
  setMode('pick');
  render();
  return 'Critic Layer ' + (salvagedNotes ? 're-injected (' + state.notes.length + ' note(s) recovered)' : 'injected')
    + '. Click elements to pin notes; read via JSON.stringify(window.__CRITIC__.export())';
})();
