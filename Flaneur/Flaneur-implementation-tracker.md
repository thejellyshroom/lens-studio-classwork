# Flâneur — implementation tracker

This file tracks what is built in Lens Studio versus the product spec (`Flâneur.md`) and course deliverable notes (`Flaneur dev plan.md`). Update it as milestones land.

## MVP idea to preserve (navigation without texting)

**Guide me here (pin navigation target) — shipped in repo:** Tap a pin row in the collapsible sidebar (`RectangleButton` on `PinEntry.prefab`, callback on `FlaneurPinRowNavCallback.flaneurNavToMe`). RealtimeStore keys `nav:<peerCompassId>` hold each peer’s active target (peer or pin); `FlaneurPeerCompass.js` aims the primary needle from **camera/head** and sets **`compassTargetText`** to a **possessive pin label** when the target is a pin. **Persistent** group-facing copy lives on **`Navigation` → `Text`** (wired through `FlaneurSidebarPinListUi.js` inputs `navigationRoot` / `navigationTargetText`). **Navigate** calls `global.flaneurNavToSharedTarget` to match the last known shared pin target; **Reset** calls `global.flaneurResetNavigation` to clear your `nav:` record and return the compass to peers. **Toasts** (`FlaneurToastFollowUi.js`) are for **transient** remote cues, not the main nav readout. **Pin-drop suppression:** `global.flaneurSuppressPinDrop` / `flaneurSuppressPinDropUntil` (from sidebar handlers) plus `FlaneurPinInput` / `FlaneurStorePins` checks prevent accidental pins when pressing always-on nav buttons. **Audio:** `FlaneurUiSfx.js` on the UISFX prefab exposes `global.flaneurSfxPinDrop`, `flaneurSfxButton`, `flaneurSfxRemoteNav` → `AudioComponent` inputs.

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
| 2 Compass Wake | **Implemented** — `FlaneurPeerCompass.js`: RealtimeStore `peer:<id>` poses + HUD needles; optional nav needle from `nav:<myId>`; bearing from camera/head. |
| 3 Ghost Reveal (return visit) | **Blocked** until core loop + Custom Location / cloud story |
| 4 Exploration — Pinning | **Implemented** (see `FlaneurStorePins.js` + pin list UI) |
| 4b Navigation — Guide me here | **Implemented** — `nav:` keys, sidebar row nav, persistent Navigation text, Navigate/Reset, suppression, UISFX |
| 5 Exploration — Reacting | **Partial** (three synced reactions on sidebar rows; not world radial) |
| 6 Meet Here | **Blocked** by primary rule |
| 7 Session End | **Not started** |
| 8 Recap Generation | **Blocked** by primary rule |
| 9 Save & Share (Snap Cloud) | **Blocked** by primary rule |

---

## What is implemented today

**Primary script:** `Assets/Scripts/FlaneurStorePins.js` (Phase A). In the default scene it often still lives on the SceneObject named **`FlaneurMultiplayerMarkers`** (legacy name).

- **Connected Lens + Spectacles Sync Kit:** Wires `global.sessionController` when `useSpectaclesSyncKit` is true; falls back to standalone `ConnectedLensModule` + `ConnectedLensEnteredEvent` after a timeout or when Sync Kit is off.
- **RealtimeStore:** Session-scoped store id `flaneur_pins_v1`, unowned, with:
  - `pin:<id>` — JSON records `{ id, oid, name, img?, x, y, z, t }` in markers-root **stored** space (or world if no root).
  - `peer:<ownerId>` — live head/camera pose `{ x, y, z, t, n? }` for `FlaneurPeerCompass.js`.
  - `nav:<peerCompassId>` — navigation target for that peer (peer id or pin id + label metadata); set/cleared via `global.flaneurPinApi` (`setNavTargetPeer`, `setNavTargetPin`, `clearNavTarget`, `getNavRecordForPeerCompassId`).
  - `react:<pinId>:<userId>` → `"0"|"1"|"2"` for sidebar reactions.
- **Markers:** Spawns from `pinTemplate`, parents under `markersRoot`; store updates rebuild remote keys. Successful commits can call `global.flaneurSfxPinDrop()` when UISFX is wired.
- **Pin drop input:** `FlaneurPinInput.js` — respects UI flags and **`global.flaneurSuppressPinDropUntil`** (and related globals) so always-on **Navigate** / **Reset** buttons do not place pins. **Pin Drop From Global Screen Events** defaults **off**; primary path is **Pin Drop Interaction** plus optional **Trigger Primary**. With global screen events on, assign **Pin Drop UI Blocker Root** / **Extra** for `ScreenTransform.containsScreenPoint` hit-testing.
- **Remote pin toasts:** Other clients’ drops raise the head toast via store-driven helpers on the markers script — skips pins this client originated (`localOriginatedPinIds`); `RealtimeStoreUpdateInfo.updaterInfo` is **not** trusted for skip in dual preview.
- **Debug logging:** `logPinInputDebug` / `logNetworkDebug` on `FlaneurStorePins` (default off in shipped inputs).
- **Pin payload:** `name` (Connected Lens `displayName`), optional `img` (JPEG base64 from Camera Module flow where available). Capture is device-focused (not Editor).
- **Social / navigation UI:** `FlaneurToastFollowUi.js` (transient toasts). `FlaneurSidebarPinListUi.js` — collapsible pin list, static **pin row slots** (`pinRowSlot0`…`7`) recommended for reliable `RectangleButton` hits, **Navigation** block for persistent status, **Navigate** / **Reset** wired to globals. Per-row **`FlaneurPinRowNavCallback.js`** on `PinEntry.prefab` holds `pinId` / label for manual callback wiring.
- **Peer compass (`FlaneurPeerCompass.js`):** Publishes to `peer:<ownerId>`; reads local `nav:<myId>` to aim at pin or peer; **`compassTargetText`** shows peer display name or possessive pin label. `global.flaneurPinApi` stored/world helpers align with pins.
- **UI sound:** `FlaneurUiSfx.js` — assign three `AudioComponent` inputs on the UISFX SceneObject; globals for pin drop, any UI button path in sidebar/nav, and remote nav events.
- **Helpers:** `shareSession` on store script; editor `touchSystem.touchBlocking` when in editor.

**Removed / deprecated:** `FlaneurPinSocialUi.js` was deleted; responsibilities live in `FlaneurSidebarPinListUi.js` and related scripts.

**Docs in repo:** `Flâneur.md` (product), `Flaneur dev plan.md` (deliverable + deep technical notes; file also contains embedded assets—prefer reading the first sections in an editor outline).

---

## Known gap: “pin-input logs but nothing happens”

**Observed:** Console shows `[Flaneur][pin-input] TouchStartEvent` / `TapEvent` / `TriggerPrimaryEvent` / `DoubleTapEvent`, etc.

**Meaning:** Input events reach the script. The next step is `tryDropPinAtNormalizedScreen`.

**Typical reason nothing visible happens:** `flaneurStore` is still **null** (no RealtimeStore bound yet). In that case the script returns early and prints a **separate** line:

- With Sync Kit: `[Flaneur] No RealtimeStore yet. With Sync Kit: open Start Menu → Multiplayer (internet) or Singleplayer + Mocked Online; ...`
- Standalone: `[Flaneur] No RealtimeStore yet. Flow: host runs lens → shares session → ...`

**What to do in Lens Studio:** Start a mode that actually creates a Connected Lens session and store (e.g. Sync Kit **Multiplayer** with internet, or **Singleplayer + Mocked Online**). **Manual Singleplayer** without mock online does not give you `init()` / store—by design in Sync Kit. Turn on **Log Network Debug** on **`FlaneurStorePins`** to confirm `RealtimeStore bound` and key-update traces.

**Other early exits (less common):** no `worldCamera` / scene camera → `[Flaneur] No camera; assign World Camera input.`; throttle `lastPinWallTime` drops bursts within 250 ms.

**Store + logic run but pins invisible:** `pinTemplate` was a **disabled** SceneObject (`Tube`). `copySceneObject` kept clones disabled, so nothing drew. **Fix:** `spawnPinObject()` now sets `so.enabled = true` on every spawn; `Tube` was set enabled in `Scene.scene` so the template is valid in-editor too.

When drops succeed with **Log Pin Input Debug** on, you should also see `[Flaneur][pin-input] Committed pin …` after the tap/touch lines.

---

## What is left to do (near-term, aligned with primary rule)

1. **Hardware + multi-user validation** — dual Spectacles / mixed device sessions; confirm `nav:` sync, Navigation line, and suppression under real touch latency.
2. **Document the exact Sync Kit / Preview clicks** you use for class demos (short paragraph here or in `FlaneurStorePins.js` header).
3. **Compass polish** — optional distance readout, needle labels for every peer, or world-anchored compass variants (current build is HUD + primary nav needle).
4. **Optional:** tap **world-space pin** to set nav target (today: sidebar row is the primary path).
5. **Custom Location fallback** — only when core multiplayer pins are reliable; see `SECONDARY-RULE-CUSTOM-LOCATIONS-SPECTACLES-RELIABILITY.mdc`.
6. **Later (explicitly deferred):** world radial reactions, Meet Here, recap, Snap Cloud ghost pins, point systems—after the shared spatial loop is stable.

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-16 | Tracker created; documented Phase A scope, UX map status, and RealtimeStore vs pin-input logging behavior. |
| 2026-04-16 | Pin visibility: force-enable spawned pin objects; enable `Tube` template; strip orphan peer script inputs from scene; log `Committed pin` on success. |
| 2026-04-16 | `FlaneurPinSocialUi.js`: head toast, sidebar + badge, pin previews with Spectacles photo sync, reaction keys; markers extended for name + capture + `global.flaneurPinApi`. |
| 2026-04-19 | Remote pin toasts (`localOriginatedPinIds`, ignore bogus `updaterInfo`); **Log Network Debug** gate; tracker pin-input defaults. **Peer compasses:** `FlaneurPeerCompass.js`, `peer:<ownerId>` store keys, `flaneurPinApi` stored/world helpers. Custom Location AR = optional skin only. |
| 2026-04-27 | **Guide me here:** `nav:<peerCompassId>` in `FlaneurStorePins.js`; compass retarget + possessive labels in `FlaneurPeerCompass.js`; sidebar nav via `FlaneurPinRowNavCallback.js` + static row slots in `FlaneurSidebarPinListUi.js`; persistent **Navigation/Text**; **Navigate** / **Reset**; pin-drop suppression; `FlaneurUiSfx.js`. Tracker documents **`FlaneurStorePins.js`** as the primary store/markers script (scene object may still be named `FlaneurMultiplayerMarkers`). **`FlaneurPinSocialUi.js` removed.** |

