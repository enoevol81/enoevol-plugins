#!/usr/bin/env python3
"""collect-inventory.py — read-only, filesystem-first snapshot of the active
Claude Code environment. Cross-platform (Windows, macOS, Linux, WSL).
Reconciles installed vs enabled. Never writes.

Usage:
    python3 collect-inventory.py [home_override]
"""
import json
import os
import sys
from pathlib import Path

HOME = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home()
CWD = Path(os.environ.get("CWD", os.getcwd()))


def load(p):
    p = Path(p)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            return {"__error__": f"{type(e).__name__}: {e}"}
    return None


def head(t):
    print(f"\n===== {t} =====")


# ── INSTALLED PLUGINS ─────────────────────────────────────────────────────────
head("INSTALLED PLUGINS  (~/.claude/plugins/installed_plugins.json)")
reg = load(HOME / ".claude/plugins/installed_plugins.json")
installed = {}
if isinstance(reg, dict) and reg.get("plugins"):
    for k, ent in reg["plugins"].items():
        ent = ent if isinstance(ent, list) else [ent]
        sc = ",".join(filter(None, (e.get("scope", "") for e in ent if isinstance(e, dict)))) or "?"
        vr = ",".join(filter(None, (e.get("version", "") for e in ent if isinstance(e, dict)))) or "?"
        installed[k] = True
        print(f"  {k:<45} scope={sc} version={vr}")
else:
    print("  (no registry — no marketplace-installed plugins)")


# ── KNOWN MARKETPLACES ────────────────────────────────────────────────────────
head("KNOWN MARKETPLACES  (~/.claude/plugins/known_marketplaces.json)")
mk = load(HOME / ".claude/plugins/known_marketplaces.json")
if isinstance(mk, dict):
    inner = mk.get("marketplaces", mk)
    names = list(inner.keys()) if isinstance(inner, dict) else []
    print("  " + ", ".join(names) if names else "  (none)")
else:
    print("  (none)")


# ── PLUGIN CACHE TREE ─────────────────────────────────────────────────────────
head("PLUGIN CACHE TREE  (~/.claude/plugins/cache)")
cache = HOME / ".claude/plugins/cache"
if cache.exists():
    for mp in sorted(cache.iterdir()):
        if mp.is_dir():
            print(f"  {mp.name}/")
            for pl in sorted(mp.iterdir()):
                if pl.is_dir():
                    versions = ", ".join(v.name for v in sorted(pl.iterdir()) if v.is_dir())
                    print(f"    {pl.name} -> {versions}")
else:
    print("  (no cache dir)")


# ── ENABLED-STATE FROM SETTINGS ───────────────────────────────────────────────
SET = [
    ("user",          HOME / ".claude/settings.json"),
    ("project",       CWD / ".claude/settings.json"),
    ("project-local", CWD / ".claude/settings.local.json"),
]
enabled, en_mcp, dis_mcp, extra_mkts = {}, {}, {}, {}

head("ENABLED-STATE FROM SETTINGS  (precedence: project-local > project > user)")
for scope, p in SET:
    s = load(p)
    if not isinstance(s, dict):
        print(f"  [{scope}] (none)")
        continue
    if "__error__" in s:
        print(f"  [{scope}] {s['__error__']}")
        continue
    ep_pairs = []
    for k, v in (s.get("enabledPlugins") or {}).items():
        enabled[k] = {"scope": scope, "val": bool(v)}
        ep_pairs.append(f"{k}={bool(v)}")
    for n in (s.get("enabledMcpjsonServers") or []):
        en_mcp.setdefault(n, scope)
    for n in (s.get("disabledMcpjsonServers") or []):
        dis_mcp.setdefault(n, scope)
    if isinstance(s.get("extraKnownMarketplaces"), dict):
        extra_mkts.update(s["extraKnownMarketplaces"])
    hooks = "yes" if s.get("hooks") else "no"
    ep_str = "{" + "; ".join(ep_pairs) + "}" if ep_pairs else "{}"
    en = ",".join(s.get("enabledMcpjsonServers") or [])
    dis = ",".join(s.get("disabledMcpjsonServers") or [])
    print(f"  [{scope}] enabledPlugins={ep_str} enabledMcp=[{en}] disabledMcp=[{dis}] hooks={hooks}")


# ── PLUGIN RECONCILIATION ─────────────────────────────────────────────────────
head("PLUGIN RECONCILIATION  (installed vs enabled)")
all_keys = sorted(set(installed) | set(enabled))
if not all_keys:
    print("  (no plugins installed or configured)")
for k in all_keys:
    inst = k in installed
    if k in enabled:
        e = enabled[k]
        state = ("ENABLED" if e["val"] else "DISABLED") + f" ({e['scope']})"
    else:
        state = "unset (defaultEnabled fallback)"
    flag = ""
    if not inst:
        flag = "  <-- enabled but NOT in install registry (@skills-dir / --plugin-dir?)"
    elif k in enabled and not enabled[k]["val"]:
        flag = "  <-- installed but DISABLED (dead weight if unused)"
    print(f"  {k:<45} installed={'yes' if inst else 'no'}  {state}{flag}")


# ── @skills-dir PLUGINS ───────────────────────────────────────────────────────
head("@skills-dir PLUGINS  (folders with .claude-plugin/plugin.json)")
any_sd = False
for scope, base in [("user", HOME / ".claude/skills"), ("project", CWD / ".claude/skills")]:
    base = Path(base)
    if base.exists():
        for d in sorted(base.iterdir()):
            man = d / ".claude-plugin/plugin.json"
            if man.exists():
                any_sd = True
                m = load(man) or {}
                desc = str(m.get("description", ""))[:80]
                print(f"  [{scope}] {m.get('name', '?')}@skills-dir v{m.get('version', '?')} - {desc}")
if not any_sd:
    print("  (none)")


# ── SKILLS ────────────────────────────────────────────────────────────────────
head("SKILLS  (SKILL.md folders)")
for scope, base in [("user", HOME / ".claude/skills"), ("project", CWD / ".claude/skills")]:
    base = Path(base)
    hit = False
    if base.exists():
        for d in sorted(base.iterdir()):
            sm = d / "SKILL.md"
            if sm.exists():
                hit = True
                desc = ""
                for line in sm.read_text(encoding="utf-8", errors="replace").splitlines():
                    if line.strip().lower().startswith("description:"):
                        desc = line.split(":", 1)[1].strip()[:120]
                        break
                print(f"  [{scope}] /{d.name} - {desc}")
    if not hit:
        print(f"  [{scope}] (none)")


# ── AGENTS ────────────────────────────────────────────────────────────────────
head("AGENTS / SUBAGENTS  (.md)")
for scope, base in [("user", HOME / ".claude/agents"), ("project", CWD / ".claude/agents")]:
    base = Path(base)
    md = []
    if base.exists():
        md = sorted(f.name for f in base.iterdir() if f.suffix == ".md")
    print(f"  [{scope}] {', '.join(md) if md else '(none)'}")


# ── MCP SERVERS ───────────────────────────────────────────────────────────────
head("MCP SERVERS  (configured + enabled state + context cost)")
conf: dict[str, list[str]] = {}


def add_servers(src: str, obj):
    if isinstance(obj, dict):
        for n in obj:
            conf.setdefault(n, []).append(src)


proj_mcp = load(CWD / ".mcp.json") or {}
add_servers("project .mcp.json", proj_mcp.get("mcpServers"))

cj = load(HOME / ".claude.json") or {}
add_servers("user ~/.claude.json", cj.get("mcpServers"))

proj_slice: dict = {}
if isinstance(cj.get("projects"), dict):
    proj_slice = cj["projects"].get(str(CWD), {}) or {}
    add_servers("project ~/.claude.json", proj_slice.get("mcpServers"))
    for n in (proj_slice.get("enabledMcpjsonServers") or []):
        en_mcp.setdefault(n, "project ~/.claude.json")
    for n in (proj_slice.get("disabledMcpjsonServers") or []):
        dis_mcp.setdefault(n, "project ~/.claude.json")

always = set()
for obj in [proj_mcp.get("mcpServers"), cj.get("mcpServers"), proj_slice.get("mcpServers")]:
    if isinstance(obj, dict):
        for n, c in obj.items():
            if isinstance(c, dict) and c.get("alwaysLoad"):
                always.add(n)

if not conf:
    print("  (no MCP servers configured)")
for n in sorted(conf):
    if n in en_mcp:
        st = f"ENABLED ({en_mcp[n]})"
    elif n in dis_mcp:
        st = f"DISABLED ({dis_mcp[n]})"
    else:
        st = "pending approval / not toggled"
    cost = "  [alwaysLoad: upfront context cost]" if n in always else ""
    print(f"  {n:<26} {st:<32} sources={','.join(conf[n])}{cost}")


# ── MARKETPLACES IN SETTINGS ──────────────────────────────────────────────────
head("MARKETPLACES IN SETTINGS  (extraKnownMarketplaces)")
if extra_mkts:
    print("  " + ", ".join(sorted(extra_mkts)))
else:
    print("  (none)")


# ── CLAUDE.md MEMORY FILES ────────────────────────────────────────────────────
head("CLAUDE.md MEMORY FILES")
for p in [CWD / "CLAUDE.md", CWD / ".claude/CLAUDE.md", HOME / ".claude/CLAUDE.md"]:
    status = "present" if p.exists() else "(none)"
    print(f"  {p} : {status}")


head("END")
