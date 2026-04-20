# Flâneur — implementation tracker

This file tracks what is built in Lens Studio versus the product spec (`Flâneur.md`) and course deliverable notes (`Flaneur dev plan.md`). Update it as milestones land.

---

## Product snapshot (why this exists)

- **What:** A shared spatial layer for small groups (roughly 2–4 people) moving through the same physical space—awareness of where others are, shared pins on what people notice, lightweight reactions, optional “meet here” beacon, and (later) session recap and history.
- **Hardest technical themes (dev plan):** persistent world-anchored pins with concurrency; compass-style direction without relying on perfect GPS; session lifecycle; clutter control; recap generation.
- **Execution rule (repo):** Prove a **minimal working loop** for shared spatial state (create object → valid position → sync via Connected Lens → correct reconstruction on peers) before UI polish, recap, ghost pins, reactions, or complex flows.

---

## Session flow (from dev plan UX map)

| Phase | Status |
|------:|:-------|
| 1 Launch & Pair | Not implemented in-scene (Connected Lens / Sync Kit handles session entry). |
| 2 Compass Wake | **In progress** — `FlaneurPeerCompass.js`: RealtimeStore `peer:<id>` poses + HUD needles (horizontal bearing); same frame as pins. |
| 3 Ghost Reveal (return visit) | **Blocked** until core loop + Custom Location / cloud story |
| 4 Exploration — Pinning | **In progress** (store + markers + photo metadata + UI list) |
| 5 Exploration — Reacting | **Partial** (three synced reactions on sidebar rows; not world radial) |
| 6 Meet Here | **Blocked** by primary rule |
| 7 Session End | **Not started** |
| 8 Recap Generation | **Blocked** by primary rule |
| 9 Save & Share (Snap Cloud) | **Blocked** by primary rule |

---

## What is implemented today

**Primary script:** `Assets/Scripts/FlaneurMultiplayerMarkers.js` (Phase A).

- **Connected Lens + Spectacles Sync Kit:** Wires `global.sessionController` when `useSpectaclesSyncKit` is true; falls back to standalone `ConnectedLensModule` + `ConnectedLensEnteredEvent` after a timeout or when Sync Kit is off.
- **RealtimeStore:** Session-scoped store id `flaneur_pins_v1`, unowned, with `pin:<id>` keys and JSON records `{ id, oid, name, img?, x, y, z, t }` in markers-root space (or world if no root); `peer:<ownerId>` for live head position `{ x, y, z, t, n? }` (compass script).
- **Markers:** Spawns from `pinTemplate` (or empty `SceneObject`), parents under `markersRoot` or the script object; `onRealtimeStoreUpdated` / rebuild applies remote keys.
- **Pin drop input:** **Pin Drop From Global Screen Events** defaults **off**; primary path is **Pin Drop Interaction** (`InteractionComponent`, recommended for Spectacles Preview) plus optional **Trigger Primary** when `pinDropListenTriggerPrimary` is on. With global screen events on, assign **Pin Drop UI Blocker Root** / **Extra** so `ScreenTransform.containsScreenPoint` skips placement on UI. **Editor Touch Blocking For Preview** defaults off.
- **Remote pin toasts:** Other clients’ drops raise the head toast via `FlaneurMultiplayerMarkers.maybeNotifyRemotePinDropFromStoreKey` — skips only pins this client originated (`localOriginatedPinIds`); `RealtimeStoreUpdateInfo.updaterInfo` is **not** trusted for skip (dual preview often marks every update as “local”). Toast label uses store `name` / `oid` when updater metadata is unreliable.
- **Debug logging:** `logPinInputDebug` → tap/pin-input traces. `logNetworkDebug` → RealtimeStore bind, key updates, spawn lines, toast trace, startup wiring hints (default off).
- **Pin payload:** Store record includes `name` (Connected Lens `displayName`), optional `img` (JPEG base64 after Spectacles `require("LensStudio:CameraModule").requestImage` + `Base64.encodeTextureAsync`). No Camera Module asset; still capture is device-only (not Editor).
- **Social UI (`FlaneurPinSocialUi.js`):** Head-following world `Text` toast (via `toastAnchor` + offsets), collapsible screen sidebar (FAB + count badge + scroll list), row prefab with photo/name/reactions. Reactions use store keys `react:<pinId>:<userId>` → `"0"|"1"|"2"`. See script header for hierarchy naming (`PinPhoto`, `PinName`, `PinReacts`, `React0`…).
- **Peer compasses (`FlaneurPeerCompass.js`):** Publishes head/camera position to `peer:<ownerId>` in **stored** space; `global.flaneurPinApi.worldPointToStored` / `storedPointToWorld` keep alignment with pins. Custom Location AR assets are optional visual/skin only—not required for sync.
- **Helpers:** `shareSession` exposed on script; editor `touchSystem.touchBlocking` when in editor.

**Docs in repo:** `Flâneur.md` (product), `Flaneur dev plan.md` (deliverable + deep technical notes; file also contains embedded assets—prefer reading the first sections in an editor outline).

---

## Known gap: “pin-input logs but nothing happens”

**Observed:** Console shows `[Flaneur][pin-input] TouchStartEvent` / `TapEvent` / `TriggerPrimaryEvent` / `DoubleTapEvent`, etc.

**Meaning:** Input events reach the script. The next step is `tryDropPinAtNormalizedScreen`.

**Typical reason nothing visible happens:** `flaneurStore` is still **null** (no RealtimeStore bound yet). In that case the script returns early and prints a **separate** line:

- With Sync Kit: `[Flaneur] No RealtimeStore yet. With Sync Kit: open Start Menu → Multiplayer (internet) or Singleplayer + Mocked Online; ...`
- Standalone: `[Flaneur] No RealtimeStore yet. Flow: host runs lens → shares session → ...`

**What to do in Lens Studio:** Start a mode that actually creates a Connected Lens session and store (e.g. Sync Kit **Multiplayer** with internet, or **Singleplayer + Mocked Online**). **Manual Singleplayer** without mock online does not give you `init()` / store—by design in Sync Kit. Turn on **Log Network Debug** on `FlaneurMultiplayerMarkers` to confirm `RealtimeStore bound` and key-update traces.

**Other early exits (less common):** no `worldCamera` / scene camera → `[Flaneur] No camera; assign World Camera input.`; throttle `lastPinWallTime` drops bursts within 250 ms.

**Store + logic run but pins invisible:** `pinTemplate` was a **disabled** SceneObject (`Tube`). `copySceneObject` kept clones disabled, so nothing drew. **Fix:** `spawnPinObject()` now sets `so.enabled = true` on every spawn; `Tube` was set enabled in `Scene.scene` so the template is valid in-editor too.

When drops succeed with **Log Pin Input Debug** on, you should also see `[Flaneur][pin-input] Committed pin …` after the tap/touch lines.

---

## What is left to do (near-term, aligned with primary rule)

1. **Shared pin loop** — largely validated (store bind, dual preview, remote markers + head toast). Continue to verify on-device Spectacles + multi-user sessions as needed.
2. **Document the exact Sync Kit / Preview clicks** you use for class demos (single paragraph in this file or in script header once settled).
3. **Compass / peer direction** — baseline HUD needles shipped (`FlaneurPeerCompass.js`); validate on two devices / dual preview; consider names-on-needles, distance readout, or world-space compasses later.
4. **Custom Location fallback** — only when core multiplayer pins are reliable; see `SECONDARY-RULE-CUSTOM-LOCATIONS-SPECTACLES-RELIABILITY.mdc`.
5. **Later (explicitly deferred):** world radial reactions, Meet Here, recap, Snap Cloud ghost pins, point systems—after the shared spatial loop is stable.

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-16 | Tracker created; documented Phase A scope, UX map status, and RealtimeStore vs pin-input logging behavior. |
| 2026-04-16 | Pin visibility: force-enable spawned pin objects; enable `Tube` template; strip orphan peer script inputs from scene; log `Committed pin` on success. |
| 2026-04-16 | `FlaneurPinSocialUi.js`: head toast, sidebar + badge, pin previews with Spectacles photo sync, reaction keys; markers extended for name + capture + `global.flaneurPinApi`. |
| 2026-04-19 | Remote pin toasts (`localOriginatedPinIds`, ignore bogus `updaterInfo`); **Log Network Debug** gate; tracker pin-input defaults. **Peer compasses:** `FlaneurPeerCompass.js`, `peer:<ownerId>` store keys, `flaneurPinApi` stored/world helpers. Custom Location AR = optional skin only. |

