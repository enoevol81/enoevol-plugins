// icon-forge MCP — target detection + environment install logic.
// Pure Node (node:fs / node:path). No image transcoding here: icon-forge's
// rasterize.py produces the PNG sizes; this module places files and writes the
// platform-native loaders/manifests that wire them into the live project.

import fs from "node:fs";
import path from "node:path";

const SVG_RE = /\.svg$/i;
const PNG_RE = /\.png$/i;

// ---------------------------------------------------------------------------
// small fs helpers
// ---------------------------------------------------------------------------

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readText(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function listFiles(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function stem(file) {
  return path.basename(file).replace(/\.[^.]+$/, "");
}

function toIconId(file) {
  return stem(file)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

// Collect the source icons. Looks in iconsDir, iconsDir/svg, iconsDir/png.
function collectIcons(iconsDir) {
  const svgs = [];
  const pngs = [];
  const scan = (dir) => {
    for (const ent of listFiles(dir)) {
      if (!ent.isFile()) continue;
      const full = path.join(dir, ent.name);
      if (SVG_RE.test(ent.name)) svgs.push(full);
      else if (PNG_RE.test(ent.name)) pngs.push(full);
    }
  };
  scan(iconsDir);
  scan(path.join(iconsDir, "svg"));
  scan(path.join(iconsDir, "png"));
  // de-dupe by basename (same logical icon may appear in . and ./svg) — keep first.
  const byName = (arr) => {
    const seen = new Set();
    return arr.filter((p) => {
      const k = path.basename(p).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  return {
    svgs: byName(svgs),
    pngs: byName(pngs),
  };
}

// ---------------------------------------------------------------------------
// target detection
// ---------------------------------------------------------------------------

export const TARGETS = {
  blender: {
    label: "Blender add-on",
    installs: "PNGs into <project>/icons/ + a bpy.utils.previews loader (icon_forge_icons.py).",
  },
  "vscode-extension": {
    label: "VS Code extension",
    installs: "Icons into <project>/icons/ + a contributes.icons snippet for package.json.",
  },
  web: {
    label: "Web app / site",
    installs: "Icons into <project>/public/icons/, an SVG sprite, favicon <link> snippet, and site.webmanifest.",
  },
  electron: {
    label: "Electron app",
    installs: "Icons into <project>/build/icons/ (electron-builder convention) + an index.",
  },
  generic: {
    label: "Generic project",
    installs: "Icons into <project>/icons/ + an icons.index.json manifest.",
  },
};

export function detectTarget(projectDir) {
  const evidence = [];
  const has = (rel) => exists(path.join(projectDir, rel));

  const pkg = readJSON(path.join(projectDir, "package.json"));
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const dep = (name) => Object.prototype.hasOwnProperty.call(deps, name);

  // Blender: manifest, or any python with bpy / bl_info
  if (has("blender_manifest.toml")) evidence.push("blender_manifest.toml present");
  const initPy = readText(path.join(projectDir, "__init__.py"));
  if (/bl_info\s*=/.test(initPy) || /import\s+bpy/.test(initPy)) {
    evidence.push("__init__.py uses bl_info / bpy");
  }
  if (evidence.length) return finalize("blender", evidence);

  // shallow scan for a bpy python file (one level deep) before giving up on blender
  for (const ent of listFiles(projectDir)) {
    if (ent.isFile() && ent.name.endsWith(".py")) {
      const txt = readText(path.join(projectDir, ent.name));
      if (/import\s+bpy/.test(txt) || /bl_info\s*=/.test(txt)) {
        return finalize("blender", [`${ent.name} uses bpy / bl_info`]);
      }
    }
  }

  // VS Code extension
  if (pkg && (pkg.engines?.vscode || pkg.contributes)) {
    return finalize("vscode-extension", ["package.json has engines.vscode / contributes"]);
  }

  // Electron
  if (dep("electron")) return finalize("electron", ["package.json depends on electron"]);

  // Web frameworks / static
  for (const f of ["react", "next", "vue", "svelte", "vite", "@angular/core", "astro", "solid-js"]) {
    if (dep(f)) return finalize("web", [`package.json depends on ${f}`]);
  }
  if (has("public") || has("index.html") || has(path.join("src", "index.html"))) {
    return finalize("web", ["public/ or index.html present"]);
  }
  if (pkg) return finalize("web", ["package.json present (assuming web/JS project)"]);

  return finalize("generic", ["no platform signal found — using generic install"]);

  function finalize(target, ev) {
    return {
      target,
      label: TARGETS[target].label,
      confidence: target === "generic" ? "low" : "high",
      evidence: ev,
      recommendedInstall: TARGETS[target].installs,
    };
  }
}

// ---------------------------------------------------------------------------
// installers (one per target). Each returns { wrote: [], notes: [], nextSteps: [] }
// ---------------------------------------------------------------------------

function rel(projectDir, p) {
  return path.relative(projectDir, p).split(path.sep).join("/");
}

function installBlender(projectDir, icons, opts) {
  const wrote = [];
  const dest = path.join(projectDir, "icons");
  const sources = icons.pngs.length ? icons.pngs : icons.svgs;
  if (!icons.pngs.length) {
    // Blender's previews API needs raster. Warn but still place SVGs as source.
  }
  const ids = [];
  for (const src of sources) {
    const out = path.join(dest, path.basename(src));
    copyFile(src, out);
    wrote.push(rel(projectDir, out));
    if (PNG_RE.test(src)) ids.push([toIconId(src), path.basename(src)]);
  }
  // loader
  const entries = ids.map(([id, fn]) => `    "${id}": "${fn}",`).join("\n");
  const loader = blenderLoader(entries);
  const loaderPath = path.join(projectDir, "icon_forge_icons.py");
  fs.writeFileSync(loaderPath, loader, "utf8");
  wrote.push(rel(projectDir, loaderPath));

  const notes = icons.pngs.length
    ? []
    : ["No PNGs found — Blender's previews API needs raster. Run scripts/rasterize.py on your SVGs first, then re-install."];
  return {
    wrote,
    notes,
    nextSteps: [
      "In your add-on's __init__.py: `from . import icon_forge_icons` then call `icon_forge_icons.register_icons()` in register() and `unregister_icons()` in unregister().",
      'Use an icon in a layout with `icon_value=icon_forge_icons.get_icon("MY_ICON")`.',
    ],
  };
}

function installVscode(projectDir, icons, opts) {
  const wrote = [];
  const dest = path.join(projectDir, "icons");
  for (const src of [...icons.svgs, ...icons.pngs]) {
    const out = path.join(dest, path.basename(src));
    copyFile(src, out);
    wrote.push(rel(projectDir, out));
  }
  // Reference snippet: plain image icons are referenced directly from contributes
  // (light/dark SVG paths). An icon-font contribution is overkill for most extensions.
  const snippet = {
    "// note": "VS Code custom 'contributes.icons' use an icon font. For plain image icons, reference icons/<file>.svg directly from your views/commands. This snippet lists the available files.",
    files: [...icons.svgs, ...icons.pngs].map((s) => `icons/${path.basename(s)}`),
  };
  const snippetPath = path.join(projectDir, "icon-forge.contributes.json");
  fs.writeFileSync(snippetPath, JSON.stringify(snippet, null, 2), "utf8");
  wrote.push(rel(projectDir, snippetPath));
  return {
    wrote,
    notes: [],
    nextSteps: [
      "Reference an icon from a command/view, e.g. `\"icon\": { \"light\": \"icons/foo.svg\", \"dark\": \"icons/foo.svg\" }` in your package.json contributes block.",
    ],
  };
}

function installWeb(projectDir, icons, opts) {
  const wrote = [];
  const publicDir = exists(path.join(projectDir, "public"))
    ? path.join(projectDir, "public")
    : projectDir;
  const dest = path.join(publicDir, "icons");
  for (const src of [...icons.svgs, ...icons.pngs]) {
    const out = path.join(dest, path.basename(src));
    copyFile(src, out);
    wrote.push(rel(projectDir, out));
  }

  // SVG sprite from the svgs
  if (icons.svgs.length) {
    const sprite = buildSvgSprite(icons.svgs);
    const spritePath = path.join(dest, "sprite.svg");
    fs.writeFileSync(spritePath, sprite, "utf8");
    wrote.push(rel(projectDir, spritePath));
  }

  // favicon snippet + webmanifest (reference conventional sizes if those PNGs exist)
  const pngNames = new Set(icons.pngs.map((p) => path.basename(p)));
  const faviconHtml = buildFaviconSnippet(pngNames);
  const htmlPath = path.join(projectDir, "icon-forge-head.html");
  fs.writeFileSync(htmlPath, faviconHtml, "utf8");
  wrote.push(rel(projectDir, htmlPath));

  const manifest = buildWebManifest(pngNames, opts);
  const manifestPath = path.join(publicDir, "site.webmanifest");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  wrote.push(rel(projectDir, manifestPath));

  return {
    wrote,
    notes: icons.svgs.length
      ? []
      : ["No SVGs found — skipped the SVG sprite. Provide SVG sources to get an inline sprite."],
    nextSteps: [
      "Paste icon-forge-head.html into your document <head> (or copy the <link> tags into your framework's head component).",
      'Use a sprite icon with `<svg><use href="/icons/sprite.svg#ICON_ID"/></svg>`.',
    ],
  };
}

function installElectron(projectDir, icons, opts) {
  const wrote = [];
  const dest = path.join(projectDir, "build", "icons");
  for (const src of [...icons.pngs, ...icons.svgs]) {
    const out = path.join(dest, path.basename(src));
    copyFile(src, out);
    wrote.push(rel(projectDir, out));
  }
  return {
    wrote,
    notes: [],
    nextSteps: [
      "Point electron-builder at build/icons/ via the `icon` field in your build config.",
    ],
  };
}

function installGeneric(projectDir, icons, opts) {
  const wrote = [];
  const dest = path.join(projectDir, "icons");
  const index = [];
  for (const src of [...icons.svgs, ...icons.pngs]) {
    const out = path.join(dest, path.basename(src));
    copyFile(src, out);
    const r = rel(projectDir, out);
    wrote.push(r);
    index.push({ id: toIconId(src), file: r });
  }
  const indexPath = path.join(dest, "icons.index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  wrote.push(rel(projectDir, indexPath));
  return { wrote, notes: [], nextSteps: ["Reference icons via icons/icons.index.json."] };
}

const INSTALLERS = {
  blender: installBlender,
  "vscode-extension": installVscode,
  web: installWeb,
  electron: installElectron,
  generic: installGeneric,
};

export function installIconSet({ projectDir, iconsDir, target, options = {} }) {
  if (!exists(projectDir)) throw new Error(`projectDir does not exist: ${projectDir}`);
  if (!exists(iconsDir)) throw new Error(`iconsDir does not exist: ${iconsDir}`);

  const resolvedTarget = target || detectTarget(projectDir).target;
  const installer = INSTALLERS[resolvedTarget];
  if (!installer) throw new Error(`unknown target: ${resolvedTarget}`);

  const icons = collectIcons(iconsDir);
  if (!icons.svgs.length && !icons.pngs.length) {
    throw new Error(`no .svg or .png icons found in ${iconsDir} (looked in ., ./svg, ./png)`);
  }

  const result = installer(projectDir, icons, options);
  return {
    target: resolvedTarget,
    iconsFound: { svg: icons.svgs.length, png: icons.pngs.length },
    ...result,
  };
}

// ---------------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------------

function blenderLoader(entries) {
  return `"""icon-forge generated icon loader.

Import from your add-on's __init__.py:
    from . import icon_forge_icons
and call register_icons()/unregister_icons() from register()/unregister().
"""
import os
import bpy
import bpy.utils.previews

ICON_FILES = {
${entries || "    # (no PNGs were installed — run rasterize.py and re-install)"}
}

_pcoll = None
_ICON_DIR = os.path.join(os.path.dirname(__file__), "icons")


def register_icons():
    global _pcoll
    _pcoll = bpy.utils.previews.new()
    for icon_id, filename in ICON_FILES.items():
        path = os.path.join(_ICON_DIR, filename)
        if os.path.exists(path):
            _pcoll.load(icon_id, path, 'IMAGE')
        else:
            print(f"[icon-forge] missing: {path}")


def unregister_icons():
    global _pcoll
    if _pcoll is not None:
        bpy.utils.previews.remove(_pcoll)
        _pcoll = None


def get_icon(icon_id: str) -> int:
    return _pcoll[icon_id].icon_id
`;
}

function buildSvgSprite(svgPaths) {
  const symbols = [];
  for (const p of svgPaths) {
    const raw = readText(p);
    const viewBox = (raw.match(/viewBox\s*=\s*"([^"]+)"/i) || [])[1] || "0 0 24 24";
    // inner = everything between the outer <svg ...> and </svg>
    const inner = raw
      .replace(/^[\s\S]*?<svg[^>]*>/i, "")
      .replace(/<\/svg>\s*$/i, "")
      .trim();
    const id = toIconId(p);
    symbols.push(`  <symbol id="${id}" viewBox="${viewBox}">\n    ${inner}\n  </symbol>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join("\n")}\n</svg>\n`;
}

function buildFaviconSnippet(pngNames) {
  const has = (n) => pngNames.has(n);
  const lines = ["<!-- icon-forge favicon set — paste into <head> -->"];
  if (has("favicon-32.png") || has("favicon.png"))
    lines.push(`<link rel="icon" type="image/png" sizes="32x32" href="/icons/${has("favicon-32.png") ? "favicon-32.png" : "favicon.png"}">`);
  if (has("favicon-16.png"))
    lines.push(`<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png">`);
  if (has("apple-touch-icon.png") || has("icon-180.png"))
    lines.push(`<link rel="apple-touch-icon" sizes="180x180" href="/icons/${has("apple-touch-icon.png") ? "apple-touch-icon.png" : "icon-180.png"}">`);
  lines.push(`<link rel="manifest" href="/site.webmanifest">`);
  if (lines.length === 2)
    lines.push("<!-- Tip: name PNGs favicon-16.png / favicon-32.png / apple-touch-icon.png / icon-192.png / icon-512.png and re-install to auto-wire all sizes. -->");
  return lines.join("\n") + "\n";
}

function buildWebManifest(pngNames, opts) {
  const icons = [];
  if (pngNames.has("icon-192.png"))
    icons.push({ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" });
  if (pngNames.has("icon-512.png"))
    icons.push({ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" });
  return {
    name: opts.appName || "App",
    short_name: opts.shortName || opts.appName || "App",
    icons,
    theme_color: opts.themeColor || "#000000",
    background_color: opts.backgroundColor || "#ffffff",
    display: "standalone",
  };
}
