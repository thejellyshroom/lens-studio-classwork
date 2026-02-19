# Spawn Object Button — Step-by-Step Implementation

This guide walks you through setting up the "Spawn Object" button in Lens Studio so users can place objects in the world **while creating their path** (during the path-building phase).

---

## What Was Implemented (Code)

1. **UI.ts** — New event `spawnObjectClicked` and handler `onSpawnObjectButton()` so a button can trigger spawns.
2. **BuildingPathState.ts** — Subscribes to the spawn event, instantiates the prefab at the player’s ground position (with optional forward offset), and cleans up spawned objects on Reset.
3. **PathMaker.ts** — New inputs: `pfbSpawnObject` (Object Prefab to spawn) and `spawnOffsetInFront` (distance in front of the user in cm). These are passed into the building state.

---

## Step-by-Step: Lens Studio Editor Setup

### Step 1: Create or Choose the Object to Spawn

1. Create a 3D object (or use an existing prefab) that you want users to place (e.g. marker, cone, flag).
2. In the **Assets** panel, turn it into a **Prefab**:
   - Drag the scene object from the **Scene** hierarchy into the **Assets** panel, **or**
   - Right‑click the object → **Create Prefab from Object**.
3. Name the prefab (e.g. `SpawnableMarker`). You will assign this to the PathMaker script.

---

### Step 2: Add a Button to the “During Path Creation” UI

1. In the **Scene** hierarchy, locate the **During Path Creation** UI.
   - It’s the UI that appears when the user is walking and building the path (same panel that has **Finish** and **Reset**).
2. Under that UI object, add a new **Button** (or duplicate an existing button):
   - Right‑click the During Path Creation UI → **Add New** → **Button** (or use your Spectacles UI kit’s button if applicable).
3. Position and style the button (e.g. label “Place Object” or “Spawn”).
4. Remember this button’s **Scene Object** name; you will wire its tap to the UI script in the next step.

---

### Step 3: Wire the Button to the UI Script

1. Select the **UI** component in the scene (the one that has the **UI** script with `onCreatePathButton`, `onFinishCreatePathButton`, etc.).
2. In the **Inspector**, find the **Script** component and its **Behavior** / **Callback** list (where you see `onCreatePathButton`, `onFinishCreatePathButton`, `onResetCreatePathButton`).
3. Add a new callback entry:
   - Set the **Callback** (or **Behavior**) to: **`onSpawnObjectButton`** (must match the method name in `UI.ts`).
   - Set the **Target** to the **Scene Object** that has the **Interaction Component** (or tap target) for your new button.
   - If your setup uses “Tap” or “Click” behaviors that call a script method by name, configure the button’s interaction to call **`onSpawnObjectButton`** on the same **UI** script component.

   **Note:** Exact steps depend on your Spectacles UI / Interaction Kit:
   - If you use **Script Component** behaviors: add a behavior that invokes **`onSpawnObjectButton`** when the button is tapped.
   - If you use **Interaction Component** and a central router: route the button’s `onTap` to the UI script and call `onSpawnObjectButton` from there.

4. Save the scene. When the user taps the new button during path creation, `onSpawnObjectButton()` will run and fire `spawnObjectClicked`, which BuildingPathState uses to spawn the object.

---

### Step 4: Assign the Spawn Prefab and Offset to PathMaker

1. In the **Scene** hierarchy, select the object that has the **PathMaker** script (e.g. the main path/lens controller object).
2. In the **Inspector**, find the **PathMaker** script component.
3. Set the new inputs:
   - **Pfb Spawn Object:** Drag your spawnable prefab from the Assets panel (e.g. `SpawnableMarker`) into this field. If you leave it empty, the spawn button will do nothing (no errors).
   - **Spawn Offset In Front:** Enter a value in **centimeters** (Lens Studio units). Example: **80** = spawn 80 cm in front of the user. Adjust to place objects where you want (e.g. 0 for at feet, 100–200 for further ahead).

4. Save the scene.

---

### Step 5: Test the Flow

1. **Preview** or build the lens and put on Spectacles (or use preview device).
2. Complete the tutorial until you can start a path (tap “Create Path”).
3. Place the **Start** line, then walk to start building the path.
4. When the “During Path Creation” UI appears (Finish / Reset), your new **Spawn** button should also be visible.
5. Tap **Spawn** (or “Place Object”):
   - An instance of your prefab should appear in the world in front of you (at `spawnOffsetInFront` cm).
6. Tap again to place more instances.
7. Tap **Reset**:
   - The path and **all spawned objects** should be removed (start line and spawns are cleared).
8. Finish a path (sprint or loop) and confirm that spawned objects remain in the scene as intended (they are only cleared on Reset during path building).

---

## Optional: Spawn at Feet (No Forward Offset)

- Set **Spawn Offset In Front** to **0** on the PathMaker component. Objects will spawn at the user’s current ground position (no forward offset).

---

## Optional: Change Spawn Rotation

- In **BuildingPathState.ts**, method **`spawnObjectInSpace()`**, the rotation is set to `quat.lookAt(flatForward, vec3.up())` so the object faces the same direction as the user. You can replace this with a fixed rotation or align to path direction if you add path data to the spawn logic.

---

## Summary Checklist

- [ ] Prefab created for the object to spawn.
- [ ] Button added to the During Path Creation UI.
- [ ] Button tap wired to **`onSpawnObjectButton`** on the UI script.
- [ ] **PathMaker** has **Pfb Spawn Object** assigned and **Spawn Offset In Front** set.
- [ ] Tested: spawn during path build, multiple spawns, and Reset clears spawns.

After these steps, the spawn-object feature is fully implemented and ready to use.
