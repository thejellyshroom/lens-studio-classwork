# Achievement-Based Artifact Collection — Setup Instructions

Flow: **Time since path started** (10 s demo) unlocks **Touch Grass** → a collectible spawns ahead of the user → user walks to it (pass-through) to collect → item goes to **inventory** → user taps **Place from inventory** → same voice record + confirm flow → artifact placed with recording. **Sounds** play when a collectible appears and when collected. **UI** shows "Artifact nearby — X m" when within range.

---

## 1. Scripts added

- **AchievementTracker** – Tracks path elapsed time; unlocks `touch_grass` at 10 s. Call `pathStarted()` when BuildingPathState starts, `pathEnded()` when it stops.
- **Inventory** – Holds collected achievement IDs/counts. `addCollected(id)`, `takeOne(id)`, `hasAny()`, `getEntries()`.
- **BuildingPathState** – Spawns Touch Grass collectible when unlocked, proximity collection, nearby indicator, place-from-inventory flow (voice + place with achievement prefab).
- **PathMaker** – New optional inputs: `achievementTracker`, `inventory`, `pfbTouchGrassCollectible`, `soundController`.
- **UI** – `showCollectibleNearby(distanceCm, worldPosition)`, `hideCollectibleNearby()`, `placeFromInventoryClicked` event, `onPlaceFromInventoryButton()`, `showNoCollectedArtifacts()` (auto-hides after 1 s), `hideNoCollectedArtifacts()`.

---

## 2. Scene setup in Lens Studio

### 2.1 AchievementTracker and Inventory

1. Create or use a **persistent** scene object (e.g. "Managers" or same as LensInitializer).
2. Add **AchievementTracker** script component. No inputs (10 s is hardcoded for demo).
3. Add **Inventory** script component. No inputs.

### 2.2 PathMaker

1. Select the object with the **PathMaker** script.
2. In the Inspector, set:
   - **Achievement Tracker** → the AchievementTracker component from 2.1.
   - **Inventory** → the Inventory component from 2.1.
   - **Pfb Touch Grass Collectible** → the prefab to spawn as the Touch Grass collectible (can be the same as your Artifact prefab or a copy).
   - **Sound Controller** → (optional) the **SoundController** component in the scene.

### 2.3 SoundController (sounds for appear / collect)

1. Ensure **SoundController** is in the scene (singleton).
2. In its **Sound Events** array, add two entries:
   - **Key**: `collectible_appeared` — **Clip**: a short one-shot sound (e.g. chime) when a collectible spawns.
   - **Key**: `collectible_collected` — **Clip**: a short one-shot sound when the user collects by walking through.
3. Ensure **Auds** (AudioComponent pool) has at least one free slot for one-shots.

If SoundController is not in the scene, leave **PathMaker → Sound Controller** unset; spawn/collect will still work, but no sound.

### 2.4 Collectible nearby indicator (UI)

1. Create a **panel** (e.g. under your during-path UI) with:
   - A **Text** component for the message (e.g. "Artifact nearby — X m").
2. Assign that panel’s **Scene Object** to the **UI** component’s **Collectible Nearby UI** input.
3. Assign the **Text** to **UI**’s **Collectible Nearby Text** input (optional; if unset, the panel still shows/hides but text won’t update).
4. Position/style the panel as needed. The script shows it by setting local position and hides it by moving off-screen.

### 2.5 Place from inventory (single “Place artifact” button)

1. Use the **same** “Place artifact” button for both flows. Wire that button’s **On Tap** to the **UI** component’s **On Spawn Object Button** (no separate “Place from inventory” button required).
2. When the user has **at least one collected item**, tapping “Place artifact” starts the place-from-inventory flow: the first inventory entry is used (e.g. Touch Grass), then the same record-voice flow runs; after Confirm, the artifact is placed with the chosen achievement prefab. **Nothing is consumed from inventory** — counts stay the same.
3. When the user has **no collected items**, tapping “Place artifact” shows the **No Collected Artifacts** panel (see 2.6) instead of starting the place-artifact or voice flow.

### 2.6 No collected artifacts message (empty inventory)

1. Create a **panel** (e.g. under your during-path UI) with a **Text** component set to **"You have no collected artifacts yet"** (or similar).
2. Assign that panel’s **Scene Object** to the **UI** component’s **No Collected Artifacts UI** input.
3. The panel **auto-hides after 1 second**; no dismiss button is required.
4. If **No Collected Artifacts UI** is left unset, tapping “Place artifact” with empty inventory will fall back to the normal place-artifact flow (no message).

---

## 3. Flow summary

| Step | What happens |
|------|----------------|
| User starts path (BuildingPathState) | `achievementTracker.pathStarted()`; timer runs. |
| After 10 s | `touch_grass` unlocks; one Touch Grass collectible spawns ahead of the user; **collectible_appeared** sound plays. |
| User walks toward collectible | When within **500 cm** (configurable), UI shows "Artifact nearby — X m". |
| User walks into collectible (within **150 cm**) | Collectible is destroyed; **inventory.addCollected("touch_grass")**; **collectible_collected** sound plays. |
| User taps **Place artifact** | If inventory has at least one collected item: place-from-inventory flow (first entry) → record voice → place with **pfbTouchGrassCollectible**; **inventory is not consumed**. If inventory is empty and **No Collected Artifacts UI** is set: show “You have no collected artifacts yet” panel (no voice/place flow). If **No Collected Artifacts UI** is unset: normal place-artifact flow. |
| Path ends / reset | `achievementTracker.pathEnded()`; active collectibles destroyed; nearby indicator hidden. |

---

## 4. Constants (in code)

- **Touch Grass unlock**: 10 s in [AchievementTracker.ts](Assets/Scripts/AchievementTracker.ts) (`TOUCH_GRASS_SECONDS`).
- **Collect radius**: 150 cm in [BuildingPathState.ts](Assets/Scripts/PathMakerStates/BuildingPathState.ts) (`collectibleCollectRadiusCm`).
- **Nearby radius**: 500 cm (`collectibleNearbyRadiusCm`).
- **Spawn ahead**: Uses same math as manual "Place artifact" (spawn offset + 200 cm).

---

## 5. Optional: multiple achievement types

To add more achievements (e.g. another prefab and unlock rule):

1. In **AchievementTracker**, add another time-based or condition and `unlockedIds.add("another_id")`.
2. In **PathMaker**, add another prefab input (e.g. `pfbOtherCollectible`) or an array of `{ achievementId, prefab }`.
3. In **BuildingPathState**, extend `trySpawnTouchGrassCollectible` (or a generic `trySpawnCollectibles`) and the spawn/collect logic to handle the new id and prefab.
4. For **Place from inventory**, the UI currently uses the first entry from `inventory.getEntries()`; you can add a picker that lets the user choose which collected type to place and pass that `achievementId` (would require an event that carries a string or a different callback pattern).

Dashboard / persistence (e.g. CloudStorageModule) can be added later to persist unlocked achievements and inventory across sessions.
