#!/usr/bin/env python3
"""Portable, evidence-backed run ledger. Does not execute commands or grant permissions."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as stream:
            json.dump(data, stream, indent=2)
            stream.write('\n')
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def validate(data):
    if data.get('schemaVersion') != 1 or not data.get('outcome'):
        raise ValueError('Expected schemaVersion 1 and a nonempty outcome')
    steps = data.get('steps', [])
    ids = [step['id'] for step in steps]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('Steps need unique IDs')
    seen = set()
    for step in steps:
        if not step.get('acceptance') or not set(step.get('dependsOn', [])).issubset(seen):
            raise ValueError('Each step needs acceptance criteria and earlier dependencies')
        seen.add(step['id'])


def evidence(root, raw):
    path = (root / raw).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError('Evidence must be an existing file within the project')
    return {'path': path.relative_to(root).as_posix(), 'sha256': digest(path)}


def stale_steps(data):
    root = Path(data['root'])
    stale = []
    complete = {step['id'] for step in data['steps'] if step['status'] == 'complete'}
    for step in data['steps']:
        if step['status'] != 'complete':
            continue
        invalid = any(not (root / item['path']).is_file() or
                      digest(root / item['path']) != item['sha256']
                      for item in step['evidence'])
        dependencies = set(step.get('dependsOn', []))
        if invalid or not dependencies.issubset(complete) or dependencies & set(stale):
            stale.append(step['id'])
    return stale


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['init', 'status', 'start', 'complete', 'block', 'resume'])
    parser.add_argument('ledger', type=Path)
    parser.add_argument('--plan', type=Path)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--step')
    parser.add_argument('--evidence', action='append', default=[])
    parser.add_argument('--result', help='Observed acceptance result, not a claim of automatic verification')
    parser.add_argument('--next', dest='next_action')
    args = parser.parse_args()
    try:
        if args.action == 'init':
            if args.ledger.exists() or not args.plan:
                raise ValueError('Use a new ledger and supply --plan')
            data = json.loads(args.plan.read_text(encoding='utf-8'))
            validate(data)
            data['root'] = str(args.root.resolve())
            data['nextAction'] = data['steps'][0]['acceptance']
            for step in data['steps']:
                step.update(status='pending', evidence=[], result='')
        else:
            data = json.loads(args.ledger.read_text(encoding='utf-8'))
            validate(data)
            stale = stale_steps(data)
            if args.action == 'status':
                print(json.dumps({'run': data, 'staleSteps': stale,
                                  'complete': not stale and all(s['status'] == 'complete' for s in data['steps'])}, indent=2))
                return
            if args.action == 'resume':
                for step in data['steps']:
                    if step['id'] in stale or step['status'] in ('running', 'blocked'):
                        step['status'] = 'pending'
                pending = next((s for s in data['steps'] if s['status'] != 'complete'), None)
                data['nextAction'] = pending['acceptance'] if pending else 'All recorded criteria complete; report evidence and limitations.'
            else:
                step = next((s for s in data['steps'] if s['id'] == args.step), None)
                if step is None:
                    raise ValueError('Supply a valid --step')
                complete = {s['id'] for s in data['steps'] if s['status'] == 'complete'} - set(stale)
                if not set(step.get('dependsOn', [])).issubset(complete):
                    raise ValueError('Dependencies are incomplete or stale')
                if args.action == 'complete':
                    if not args.evidence or not args.result:
                        raise ValueError('Completion requires --evidence and --result')
                    step['evidence'] = [evidence(Path(data['root']), p) for p in args.evidence]
                    step['status'] = 'complete'
                elif args.action == 'block':
                    if not args.result or not args.next_action:
                        raise ValueError('Blocking requires a reason and exact --next action')
                    step['status'] = 'blocked'
                else:
                    step['status'] = 'running'
                step['result'] = args.result or ''
                pending = next((s for s in data['steps'] if s['status'] != 'complete'), None)
                data['nextAction'] = args.next_action or (pending['acceptance'] if pending else 'Report completion evidence.')
        save(args.ledger, data)
        print(json.dumps(data, indent=2))
    except (ValueError, KeyError, OSError, TypeError) as error:
        parser.exit(1, f'error: {error}\n')


if __name__ == '__main__':
    main()
