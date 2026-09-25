#!/usr/bin/env python3
"""Create a reproducible standalone plugin ZIP after checking generated sources."""
import hashlib
import argparse
import json
from pathlib import Path
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plugin', choices=['design-steward', 'cut-weight'], default='design-steward')
    args = parser.parse_args()
    plugin = ROOT / args.plugin
    if args.plugin == 'design-steward':
        subprocess.run([sys.executable, str(ROOT / '_dev/scripts/build_design_steward.py'), '--check'], check=True)
    version = json.loads((plugin / '.claude-plugin/plugin.json').read_text(encoding='utf-8'))['version']
    output = ROOT / 'dist' / f'{args.plugin}-{version}.zip'
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(plugin.rglob('*')):
            rel = path.relative_to(plugin).parts
            if (not path.is_file() or '__pycache__' in path.parts or path.suffix == '.pyc'
                    or rel[:2] == ('evals', 'results')):
                continue
            entry = zipfile.ZipInfo(path.relative_to(plugin).as_posix(), (2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, path.read_bytes())
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert '.claude-plugin/plugin.json' in archive.namelist()
    checksum = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.zip.sha256').write_text(f'{checksum}  {output.name}\n', encoding='utf-8')
    print(f'{output}\nSHA256 {checksum}')


if __name__ == '__main__':
    main()
