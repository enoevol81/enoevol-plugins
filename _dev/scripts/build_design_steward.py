#!/usr/bin/env python3
"""Assemble a standalone curated plugin; --check detects source/package drift."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'design-steward'


def files():
    result = {}
    for plugin in ('canon-check', 'critic-layer', 'hands-free', 'cut-weight'):
        for directory in ('skills', 'references', 'scripts'):
            base = ROOT / plugin / directory
            if not base.exists():
                continue
            for source in sorted(base.rglob('*')):
                if source.is_file() and '__pycache__' not in source.parts and source.suffix != '.pyc':
                    result[Path('components') / plugin / source.relative_to(ROOT / plugin)] = source
    for name, plugin in [('run_state.py', 'hands-free'), ('source_snapshot.py', 'canon-check'), ('source_candidates.py', 'critic-layer')]:
        result[Path('scripts') / name] = ROOT / plugin / 'scripts' / name
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check', action='store_true')
    a = p.parse_args()
    mapping = files()
    manifest = {dest.as_posix(): {'source': source.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()} for dest, source in mapping.items()}
    manifest_text = json.dumps(manifest, indent=2) + '\n'
    old_path = DEST / 'build-manifest.json'
    old = json.loads(old_path.read_text(encoding='utf-8')) if old_path.exists() else {}
    stale = sorted(set(old) - set(manifest))
    # Never silently leave removed source files in a release or delete hand edits.
    if stale:
        p.exit(1, 'Obsolete generated files require explicit review: ' + ', '.join(stale) + '\n')
    if a.check:
        bad = [str(dest) for dest, source in mapping.items() if not (DEST / dest).is_file() or (DEST / dest).read_bytes() != source.read_bytes()]
        if not old_path.exists() or old_path.read_text(encoding='utf-8') != manifest_text:
            bad.append('build-manifest.json')
        if bad:
            p.exit(1, 'Rebuild required: ' + ', '.join(bad) + '\n')
        print(f'PASS: {len(mapping)} bundled files match canonical sources')
        return
    for dest, source in mapping.items():
        target = DEST / dest
        if target.exists() and dest.as_posix() in old:
            recorded = old[dest.as_posix()]['sha256']
            current = hashlib.sha256(target.read_bytes()).hexdigest()
            desired = manifest[dest.as_posix()]['sha256']
            if current not in (recorded, desired):
                p.exit(1, f'Generated file has local edits; reconcile first: {target}\n')
    for dest, source in mapping.items():
        target = DEST / dest
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
    old_path.write_text(manifest_text, encoding='utf-8', newline='\n')
    print(f'Built {len(mapping)} shared component files; runtime has no sibling-plugin dependency')


if __name__ == '__main__':
    main()
