import type {AudioFrameData} from "Microphone.lspkg/Scripts/MicrophoneRecorder"

/**
 * Attach to a spawned artifact scene object to store its linked voice recording.
 * Play trigger: pinch/trigger the artifact (Interactable.onTriggerStart).
 * Requires setMicrophoneRecorder() to be called (e.g. by BuildingPathState when placing the artifact).
 */
@component
export class ArtifactRecording extends BaseScriptComponent {
  private frames: AudioFrameData[] = []
  private microphoneRecorder: any = null
  private playSubscribed: boolean = false

  private static readonly DEBUG = true

  private debug(msg: string) {
    if (ArtifactRecording.DEBUG) print("[ArtifactRecording] " + msg)
  }

  setFrames(frames: AudioFrameData[]) {
    this.frames = frames
    this.debug("setFrames: " + (frames ? frames.length : 0) + " frames")
  }

  getFrames(): AudioFrameData[] {
    return this.frames
  }

  hasRecording(): boolean {
    return this.frames.length > 0
  }

  setMicrophoneRecorder(recorder: any) {
    this.microphoneRecorder = recorder
    this.debug("setMicrophoneRecorder: " + (recorder ? "set" : "null"))
    this.trySubscribeToPlayTrigger()
  }

  private playRecording() {
    this.debug("playRecording called, hasRecorder=" + !!this.microphoneRecorder + " hasRecording=" + this.hasRecording() + " frameCount=" + this.frames.length)
    if (!this.microphoneRecorder) {
      this.debug("playRecording: no microphoneRecorder, skipping")
      return
    }
    if (!this.hasRecording()) {
      this.debug("playRecording: no recording frames, skipping")
      return
    }
    const ok = this.microphoneRecorder.playRecordedFrames(this.getFrames())
    this.debug("playRecording: playRecordedFrames returned " + ok)
  }

  private trySubscribeToPlayTrigger() {
    this.debug("trySubscribeToPlayTrigger: recorder=" + !!this.microphoneRecorder + " playSubscribed=" + this.playSubscribed)
    if (!this.microphoneRecorder || this.playSubscribed) return
    const so = this.sceneObject as any
    const interactable = this.getInteractable(so)
    if (!interactable) {
      this.debug("trySubscribeToPlayTrigger: no Interactable found on this object or hierarchy")
      return
    }
    if (typeof (interactable as any).onTriggerStart === "undefined") {
      this.debug("trySubscribeToPlayTrigger: Interactable has no onTriggerStart")
      return
    }
    this.playSubscribed = true
    ;(interactable as any).onTriggerStart.add(() => this.playRecording())
    this.debug("trySubscribeToPlayTrigger: subscribed to Interactable.onTriggerStart")
  }

  /** SpectaclesInteractionKit Interactable (same object or hierarchy). Tries type name first, then duck-type (onTriggerStart). */
  private getInteractable(so: any): any {
    const byName = this.getInteractableByTypeName(so)
    if (byName) return byName
    return this.getInteractableByDuckType(so, 0, 10)
  }

  private getInteractableByTypeName(so: any): any {
    const names = ["Interactable", "Script.Interactable", "SpectaclesInteractionKit.lspkg/Interactable"]
    for (const name of names) {
      let comp = so.getComponent(name)
      if (comp) {
        this.debug("getInteractable: found by name '" + name + "' on self")
        return comp
      }
      if (typeof so.getComponentInDescendants === "function") {
        comp = so.getComponentInDescendants(name, true, true, 10)
        if (comp) {
          this.debug("getInteractable: found by name in descendants")
          return comp
        }
      }
      if (typeof so.getComponentInAncestors === "function") {
        comp = so.getComponentInAncestors(name, true, true, 5)
        if (comp) {
          this.debug("getInteractable: found by name in ancestors")
          return comp
        }
      }
      if (so.hasParent && so.hasParent()) {
        comp = so.getParent().getComponent(name)
        if (comp) {
          this.debug("getInteractable: found by name on parent")
          return comp
        }
      }
    }
    return null
  }

  /** Find any component with onTriggerStart (Interactable interface) on this object or hierarchy. */
  private getInteractableByDuckType(so: any, depth: number, maxDepth: number): any {
    if (depth > maxDepth) return null
    if (typeof so.getAllComponents === "function") {
      const components = so.getAllComponents()
      for (let i = 0; i < components.length; i++) {
        const c = components[i]
        if (c && typeof (c as any).onTriggerStart !== "undefined") {
          this.debug("getInteractable: found by duck-type (onTriggerStart) at depth " + depth)
          return c
        }
      }
    }
    const count = so.getChildrenCount ? so.getChildrenCount() : 0
    for (let i = 0; i < count; i++) {
      const child = so.getChild(i)
      const found = this.getInteractableByDuckType(child, depth + 1, maxDepth)
      if (found) return found
    }
    if (so.hasParent && so.hasParent()) {
      const found = this.getInteractableByDuckType(so.getParent(), depth + 1, maxDepth)
      if (found) return found
    }
    return null
  }
}
