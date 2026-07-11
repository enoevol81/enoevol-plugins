/*
 * Critic Layer — injectable sticky-note review overlay
 * -----------------------------------------------------
 * Injected into a live page via claude-in-chrome's javascript_tool. The designer
 * clicks any element to pin a note; notes are anchored to the DOM element under
 * the click and stored client-side on window.__CRITIC__. The skill reads them
 * back on demand with:  JSON.stringify(window.__CRITIC__.export())
 *
 * Design constraints:
 *  - Idempotent: re-injection re-uses the existing instance, never duplicates.
 *  - Never calls window.prompt/alert/confirm (they freeze the browser bridge).
 *    All text entry is inline DOM inputs.
 *  - All overlay nodes are id/class-namespaced so they never pick themselves and
 *    cleanup stays a one-liner.
 *  - Pins re-anchor to their element on scroll/resize/re-render.
 *  - Export is versioned + self-describing (schemaVersion, url, viewport,
 *    timestamp, notes) and reachable three ways: the API, the HUD Export button
 *    (clipboard), and a console dump — so notes survive losing the MCP bridge.
 */
(function () {
  'use strict';
  var PREFIX = '__critic__';
  var Z = 2147480000; // above almost everything, below nothing sane

  // Idempotency: if already booted AND our DOM is still attached, re-show and
  // bail. If the page tore our nodes out (aggressive SPA re-render, document
  // rewrite) the old instance is a zombie: salvage its notes, tear down its
  // listeners, and rebuild fresh so re-injection always yields a working HUD.
  var salvagedNotes = null;
  var salvagedSeq = 0;
  if (window.__CRITIC__ && window.__CRITIC__.__booted) {
    if (document.getElementById(PREFIX + 'root')) {
      window.__CRITIC__.show();
      return '__CRITIC__ already active: ' + window.__CRITIC__.notes.length + ' note(s)';
    }
    try {
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

  var state = {
    notes: salvagedNotes || [],
    seq: salvagedSeq,
    picking: true,
    viewport: null,
  };

  // ---- DOM helpers -------------------------------------------------------
  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
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
  function resolveAnchor(snap) {
    if (snap.id) { var byId = document.getElementById(snap.id); if (byId) return byId; }
    if (snap.selector) { try { var bySel = document.querySelector(snap.selector); if (bySel) return bySel; } catch (e) {} }
    if (snap.classes && snap.classes.length) {
      var q = snap.tag + '.' + snap.classes.map(function (c) { return CSS.escape(c); }).join('.');
      try {
        var cands = document.querySelectorAll(q);
        if (cands.length === 1) return cands[0];
        for (var i = 0; i < cands.length; i++) {
          if ((cands[i].textContent || '').trim().slice(0, 120) === snap.text) return cands[i];
        }
        if (cands.length) return cands[0];
      } catch (e) {}
    }
    return null;
  }

  // ---- Overlay roots -----------------------------------------------------
  var root = el('div', 'position:fixed;inset:0;pointer-events:none;z-index:' + Z + ';');
  root.id = PREFIX + 'root';
  var highlight = el('div', 'position:fixed;pointer-events:none;border:2px solid #ff5b45;background:rgba(255,91,69,0.08);display:none;z-index:' + (Z + 1) + ';box-sizing:border-box;');
  highlight.id = PREFIX + 'hl';
  var tip = el('div', 'position:fixed;pointer-events:none;background:#111;color:#fff;font:11px/1.4 ui-monospace,Menlo,monospace;padding:3px 7px;border-radius:5px;display:none;z-index:' + (Z + 2) + ';white-space:nowrap;');
  tip.id = PREFIX + 'tip';
  var pinLayer = el('div', 'position:fixed;inset:0;pointer-events:none;z-index:' + (Z + 3) + ';');
  pinLayer.id = PREFIX + 'pins';

  // ---- HUD -----------------------------------------------------------------
  // Single-row rounded pill: brand mark, icon segments, count chip. Divider
  // hairlines between segments read the row without needing a boxed header.
  var ICONS = {
    mark: '<svg width="11" height="11" viewBox="0 0 11 11"><path d="M8.5 0.5L2.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
    pick: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    notes: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 3.5h12M2 8h12M2 12.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    exp: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 4.5L8 1.5l3 3M2.5 9.5v3a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clear: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4.5 4.5l.6 8.5a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
    b.appendChild(el('span', '', label));
    return b;
  }

  var pickBtn = iconBtn(ICONS.pick, 'Picking: ON');
  var listBtn = iconBtn(ICONS.notes, 'Notes');
  var exportBtn = iconBtn(ICONS.exp, 'Export');
  exportBtn.title = 'Copy all notes as JSON (also logged to the console)';
  var clearBtn = iconBtn(ICONS.clear, 'Clear all');
  clearBtn.style.color = '#8a8a8a';
  hud.appendChild(pickBtn);
  hud.appendChild(divider());
  hud.appendChild(listBtn);
  hud.appendChild(divider());
  hud.appendChild(exportBtn);
  hud.appendChild(divider());
  hud.appendChild(clearBtn);
  hud.appendChild(divider());

  var countBadge = el('span', 'display:flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;font:11px ui-monospace,Menlo,monospace;font-weight:700;color:#fff;background:#ff5b45;border-radius:999px;margin:2px 2px 2px 0;box-shadow:0 0 0 1px rgba(0,0,0,0.3);', '0');
  hud.appendChild(countBadge);

  var hint = el('div', 'position:fixed;top:44px;right:12px;pointer-events:none;color:#eee;font:11px Inter,system-ui,sans-serif;background:rgba(15,15,15,0.94);padding:4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.08);opacity:0;transition:opacity .15s;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:' + (Z + 5) + ';');
  hint.id = PREFIX + 'hint';

  stop(hud); // clicks on the HUD never fall through to the page

  // ---- Wiring ------------------------------------------------------------
  // Bubble-phase, not capture: a capture-phase stopPropagation on an ancestor
  // (hud/editor) would stop the event before it ever reaches a descendant
  // button/select, silently killing every click handler inside. Bubble phase
  // lets the target's own listener (Delete, Done, Picking toggle...) fire
  // first, then keeps the click from escaping the overlay afterward.
  function stop(node) {
    ['pointerdown', 'mousedown', 'click', 'pointerup', 'focusin'].forEach(function (ev) {
      node.addEventListener(ev, function (e) { e.stopPropagation(); }, false);
    });
  }

  function onMove(e) {
    if (!state.picking) { highlight.style.display = 'none'; tip.style.display = 'none'; return; }
    var t = document.elementFromPoint(e.clientX, e.clientY);
    if (!pickable(t)) { highlight.style.display = 'none'; tip.style.display = 'none'; return; }
    var r = t.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.top = r.top + 'px'; highlight.style.left = r.left + 'px';
    highlight.style.width = r.width + 'px'; highlight.style.height = r.height + 'px';
    tip.style.display = 'block';
    tip.textContent = descOf(t);
    tip.style.top = Math.max(0, r.top - 18) + 'px';
    tip.style.left = r.left + 'px';
  }
  function descOf(node) {
    var s = node.tagName.toLowerCase();
    if (node.id) s += '#' + node.id;
    if (node.classList && node.classList.length) s += '.' + Array.prototype.slice.call(node.classList).slice(0, 2).join('.');
    return s;
  }
  function onClick(e) {
    // Click-away dismisses the open editor instead of falling through to the
    // page (picking is already paused while editing, but the click would
    // otherwise still activate whatever the page renders underneath it).
    if (editingNoteId != null && !own(document.elementFromPoint(e.clientX, e.clientY))) {
      e.preventDefault(); e.stopPropagation();
      closeEditor();
      return;
    }
    if (!state.picking) return;
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
    openEditor(note);
  }

  // ---- Pins + editor -----------------------------------------------------
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
    countBadge.textContent = String(state.notes.length);
    pinLayer.innerHTML = '';
    state.notes.forEach(function (note, i) {
      pinLayer.appendChild(buildPin(note, i));
    });
  }
  // Scroll/resize fire on any nested scrollable/pannable ancestor (capture
  // phase catches those even though 'scroll' doesn't bubble) — potentially
  // many times a second while dragging a board. A full render() would tear
  // down and rebuild every pin's DOM, including the one currently focused
  // for text entry, firing blur -> auto-close-and-discard mid-keystroke.
  // Reposition-only: move existing wraps, never touch their children/focus.
  // rAF-coalesced: resolveAnchor runs querySelector per note, so raw scroll
  // events on a heavy page would otherwise burn a frame budget for nothing.
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

  // Reposition a note from a screen point: re-normalize against its anchor
  // element when one still resolves (keeps live-anchoring after a drag),
  // and always refresh the page-relative fallback coords too.
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
          openEditor(note);
        }
      }
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
    }, false);
  }

  var editingNoteId = null;
  var justOpenedNoteId = null; // animates the intro once; select-change re-renders skip it
  var pickingBeforeEdit = null;
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
  // Editing a note pauses picking so clicking around the page to read
  // context doesn't stamp new notes; picking resumes at whatever it was
  // once the bar closes (Enter, Escape, blur, or click-away).
  function closeEditor() {
    var was = editingNoteId != null;
    editingNoteId = null;
    if (was && pickingBeforeEdit != null) { setPicking(pickingBeforeEdit); pickingBeforeEdit = null; }
    render();
  }
  function openEditor(note) {
    if (editingNoteId == null) pickingBeforeEdit = state.picking;
    editingNoteId = note.id;
    justOpenedNoteId = note.id;
    setPicking(false);
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
      setTimeout(function () { if (editingNoteId === note.id && !box.contains(document.activeElement)) closeEditor(); }, 100);
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

  // ---- HUD actions -------------------------------------------------------
  pickBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    closeEditor(); // toggling picking manually overrides any pending auto-resume
    pickingBeforeEdit = null;
    setPicking(!state.picking);
  });
  listBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    showHint(state.notes.length
      ? state.notes.map(function (n, i) { return (i + 1) + '. [' + n.severity + '] ' + (n.note || n.element_label); }).join('  |  ')
      : 'No notes yet.', 3000);
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
    if (clearBtn.__armed) { state.notes = []; state.seq = 0; render(); closeEditor(); showHint('Cleared.', 1500); clearBtn.__armed = false; return; }
    showHint('Click "Clear all" again within 3s to confirm.', 3000);
    clearBtn.__armed = true;
    setTimeout(function () { clearBtn.__armed = false; }, 3000);
  });

  // ---- Public API --------------------------------------------------------
  var api = {
    __booted: true,
    notes: state.notes,
    // Versioned, self-describing capture: downstream tools key on
    // schemaVersion + tool, so only make additive changes at version 1.
    export: function () {
      return {
        schemaVersion: 1,
        tool: 'critic-layer',
        url: location.href,
        path: location.pathname,
        title: document.title,
        viewport: state.viewport || (window.innerWidth + 'x' + window.innerHeight),
        viewportSize: { width: window.innerWidth, height: window.innerHeight },
        capturedAt: new Date().toISOString(),
        notes: state.notes.map(function (n) {
          var live = !!resolveAnchor(n.anchor);
          return Object.assign({}, n, { anchorLive: live });
        }),
      };
    },
    dump: function () {
      var json = JSON.stringify(api.export(), null, 2);
      try { console.log('__CRITIC_EXPORT__\n' + json); } catch (e) {}
      return json;
    },
    setViewport: function (name) { state.viewport = name; render(); return name; },
    show: function () { root.style.display = ''; hud.style.display = ''; hint.style.display = ''; },
    hide: function () { root.style.display = 'none'; hud.style.display = 'none'; hint.style.display = 'none'; },
    clear: function () { state.notes.length = 0; state.seq = 0; render(); },
    destroy: function () {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', scheduleReposition, true);
      window.removeEventListener('resize', scheduleReposition, true);
      window.removeEventListener('popstate', onRouteChange, false);
      window.removeEventListener('hashchange', onRouteChange, false);
      document.removeEventListener('keydown', onKeydown, true);
      [root, highlight, tip, pinLayer, hud, hint].forEach(function (n) { if (n && n.remove) n.remove(); });
      try { delete window.__CRITIC__; } catch (e) { window.__CRITIC__ = undefined; }
    },
  };
  Object.defineProperty(api, 'notes', { get: function () { return state.notes; } });

  // Escape: close an open editor first, otherwise pause picking so the
  // designer can move around the page without stamping notes.
  function onKeydown(e) {
    if (e.key !== 'Escape') return;
    if (editingNoteId != null) { closeEditor(); return; }
    if (state.picking) setPicking(false);
  }

  // ---- Boot --------------------------------------------------------------
  [root, highlight, tip, pinLayer, hud, hint].forEach(function (n) { document.documentElement.appendChild(n); });
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition, true);
  // SPA route changes: re-evaluate which pins belong on the current path.
  // (pushState isn't patched — the next scroll/resize catches those anyway.)
  window.addEventListener('popstate', onRouteChange, false);
  window.addEventListener('hashchange', onRouteChange, false);
  window.__CRITIC__ = api;
  render();
  return 'Critic Layer ' + (salvagedNotes ? 're-injected (' + state.notes.length + ' note(s) recovered)' : 'injected')
    + '. Click elements to pin notes; read via JSON.stringify(window.__CRITIC__.export())';
})();
