# Horizontal Hiking Dashboard — Integration with Scout

Use this after the menu buttons work in the dashboard prefab. Goal: **warning tutorial → dashboard** (skip home); **Start** = start pathmaking; **End** = go home; timer runs when started.

---

## 1. Add the dashboard to the scene

- Drag **Horizontal Hiking Dashboard** prefab from the Asset Library into your scene (or it may already be there).
- The root object of that prefab is the **dashboard root** (e.g. "Horizontal Hiking Dashboard"). You will wire this to LensInitializer.

---

## 2. Replace DashboardJava with HikingDashboard

- In the dashboard hierarchy, find the object that has the **DashboardJava** (JavaScript) component.
- **Remove** the DashboardJava component.
- **Add Component** → Scripts → **HikingDashboard** (from `Assets/Scripts/HikingDashboard.ts`).
- In the HikingDashboard Inspector:
  - **Elapsed Text** → drag the Text object that should show the timer (e.g. "0:00:00").
  - **Distance Text** → the Text that should show path distance (e.g. "0.0'" while building). Optionally: **Pace Text**, **Alt Text** (not required for basic timer).
- To drive that distance from the path: on the **PathMaker** component, set **Path Dist Text Dashboard** to the same Text object you assigned to HikingDashboard’s **Distance Text**. Path distance will update there instead of (or in addition to) the old during-path UI.

---

## 3. Wire the Menu Controller (dashboard)

- Select the object that has the **Menu Controller** script (e.g. "Menu Controller" in the dashboard).
- In the Inspector, set:
  - **Menu Toggle Group** → the Scene Object that is the full menu panel (the one that slides in/out).
  - **Menu Button** → the **RectangleButton component** on the menu button (not the Scene Object).
  - **Close Button** → the **RectangleButton component** on the X/close button.
  - **Start Button** → the **RectangleButton component** on the Start button.
  - **Pause Button** → the **RectangleButton component** on the Pause button.
  - **End Button** → the **RectangleButton component** on the End button.
  - **Dashboard Script** → the **HikingDashboard** component you added in step 2.

(Optional later: **Scout Ui** → your main Scout UI component; **Artifact 1/2/3 Button** → the three artifact RectangleButtons. Each button: select that artifact → record → place (cancel as before). On **PathMaker** (Inspector) set **Pfb Artifact 1**, **Pfb Artifact 2**, **Pfb Artifact 3** to the three artifact prefabs so each menu button places the correct one. Optional: if you want “place artifact” from the menu.)

---

## 4. Wire LensInitializer for dashboard flow

- Select the object that has the **LensInitializer** script.
- In the Inspector, set:
  - **Dashboard Root** → the **root Scene Object** of the Horizontal Hiking Dashboard (the top-level object of the prefab instance).
  - **Hiking Dashboard** → the same **HikingDashboard** component you used in steps 2 and 3.

When both **Dashboard Root** and **Hiking Dashboard** are set, the flow after the warning tutorial becomes: **show dashboard**. If either is left empty, the lens just hides the UI after the tutorial.

---

## 4b. Wire the warning tutorial “OK” / dismiss button

So the warning goes **directly to the dashboard** when the user taps OK:

- On the **warning tutorial** panel, select the **OK** (or dismiss) button — the one that uses **Custom Pinch Button** (or any button component that lets you set a script callback).
- In the Inspector, set the button’s **script callback** to:
  - **Script / Component:** the **UI** component (Scout’s main UI script).
  - **Method / Function:** **onProgressTutorial**

That method hides the warning and completes the tutorial; the lens then shows the dashboard (if Dashboard Root + Hiking Dashboard are set).

---

## 5. Make the dashboard follow the camera (world-space billboard)

- Add the **DashboardFollow** script to the **dashboard root** (the same object you set as **Dashboard Root** on LensInitializer).
- In the Inspector, set:
  - **Main Camera** → the scene’s **Camera** component (the same camera used for the lens), not a Scene Object. This keeps the follow in world space with billboarding, like other UI in the project.
  - **Distance** → how far in front of the camera the dashboard sits (default 80).

The script sets world position and world rotation every frame so the panel stays in front of the user and always faces them (billboard). The dashboard root should **not** use a Screen Transform for this to work correctly.

**Letting the user move the dashboard:** The script exposes **startDragging()** and **finishDragging()**. While the user is dragging the Frame, the follow does not overwrite position; when they release, their offset is kept so the panel follows from the new spot. If the dashboard uses the SpectaclesInteractionKit **Frame** with **Use Follow Behavior** enabled, the Frame may call these on the follow component automatically. If not, wire the Frame’s “on translate start” (or drag start) to **DashboardFollow.startDragging** and “on translate end” (or drag end) to **DashboardFollow.finishDragging** on the dashboard root.

---

## 6. Flow summary

| Step | What happens |
|------|----------------|
| Lens starts | Tutorial (warning) runs. |
| Tutorial complete | If Dashboard Root + Hiking Dashboard are set → **dashboard** is shown. Else → UI is hidden. |
| User taps **Menu** | Menu panel toggles (show/hide). |
| User taps **Start** (in menu) | Timer starts; **pathmaking** starts (place start line, build path, place artifacts, etc.). |
| User taps **Pause** | Timer pauses. |
| User taps **End** (in menu) | Path state stops; **dashboard** is shown again. |
| User taps **Close** (X) | Menu panel closes (dashboard stays). |


---

## 7. Troubleshooting

- **Timer doesn’t start** → Ensure **Dashboard Script** on Menu Controller points to the **HikingDashboard** component, and that HikingDashboard has **Elapsed Text** assigned.
- **Start doesn’t start path** → Ensure **LensInitializer** has **Hiking Dashboard** assigned (same component as on the dashboard).
- **After tutorial I don't see the dashboard** → Ensure both **Dashboard Root** and **Hiking Dashboard** are set on LensInitializer.
- **Dashboard never appears** → Ensure **Dashboard Root** is the correct root object of the dashboard prefab instance and that it’s **enabled** in the hierarchy (script enables it when entering dashboard state).
