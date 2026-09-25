import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import re
import yaml

ROOT = Path(__file__).resolve().parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


snap = module('snapshot', 'canon-check/scripts/source_snapshot.py')
mapping = module('mapping', 'critic-layer/scripts/source_candidates.py')


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.ledger = self.root / '.hands-free/run.json'
        self.plan = self.root / 'plan.json'
        self.plan.write_text(json.dumps({'schemaVersion': 1, 'outcome': 'Fixture', 'steps': [
            {'id': 'build', 'acceptance': 'Button changed', 'dependsOn': []},
            {'id': 'verify', 'acceptance': 'Button tested', 'dependsOn': ['build']}]}))

    def tearDown(self):
        self.temp.cleanup()

    def run_state(self, action, *args, code=0):
        result = subprocess.run([sys.executable, str(ROOT / 'hands-free/scripts/run_state.py'), action,
                                 str(self.ledger), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, code, result.stderr)
        return json.loads(result.stdout) if result.returncode == 0 else result.stderr

    def init(self):
        self.run_state('init', '--plan', str(self.plan), '--root', str(self.root))

    def test_dependencies_and_completion_require_evidence(self):
        self.init()
        self.run_state('start', '--step', 'verify', code=1)
        self.run_state('complete', '--step', 'build', '--result', 'done', code=1)
        self.run_state('complete', '--step', 'build', '--evidence', 'missing.txt', '--result', 'done', code=1)
        (self.root / 'button.css').write_text('border-radius: 8px')
        self.run_state('complete', '--step', 'build', '--evidence', 'button.css', '--result', '8px confirmed')
        self.run_state('start', '--step', 'verify')

    def test_resume_invalidates_changed_evidence_and_dependents(self):
        self.init()
        (self.root / 'button.css').write_text('8px')
        (self.root / 'test.txt').write_text('PASS')
        for step, file in [('build', 'button.css'), ('verify', 'test.txt')]:
            self.run_state('complete', '--step', step, '--evidence', file, '--result', 'checked')
        self.assertTrue(self.run_state('status')['complete'])
        (self.root / 'button.css').write_text('6px')
        self.assertEqual(self.run_state('status')['staleSteps'], ['build', 'verify'])
        data = self.run_state('resume')
        self.assertEqual([s['status'] for s in data['steps']], ['pending', 'pending'])

    def test_missing_evidence_and_interruption(self):
        self.init()
        self.run_state('start', '--step', 'build')
        self.assertEqual(self.run_state('resume')['steps'][0]['status'], 'pending')
        self.run_state('block', '--step', 'build', '--result', 'No preview', code=1)
        self.run_state('block', '--step', 'build', '--result', 'No preview', '--next', 'Start preview')
        self.assertEqual(self.run_state('status')['run']['nextAction'], 'Start preview')

    def test_reopening_completed_dependency_invalidates_verification(self):
        self.init()
        (self.root / 'proof.txt').write_text('PASS')
        for step in ['build', 'verify']:
            self.run_state('complete', '--step', step, '--evidence', 'proof.txt', '--result', 'checked')
        self.run_state('start', '--step', 'build')
        self.assertEqual(self.run_state('status')['staleSteps'], ['verify'])
        self.assertEqual([s['status'] for s in self.run_state('resume')['steps']], ['pending', 'pending'])

    def test_reject_existing_run_and_dependency_cycle(self):
        self.init()
        self.run_state('init', '--plan', str(self.plan), code=1)
        data = json.loads(self.plan.read_text())
        data['steps'][0]['dependsOn'] = ['verify']
        self.plan.write_text(json.dumps(data))
        self.ledger = self.root / 'other.json'
        self.run_state('init', '--plan', str(self.plan), code=1)

    def test_source_baseline_changes_and_output_exclusion(self):
        (self.root / 'design.md').write_text('8px')
        old = snap.snapshot(self.root)
        (self.root / 'design.md').write_text('6px')
        (self.root / 'new.css').write_text('color: red')
        (self.root / 'plan.json').unlink()
        (self.root / '_canon-check').mkdir()
        (self.root / '_canon-check/report.md').write_text('Generated report')
        delta = snap.changes(old, snap.snapshot(self.root))
        self.assertEqual(delta['changed'], ['design.md'])
        self.assertEqual(delta['added'], ['new.css'])
        self.assertEqual(delta['removed'], ['plan.json'])

    def test_bounded_scan_is_not_fresh_and_scope_cannot_escape(self):
        (self.root / 'large.css').write_text('x' * 2_000_001)
        self.assertFalse(snap.snapshot(self.root)['complete'])
        with self.assertRaises(ValueError):
            snap.snapshot(self.root, '..')

    def test_mapping_reports_candidates_not_certainty(self):
        (self.root / 'Button.tsx').write_text('<button id="start">Get started</button>')
        capture = {'sessionId': 'fixture', 'notes': [{'id': 'note_001', 'anchor': {'id': 'start', 'text': 'Get started'}}]}
        result = mapping.candidates(self.root, capture)['issues'][0]
        self.assertEqual(result['issueId'], 'fixture:note_001')
        self.assertFalse(result['verified'])
        self.assertEqual(result['matches'][0]['path'], 'Button.tsx')
        merged = mapping.candidates(self.root, {'captures': [capture]})
        self.assertEqual(merged['issues'][0]['issueId'], 'fixture:note_001')

    def test_package_sources_match_and_seven_skills(self):
        result = subprocess.run([sys.executable, str(ROOT / '_dev/scripts/build_design_steward.py'), '--check'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(len(list((ROOT / 'design-steward/skills').glob('*/SKILL.md'))), 7)
        component = ROOT / 'design-steward/components/cut-weight/skills/cut-weight'
        self.assertEqual((component / 'scripts/inventory.py').read_bytes(),
                         (ROOT / 'cut-weight/skills/cut-weight/scripts/inventory.py').read_bytes())
        self.assertTrue((component / 'references/quarantine-protocol.md').is_file())
        self.assertTrue((component / 'references/workflow-handoff.md').is_file())

    def test_skill_frontmatter_and_local_contract_links(self):
        for plugin in ['design-steward', 'hands-free', 'canon-check', 'critic-layer', 'cut-weight']:
            for skill in (ROOT / plugin / 'skills').glob('*/SKILL.md'):
                text = skill.read_text(encoding='utf-8')
                metadata = yaml.safe_load(text.split('---', 2)[1])
                self.assertEqual(metadata['name'], skill.parent.name)
                self.assertIsInstance(metadata['description'], str)
                for ref in re.findall(r'(?<!\w)(\.\./(?:[\w.-]+/)*[\w.-]+\.md)', text):
                    self.assertTrue((skill.parent / ref).is_file(), f'{skill}: {ref}')
                for ref in re.findall(r'`\$\{CLAUDE_PLUGIN_ROOT\}/([^`]+)`', text):
                    # Compare exact names: Windows ignores trailing dots and case.
                    path = ROOT / plugin
                    for part in ref.rstrip('/').split('/'):
                        self.assertIn(part, os.listdir(path), f'{skill}: {ref}')
                        path = path / part


if __name__ == '__main__':
    unittest.main()
