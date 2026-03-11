/**
 * Pre-placed demo artifact with a pre-recorded audio clip.
 *
 * Setup:
 *  1. Place your artifact prefab instance in the scene wherever you want it.
 *  2. Add this script (DemoArtifact) to the artifact root (or a child).
 *  3. Add an AudioComponent to the same object, assign your audio asset to it,
 *     and uncheck "Play Automatically".
 *  4. Set the audioComponent input on this script to that AudioComponent.
 *  5. The artifact must have an Interactable somewhere in its hierarchy
 *     (same as the normal artifact flow). Tapping it plays the audio clip.
 *
 * No MicrophoneRecorder or ArtifactRecording needed for demo artifacts.
 */
@component
export class DemoArtifact extends BaseScriptComponent {
  @input
  audioComponent: AudioComponent

  private subscribed = false

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.init())
  }

  private init() {
    if (this.subscribed) return
    const interactables = this.findInteractables(this.sceneObject, 0, 10)
    if (interactables.length === 0) return
    this.subscribed = true
    for (const interactable of interactables) {
      if (typeof interactable.onTriggerStart !== "undefined") {
        interactable.onTriggerStart.add(() => this.play())
      }
    }
  }

  private play() {
    if (!this.audioComponent) return
    this.audioComponent.stop(false)
    this.audioComponent.play(1)
  }

  private findInteractables(so: SceneObject, depth: number, maxDepth: number): any[] {
    const out: any[] = []
    if (depth > maxDepth) return out
    const soAny = so as any
    if (typeof soAny.getAllComponents === "function") {
      const components = soAny.getAllComponents()
      for (let i = 0; i < components.length; i++) {
        if (components[i] && typeof components[i].onTriggerStart !== "undefined") {
          out.push(components[i])
        }
      }
    }
    for (let i = 0; i < so.getChildrenCount(); i++) {
      const children = this.findInteractables(so.getChild(i), depth + 1, maxDepth)
      for (const c of children) out.push(c)
    }
    return out
  }
}
