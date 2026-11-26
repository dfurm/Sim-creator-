# Environment record (Run 2.0, 26 Nov 2026)

Claude Code cloud container (Linux), repo `dfurm/Sim-creator-`, branch
`claude/furmtech-phase-2-setup-web075`. Everything below was checked in this run.

## Tool versions
| Tool | Version |
|---|---|
| node | v22.23.5 |
| npm / npx | 10.9.9 |
| python3 | 3.13.18 |
| pip (system) | 24.0 · pip (venv) 26.3 |
| git | 2.43.0 |
| TypeScript | 7.0.2 (strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Vite | 8.4.0 (+ vite-plugin-singlefile 2.3.4) |
| Vitest | 5.1.2 |
| @playwright/test | 1.65.1 |
| Chromium used by tests | Chrome for Testing 158.0.8127.36 (pre-installed, `/opt/pw-browsers/chromium`) |
| Python venv `./.venv` | numpy 2.5.5, scipy 1.18.1, fluids 1.3.1 (see `reports/python-requirements.lock.txt`) |

`fluids` 1.3.1 is licensed MIT. It also bundles `fluids/nrlmsise00`, which has its own
MIT licence (© 2016 Joshua Milas). It is installed for reference checks only and is not a
product dependency.

## What runs here
| Capability | Status | Evidence |
|---|---|---|
| Strict type-check | ✅ | `npm run typecheck` clean |
| Unit tests (Vitest) | ✅ | toolchain test 1/1 passed |
| Headless browser (Playwright + Chromium) | ✅ with fallback | blank-page smoke test passed |
| `npx playwright install chromium` | ❌ | `Error: Download failed: server returned code 403 body 'request blocked: no rule or allowlist entry allows host "cdn.playwright.dev"'` |
| Production build (`dist/app/`) | ✅ over http | `vite preview` returned HTTP 200 |
| Production build opened via file:// | ❌ (expected) | Chromium: `Access to script at 'file:///…/assets/index-*.js' from origin 'null' has been blocked by CORS policy` |
| Single-file build via file:// (`dist/file/index.html`) | ✅ | e2e test: content rendered, 0 console errors |
| `spec/verification/reference_checks.py` | ✅ | 30/30 checks passed across 28 sims, exit 0; values identical to `spec/verification/reference_results.json`. Output: `reports/reference_checks_output.json` |
| npm registry | ✅ | registry.npmjs.org 200 |
| PyPI | ✅ | pypi.org 200 |
| GitHub | ✅ | `git ls-remote`/push to origin work; api.github.com reachable |
| Google Drive connector (MCP) | ✅ available | tools load; nothing uploaded |

**Playwright browser fallback.** The project's Playwright (1.65.1) expects Chromium build
1255, but the container has build 1243 and the download is blocked. `playwright.config.ts`
uses Playwright's own browser when it is installed. Otherwise it uses `$PW_CHROMIUM_PATH` or
`/opt/pw-browsers/chromium`. On your own machine, `npx playwright install chromium` works
normally and no fallback is used.

## What cannot run here
- Downloading Playwright browsers (cdn.playwright.dev blocked). Firefox and WebKit are not
  available, so cross-browser checks are pending.
- General web hosts are blocked, e.g. cdn.jsdelivr.net, nist.gov, drive.google.com
  (direct). Fetching references or CDN assets at runtime is not possible. Bundle KaTeX and
  similar libraries from npm instead, which the architecture requires anyway.
- Real devices, mobile browsers, screen readers and manual accessibility testing.
- A GUI browser for double-click testing. file:// is tested headlessly only.
- Anything that has to persist outside git. The container is ephemeral, and `node_modules`,
  `.venv` and `dist/` are rebuilt each session.

## Commands to pre-approve
Add these to `.claude/settings.json` → `permissions.allow` (or approve them as "always" when
prompted):
```json
[
  "Bash(npm ci)", "Bash(npm install:*)", "Bash(npm run:*)", "Bash(npm test:*)",
  "Bash(npx tsc:*)", "Bash(npx vite:*)", "Bash(npx vitest:*)", "Bash(npx playwright test:*)",
  "Bash(node:*)",
  "Bash(python3 -m venv:*)", "Bash(.venv/bin/pip install:*)", "Bash(.venv/bin/python:*)",
  "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git add:*)",
  "Bash(git commit:*)", "Bash(git push -u origin claude/*)", "Bash(git fetch:*)",
  "Bash(zip:*)", "Bash(unzip:*)", "Bash(sha256sum:*)",
  "Edit(app/**)", "Write(app/**)", "Write(dist/**)"
]
```
Keep `spec/**` out of the Edit and Write rules. You can also add
`"deny": ["Edit(spec/**)", "Write(spec/**)"]`.

## Getting the final zip into Google Drive
**Recommended: upload through the Google Drive connector in this session.**
1. Build and zip into `dist/` (e.g. `dist/Furmtech_Simulation_Library_<version>.zip`), and
   record its `sha256sum`.
2. Ask Claude to upload it. Claude calls `mcp__Google_Drive__create_file` with the zip as a
   file reference (`sha256:<hash>:<absolute path>`), `contentMimeType: application/zip` and
   `disableConversionToGoogleType: true`, into a Drive folder you name. The connector
   asks for your approval, and you can compare the checksum.
3. Nothing is uploaded without your explicit go-ahead in that run. *Not yet tested:* upload of a
   binary zip through the connector and its size limit are unverified.

**Fallback (if the zip is too large for the connector or the upload fails):** commit the zip
to a branch, or attach it to a GitHub Release. Download it on your computer and drag it into
Drive. Both routes are reachable from here.
