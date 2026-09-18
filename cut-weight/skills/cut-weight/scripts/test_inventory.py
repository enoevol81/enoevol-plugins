"""Isolated regression tests for inventory coverage and non-destructive behavior."""
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
import time
import unittest

SCRIPT = Path(__file__).with_name("inventory.py")


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="cut-weight-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "project"
        self.root.mkdir()
        self.out = self.base / "run" / "inventory.json"

    def put(self, name, text="fixture"):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def git(self, *args):
        return subprocess.run(["git", "-C", str(self.root), *args], check=True,
                              capture_output=True, text=True).stdout

    def scan(self, *args, expected=0):
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.root),
                                 "--out", str(self.out), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, expected, result.stderr)
        return json.loads(self.out.read_text()) if expected == 0 else result

    def test_source_in_build_is_visible_and_no_file_is_changed(self):
        source = self.put("build/handwritten.py", "print('required')")
        self.put("dist/guide.md", "# Deployment instructions")
        self.put(".git", "gitdir: /missing/worktree")
        self.put("_quarantine/old/report.md")
        before = source.read_bytes()
        report = self.scan()
        paths = {f["path"] for f in report["files"]}
        self.assertIn("build/handwritten.py", paths)
        self.assertIn("dist/guide.md", paths)
        self.assertNotIn(".git", paths)
        self.assertNotIn("_quarantine/old/report.md", paths)
        self.assertEqual(source.read_bytes(), before)
        self.assertFalse((self.root / "inventory.json").exists())

    def test_mixed_tool_material_and_nested_intent_are_discovered(self):
        self.put(".gstack/report.md", "# Completed review")
        self.put(".compound-engineering/notes.md")
        self.put(".impeccable/audit.md")
        self.put("_critic-layer/run/report.md")
        self.put(".claude/hooks/active.py")
        self.put(".mcp.json", "{}")
        self.put("modules/scout/INTENT.md", "# Scout purpose")
        self.put("notes/unusual-name.md", "# Product strategy")
        report = self.scan()
        categories = {f["path"]: f.get("agent_artifact") for f in report["files"]}
        self.assertEqual(categories[".gstack/report.md"], "tool-material")
        self.assertEqual(categories[".claude/hooks/active.py"], "agent-config")
        self.assertEqual(categories[".mcp.json"], "agent-config")
        self.assertEqual(categories["modules/scout/INTENT.md"], "canonical")
        docs = {d["path"] for d in report["documents"]}
        self.assertIn("notes/unusual-name.md", docs)
        self.assertIn("modules/scout/INTENT.md", docs)

    def test_tracked_ignored_and_history_are_distinct_in_subfolder(self):
        self.git("init")
        self.put(".gitignore", "nested/.gstack/\n")
        self.put("nested/.gstack/kept.md", "# Shared guidance")
        self.git("add", ".gitignore")
        self.git("add", "-f", "nested/.gstack/kept.md")
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                 "commit", "-m", "fixture")
        self.put("nested/.gstack/local.md", "# Local report")
        self.root = self.root / "nested"
        report = self.scan()
        files = {f["path"]: f for f in report["files"]}
        self.assertTrue(files[".gstack/kept.md"]["tracked"])
        self.assertTrue(files[".gstack/kept.md"]["matches_ignore_rule"])
        self.assertIsNotNone(files[".gstack/kept.md"]["git_last_touch_days"])
        self.assertFalse(files[".gstack/local.md"]["tracked"])
        self.assertTrue(files[".gstack/local.md"]["matches_ignore_rule"])
        self.assertIsNone(files[".gstack/local.md"]["git_last_touch_days"])

    def test_bulk_omissions_do_not_hide_tracked_source(self):
        self.git("init")
        self.put("venv/owned.py")
        self.git("add", "venv/owned.py")
        self.put("node_modules/dependency/index.js")
        report = self.scan()
        self.assertIn("venv/owned.py", {f["path"] for f in report["files"]})
        omitted = {d["path"]: d for d in report["omitted_dirs"]}
        self.assertIsNone(omitted["node_modules/"]["bytes"])
        self.assertFalse(report["git"]["history_available"])

    def test_limits_and_existing_output(self):
        self.put("a.md", "# Header\n" + "x" * 500)
        self.put("b.md")
        report = self.scan("--max-files", "1", "--document-bytes", "20")
        self.assertTrue(report["files_capped"])
        self.assertTrue(report["documents"][0]["preview_truncated"])
        before = self.out.read_bytes()
        self.scan(expected=2)
        self.assertEqual(self.out.read_bytes(), before)

    def test_nested_repositories_are_not_walked(self):
        self.put("vendor/other/.git", "gitdir: /missing")
        self.put("vendor/other/private.md")
        report = self.scan()
        self.assertEqual(report["files"], [])
        self.assertEqual(report["omitted_dirs"][0]["reason"], "nested-repository")

    def test_ignored_old_reports_and_recent_done_backlog_require_review(self):
        self.git("init")
        self.put(".gitignore", ".gstack/\n")
        old = self.put(".gstack/qa-reports/report.md", "# Completed audit")
        os.utime(old, (time.time() - 71 * 86400,) * 2)
        self.put(".compound-engineering/config.local.example.yaml", "# Example only")
        self.put("TODOS.md", "# Tasks\n## Open\nOne item\n## Done\nHistory")
        self.put("STRATEGY.md", "# Strategy")
        report = self.scan()
        items = {i["id"]: i for i in report["review_items"]}
        self.assertIn(".gstack/qa-reports/report.md", items["tool:.gstack/"]["age_flagged_members"])
        self.assertIn("tool:.compound-engineering/", items)
        self.assertIn("doc:STRATEGY.md", items)
        self.assertTrue(any("completion-history" in r for r in items["doc:TODOS.md"]["reasons"]))
        self.assertTrue(all(i["status"] == "UNREVIEWED" for i in items.values()))
        old_entry = next(f for f in report["files"] if f["path"] == ".gstack/qa-reports/report.md")
        self.assertTrue(old_entry["matches_ignore_rule"])
        self.assertFalse(old_entry["tracked"])
        self.assertIsNone(old_entry["git_last_touch_days"])

    def test_age_threshold_is_configurable(self):
        old = self.put("notes.md", "# Notes")
        os.utime(old, (time.time() - 71 * 86400,) * 2)
        report = self.scan("--review-age-days", "90")
        self.assertEqual(report["review_policy"]["age_days"], 90)
        self.assertEqual(report["files"][0]["age_review_reasons"], [])
        self.assertEqual(len(report["review_items"]), 1)  # Still needs purpose review.

    def test_either_age_clock_triggers_at_boundary_without_deletion_verdict(self):
        review = runpy.run_path(str(SCRIPT))["review_items"]
        files = [{"path": "strategy.md", "mtime_days": 1, "git_last_touch_days": 60},
                 {"path": "recent.md", "mtime_days": 59, "git_last_touch_days": None}]
        items = review(files, [{"path": f["path"]} for f in files], 60)
        self.assertEqual(files[0]["age_review_reasons"], ["git_last_touch_days>=60"])
        self.assertEqual(files[1]["age_review_reasons"], [])
        self.assertTrue(all("disposition" not in item for item in items))

    def test_links_do_not_read_external_documents(self):
        external = self.base / "external.md"
        external.write_text("# Outside content")
        link = self.root / "linked.md"
        try:
            link.symlink_to(external)
        except OSError:
            self.skipTest("symlink creation unavailable on this host")
        report = self.scan()
        self.assertTrue(report["files"][0]["symlink_or_junction"])
        self.assertEqual(report["documents"], [])


if __name__ == "__main__":
    unittest.main()
