Jessica Sheng  
ACAD-207


-- MVP scope note (keep the best idea, cut the rest)
**Guide me here (pin navigation target) — implemented shape:** tap a pin row in the collapsible sidebar (`RectangleButton` + per-row `FlaneurPinRowNavCallback.js`; optional static row slots for reliable hits). Your compass (`FlaneurPeerCompass.js`) reads `nav:<yourPeerCompassId>` from RealtimeStore (`FlaneurStorePins.js` / `global.flaneurPinApi`) and retargets; the needle label uses a **possessive pin** string (**“Jess’s pin”**). **Persistent** group-facing status lives on **`Navigation` → `Text`** (`FlaneurSidebarPinListUi.js`). **Navigate** applies the shared target to you; **Reset** clears your nav target and returns the compass to **peers**. **Toasts** (`FlaneurToastFollowUi.js`) stay **short / non-persistent** for remote cues. Pin drops are suppressed briefly when UI buttons fire (`global.flaneurSuppressPinDrop` / related checks in `FlaneurPinInput.js`). **UISFX:** `FlaneurUiSfx.js` routes pin-drop, button, and remote-nav sounds to `AudioComponent` inputs on the UISFX prefab.
**Lens Studio build status (engineering):** See [`Flaneur-implementation-tracker.md`](Flaneur-implementation-tracker.md) for file-level truth. This document stays product- and course-oriented.

Notes:  
People number for clustering  
Location marker for image pins

Sound feedback loudness based on distance  
Messaging thing for people that can’t make it?

# **FLÂNEUR — Project 2, Deliverable 1**

## **Visual Arc: First & Last Thing Users See**

The experience has a clear emotional arc: from arriving at a shared space feeling loosely untethered from your group, to leaving with a tangible artifact of what you collectively found and felt.

### **First Thing Seen — Pairing Screen → Compass Wake**

The user opens Flâneur and sees a pairing screen on the phone. They are prompted to either share their code, or join a new lobby through another person’s code. In the Spectacles, they would see who is in the current lobby as they are connecting. Once they are finally connected, they would see compasses for each person.

[https://www.figma.com/design/W10ES7BQjXxth8K067WaBr/Flaneur?node-id=0-1\&p=f\&t=4PnxBD3T5FfnQ12B-0](https://www.figma.com/design/W10ES7BQjXxth8K067WaBr/Flaneur?node-id=0-1&p=f&t=4PnxBD3T5FfnQ12B-0)

![][image1]

### **Last Thing Seen — The Recap Collage**

When the group disperses, Flâneur auto-generates a spatial collage: each member's pins rendered as illustrated cards, arranged by color cluster, with the most-reacted items displayed largest.

![][image2]

---

## **Build scope (MVP for Lens Studio)**

The full product vision includes persistent history, ghost pins on return visits, and recap generation. **For the current Lens Studio build, the goal is a reliable multiplayer loop first**, plus one “navigation without texting” feature:

- **Compass Wake:** show where your peers are (directional awareness; bearing from camera/head)
- **Shared pins:** drop a pin, everyone sees it in the correct shared space
- **Guide me here:** sidebar pin row → compass retargets + possessive label under arrow; **Navigation** text shows shared “who’s going where”; **Navigate** / **Reset**; transient toasts for remote signals; optional UI SFX

**Deferred (explicitly later):** Meet Here with Custom Locations anchoring, Snap Cloud persistence, Ghost Reveal, Recap collage generation, world-space reaction radial, points/challenges, and advanced clutter/LOD logic.

## **Dev Notes: Core Problems & Lens Studio Functionality**

### **Core Technical Problems to Solve**

**MVP (current build):**

* **Shared pins across multiple users (same session)** — concurrency + reconstruction in a shared coordinate space.  
* **Compass direction to group members** using relative spatial positioning without requiring precise GPS (indoor environments like museums have poor GPS).  
* **Guide me here retargeting** — `nav:` RealtimeStore records per peer, compass + possessive label, persistent **Navigation** line for group status, **Navigate** / **Reset**, pin-drop suppression on UI buttons, and optional audio (`FlaneurUiSfx.js`).

**Later (post-MVP):**

* **Session lifecycle management:** end/disband flows, recap trigger, graceful teardown.  
* **Avoiding AR clutter:** dynamic LOD logic to fade, scale, or suppress pins when the field of view is too crowded.  
* **Recap generation:** aggregating all group pins at session end and rendering a spatially composed collage in real time on-device.

---

### **Lens Studio Functionality to Explore**

#### **Connected Lens (Multiplayer)**

The backbone of the entire experience. Connected Lens handles real-time group state: who is in the session, where each member's pins are placed, and live reaction events. All group-shared data flows through Connected Lens's session and realtime messaging system.

* RealtimeStore for live compass direction updates per user  
* RealtimeStore for pin placement events (position, category, owner color)  
* Realtime messaging for ephemeral reaction events (glow, question mark, come-see-this pulse)  
* Session lifecycle hooks: join, leave, disband → triggers recap generation

#### **Custom Locations (Persistent Spatial Anchoring)**

Used to anchor the Meet Here beacon and saved group pins to specific physical spots. The one interaction in the app that requires true world-anchored content rather than body-relative display.

* Scanning and registering a Custom Location when a user drops a Meet Here beacon  
* Storing pin positions relative to a Custom Location for the group history / ghost pin system on return visits  
* Fallback: if Custom Location fails to lock (crowded/dynamic environment), fall back to approximate beacon with pulsing radius indicator rather than hard pin

#### **Snap Cloud / Cloud Storage (Persistent History)**

Powers the group's shared history — persisting pin archives across sessions so that return visits surface old ghost pins.

* Storing session recap data per group (pins, reactions, timestamp, location tag)  
* Retrieving prior session data on session start to render faint ghost markers  
* Uploading the Recap collage asset to cloud for sharing outside the app

#### **Spatial / AR Interaction**

* Hand tracking \+ pinch gesture: core input for pin drop and reaction selection  
* Gaze / eye tracking (if supported on Spectacles): to direct the pin toward what the user is looking at  
* World mesh / surface detection: to anchor Meet Here beacons to actual surfaces  
* Body-relative rendering: Compass and reaction radials rendered in screen space, not world space

#### **Visual / Rendering**

* Billboard sprites for floating pin markers (always face the user)  
* Particle/glow shader for the reaction glow and Meet Here pulse effect  
* Custom 2D/3D collage layout system for the Recap screen

**Note on Multiplayer vs Live Data:** This app requires both Connected Lens (for live in-session multiplayer) AND Snap Cloud (for persistent cross-session history). These are complementary, not alternatives.

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

### **Meet Here Drop**

**Gesture / Trigger:** User performs a hold-and-release gesture while pointing their hand toward the ground or a surface in the environment.

**Spatial Behavior:** An AR beacon anchors to the surface detected by the world mesh at that point. A vertically rising light column marks the spot. All other group members' Compass indicators immediately reorient to point toward this anchor. The beacon pulses gently to remain visible across distance.

**Purpose:** Spatially meaningful because the beacon is locked to a real physical spot — not a map pin. Other users navigate to it by following their compass. The meeting point is literally standing in the world.

**Ghost Pin Reveal**

**Gesture / Trigger:** On a return visit to a previously scanned Custom Location, the user performs a slow open-palm gesture (like brushing aside a curtain) while facing an area where old pins were dropped.

**Spatial Behavior:** Faint translucent versions of prior-session pins materialize in their original world positions — rendered in desaturated versions of the original member colors. They dissolve slowly if the user doesn't interact. Pinching one expands it to show the recap card from the original visit.

**Purpose:** Overlays memory onto physical space in the exact locations where moments happened. A farmer's market stall you pinned six months ago reappears as a ghost at that actual stall — history embedded in place.

---

## [**UX Map: Typical Session Flow**](https://www.figma.com/board/djVApicM4TGccS5BLcJhsp/Untitled?node-id=1-63&t=4PnxBD3T5FfnQ12B-4)

[https://www.figma.com/board/djVApicM4TGccS5BLcJhsp/Untitled?node-id=1-63\&t=4PnxBD3T5FfnQ12B-4](https://www.figma.com/board/djVApicM4TGccS5BLcJhsp/Untitled?node-id=1-63&t=4PnxBD3T5FfnQ12B-4)

Steps 4–6 (the exploration phase) should feel like the app disappears. Users should be fully present in the physical space, with Flâneur operating as a light ambient layer.

| \# | Phase | What Happens |
| :---- | :---- | :---- |
| 1 | **Launch & Pair** | User opens Flâneur. A pairing code / QR is displayed. Group members tap to join. Each user is assigned a color. Session begins when host confirms. |
| 2 | **Compass Wake** | The AR layer activates. Peripheral Compass arcs appear at screen edges indicating where each group member is. The physical space ahead is clear — no visual clutter yet. |
| 3 | **Ghost Reveal** *(later, return visit)* | If a Custom Location is recognized, faint ghost pins from prior sessions materialize briefly. User can brush-gesture to explore them or ignore them and walk. |
| 4 | **Exploration — Pinning** | Users explore independently. When something catches their eye, they pinch to drop a pin. Their pin floats above the object in their color, visible to the full group. |
| 4b | **Navigation — Guide me here (MVP)** | User taps a pin row in the sidebar. Their compass retargets to that pin; the needle label shows a **possessive** pin label (e.g. “Jessica’s pin”). Everyone sees **persistent** status on **Navigation/Text** (who is navigating where). **Navigate** matches the shared target; **Reset** returns the user to peer-relative compass. Short toasts / SFX can reinforce remote activity without replacing the nav line. |
| 5 | **Exploration — Reacting** *(later)* | Group members see each other's pins floating in world space. Looking at a pin surfaces the 3-option reaction radial. Users react without speaking or stopping. |
| 6 | **Meet Here** *(later)* | When the group wants to regroup, any member drops a Meet Here beacon on the ground. All Compass indicators immediately pivot to point toward it. Members converge. |
| 7 | **Session End** *(later)* | One user (or the group together) triggers End Session via a simple menu. Flâneur signals all devices that the session is closing. |
| 8 | **Recap Generation** *(later)* | The Recap collage assembles automatically: pins clustered by color, most-reacted items enlarged, arranged as a floating spatial collage. All users see the same view. |
| 9 | **Save & Share** *(later)* | The Recap is saved to the group's shared history in Snap Cloud. Users can optionally share a screenshot export. Ghost pins will appear on the group's next return visit to this location. |
