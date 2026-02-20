# Voice Recording for Artifacts — Setup Instructions

Flow: **Place artifact** → **Microphone package UI** (record with package’s Record/Playback) → tap **Done** → **Confirm** / **Re-record** / **Cancel** → recording is linked to the artifact. **Pinch/trigger** the artifact to play.

---

## What Was Implemented

1. **Microphone.lspkg** is used as-is: its **MicrophoneRecorder** UI (Record + Playback buttons with ActivateMicrophoneRecorder and PlaybackMicrophoneRecorder) handles recording. We only show/hide that UI and then show our **Confirm / Re-record / Cancel** panel.

2. **UI.ts**
   - **recordVoicePackageUI** (optional): the **Microphone package UI** Scene Object (the one with Record and Playback). We show it when the user taps Place artifact.
   - **recordVoiceConfirmUI** (optional): your panel with **Confirm**, **Re-record**, **Cancel** (and optionally a **Done** button – see below).
   - Methods: `showRecordVoicePackageUI()`, `showRecordVoiceConfirm()`, `hideRecordVoicePackageUI()`, `hideRecordVoice()`.
   - Button handlers: **`onRecordVoiceDoneButton`** (shows the Confirm panel after they’ve recorded – wire a “Done” button to this), **`onRecordVoiceConfirmButton`**, **`onRecordVoiceRerecordButton`**, **`onRecordVoiceCancelButton`**.

3. **BuildingPathState**
   - On **Place artifact**: if microphone recorder and **recordVoicePackageUI** are set, shows the **Microphone package UI** only (no custom record prompt). User records with the package’s Record/Stop and Playback. When they tap **Done** (your button → `onRecordVoiceDoneButton`), the **Confirm** panel (Confirm / Re-record / Cancel) is shown.
   - **Confirm**: places artifact, attaches current recording, hides package UI and confirm panel.
   - **Re-record**: hides confirm panel, shows package UI again.
   - **Cancel**: no artifact, hide both UIs.

4. **PathMaker**
   - Optional input: **microphoneRecorder** (the **MicrophoneRecorder** component from the package).

---

## Step-by-Step Setup in Lens Studio

### 1. Microphone.lspkg in the scene

- Add or instantiate the **Microphone** package content in your scene (e.g. the **SceneHierarchy** prefab from `Microphone.lspkg`).
- Select the **Scene Object** that has the **MicrophoneRecorder** script (in the package prefab it’s the one named **MicrophoneRecorder**).
- On the **MicrophoneRecorder** component, assign the two **Audio Track Asset** inputs (these are **assets** from the package, not scripts or “Audio Component”):

  | Input on MicrophoneRecorder | What to assign |
  |-----------------------------|----------------|
  | **Microphone Asset**        | The package’s **microphone** audio track asset. In the package it’s under `MicrophoneAssets` and appears as **Microphone** or **Microphone.micaudio** (the one that provides the mic input). |
  | **Audio Output**            | The package’s **playback** audio track asset. In the package it’s under `MicrophoneAssets` and the **file** is named **AudioOutput.audioOutput** – in the Asset panel it may show as **AudioOutput** or similar. This is used to play back the recorded audio. |

- **Not** the same as: “Interactible Audio Feedback” (script) or a generic “Audio Component” (the script creates its own AudioComponent at runtime). You only need to assign the two **Audio Track Assets** above. If your scene already has the Microphone prefab from the package, those two slots may already be filled; if you added only the **MicrophoneRecorder** script to your own object, drag **Microphone.micaudio** into **Microphone Asset** and **AudioOutput.audioOutput** into **Audio Output** from the `Assets/Microphone.lspkg/MicrophoneAssets/` folder.

### 2. Assign MicrophoneRecorder to PathMaker

- Select the object that has the **PathMaker** script.
- In the Inspector, set **Microphone Recorder** to the **MicrophoneRecorder** component from step 1.

### 3. Use the Microphone package UI

- Add the **Microphone** package’s UI to your scene (e.g. the **MicrophoneRecorderUI** or the prefab that contains the Record and Playback buttons with **ActivateMicrophoneRecorder** and **PlaybackMicrophoneRecorder** scripts). Do **not** wire our code to their Record/Stop – the package handles that.
- Assign that **Microphone recorder UI** Scene Object to the **UI** component’s **Record Voice Package UI** input. Our code will show/hide it when entering or leaving the artifact placement flow.

### 4. Your Confirm / Cancel UI

- Your panel with **Confirm**, **Re-record**, **Cancel** (the one you implemented manually):
  - **Confirm** → **`onRecordVoiceConfirmButton`** (place artifact with current recording).
  - **Re-record** → **`onRecordVoiceRerecordButton`** (hide confirm panel, show package UI again to record again).
  - **Cancel** → **`onRecordVoiceCancelButton`** (cancel placement).
- Add a **Done** button (on this panel or next to the package UI): when the user has finished recording with the package’s Record/Playback, they tap **Done** → wire it to **`onRecordVoiceDoneButton`** so the Confirm panel is shown (Confirm / Re-record / Cancel).
- Assign this panel’s **Scene Object** to the **UI** component’s **Record Voice Confirm UI** input.

### 5. Artifact prefab: ArtifactRecording + Interactable

Your spawnable artifact prefab (assigned to **PathMaker → Pfb Spawn Object**) must use **SpectaclesInteractionKit**’s **Interactable** (e.g. manipulation prefab with **Interactable**, **InteractableManipulation**, **InteractableOutlineFeedback**, **InteractableAudioFeedback**).

- Attach **ArtifactRecording** to the **same** scene object that has **Interactable** (or a child/parent of it).
- **ArtifactRecording** subscribes to **Interactable.onTriggerStart** — when the user pinches/triggers the artifact, that artifact’s recording plays.
- Example: **Artifact (root)** with components: **ArtifactRecording**, **Interactable**, **InteractableManipulation**, **Render Mesh Visual**, etc. All on one object is fine.

When the user taps **Confirm**, the code sets the recording frames on **ArtifactRecording** and passes the **MicrophoneRecorder** reference. Pinch/trigger on the artifact then plays that artifact’s recording via `microphoneRecorder.playRecordedFrames(this.getFrames())`.

### 6. Replaying the recording (pinch/trigger-to-play)

- Pinch or **trigger** the artifact (same gesture you use to grab/manipulate it). **ArtifactRecording** listens to **Interactable.onTriggerStart**.
- Playback uses the **same** **MicrophoneRecorder** and its **Audio Output** as the package’s Playback button. If you don’t hear the artifact:
  1. Confirm the package **Playback** button (in the record UI) plays sound — if that’s silent, fix **MicrophoneRecorder**’s **Microphone Asset** and **Audio Output** (step 1) first.
  2. Ensure **ArtifactRecording** and **Interactable** are on the same scene object or in the same hierarchy (parent/child).
  3. Ensure **PathMaker → Microphone Recorder** is set so the artifact receives the recorder reference when placed.
  4. Check the **Logger** in Lens Studio for `[ArtifactRecording]` debug lines (set `ArtifactRecording.DEBUG = true` in code to enable).

---

## Flow Summary

| User action       | Result |
|-------------------|--------|
| Tap **Place artifact** | Microphone package UI is shown (Record + Playback). Confirm panel is hidden. |
| Use package UI    | Record with package’s Record button, stop, optionally play back. |
| Tap **Done**      | Confirm panel is shown (Confirm / Re-record / Cancel). |
| Tap **Confirm**   | Artifact is placed with the recording attached; both UIs hide. |
| Tap **Re-record** | Confirm panel hides; Microphone package UI is shown again. |
| Tap **Cancel**    | No artifact placed; both UIs hide. |
| **Pinch / trigger** artifact | Plays that artifact’s recording (**ArtifactRecording** + **Interactable**). |

If **Microphone Recorder** or **Record Voice Package UI** is not set, tapping **Place artifact** spawns an artifact immediately with no recording (previous behavior).
