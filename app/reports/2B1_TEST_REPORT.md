# Run 2B1 test report: navigation fix for phones (in-app routing)

**Furmtech Simulation Library · 0.2.0-proto · 26 November 2026** · branch `claude/furmtech-phase-2-setup-web075`

## 1. Problem

You reported that opening `furmtech-sim-standalone.html` from an Android file manager left every link doing nothing. Every page link was a `?sim=…` URL, and the app chose the page by reading `location.search`. A local file opened that way may not get, or keep, a query string, so the links could not work. *I could not reproduce this on a real phone here (no device). The fix removes the dependency instead.*

## 2. Fix

- **In-app routing** (`app/src/ui/router.tsx`): the current page (home, S02 explore or investigate, pipe explore, tasks a/b/c) is **React state**. Every navigation link is a `Link` whose click handler calls `preventDefault()` and changes that state directly, so no URL has to load.
- **Hash as an extra:** after navigating, the route is mirrored to `#/S02/investigate`, `#/pipe/a`, etc. using `history.pushState`, wrapped in `try`, so a viewer that refuses URL changes still navigates. On the web build this gives deep links, reload persistence and a working Back button. Hashes that are not routes (in-page anchors such as `#anchor-S02-throat_area`) are ignored.
- **Legacy `?sim=…`:** still read once at start-up as a fallback. It is no longer used by any link.
- **Accessibility:** links remain real `<a>` elements with an `href`, the current page carries `aria-current="page"`, and focus moves to the new page's `<h1>` after each navigation.

Two further defects were found and fixed while testing this:
1. **404 console error on the web build:** Chromium requested `/favicon.ico`. An inline empty icon (`<link rel="icon" href="data:,">`) removes the request.
2. **Numeric fields could revert a value (a real race, found by a test that failed intermittently):** type a value, press Enter, then move straight to another field. The blur handler re-committed a stale draft before the screen had updated, silently restoring the old value (seen with S02 v_max 0.25 → 2.00). Slow phones make this more likely. Blur now commits only text typed since the last commit. A regression test repeats the sequence five times.

## 3. Results (commands run from `app/`)

| Command | Result |
|---|---|
| `npm run typecheck` | **Clean** |
| `npm test` | **344/344 passed** (12 files; 5 new router unit tests) |
| `npm run test:e2e` | **30/30 passed**. Includes 8 new navigation tests and 1 regression test. |
| `npx playwright test --repeat-each 3` (stability check) | **90/90 passed** |
| `spec/verification/reference_checks.py` (repo root) | exit 0 (30/30) |
| Bundle | JS 224 kB gzip; single file 1.13 MB raw / 493 kB gzip |

**New navigation tests** (`e2e/navigation.spec.ts`). None of them use query strings to navigate; every page is reached by clicking or tapping visible links.

| # | Where | What it shows |
|---|---|---|
| 1 | Web build (`dist/app` on :4173) | Starting at `./`, click through home → S02 explore → S02 investigate → back → pipe explore → tasks a/b/c (in-lesson nav) → explore → home → tasks a/b/c from home. Each page renders its own content. The URL never contains `?`; **no document reload** (a window marker survives); **0 console errors**; no external requests. |
| 2 | Web build | `#/pipe/c` deep link; survives reload; Back button returns from task (a) to task (c); `#/S02/investigate` deep link. |
| 3 | Web build | Legacy `?sim=pipe&task=b` still opens task (b), and the home link works from there. |
| 4 | Web build, `history.pushState` made to throw | The full tour still works; the URL never changes; 0 console errors. This simulates a viewer that refuses URL changes. |
| 5 | Web build, keyboard | Link focused and activated with Enter; focus lands on the new `<h1>`. |
| 6 | **Single file, file://, desktop** | Full tour by clicking; 0 console errors or warnings; 0 non-file network requests. |
| 7 | Single file, file://, `pushState` throwing | Full tour still works; 0 console errors. |
| 8 | **Single file, file://, emulated Pixel 7** (Android 14 Chrome user agent, 412×839 viewport, isMobile, touch) | Full tour by **tap**, with `pushState` throwing; 0 console errors; no horizontal scroll. |

The existing file:// tests (S02 and the four pipe pages) still pass. They load pages through the legacy query string, which is still supported.

## 4. How to open the single file

The page shows a **Library home** with links to every page, and every page has a **Library home** link plus links to its sibling pages. You never need to type an address.

- **Desktop:** double-click `furmtech-sim-standalone.html`, or open it in Chrome or Edge.
- **Android:** copy the file to the phone, open it from the file manager and choose **Chrome** if asked "Open with". Some file managers show HTML in a built-in viewer that may not run scripts; if nothing on the page responds, use "Open with → Chrome". *(Not tested on a real device here.)*
- **iPhone/iPad:** the Files app preview may show the page without running scripts. Opening a local HTML file in Safari depends on how it reaches the device, for example as a link from a web server or a cloud drive's "open in browser". *(Not tested here.)* The `web/` folder served from any static web server is the most reliable option on iOS.
- **Web server:** serve the `web/` folder. Pages can be deep-linked as `…/index.html#/pipe/b`.

## 5. Manual test checklist: Android Chrome and iOS Safari

To be run by a person on real devices. Record the device, OS version, browser version, and *how the file was opened* (file manager → Chrome, Files app, cloud-drive link, or web server).

| # | Step | Android Chrome | iOS Safari |
|---|---|---|---|
| 1 | Open `furmtech-sim-standalone.html` from local storage; the "Pipe-flow lesson sequence" home page appears | ☐ | ☐ |
| 2 | Tap "S02 · Continuity through a contraction"; the S02 page shows v̄₂ = 2.04 m/s in the outputs table | ☐ | ☐ |
| 3 | Tap "Guided investigation: halve D₂"; v̄₂ shows "hidden until prediction" | ☐ | ☐ |
| 4 | Tap "Library home"; the home page returns | ☐ | ☐ |
| 5 | Tap "Pipe lesson … explore"; p₃ (lossy) = 82110 Pa | ☐ | ☐ |
| 6 | Tap "Task (a)", "Task (b)", "Task (c)" and "Explore" in the lesson navigation; each shows its task panel (none for Explore) | ☐ | ☐ |
| 7 | From home, tap each of Task (a), (b), (c) directly | ☐ | ☐ |
| 8 | On task (a): type a prediction with the on-screen keyboard, tap "Record prediction"; hidden values appear | ☐ | ☐ |
| 9 | Type a value in a numeric field, press the keyboard's Go/Enter, then tap another field; the first value stays (2B1 fix) | ☐ | ☐ |
| 10 | Drag a slider; values update; no page scrolls sideways | ☐ | ☐ |
| 11 | "Export CSV" and "Download snapshot" save a file (note where it went) | ☐ | ☐ |
| 12 | "Save in this browser", reload or reopen the file, "Restore browser save" (may not be available for local files; note the result) | ☐ | ☐ |
| 13 | Rotate the device; the layout reflows | ☐ | ☐ |
| 14 | Turn on Reduce Motion (iOS) or Remove animations (Android); S02 parcel motion starts paused | ☐ | ☐ |
| 15 | Screen reader (TalkBack or VoiceOver): navigate to a link, activate it; the new page heading is announced | ☐ | ☐ |
| 16 | Repeat steps 1–7 from the `web/` folder on a static server (and with `#/pipe/b` deep link + Back button) | ☐ | ☐ |

## 6. Package and Drive

The package result is recorded in `app/reports/2B1/drive-upload.md`, written after packaging.

## 7. Verification pending

- **Real Android Chrome:** the original failure was not reproduced, and the fix is unconfirmed on a device. Emulated Pixel 7 in desktop Chromium 158 passed, but emulation does not reproduce `content://` URLs from file managers or built-in HTML viewers.
- **Real iOS Safari:** not tested at all, either from the Files app or from a web server.
- **Desktop browsers other than Chromium 158** (Firefox, Safari, Edge), including double-clicking the file.
- **The manual checklist in §5**, for both platforms.
- **Screen-reader announcement** of the page change (focus moves to `<h1>`; no assistive-technology test was run).
- Everything still pending from the 2B report (scientific and educational review, the browser matrix, manual accessibility, performance on a phone, the host adapter in 2C, the licence review).
