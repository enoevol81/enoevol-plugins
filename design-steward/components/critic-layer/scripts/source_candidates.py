#!/usr/bin/env python3
"""Find source candidates for capture text, IDs and classes; never claim a verified mapping."""
import argparse
import json
import os
from pathlib import Path


def candidates(root, capture):
    if 'captures' in capture:
        parts = [candidates(root, part) for part in capture['captures']]
        return {'schemaVersion': 1, 'complete': all(p['complete'] for p in parts),
                'skipped': sorted({s for p in parts for s in p['skipped']}),
                'issues': [item for p in parts for item in p['issues']]}
    items = capture.get('notes', []) + capture.get('edits', [])
    result = {'schemaVersion': 1, 'complete': True, 'skipped': [], 'issues': []}
    sources = []
    def fail(error):
        result['complete'] = False
        result['skipped'].append(str(error))
    for folder, dirs, files in os.walk(root, onerror=fail):
        dirs[:] = sorted(d for d in dirs if not d.startswith('.') and d not in ('node_modules', 'vendor', 'dist', 'build', '_canon-check') and not (Path(folder) / d).is_symlink())
        for name in sorted(files):
            path = Path(folder) / name
            if path.suffix not in ('.tsx', '.jsx', '.html', '.vue', '.svelte', '.css', '.scss', '.ts', '.js'):
                continue
            try:
                if path.is_symlink() or path.stat().st_size > 1_000_000 or len(sources) >= 5000:
                    fail(f'Skipped source: {path.relative_to(root)}')
                    continue
                sources.append((path.relative_to(root).as_posix(), path.read_text(encoding='utf-8', errors='replace').splitlines()))
            except OSError as error:
                fail(error)
    for item in items:
        anchor = item.get('anchor', {})
        needles = [x for x in [anchor.get('id'), anchor.get('text'), *anchor.get('classes', [])] if isinstance(x, str) and len(x) >= 3]
        matches = []
        total = 0
        for path, lines in sources:
            for number, line in enumerate(lines, 1):
                matched = [n for n in needles if n in line]
                if matched:
                    total += 1
                    if len(matches) < 30:
                        matches.append({'path': path, 'line': number, 'matched': matched})
        result['issues'].append({'issueId': item.get('issueId', f"{capture.get('sessionId', 'legacy')}:{item['id']}"),
                                 'status': 'candidate' if matches else 'unmapped',
                                 'verified': False, 'matches': matches, 'omittedMatches': max(0, total-30)})
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('root', type=Path)
    p.add_argument('capture', type=Path)
    a = p.parse_args()
    try:
        if not a.root.is_dir():
            raise ValueError('Project root must exist')
        print(json.dumps(candidates(a.root.resolve(), json.loads(a.capture.read_text(encoding='utf-8'))), indent=2))
    except (OSError, ValueError, KeyError, TypeError) as error:
        p.exit(1, f'error: {error}\n')
