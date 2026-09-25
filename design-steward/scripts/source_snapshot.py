#!/usr/bin/env python3
"""Hash scoped design sources; detect changes, additions and removals before report reuse."""
import argparse
import hashlib
import json
from pathlib import Path
import os

SKIP = {'.git', 'node_modules', 'vendor', 'dist', 'build', '.next', '.venv', '__pycache__', '_canon-check', '.design-steward', '.hands-free'}
EXT = {'.md', '.mdx', '.css', '.scss', '.sass', '.less', '.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.html'}


def snapshot(root, scope='.', limit=10000):
    root = root.resolve()
    base = (root / scope).resolve()
    if not base.is_relative_to(root) or not base.is_dir():
        raise ValueError('Scope must be a directory inside the project')
    result = {'schemaVersion': 1, 'root': str(root), 'scope': scope, 'files': {}, 'skipped': [], 'complete': True}
    def fail(error):
        result['skipped'].append(str(error))
        result['complete'] = False
    for folder, dirs, files in os.walk(base, onerror=fail):
        dirs[:] = sorted(d for d in dirs if d not in SKIP and not (Path(folder) / d).is_symlink())
        for name in sorted(files):
            path = Path(folder) / name
            if path.suffix.lower() not in EXT:
                continue
            rel = path.relative_to(root).as_posix()
            try:
                if path.is_symlink() or path.stat().st_size > 2_000_000:
                    fail(f'Skipped oversized or symbolic source: {rel}')
                    continue
                if len(result['files']) >= limit:
                    fail('File limit reached')
                    return result
                result['files'][rel] = hashlib.sha256(path.read_bytes()).hexdigest()
            except OSError as error:
                fail(error)
    return result


def changes(old, new):
    before, after = old['files'], new['files']
    return {'added': sorted(after.keys() - before.keys()), 'removed': sorted(before.keys() - after.keys()),
            'changed': sorted(k for k in before.keys() & after.keys() if before[k] != after[k]),
            'complete': old['complete'] and new['complete'],
            'sameRoot': old['root'] == new['root'], 'skipped': new['skipped']}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['save', 'check'])
    p.add_argument('root', type=Path)
    p.add_argument('baseline', type=Path)
    p.add_argument('--scope', default='.')
    a = p.parse_args()
    try:
        if a.action == 'save':
            data = snapshot(a.root, a.scope)
            a.baseline.parent.mkdir(parents=True, exist_ok=True)
            a.baseline.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8', newline='\n')
            print(json.dumps({'complete': data['complete'], 'files': len(data['files']), 'skipped': data['skipped']}))
        else:
            old = json.loads(a.baseline.read_text(encoding='utf-8'))
            data = changes(old, snapshot(a.root, old['scope']))
            data['fresh'] = data['complete'] and data['sameRoot'] and not any(data[k] for k in ('added', 'removed', 'changed'))
            print(json.dumps(data, indent=2))
            if not data['fresh']:
                raise SystemExit(2)
    except (OSError, ValueError, KeyError) as error:
        p.exit(1, f'error: {error}\n')


if __name__ == '__main__':
    main()
