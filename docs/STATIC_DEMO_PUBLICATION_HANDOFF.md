# Current publication handoff — 2026-10-22

The repository creation prerequisite is now satisfied. Fresh connected GitHub and CLI reads identify SafetyMP (account 223377379) and public repository `SafetyMP/Agentic-Process-Safety` (ID 1430231911), with admin/push permission. `main` and HEAD resolve to `7f64ee96db99c56472a9a8ec532d4765b6069d9a`. The commit has no parents, message `Initial commit`, and its complete tree contains only `LICENSE`. There are no Actions runs. The Pages API returns 404; Pages configuration is unverified. Preserve this existing history and license. Do not create the repository again.

This worker may perform local artifact work only. The coordinator's next action is publication and Linux CI execution under the user's existing authorization. No additional repository-creation approval is needed. The prior 404 observations in `STATIC_DEMO_CI_HANDOFF.md` are historical.

## Prepared local inputs

`.harness/publication-source-manifest.json` enumerates individual candidate public source paths, byte lengths and SHA256 digests. It excludes operational artifacts, caches, raw evidence, private runtime directories, databases, scratch directories and credentials. It includes protected backend source/tests/policies/schemas, the demo, original commands, lockfiles, workflow and documentation. It is a local transfer aid, not a browser result or completion receipt. Review the exact listed content before publication; a credential-pattern scan cannot establish absence of every secret. Pattern scan matches were source/test token handling, workflow permission declarations and scanner expressions; no credential value was found.

Use a **new checkout inside this workspace** to preserve the existing remote parent. Do not stage the original mixed checkout. Before the following commands, the coordinator must confirm the same repository ID, public visibility, push access and current remote history again. If history has advanced, stop and reconcile the actual new commits; do not reset or force push.

```sh
gh repo clone SafetyMP/Agentic-Process-Safety .harness/publication-checkout
git -C .harness/publication-checkout log --oneline --all
git -C .harness/publication-checkout ls-tree -r --name-only HEAD
```

After reviewing the manifest and source contents, run this bounded transfer from the workspace root. It refuses changed source, an unexpected parent, an occupied candidate path, or a dirty destination. It stages only the manifest paths, retaining the existing LICENSE. It neither commits nor pushes.

```python
import hashlib, json, pathlib, shutil, subprocess
root = pathlib.Path.cwd()
dest = root / '.harness/publication-checkout'
manifest = json.loads((root / '.harness/publication-source-manifest.json').read_text())
def git(*args):
    return subprocess.check_output(['git', '-C', str(dest), *args], text=True).strip()
assert git('rev-parse', 'HEAD') == manifest['remoteParent']
assert git('status', '--porcelain') == ''
assert git('ls-tree', '-r', '--name-only', 'HEAD') == 'LICENSE'
rows = manifest['files']
assert rows and len({r['path'] for r in rows}) == len(rows)
for row in rows:
    path = pathlib.PurePosixPath(row['path'])
    assert not path.is_absolute() and '..' not in path.parts
    source = root / path
    target = dest / path
    assert source.is_file() and not source.is_symlink() and not target.exists()
    content = source.read_bytes()
    assert len(content) == row['bytes']
    assert hashlib.sha256(content).hexdigest() == row['sha256'], row['path']
for row in rows:
    target = dest / row['path']
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / row['path'], target)
subprocess.run(['git', '-C', str(dest), 'add', '--', *[r['path'] for r in rows]], check=True)
assert set(git('diff', '--cached', '--name-only').splitlines()) == {r['path'] for r in rows}
```

Inspect `git -C .harness/publication-checkout diff --cached` in full. Run all original applicable source/regression checks on the reconciled tree (the Python/OPA environment must be provisioned separately); preserve original commands and protected bytes. Then the coordinator can commit the reviewed source and perform a normal `git push origin main` from that checkout. Configure Pages to use GitHub Actions before deployment; verify current settings rather than assuming the 404 means a particular configuration. A main push starts the pinned workflow; do not dispatch a duplicate run if that run is active. No commit SHA, run ID, success, screenshot or deployment is predicted here.

Follow `STATIC_DEMO_CI_HANDOFF.md` for the exact original ZIP, source/commit/workflow/run/dist bindings, seven genuine image inspections and independent verification. `gh run download` extracts files; retain the original ZIP separately through the artifact archive endpoint for the digest check. Require real Linux Chromium success, actual documented visual QA and a current independently validated controller receipt. Do not infer browser success from local tests or this manifest.

## Current bounded verification

All 19 verifier tests pass, including genuine-format version parsing, real newline splitting and Git-compatible NUL-delimited blob hashes. Production integrity passes for all 70 files and original scripts. Static contract passes for seven files / 970570 bytes. The independent CI gate still rejects absent `.harness/linux-ci-review.json`. No real browser evidence or current completion receipt exists. No repository write, workflow dispatch, staging, commit, push, browser launch/download, controller-state change or acceptance change occurred in this work unit. Workspace checkpoint tools are unavailable; this handoff records the current focus and next action.
