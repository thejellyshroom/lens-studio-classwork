# Flâneur — Dev Plan (annotated copy)

**Source:** [`Flaneur dev plan.md`](Flaneur%20dev%20plan.md) (original includes embedded figure assets; this file is text-only through the UX map).

**Purpose of this copy:** Same dev plan content with annotations in three categories:

1. **Recording** — What is *reflected in the demo recording you submitted* (below prefilled from **what the current Lens Studio project can demonstrate** as of **2026-04-27**; edit if your video showed more, less, or different).
2. **Working on** — What engineering is **actively in progress** per [`Flaneur-implementation-tracker.md`](Flaneur-implementation-tracker.md).
3. **Obsolete / deferred** — What the written plan described but is **not pursued yet**, **superseded by implementation choices**, or **blocked** by execution rules.

---

## Annotation summary (quick index)

| Plan area | Recording (typical demo from this repo) | Working on | Obsolete / deferred |
|-----------|----------------------------------------|------------|---------------------|
| Pairing / launch UI | Session entry via Connected Lens / Spectacles Sync Kit, not a custom Flâneur pairing screen | Document exact Preview / Sync Kit clicks for class demos | Custom in-lens “pairing screen → lobby list” as sole path |
| Compass wake | Peer direction via `FlaneurPeerCompass.js` (RealtimeStore `peer:<id>`, HUD needles, stored/world alignment with pins); nav target needle + `compassTargetText` when `nav:<id>` selects a pin | Validation on two devices / dual preview; distance readouts, world-space compasses | Perfect GPS-based compass; compasses as only screen-edge arcs if implementation differs |
| Ghost reveal | Not demoable | — | Blocked until core loop + Custom Location / cloud story |
| Pinning | Shared pins via **`FlaneurStorePins.js`** (scene object may still be named `FlaneurMultiplayerMarkers`), RealtimeStore `pin:<id>`, photos/name metadata, remote head toast | Reliability on Spectacles + multi-user | Pinch + gaze-only as *required* input (actual path: Interaction / screen events + optional triggers) |
| Guide me here / nav | `nav:<peerCompassId>` in RealtimeStore; sidebar rows + `FlaneurPinRowNavCallback.js`; persistent **Navigation/Text**; Navigate + Reset; pin-drop suppression; optional `FlaneurUiSfx.js` | Edge cases: many pins, slot wiring, device testing | Spec wording that **only** a peer toast carries “who’s navigating where” (implementation: **persistent nav line** + transient toast/SFX) |
| Reacting | Three synced reactions on **sidebar rows** (`react:<pinId>:<userId>`) | World radial / pin-anchored reactions | Spec’s “look at pin → world radial” **not** in build (sidebar model instead) |
| Meet Here | Not implemented | — | Blocked by primary execution rule until shared spatial loop is stable |
| Session end / recap / Snap Cloud | Not implemented | — | Explicitly blocked / deferred per primary rule and tracker |
| Custom Location | Optional visual skin only; **not** required for current pin sync | Fallback strategy later per secondary rule | Plan text that pins *depend on* Custom Location for basic multiplayer (current model: stored space + Connected Lens) |
| Recap collage | Not demoable | — | Blocked; also primary rule prohibited recap until core loop stable |

---

# **FLÂNEUR — Project 2, Deliverable 1** *(annotated)*

## **Visual Arc: First & Last Thing Users See**

The experience has a clear emotional arc: from arriving at a shared space feeling loosely untethered from your group, to leaving with a tangible artifact of what you collectively found and felt.

**Annotations**

- **Recording:** Emotional arc is only *partially* visible in a technical demo—what reads on video today is mainly **shared presence** (pins + peer direction), not the full “arrive untethered → leave with collage” story.
- **Working on:** Strengthening the **middle** of the arc (exploration + compass) before the closing recap beat.
- **Obsolete / deferred:** None of the narrative is obsolete; the **last beat** (recap collage) is simply **not buildable in-app yet**.

### **First Thing Seen — Pairing Screen → Compass Wake**

The user opens Flâneur and sees a pairing screen on the phone. They are prompted to either share their code, or join a new lobby through another person’s code. In the Spectacles, they would see who is in the current lobby as they are connecting. Once they are finally connected, they would see compasses for each person.

Figma: [Flaneur design](https://www.figma.com/design/W10ES7BQjXxth8K067WaBr/Flaneur?node-id=0-1&p=f&t=4PnxBD3T5FfnQ12B-0)  
Figures: see original `Flaneur dev plan.md` (`image1`).

**Annotations**

- **Recording:** Expect **platform session / Sync Kit flow** and **compass-style peer indicators** if the recording shows multiplayer Preview; do **not** expect a bespoke Flâneur pairing UI unless you added it outside this repo snapshot.
- **Working on:** Compass behavior and consistency with pin coordinate space (`global.flaneurPinApi` stored/world helpers).
- **Obsolete / deferred:** Treating the **custom phone pairing screen** as the implemented first screen—it is still **product intent**, not the current in-scene implementation.

### **Last Thing Seen — The Recap Collage**

When the group disperses, Flâneur auto-generates a spatial collage: each member's pins rendered as illustrated cards, arranged by color cluster, with the most-reacted items displayed largest.

Figures: see original `Flaneur dev plan.md` (`image2`).

**Annotations**

- **Recording:** **Not** reflected—no recap pipeline in the build.
- **Working on:** **None** for recap (intentionally after core loop).
- **Obsolete / deferred:** Entire subsection for **Deliverable 1 recording** is **future work**; keep as north star, not current demo proof.

---

## **Dev Notes: Core Problems & Lens Studio Functionality**

### **Core Technical Problems to Solve**

* **Persistent world-anchored pins across multiple users simultaneously** — the hardest concurrency + spatial anchoring challenge in the entire app.
* **Compass direction to group members** using relative spatial positioning without requiring precise GPS (indoor environments like museums have poor GPS).
* **Guide me here / navigation targets** — per-peer `nav:` records, compass retargeting, synced group-visible status, and UI that does not fight pin-drop input.
* **Session lifecycle management:** pairing, active session, recap generation, and graceful disbanding — all with low latency on-device.
* **Avoiding AR clutter:** dynamic LOD logic to fade, scale, or suppress pins when the field of view is too crowded.
* **Recap generation:** aggregating all group pins at session end and rendering a spatially composed collage in real time on-device.

**Annotations**

- **Recording:** **Pins + compass + guide-me-here** are the problems a recording can **show** today; **clutter LOD** and **full lifecycle** are mostly **not** visible yet.
- **Working on:** On-device validation, sidebar/nav polish, and any remaining multi-user edge cases.
- **Obsolete / deferred:** **Recap, heavy lifecycle UI, clutter LOD** remain **de-prioritized** until the shared spatial loop is bulletproof (see primary execution rule).

### **Lens Studio Functionality to Explore**

#### **Connected Lens (Multiplayer)**

The backbone of the entire experience. Connected Lens handles real-time group state: who is in the session, where each member's pins are placed, and live reaction events. All group-shared data flows through Connected Lens's session and realtime messaging system.

* RealtimeStore for live compass direction updates per user
* RealtimeStore for pin placement events (position, category, owner color)
* Realtime messaging for ephemeral reaction events (glow, question mark, come-see-this pulse)
* Session lifecycle hooks: join, leave, disband → triggers recap generation

**Annotations**

- **Recording:** **RealtimeStore for pins** and **`peer:<id>` for compass** are the credible demo story; **reactions** appear as **persisted store keys on sidebar**, not necessarily as ephemeral messaging.
- **Working on:** Store bind robustness, remote toasts, `localOriginatedPinIds` / updater metadata edge cases; `nav:` key lifecycle.
- **Obsolete / deferred:** Assuming **realtime messaging** (non-Store) is required for reactions—**current build uses RealtimeStore reaction keys**; **join/leave → recap** hooks **not** implemented.

#### **Custom Locations (Persistent Spatial Anchoring)**

Used to anchor the Meet Here beacon and saved group pins to specific physical spots. The one interaction in the app that requires true world-anchored content rather than body-relative display.

* Scanning and registering a Custom Location when a user drops a Meet Here beacon
* Storing pin positions relative to a Custom Location for the group history / ghost pin system on return visits
* Fallback: if Custom Location fails to lock (crowded/dynamic environment), fall back to approximate beacon with pulsing radius indicator rather than hard pin

**Annotations**

- **Recording:** Custom Location kit may appear as **optional visuals** only; **pins do not depend on it** for the current multiplayer loop.
- **Working on:** **Deferred** until core multiplayer is reliable (secondary rule).
- **Obsolete / deferred:** Any reading of the plan that **requires** Custom Location **before** basic shared pins is **obsolete relative to current architecture** (stored coordinates + Sync Kit).

#### **Snap Cloud / Cloud Storage (Persistent History)**

Powers the group's shared history — persisting pin archives across sessions so that return visits surface old ghost pins.

* Storing session recap data per group (pins, reactions, timestamp, location tag)
* Retrieving prior session data on session start to render faint ghost markers
* Uploading the Recap collage asset to cloud for sharing outside the app

**Annotations**

- **Recording:** **Not** reflected.
- **Working on:** **None.**
- **Obsolete / deferred:** Entire subsection for **current milestone**; remains **valid product intent** for later.

#### **Spatial / AR Interaction**

* Hand tracking + pinch gesture: core input for pin drop and reaction selection
* Gaze / eye tracking (if supported on Spectacles): to direct the pin toward what the user is looking at
* World mesh / surface detection: to anchor Meet Here beacons to actual surfaces
* Body-relative rendering: Compass and reaction radials rendered in screen space, not world space

**Annotations**

- **Recording:** Likely **InteractionComponent / tap / trigger** paths rather than a polished **pinch + gaze** stack; **peer compass** may be screen/HUD style.
- **Working on:** Input reliability on device vs Editor; **pin-drop suppression** window for always-on **Navigate** / **Reset** (`global.flaneurSuppressPinDrop` + `FlaneurPinInput` checks).
- **Obsolete / deferred:** Treating **pinch + gaze** as the **only** shipped interaction model—they are **aspirational** in the plan, **not** the exclusive implementation.

#### **Visual / Rendering**

* Billboard sprites for floating pin markers (always face the user)
* Particle/glow shader for the reaction glow and Meet Here pulse effect
* Custom 2D/3D collage layout system for the Recap screen

**Note on Multiplayer vs Live Data:** This app requires both Connected Lens (for live in-session multiplayer) AND Snap Cloud (for persistent cross-session history). These are complementary, not alternatives.

**Annotations**

- **Recording:** **Pins + simple markers + social UI**; **particle Meet Here** and **recap layout** are **not** expected.
- **Working on:** Pin template visibility, toast + sidebar + **Navigation** line polish; UISFX levels.
- **Obsolete / deferred:** **Recap layout** and **Meet Here VFX** deferred; the **Cloud half** of the note is **not build-complete** yet.

---

## **Unique Spatially-Meaningful AR Interactions**

### **Pin Drop**

**Gesture / Trigger:** User performs a pinch gesture while looking at or pointing toward a physical object (painting, stall, dish). Gaze or hand ray-cast determines what is being targeted.

**Spatial Behavior:** A floating illustrated marker appears above the real-world object in the user's personal color. The pin is visible to all group members in their own view, floating at the correct world position via Custom Location or relative world anchor.

**Purpose:** The core sharing gesture. Turns a moment of silent discovery into a shared spatial signal without interrupting anyone's movement or conversation.

**Directional Reaction**

**Gesture / Trigger:** User looks at another member's visible floating pin in the world. A small radial menu fades in (glow / ? / pulse). User pinches toward one of the three radial options.

**Spatial Behavior:** The selected reaction plays as a world-anchored animation directly on the pin in 3D space. The "come see this" pulse sends a ripple outward from the pin's world position, visible to all group members simultaneously — a spatial call to attention.

**Purpose:** Reactions happen at the pin's location in the physical world, not in a sidebar or notification tray. The spatial grounding makes them feel like pointing and gesturing rather than texting.

**Annotations**

- **Recording:** **Shared pin drop + group visibility + photo/name** are the demo backbone; **reactions** are **sidebar-synced**, **not** world radial.
- **Working on:** End-to-end pin loop on hardware; optional UX for reactions.
- **Obsolete / deferred (relative to spec text):** **World-anchored reaction animation** and **gaze-driven radial** are **not** the current implementation—sidebar model **partially supersedes** this section for now.

### **Meet Here Drop**

**Gesture / Trigger:** User performs a hold-and-release gesture while pointing their hand toward the ground or a surface in the environment.

**Spatial Behavior:** An AR beacon anchors to the surface detected by the world mesh at that point. A vertically rising light column marks the spot. All other group members' Compass indicators immediately reorient to point toward this anchor. The beacon pulses gently to remain visible across distance.

**Purpose:** Spatially meaningful because the beacon is locked to a real physical spot — not a map pin. Other users navigate to it by following their compass. The meeting point is literally standing in the world.

**Annotations**

- **Recording:** **Not** reflected.
- **Working on:** **None** (blocked until core loop stable).
- **Obsolete / deferred:** **Not obsolete** as design—**explicitly blocked** from implementation order.

**Ghost Pin Reveal**

**Gesture / Trigger:** On a return visit to a previously scanned Custom Location, the user performs a slow open-palm gesture (like brushing aside a curtain) while facing an area where old pins were dropped.

**Spatial Behavior:** Faint translucent versions of prior-session pins materialize in their original world positions — rendered in desaturated versions of the original member colors. They dissolve slowly if the user doesn't interact. Pinching one expands it to show the recap card from the original visit.

**Purpose:** Overlays memory onto physical space in the exact locations where moments happened. A farmer's market stall you pinned six months ago reappears as a ghost at that actual stall — history embedded in place.

**Annotations**

- **Recording:** **Not** reflected.
- **Working on:** **None.**
- **Obsolete / deferred:** Depends on **persistence + Custom Location + recap**; **blocked** for now.

---

## [**UX Map: Typical Session Flow**](https://www.figma.com/board/djVApicM4TGccS5BLcJhsp/Untitled?node-id=1-63&t=4PnxBD3T5FfnQ12B-4)

[FigJam board](https://www.figma.com/board/djVApicM4TGccS5BLcJhsp/Untitled?node-id=1-63&t=4PnxBD3T5FfnQ12B-4)

Steps 4–6 (the exploration phase) should feel like the app disappears. Users should be fully present in the physical space, with Flâneur operating as a light ambient layer.

| # | Phase | What Happens |
| :---- | :---- | :---- |
| 1 | **Launch & Pair** | User opens Flâneur. A pairing code / QR is displayed. Group members tap to join. Each user is assigned a color. Session begins when host confirms. |
| 2 | **Compass Wake** | The AR layer activates. Peripheral Compass arcs appear at screen edges indicating where each group member is. The physical space ahead is clear — no visual clutter yet. |
| 3 | **Ghost Reveal** *(if return visit)* | If the Custom Location is recognized, faint ghost pins from prior sessions materialize briefly. User can brush-gesture to explore them or ignore them and walk. |
| 4 | **Exploration — Pinning** | Users explore independently. When something catches their eye, they pinch to drop a pin. Their pin floats above the object in their color, visible to the full group. |
| 4b | **Navigation — Guide me here (MVP)** | Sidebar pin row → compass retarget + possessive label; **Navigation/Text** for group status; **Navigate** / **Reset**; transient toast/SFX optional. |
| 5 | **Exploration — Reacting** | Group members see each other's pins floating in world space. Looking at a pin surfaces the 3-option reaction radial. Users react without speaking or stopping. |
| 6 | **Meet Here** | When the group wants to regroup, any member drops a Meet Here beacon on the ground. All Compass indicators immediately pivot to point toward it. Members converge. |
| 7 | **Session End** | One user (or the group together) triggers End Session via a simple menu. Flâneur signals all devices that the session is closing. |
| 8 | **Recap Generation** | The Recap collage assembles automatically: pins clustered by color, most-reacted items enlarged, arranged as a floating spatial collage. All users see the same view. |
| 9 | **Save & Share** | The Recap is saved to the group's shared history in Snap Cloud. Users can optionally share a screenshot export. Ghost pins will appear on the group's next return visit to this location. |

**Annotations (by phase)**

| # | Recording | Working on | Obsolete / deferred |
|---|-----------|------------|---------------------|
| 1 | Platform session entry; **not** full custom pairing UX | Document demo flow | Custom pairing screen as shipped |
| 2 | Peer compass / needles **if** demo runs multiplayer | Tuning + multi-device validation | “Screen-edge arcs” only if your HUD differs |
| 3 | **No** | — | Entire row until persistence |
| 4 | **Yes** — core demo | Input + store edge cases | “Pinch-only” wording |
| 4b | **Yes** — nav store + compass + sidebar | Device hardening; slot/prefab wiring docs | Treating **toast** as the **only** persistent nav UI (superseded: **Navigation/Text**) |
| 5 | **Partial** — reactions **not** world radial | Possible move toward spec | Sidebar-only as final design **not** decided—**spec** still targets world |
| 6–9 | **No** | — | Blocked / future |
