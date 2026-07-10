# REFACTOR-001 Rebuild flox player against KVideo (Tier B)

- **status**: completed
- **priority**: P1
- **owner**: pma
- **createdAt**: 2026-06-09 07:35

## Description

Replace the flox native `<video controls>` player with a custom control layer
ported from the upstream reference project KVideo (`/srv/work/projects/tmp/KVideo`),
scoped to **Tier B**: custom controls + robustness fixes, excluding danmaku,
casting (Cast/AirPlay), PiP, "watch together", and the premium dual-settings store.

flox is a stripped-down early fork of KVideo. Many files are near-identical
(`useHlsPlayer`, `m3u8-utils`, `m3u8-ad-detector`, `useVideoResolution`,
`resolution-probe`, `SourceSelector`, `EpisodeList`, `VideoMetadata`). flox's
`settings-store` already carries dangling fields (`fullscreenType`,
`showModeIndicator`) that KVideo's custom player consumes — this refactor
activates them.

### Acceptance criteria

- HLS playback works in: desktop Chrome (MSE), desktop Safari (native), iOS Safari (native + blob ad filter).
- Ad filtering (off / heuristic / aggressive + custom keywords) preserved across all paths.
- Proxy fallback/retry (`retry` / `always` / `none`) preserved; manual proxy toggle works.
- Progress memory (history save throttle + `beforeunload` + `?t=` seamless source switch) preserved.
- Custom controls: play/pause, progress bar (click/drag), volume, speed menu, fullscreen (native + window), skip ±N, keyboard shortcuts, double-tap gesture, copy link, resolution badge, mode indicator.
- Auto-skip intro/outro decoupled from auto-next-episode (each toggle independent).
- HEVC no longer hard-fails: lock to H.264 level when available, warn only if all levels are HEVC.
- iOS blob ad-filter path: failure detection + 8s timeout fallback to original source; no blob leak.
- `app/player/page.tsx` keeps working; props extended, not broken.
- `pnpm --filter @cdlab/flox typecheck`, `lint`, and `build` pass.
- Code follows flox Biome conventions (no semicolons, single quotes, `import type`, `import * as z`).

## ActiveForm

Rebuilding the flox player against the KVideo reference (Tier B).

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Plan: [PLAN-001](../plan/PLAN-001.md).
Reference source tree: `/srv/work/projects/tmp/KVideo/components/player/**`, `/srv/work/projects/tmp/KVideo/lib/hooks/mobile/**`.

### Progress

- **Phase 0 done** (2026-06-09): Added `src/lib/hooks/mobile/{useDeviceDetection,useDoubleTap}.ts` (skipped `useScreenOrientation` — unused by the desktop player path). Added `seekStepSeconds` + `DEFAULT/MIN/MAX_SEEK_STEP_SECONDS` + `normalizeSeekStepSeconds` to `settings-store` (state/action/default/merge), exposed via `usePlayerSettings`. `typecheck` passes. Decision: `mediaProxyEnabled` substitute = constant `true`.
- **Phase 1 done** (2026-06-09): Upgraded `useHlsPlayer` with KVideo robustness while preserving flox's ref-based callback/keyword optimization (minimal deps `[src, videoRef, autoPlay, isAdFilterEnabled]`, muted autoplay retry). Added: HEVC H.264 level-locking (P3), iOS `fetchWithFallback` (proxy fallback) + blob playback-failure listener + 8s timeout fallback (P5), unsupported-env direct->proxy fallback. iOS path now reads filter params via refs (fixes latent staleness). `typecheck` passes.
- **Phase 2 done** (2026-06-09): Ported logic layer (copy + biome auto-format to flox style): `useDesktopPlayerState` (refs/data/actions), `useDesktopPlayerLogic`, `hooks/desktop/*` (playback, volume, progress, skip, fullscreen, controls-visibility, utilities, shortcuts, cast, android-pip-utils), `useAutoSkip`, `useStallDetection`, `usePlaybackPolling`. Adapted: `usePlayerSettings()` parameterless, localStorage `kvideo-*`->`flox-*`, `KVideoAndroid`->`FloxAndroid`. `typecheck` passes.
- **Phase 3 done** (2026-06-09): Ported UI layer. Created `src/components/ui/Icon.tsx` shim mapping 23 `Icons.*` names to lucide-react. Copied `desktop/*` UI + `DesktopVideoPlayer` + `CustomVideoPlayer` + `web-fullscreen.css`. Stripped danmaku (DanmakuCanvas/useDanmaku + MoreMenu danmaku section), premium store, RuntimeFeatures, `fullscreenType: 'auto'` branch (flox is native|window only). `typecheck` passes.
- **Phase 4 done** (2026-06-09): Rewrote `VideoPlayer.tsx` as the shell (kept flox's videoId/source-based progress logic + proxy/retry state machine; added mode-indicator badge; renders `CustomVideoPlayer`). Removed `NativePlayer.tsx`. Wired `isReversed` into `app/player/page.tsx`. `typecheck` passes.
- **Phase 5 done** (2026-06-09): biome auto-format all new files; fixed two `useExhaustiveDependencies` regressions where `--unsafe` dropped `src` from deps (loading-reset + viewport effects — restored with correctly-placed suppression); removed an ineffective suppression in `useHlsPlayer`; reverted an unrelated biome reformat of `EpisodeList.tsx` (surgical). Updated CLAUDE.md flox player section. **Verified**: `typecheck` ✓, `build` ✓ (/player route builds), `biome check` ✓ (1 pre-existing `noImgElement` warning on untouched `VideoMetadata.tsx`, not a regression).

### Follow-up: align with project component conventions (user feedback)

- **Icons (done, 2026-06-09)**: Removed the `src/components/ui/Icon.tsx` shim. The 5 control-layer UI files now import icons directly from `lucide-react` (project convention), e.g. `Icons.Volume` -> `Volume2`. `typecheck` ✓, `build` ✓, biome clean on all 33 touched files.
- **Switches (done, 2026-06-09)**: Replaced the 4 hand-rolled `role="switch"` toggles in `DesktopMoreMenu` (mode-indicator, auto-next, skip-intro, skip-outro) with `Switch` from `@cdlab/ui/components/switch` (`checked` + `onCheckedChange`). `typecheck` ✓, `build` ✓, biome clean.
- **Menus (done, 2026-06-09)**: Replaced the hand-rolled `createPortal` + manual positioning in `DesktopSpeedMenu` and `DesktopMoreMenu` with `@cdlab/ui/components/popover` (`Popover` + `PopoverTrigger`). Deleted all manual positioning (`calculateMenuPosition` 3-mode logic, `menuPosition`/`isFullscreen` state, scroll-close) — Radix now handles placement/collision/flip. **Native-fullscreen fix**: shared `PopoverContent` portals to `document.body` (invisible inside native fullscreen, which is the flox default), so content uses `PopoverPrimitive.Portal container={containerRef.current}` + `PopoverPrimitive.Content` directly (same "shared root + primitive content" pattern byshot uses for Dialog). Added `radix-ui: catalog:prod` to flox deps (already used by byshot/bycut). Menu open state stays controlled via `open`/`onOpenChange` synced to `showSpeedMenu`/`showMoreMenu`; the 1.5s hover-keep-open timer is preserved by keeping `onMouseEnter`/`onMouseLeave` on trigger + content. `typecheck` ✓, `build` ✓, biome clean.
- **Progress + volume bars (done, 2026-06-09)**: The bespoke div bars used KVideo CSS classes (`slider-track`/`slider-range`/`slider-thumb`/`slider-buffer`) that don't exist in flox -> rendered invisible (user screenshot). Replaced both with `@cdlab/ui/components/slider` (`Slider`, themed via `bg-primary`/`bg-muted`). Added value-based handlers to `useDesktopPlayerLogic` (`seekPreview`/`seekCommit`/`setVolumeValue`) driving the video; threaded through `DesktopControlsWrapper` -> `DesktopControls` -> `DesktopProgressBar`/`DesktopLeftControls`/`DesktopVolumeControl`, replacing the ref+event drag handlers. The old `useProgressControls`/`useVolumeControls` document drag listeners are now inert (their `progressBarRef`/`volumeBarRef` targets are unused/null -> early-return; left in place, harmless). Buffered-progress indicator dropped (Slider has no secondary range). `typecheck` ✓, `build` ✓, biome clean.
- **Still bespoke (by design)**: control-bar icon buttons — player-specific, no shared equivalent.
- **Needs runtime check**: Radix positioning inside the iOS force-landscape (CSS-rotated 90°) stage is not guaranteed; verify speed/more menu placement in that mode on a real device.

### Follow-up: settings moved to an external Card (user feedback)

- **2026-06-09**: User wanted the in-player top overlay menus (speed + the more-menu settings) gone, controlled from an external `Card` below the player (the pre-refactor flox layout). Done:
  - **Store**: added `playbackRate`/`volume`/`muted` to `settings-store` (persisted via zustand) and removed ALL manual `localStorage` from the player (`flox-volume`/`flox-muted`/`flox-playback-rate` in `useDesktopPlayerState`/`useVolumeControls`/`usePlaybackControls`/`useDesktopShortcuts`/`useDesktopPlayerLogic`). `useDesktopPlayerState` now sources volume/muted/playbackRate from the store.
  - **Removed overlay menus**: deleted `DesktopSpeedMenu.tsx` + `DesktopMoreMenu.tsx`; stripped them (and the top-left resolution badge) from `DesktopOverlay`/`DesktopOverlayWrapper`/`DesktopVideoPlayer`. Dropped the web-fullscreen-size feature entirely (`WEB_FULLSCREEN_*`, cycle, its localStorage; web scale hardcoded to 1).
  - **External Card** (`VideoPlayer.tsx`): speed `ToggleGroup` (store) + resolution `Badge` + proxy/direct `Badge` (gated by 模式指示器) + settings `Popover` (广告过滤, 全屏方式, 模式指示器, 自动下一集, 跳过片头/片尾, 复制链接). Settings flow through the store so the player reacts automatically; speed applied to the video via a new effect in `DesktopVideoPlayer`. Copy link uses `getCopyUrl` + sonner toast.
  - **Bug fixed**: `web-fullscreen.css` still used `kvideo-*` class/var names while the component had been renamed to `flox-*` — window-fullscreen styling was dead; renamed CSS to `flox-*`.
  - `typecheck` ✓, `build` ✓, biome clean (only the pre-existing `VideoMetadata` `noImgElement` warning remains).

### Pending verification (cannot be done headless)

Runtime/browser behavior was not exercised: custom controls interaction, native+window fullscreen, iOS blob fallback + force-landscape, double-tap gestures, keyboard shortcuts, danmaku-removed MoreMenu layout. Needs `pnpm dev:flox` + manual (and real-device for iOS) testing before merge.
