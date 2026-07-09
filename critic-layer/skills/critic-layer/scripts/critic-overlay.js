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
 */
(function () {
  'use strict';
  var PREFIX = '__critic__';
  var Z = 2147480000; // above almost everything, below nothing sane

  // Idempotency: if already booted, just re-show and bail.
  if (window.__CRITIC__ && window.__CRITIC__.__booted) {
    window.__CRITIC__.show();
    return '__CRITIC__ already active: ' + window.__CRITIC__.notes.length + ' note(s)';
  }

  var CATEGORIES = ['layout', 'typography', 'spacing', 'color', 'hierarchy',
    'interaction', 'copy', 'performance', 'bug', 'accessibility'];
  var SEVERITIES = ['low', 'medium', 'high', 'blocker'];
  var SEV_COLOR = { low: '#8a8a8a', medium: '#d8a200', high: '#ff5b45', blocker: '#c1121f' };

  var state = {
    notes: [],
    seq: 0,
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
  function esc(s) { return String(s == null ? '' : s); }

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
  var tip = el('div', 'position:fixed;pointer-events:none;background:#111;color:#fff;font:11px/1.4 ui-monospace,Menlo,monospace;padding:2px 6px;display:none;z-index:' + (Z + 2) + ';white-space:nowrap;');
  tip.id = PREFIX + 'tip';
  var pinLayer = el('div', 'position:fixed;inset:0;pointer-events:none;z-index:' + (Z + 3) + ';');
  pinLayer.id = PREFIX + 'pins';

  // ---- HUD ---------------------------------------------------------------
  var hud = el('div', 'position:fixed;top:12px;right:12px;pointer-events:auto;z-index:' + (Z + 5) + ';background:#111;color:#fff;font:13px/1.4 Inter,system-ui,sans-serif;border:1px solid #333;min-width:180px;');
  hud.id = PREFIX + 'hud';
  var hudHead = el('div', 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #333;');
  hudHead.appendChild(el('span', 'font-weight:600;letter-spacing:0.02em;', 'CRITIC LAYER'));
  var countBadge = el('span', 'font:11px ui-monospace,monospace;color:#ff5b45;', '0');
  hudHead.appendChild(countBadge);
  hud.appendChild(hudHead);
  var pickBtn = el('button', hudBtnCss('#ff5b45', '#fff'), 'Picking: ON');
  var listBtn = el('button', hudBtnCss('#1a1a1a', '#fff'), 'Notes');
  var clearBtn = el('button', hudBtnCss('#1a1a1a', '#8a8a8a'), 'Clear all');
  [pickBtn, listBtn, clearBtn].forEach(function (b) { hud.appendChild(b); });
  var hint = el('div', 'padding:6px 10px;border-top:1px solid #333;color:#8a8a8a;font-size:11px;', 'Click any element to pin a note.');
  hud.appendChild(hint);

  function hudBtnCss(bg, fg) {
    return 'display:block;width:100%;text-align:left;padding:8px 10px;background:' + bg + ';color:' + fg + ';border:0;border-top:1px solid #222;font:13px Inter,system-ui,sans-serif;cursor:pointer;';
  }
  stop(hud); // clicks on the HUD never fall through to the page

  // ---- Wiring ------------------------------------------------------------
  function stop(node) {
    ['pointerdown', 'mousedown', 'click', 'pointerup', 'focusin'].forEach(function (ev) {
      node.addEventListener(ev, function (e) { e.stopPropagation(); }, true);
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
    render();
    openEditor(note, true);
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
  function render() {
    countBadge.textContent = String(state.notes.length);
    pinLayer.innerHTML = '';
    state.notes.forEach(function (note, i) {
      var p = pinPos(note);
      var pin = el('div', 'position:fixed;pointer-events:auto;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:11px/1 Inter,system-ui,sans-serif;font-weight:700;color:#fff;cursor:pointer;transform:translate(-50%,-50%);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);opacity:' + (p.live ? '1' : '0.5') + ';');
      pin.style.background = SEV_COLOR[note.severity] || '#ff5b45';
      pin.style.left = p.x + 'px'; pin.style.top = p.y + 'px';
      pin.style.zIndex = Z + 3;
      pin.textContent = String(i + 1);
      pin.title = note.category + ' / ' + note.severity + (note.note ? ' — ' + note.note : '');
      pin.addEventListener('click', function (ev) { ev.stopPropagation(); openEditor(note, false); });
      pinLayer.appendChild(pin);
    });
  }

  var editor = null;
  function closeEditor() { if (editor) { editor.remove(); editor = null; } }
  function openEditor(note, isNew) {
    closeEditor();
    var p = pinPos(note);
    editor = el('div', 'position:fixed;pointer-events:auto;z-index:' + (Z + 6) + ';background:#111;color:#fff;border:1px solid #333;width:260px;font:13px Inter,system-ui,sans-serif;');
    editor.id = PREFIX + 'editor';
    var left = Math.min(window.innerWidth - 272, Math.max(8, p.x + 14));
    var top = Math.min(window.innerHeight - 240, Math.max(8, p.y + 14));
    editor.style.left = left + 'px'; editor.style.top = top + 'px';

    var head = el('div', 'display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #333;');
    head.appendChild(el('span', 'font-weight:600;', 'Note ' + note.id.replace('note_', '#')));
    head.appendChild(el('span', 'color:#8a8a8a;font:11px ui-monospace,monospace;', note.element_label));
    editor.appendChild(head);

    var ta = el('textarea', 'width:100%;box-sizing:border-box;background:#1a1a1a;color:#fff;border:0;border-bottom:1px solid #333;padding:8px 10px;font:13px Inter,system-ui,sans-serif;resize:vertical;min-height:56px;');
    ta.placeholder = "What's wrong here?";
    ta.value = note.note;
    stop(ta);
    ta.addEventListener('input', function () { note.note = ta.value; });
    editor.appendChild(ta);

    var dc = el('input', 'width:100%;box-sizing:border-box;background:#1a1a1a;color:#fff;border:0;border-bottom:1px solid #333;padding:8px 10px;font:13px Inter,system-ui,sans-serif;');
    dc.placeholder = 'Desired change (optional)';
    dc.value = note.desired_change;
    stop(dc);
    dc.addEventListener('input', function () { note.desired_change = dc.value; });
    editor.appendChild(dc);

    var row = el('div', 'display:flex;gap:0;border-bottom:1px solid #333;');
    var cat = selectFrom(CATEGORIES, note.category, function (v) { note.category = v; });
    var sev = selectFrom(SEVERITIES, note.severity, function (v) { note.severity = v; render(); });
    cat.style.flex = '1'; sev.style.flex = '1'; sev.style.borderLeft = '1px solid #333';
    row.appendChild(cat); row.appendChild(sev);
    editor.appendChild(row);

    var actions = el('div', 'display:flex;');
    var del = el('button', 'flex:1;padding:8px;background:#1a1a1a;color:#8a8a8a;border:0;cursor:pointer;font:13px Inter,system-ui,sans-serif;', 'Delete');
    var done = el('button', 'flex:1;padding:8px;background:#ff5b45;color:#fff;border:0;cursor:pointer;font:13px Inter,system-ui,sans-serif;font-weight:600;', 'Done');
    del.addEventListener('click', function (e) { e.stopPropagation(); removeNote(note); closeEditor(); });
    done.addEventListener('click', function (e) { e.stopPropagation(); closeEditor(); });
    actions.appendChild(del); actions.appendChild(done);
    editor.appendChild(actions);

    stop(editor);
    root.appendChild(editor);
    ta.focus();
  }
  function selectFrom(opts, val, onChange) {
    var s = el('select', 'background:#1a1a1a;color:#fff;border:0;padding:8px 10px;font:13px Inter,system-ui,sans-serif;cursor:pointer;');
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
    state.picking = !state.picking;
    pickBtn.textContent = 'Picking: ' + (state.picking ? 'ON' : 'OFF');
    pickBtn.style.background = state.picking ? '#ff5b45' : '#1a1a1a';
    if (!state.picking) { highlight.style.display = 'none'; tip.style.display = 'none'; }
  });
  listBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    hint.textContent = state.notes.length
      ? state.notes.map(function (n, i) { return (i + 1) + '. [' + n.severity + '] ' + (n.note || n.element_label); }).join('  |  ')
      : 'No notes yet.';
  });
  clearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    hint.textContent = 'Click "Clear all" again within 3s to confirm.';
    if (clearBtn.__armed) { state.notes = []; state.seq = 0; render(); closeEditor(); hint.textContent = 'Cleared.'; clearBtn.__armed = false; return; }
    clearBtn.__armed = true;
    setTimeout(function () { clearBtn.__armed = false; }, 3000);
  });

  // ---- Public API --------------------------------------------------------
  var api = {
    __booted: true,
    notes: state.notes,
    export: function () {
      return {
        url: location.href,
        path: location.pathname,
        title: document.title,
        viewport: state.viewport || (window.innerWidth + 'x' + window.innerHeight),
        capturedAt: new Date().toISOString(),
        notes: state.notes.map(function (n) {
          var live = !!resolveAnchor(n.anchor);
          return Object.assign({}, n, { anchorLive: live });
        }),
      };
    },
    setViewport: function (name) { state.viewport = name; render(); return name; },
    show: function () { root.style.display = ''; hud.style.display = ''; },
    hide: function () { root.style.display = 'none'; hud.style.display = 'none'; },
    clear: function () { state.notes.length = 0; state.seq = 0; render(); },
    destroy: function () {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', render, true);
      window.removeEventListener('resize', render, true);
      [root, highlight, tip, pinLayer, hud].forEach(function (n) { if (n && n.remove) n.remove(); });
      try { delete window.__CRITIC__; } catch (e) { window.__CRITIC__ = undefined; }
    },
  };
  Object.defineProperty(api, 'notes', { get: function () { return state.notes; } });

  // ---- Boot --------------------------------------------------------------
  [root, highlight, tip, pinLayer, hud].forEach(function (n) { document.documentElement.appendChild(n); });
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  window.addEventListener('scroll', render, true);
  window.addEventListener('resize', render, true);
  window.__CRITIC__ = api;
  render();
  return 'Critic Layer injected. Click elements to pin notes; read via JSON.stringify(window.__CRITIC__.export())';
})();
