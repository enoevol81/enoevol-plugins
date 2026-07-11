#!/usr/bin/env python3
"""collect-inventory.py — read-only, filesystem-first snapshot of the active
Claude Code environment. Cross-platform (Windows, macOS, Linux, WSL).
Reconciles installed vs enabled, and estimates always-loaded context cost.
Never writes. Never stack-traces: every section degrades to an inline
`[error: ...]` line and the rest of the report still prints.

Usage:
    python3 collect-inventory.py [home_override]

Token estimates are chars/4 — rough, but consistent run-to-run.
MCP tool schemas can't be measured offline; run /context in-session for those.
"""
import json
import os
import sys
from pathlib import Path

# Windows consoles may default to a legacy codepage that can't print
# this report's characters — force UTF-8 with replacement, never crash.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    HOME = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home()
except Exception:
    HOME = Path(os.path.expanduser("~"))
CWD = Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.environ.get("CWD") or os.getcwd())

# Running totals for the CONTEXT BUDGET summary (always-loaded description tokens)
BUDGET = {"skills": 0, "agents": 0, "commands": 0, "plugin cache": 0, "CLAUDE.md": 0}


def est_tokens(text):
    return (len(text) + 3) // 4 if text else 0


def load(p):
    """Parse a JSON file. Returns dict/list, {'__error__': ...} on bad JSON/IO,
    or None if the file doesn't exist."""
    p = Path(p)
    try:
        if not p.is_file():
            return None
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return {"__error__": f"{type(e).__name__}: {e}"}


def is_err(obj):
    return isinstance(obj, dict) and "__error__" in obj


def read_text(p):
    try:
        return Path(p).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def listdir(p):
    """Sorted directory entries; [] on missing dir or permission error."""
    try:
        return sorted(Path(p).iterdir())
    except OSError:
        return []


def frontmatter(text):
    """Minimal YAML frontmatter parser: top-level `key: value` pairs, with
    folded/literal multiline values (>-, |, or indented continuation lines)
    joined by spaces. Tolerates CRLF. Returns {} when no frontmatter."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    out, key = {}, None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line[:1] in (" ", "\t") and key:
            out[key] = (out[key] + " " + line.strip()).strip()
        elif ":" in line and not line[:1] in (" ", "\t"):
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            out[key] = "" if val in (">", ">-", ">+", "|", "|-", "|+") else val
        else:
            key = None
    return out


def section(title):
    """Print a section header, run the body, and contain any failure so the
    rest of the report still prints."""
    def deco(fn):
        print(f"\n===== {title} =====")
        try:
            fn()
        except Exception as e:
            print(f"  [error: {type(e).__name__}: {e}]")
        return fn
    return deco


# Cross-section state
installed = {}
enabled = {}
en_mcp, dis_mcp = {}, {}
extra_mkts = {}


@section("INSTALLED PLUGINS  (~/.claude/plugins/installed_plugins.json)")
def _installed():
    reg = load(HOME / ".claude/plugins/installed_plugins.json")
    if is_err(reg):
        print(f"  [unreadable registry: {reg['__error__']}]")
        return
    if not (isinstance(reg, dict) and isinstance(reg.get("plugins"), dict) and reg["plugins"]):
        print("  (no registry — no marketplace-installed plugins)")
        return
    for k, ent in reg["plugins"].items():
        ent = ent if isinstance(ent, list) else [ent]
        sc = ",".join(filter(None, (e.get("scope", "") for e in ent if isinstance(e, dict)))) or "?"
        vr = ",".join(filter(None, (e.get("version", "") for e in ent if isinstance(e, dict)))) or "?"
        installed[k] = True
        print(f"  {k:<45} scope={sc} version={vr}")


@section("KNOWN MARKETPLACES  (~/.claude/plugins/known_marketplaces.json)")
def _marketplaces():
    mk = load(HOME / ".claude/plugins/known_marketplaces.json")
    if is_err(mk):
        print(f"  [unreadable: {mk['__error__']}]")
        return
    names = []
    if isinstance(mk, dict):
        inner = mk.get("marketplaces", mk)
        if isinstance(inner, dict):
            names = list(inner.keys())
    print("  " + ", ".join(names) if names else "  (none)")


def cache_plugin_cost(vdir):
    """Count components in a cached plugin version dir and estimate the
    always-loaded token cost of its skill/agent/command descriptions."""
    n_sk = n_ag = n_cmd = 0
    tok = 0
    for d in listdir(vdir / "skills"):
        sm = d / "SKILL.md"
        if sm.is_file():
            n_sk += 1
            tok += est_tokens(frontmatter(read_text(sm)).get("description", ""))
    for f in listdir(vdir / "agents"):
        if f.suffix == ".md":
            n_ag += 1
            tok += est_tokens(frontmatter(read_text(f)).get("description", ""))
    try:
        cmds = sorted((vdir / "commands").rglob("*.md")) if (vdir / "commands").is_dir() else []
    except OSError:
        cmds = []
    for f in cmds:
        n_cmd += 1
        tok += est_tokens(frontmatter(read_text(f)).get("description", ""))
    man = load(vdir / ".claude-plugin/plugin.json")
    has_hooks = (vdir / "hooks").is_dir() or bool(
        isinstance(man, dict) and not is_err(man) and man.get("hooks"))
    return n_sk, n_ag, n_cmd, has_hooks, tok


def ver_key(name):
    """Sort '0.10.0' after '0.9.0'; non-numeric parts sort after numeric."""
    return [(0, int(p)) if p.isdigit() else (1, p) for p in name.split(".")]


@section("PLUGIN CACHE TREE  (~/.claude/plugins/cache — what each installed plugin ships)")
def _cache():
    cache = HOME / ".claude/plugins/cache"
    if not cache.is_dir():
        print("  (no cache dir)")
        return
    for mp in listdir(cache):
        if not mp.is_dir():
            continue
        print(f"  {mp.name}/")
        for pl in listdir(mp):
            if not pl.is_dir():
                continue
            vdirs = sorted((v for v in listdir(pl) if v.is_dir()),
                           key=lambda v: ver_key(v.name))
            if not vdirs:
                print(f"    {pl.name} -> (no version dirs)")
                continue
            latest = vdirs[-1]
            n_sk, n_ag, n_cmd, hooks, tok = cache_plugin_cost(latest)
            BUDGET["plugin cache"] += tok
            parts = []
            if n_sk:
                parts.append(f"{n_sk} skill{'s' if n_sk != 1 else ''}")
            if n_ag:
                parts.append(f"{n_ag} agent{'s' if n_ag != 1 else ''}")
            if n_cmd:
                parts.append(f"{n_cmd} command{'s' if n_cmd != 1 else ''}")
            if hooks:
                parts.append("hooks")
            detail = ", ".join(parts) or "no components found"
            print(f"    {pl.name} -> {', '.join(v.name for v in vdirs)}"
                  f"  [{detail}; ~{tok} desc tok if enabled]")


@section("ENABLED-STATE FROM SETTINGS  (precedence: project-local > project > user)")
def _settings():
    sources = [
        ("user",          HOME / ".claude/settings.json"),
        ("project",       CWD / ".claude/settings.json"),
        ("project-local", CWD / ".claude/settings.local.json"),
    ]
    for scope, p in sources:
        s = load(p)
        if s is None:
            print(f"  [{scope}] (none)")
            continue
        if is_err(s):
            print(f"  [{scope}] [unreadable: {s['__error__']}]")
            continue
        if not isinstance(s, dict):
            print(f"  [{scope}] [unexpected shape: {type(s).__name__}]")
            continue
        ep_pairs = []
        ep = s.get("enabledPlugins")
        for k, v in (ep.items() if isinstance(ep, dict) else []):
            enabled[k] = {"scope": scope, "val": bool(v)}
            ep_pairs.append(f"{k}={bool(v)}")
        for n in (s.get("enabledMcpjsonServers") or []):
            en_mcp.setdefault(n, scope)
        for n in (s.get("disabledMcpjsonServers") or []):
            dis_mcp.setdefault(n, scope)
        if isinstance(s.get("extraKnownMarketplaces"), dict):
            extra_mkts.update(s["extraKnownMarketplaces"])
        hk = s.get("hooks")
        hooks = ",".join(sorted(hk)) if isinstance(hk, dict) and hk else "no"
        ep_str = "{" + "; ".join(ep_pairs) + "}" if ep_pairs else "{}"
        en = ",".join(s.get("enabledMcpjsonServers") or [])
        dis = ",".join(s.get("disabledMcpjsonServers") or [])
        print(f"  [{scope}] enabledPlugins={ep_str} enabledMcp=[{en}] disabledMcp=[{dis}] hooks={hooks}")


@section("PLUGIN RECONCILIATION  (installed vs enabled)")
def _reconcile():
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


@section("@skills-dir PLUGINS  (folders with .claude-plugin/plugin.json)")
def _skillsdir():
    any_sd = False
    for scope, base in [("user", HOME / ".claude/skills"), ("project", CWD / ".claude/skills")]:
        for d in listdir(base):
            man = d / ".claude-plugin/plugin.json"
            m = load(man)
            if m is None:
                continue
            any_sd = True
            if is_err(m):
                print(f"  [{scope}] {d.name}@skills-dir [unreadable manifest: {m['__error__']}]")
                continue
            desc = str(m.get("description", ""))[:80]
            print(f"  [{scope}] {m.get('name', '?')}@skills-dir v{m.get('version', '?')} - {desc}")
    if not any_sd:
        print("  (none)")


@section("SKILLS  (SKILL.md folders; description is always in context)")
def _skills():
    for scope, base in [("user", HOME / ".claude/skills"), ("project", CWD / ".claude/skills")]:
        hit = False
        for d in listdir(base):
            sm = d / "SKILL.md"
            if not sm.is_file():
                continue
            hit = True
            desc = frontmatter(read_text(sm)).get("description", "")
            tok = est_tokens(desc)
            BUDGET["skills"] += tok
            if desc:
                print(f"  [{scope}] /{d.name}  ~{tok} tok - {desc[:110]}")
            else:
                print(f"  [{scope}] /{d.name}  ~0 tok  <-- no description parsed (broken frontmatter? won't trigger)")
        if not hit:
            print(f"  [{scope}] (none)")


@section("AGENTS / SUBAGENTS  (.md; description is always in context)")
def _agents():
    for scope, base in [("user", HOME / ".claude/agents"), ("project", CWD / ".claude/agents")]:
        hit = False
        for f in listdir(base):
            if f.suffix != ".md":
                continue
            hit = True
            desc = frontmatter(read_text(f)).get("description", "")
            tok = est_tokens(desc)
            BUDGET["agents"] += tok
            print(f"  [{scope}] {f.name}  ~{tok} tok - {desc[:110]}")
        if not hit:
            print(f"  [{scope}] (none)")


@section("SLASH COMMANDS  (.claude/commands, incl. subdirs)")
def _commands():
    for scope, base in [("user", HOME / ".claude/commands"), ("project", CWD / ".claude/commands")]:
        try:
            files = sorted(Path(base).rglob("*.md")) if Path(base).is_dir() else []
        except OSError:
            files = []
        if not files:
            print(f"  [{scope}] (none)")
            continue
        for f in files:
            name = "/" + str(f.relative_to(base).with_suffix("")).replace(os.sep, ":")
            desc = frontmatter(read_text(f)).get("description", "")
            tok = est_tokens(desc)
            BUDGET["commands"] += tok
            print(f"  [{scope}] {name}  ~{tok} tok - {desc[:100]}")


@section("MCP SERVERS  (configured + enabled state + context cost)")
def _mcp():
    conf = {}

    def add_servers(src, obj):
        if isinstance(obj, dict):
            for n in obj:
                conf.setdefault(n, []).append(src)

    proj_mcp = load(CWD / ".mcp.json")
    if is_err(proj_mcp):
        print(f"  [project .mcp.json unreadable: {proj_mcp['__error__']}]")
        proj_mcp = {}
    proj_mcp = proj_mcp or {}
    add_servers("project .mcp.json", proj_mcp.get("mcpServers"))

    cj = load(HOME / ".claude.json")
    if is_err(cj):
        print(f"  [~/.claude.json unreadable: {cj['__error__']}]")
        cj = {}
    cj = cj or {}
    add_servers("user ~/.claude.json", cj.get("mcpServers"))

    proj_slice = {}
    if isinstance(cj.get("projects"), dict):
        # match the project slice on either native or normalized path spelling
        for key in (str(CWD), CWD.as_posix()):
            if isinstance(cj["projects"].get(key), dict):
                proj_slice = cj["projects"][key]
                break
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
        return
    for n in sorted(conf):
        if n in en_mcp:
            st = f"ENABLED ({en_mcp[n]})"
        elif n in dis_mcp:
            st = f"DISABLED ({dis_mcp[n]})"
        else:
            st = "pending approval / not toggled"
        cost = "  [alwaysLoad: upfront context cost]" if n in always else ""
        print(f"  {n:<26} {st:<32} sources={','.join(conf[n])}{cost}")
    print("  (tool-schema token cost is per enabled server and not measurable offline — run /context in-session)")


@section("MARKETPLACES IN SETTINGS  (extraKnownMarketplaces)")
def _extra_mkts():
    if extra_mkts:
        print("  " + ", ".join(sorted(extra_mkts)))
    else:
        print("  (none)")


@section("CLAUDE.md MEMORY FILES  (loaded in full every session)")
def _memory():
    for p in [CWD / "CLAUDE.md", CWD / ".claude/CLAUDE.md", CWD / "CLAUDE.local.md",
              HOME / ".claude/CLAUDE.md"]:
        if p.is_file():
            tok = est_tokens(read_text(p))
            BUDGET["CLAUDE.md"] += tok
            print(f"  {p} : present (~{tok} tok)")
        else:
            print(f"  {p} : (none)")


@section("CONTEXT BUDGET  (rough: chars/4; descriptions + memory always loaded)")
def _budget():
    total = 0
    for k, v in BUDGET.items():
        print(f"  {k:<14} ~{v} tok")
        total += v
    print(f"  {'TOTAL':<14} ~{total} tok  (excludes MCP tool schemas and system prompt)")
    print("  note: 'plugin cache' counts every cached plugin; only ENABLED ones actually load.")


print("\n===== END =====")
