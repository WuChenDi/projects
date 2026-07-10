# PLAN-001 Rebuild flox player against KVideo (Tier B)

- **status**: completed
- **createdAt**: 2026-06-09 07:35
- **approvedAt**: 2026-06-09 07:40
- **relatedTask**: REFACTOR-001

## Context

### Current flox player (target of refactor)

- `src/components/player/VideoPlayer.tsx` (401 lines) — container: settings popover UI + proxy/retry state machine + progress persistence + native `<video>` rendering, all mixed.
- `src/components/player/NativePlayer.tsx` (127 lines) — native `<video controls>`; inline initial-seek, playback rate, skip intro/outro, resolution reporting.
- `src/components/player/hooks/useHlsPlayer.ts` (420 lines) — hls.js lifecycle, ad-filter loader, iOS native fetch+blob filter, error recovery, autoplay.
- `src/components/player/hooks/{useVideoResolution,usePlayerSettings}.ts`
- `src/components/player/utils/urlUtils.ts` — dead code (`getCopyUrl`/`getProxyUrl`, no callers).
- Sole consumer: `src/app/player/page.tsx`.
- Settings store: `src/lib/store/settings-store.ts` (zustand). Already carries `fullscreenType` ('native'|'window') and `showModeIndicator`, both unused by the current player (dangling from the KVideo lineage).

### Upstream reference: KVideo (`/srv/work/projects/tmp/KVideo`)

flox is a stripped early fork of KVideo. Shared near-identical files confirm lineage.
KVideo ships a full custom control layer:

- `VideoPlayer.tsx` (shell) -> `CustomVideoPlayer.tsx` (device dispatch) -> `DesktopVideoPlayer.tsx` (orchestrator, 456 lines).
- `hooks/useDesktopPlayerState.ts` — `refs` / `data` / `actions` three-segment state container.
- `hooks/useDesktopPlayerLogic.ts` — aggregates 8 domain hooks under `hooks/desktop/`: playback, volume, progress, skip, fullscreen, controls-visibility, utilities, shortcuts (+ cast).
- `hooks/useAutoSkip.ts` (251 lines) — intro/outro skip + auto-next, decoupled, double-trigger-guarded.
- `hooks/useStallDetection.ts` — recovers stuck-but-"playing" state.
- `desktop/*` — control-layer UI: DesktopControls(Wrapper), DesktopOverlay(Wrapper), DesktopProgressBar, DesktopVolumeControl, DesktopSpeedMenu, DesktopMoreMenu, Desktop{Left,Right}Controls.
- `web-fullscreen.css` + `--kvideo-*` CSS variables for window-fullscreen.

### Problems this refactor fixes (KVideo already solves these)

- **P3 HEVC hard-fail** — KVideo locks to first H.264 level if present; warns only if all-HEVC (`useHlsPlayer.ts:142-167`).
- **P4 skip-outro coupled to auto-next** — KVideo `useAutoSkip`: advance if possible, else seek to end; toggles independent.
- **P5 iOS blob race/leak** — KVideo adds blob-failure listener + 8s `readyState===0` timeout fallback + `fetchWithFallback` via proxy.
- **P9 onEnded double-trigger** — `lastHandledSrcRef` + `isTransitioningToNextEpisode` guards.
- **P6 resolution double-path** — single `useVideoResolution` + one report effect.
- **P1/P7 monolith** — refs/data/actions container + domain-hook split.
- Adds stall detection and graceful unsupported-environment fallback (direct -> proxy).

> **P2 not solved by KVideo**: toggling ad-filter still reloads the stream (deps include `adFilterMode`/`adKeywords`). Optional follow-up, not in this plan's required scope.

### flox infrastructure gaps vs KVideo

KVideo's `DesktopVideoPlayer` pulls in pieces flox does not have:

- `lib/store/premium-mode-settings` + `usePlayerSettings(isPremium)` signature — **out of scope (Tier B)**; flox keeps single settings store, `usePlayerSettings()` stays parameterless.
- `RuntimeFeaturesProvider` (`mediaProxyEnabled`) — **out of scope**; replace with flox's existing proxy logic / a constant `true`.
- `lib/hooks/mobile/{useDeviceDetection,useDoubleTap,useScreenOrientation}` — **port required** (small, self-contained).
- `seekStepSeconds` / `DEFAULT_SEEK_STEP_SECONDS` — **port required** into flox settings-store.
- Danmaku (`DanmakuCanvas`, `useDanmaku`), Cast (`useCastControls`, AirPlay, `android-pip-utils`) — **out of scope (Tier B)**.
- Store mechanism differs: KVideo uses custom `settingsStore.getSettings()/subscribe()`; flox uses zustand `useSettingsStore`. **All ported hooks must be rewritten to zustand selectors.** This is the largest adaptation friction.

## Proposal

Port KVideo's custom player into flox under **Tier B** scope, adapting to flox's
zustand store and Biome conventions. Diff-style port (preserve flox-specific
logic where it diverges), not blind file copy. Break the work into independently
verifiable phases; each phase is a separate commit and can be rolled back.

### Phase 0 — Infra prerequisites
- Port `lib/hooks/mobile/{useDeviceDetection,useDoubleTap,useScreenOrientation}` (rewrite imports to flox paths).
- Add `seekStepSeconds` + `DEFAULT_SEEK_STEP_SECONDS` to flox `settings-store` (zustand) with persistence + setter.
- Decide the `mediaProxyEnabled` substitute (constant `true` initially — proxy is always available in flox).
- **Verify**: `typecheck` passes; new hooks unit-importable.

### Phase 1 — HLS engine robustness (highest value, low UI risk)
- Upgrade flox `useHlsPlayer` to KVideo behavior: HEVC level-locking (P3), iOS blob failure+timeout fallback (P5), unsupported-env direct->proxy fallback. Keep flox's existing ad-filter loader.
- **Verify**: playback in desktop Chrome / desktop Safari / iOS Safari; ad filter on/off all paths; HEVC stream no longer shows error screen.

### Phase 2 — State container + logic aggregator
- Add `useDesktopPlayerState` (refs/data/actions) and `useDesktopPlayerLogic` + `hooks/desktop/*` (playback, volume, progress, skip, fullscreen, controls-visibility, utilities, shortcuts). Rewrite all settings reads to zustand. Drop cast wiring.
- **Verify**: hooks compile and integrate in a scratch render; no settings-store regressions.

### Phase 3 — Custom control layer UI
- Port `DesktopVideoPlayer` + `desktop/*` UI components + `CustomVideoPlayer` dispatch + `web-fullscreen.css`. Wire `useAutoSkip` (replaces NativePlayer inline skip) and `useStallDetection`.
- Activate flox's dangling `fullscreenType` / `showModeIndicator` settings.
- **Verify**: all controls operate (play/seek/volume/speed/fullscreen native+window/skip/shortcuts/double-tap/copy-link/resolution badge/mode indicator).

### Phase 4 — Wire shell + consumer
- Refit flox `VideoPlayer.tsx` as the shell (keep proxy/retry state machine + progress persistence; render `CustomVideoPlayer` instead of `NativePlayer`). Remove `NativePlayer.tsx`. Extend `app/player/page.tsx` to pass `videoTitle`/`episodeName`/`isReversed`.
- Revive `utils/urlUtils.ts` (now used by copy-link) — `getProxyUrl` stays only if referenced, else removed.
- **Verify**: end-to-end on `/player`; progress memory + `?t=` seamless switch + proxy retry all intact.

### Phase 5 — Cleanup + gates
- Remove now-unused code introduced by the swap. Biome pass (style conformance). Update CLAUDE.md player section (currently describes the removed VePlayer/FloxPlayer).
- **Verify**: `pnpm --filter @cdlab/flox typecheck && lint && build` all pass.

## Risks

1. **Store mechanism rewrite** (KVideo `subscribe` -> flox zustand selectors) across many hooks — highest bug surface; mitigate by porting hook-by-hook with typecheck between each.
2. **iOS / mobile behaviors** (force-landscape, double-tap, blob fallback) need real-device verification; hard to reproduce locally.
3. **Biome vs ESLint style drift** — KVideo uses semicolons/double-quotes/ESLint; every ported file must be reformatted to flox Biome rules (no semis, single quotes, `import type`, `import * as z`).
4. **Edge runtime / next-on-pages** — flox deploys to CF Pages; Tier B avoids Node-only APIs (danmaku/cast excluded), keeping risk low. Verify legacy `webkit-*` JSX props typecheck.
5. **Breaking change** — `NativePlayer` removed, `VideoPlayer` props extended. Only one consumer (`app/player/page.tsx`); contained.

## Scope

- **New**: `lib/hooks/mobile/*`, `components/player/{CustomVideoPlayer,DesktopVideoPlayer}.tsx`, `components/player/desktop/*`, `components/player/hooks/{useDesktopPlayerState,useDesktopPlayerLogic,useAutoSkip,useStallDetection}.ts`, `components/player/hooks/desktop/*`, `components/player/web-fullscreen.css`.
- **Modified**: `components/player/VideoPlayer.tsx`, `components/player/hooks/useHlsPlayer.ts`, `lib/store/settings-store.ts`, `components/player/utils/urlUtils.ts`, `app/player/page.tsx`, `CLAUDE.md`.
- **Removed**: `components/player/NativePlayer.tsx`.
- **Out of scope (Tier B)**: danmaku, cast/AirPlay/PiP, watch-together, premium dual settings store, `RuntimeFeaturesProvider`, P2 ad-filter hot-toggle optimization.

## Alternatives

- **Tier A (fixes only, keep native controls)** — port just Phase 1 robustness + `useAutoSkip` decoupling; no custom UI. Smaller, but leaves the native-controls UX. Rejected per user direction (reference KVideo).
- **Tier C (full parity)** — Tier B + danmaku + cast + premium store + RuntimeFeatures. Largest scope, pulls in external data sources/SDKs. Deferred; can be a follow-up plan after Tier B lands.

## Annotations

- **2026-06-09 scope refinement (during impl)**: Original scope said "exclude PiP/Cast". Discovered that PiP + AirPlay are native browser APIs (zero deps) and are intertwined with fullscreen in `useFullscreenControls`; Cast is wired into the 655-line `DesktopMoreMenu`. Gutting these out is higher-risk than keeping them. Revised approach: port the control layer faithfully **including** PiP/AirPlay (work natively) and Cast UI, but **do not load the Google Cast SDK script** -> `isCastAvailable` stays false, cast button stays hidden/inert. Android PiP bridge (`android-pip-utils` + `window.*Android` bridge) is ported but inert (flox has no native wrapper). Still **excluded**: danmaku (no data source), watch-together, premium dual-settings store, RuntimeFeaturesProvider. `mediaProxyEnabled` -> constant `true`. localStorage keys renamed `kvideo-*` -> `flox-*`.
- **2026-06-09 friction flagged**: KVideo player UI uses a custom `@/components/ui/Icon` component (5 files); flox uses `lucide-react`. Phase 3 (UI) must bridge the icon system. Phases 0-2 are unaffected (no icon usage) and independently typecheck-verifiable. Phase 3 UI behavior cannot be unit-tested — needs dev server + manual/real-device verification.
