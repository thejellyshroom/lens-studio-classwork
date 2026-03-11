/**
 * Manages visibility of pre-placed demo ("community") artifacts.
 * Artifacts are hidden until BOTH conditions are met:
 *   1. A hike/path has started (hikeActive = true)
 *   2. The "Community Artifacts" toggle is ON (toggleOn = true)
 *
 * Setup:
 *  - Add this script to any object (e.g. the dashboard root or a manager object).
 *  - Drag all demo artifact root SceneObjects into the artifacts array.
 *  - Wire hikingDashboard so the manager can listen for hikeStarted / hikeEnded.
 *  - Wire a toggle button on the dashboard menu to call toggleCommunityArtifacts().
 */
import {HikingDashboard} from "./HikingDashboard"

@component
export class CommunityArtifactsManager extends BaseScriptComponent {
  @input
  artifacts: SceneObject[]

  @input
  hikingDashboard: HikingDashboard

  private hikeActive = false
  private toggleOn = true
  private hikeStartedRemover: (() => void) | undefined
  private hikeEndedRemover: (() => void) | undefined

  onAwake() {
    this.hideAll()
    this.hikeStartedRemover = this.hikingDashboard.hikeStarted.add(() => {
      this.hikeActive = true
      this.refresh()
    })
    this.hikeEndedRemover = this.hikingDashboard.hikeEnded.add(() => {
      this.hikeActive = false
      this.refresh()
    })
  }

  /** Call from a dashboard toggle button. Flips the community artifacts on/off. */
  toggleCommunityArtifacts() {
    this.toggleOn = !this.toggleOn
    this.refresh()
  }

  /** Explicitly set the toggle state (e.g. from a checkbox). */
  setCommunityArtifacts(on: boolean) {
    this.toggleOn = on
    this.refresh()
  }

  private refresh() {
    if (this.hikeActive && this.toggleOn) {
      this.showAll()
    } else {
      this.hideAll()
    }
  }

  private showAll() {
    if (!this.artifacts) return
    for (const so of this.artifacts) {
      if (so) so.enabled = true
    }
  }

  private hideAll() {
    if (!this.artifacts) return
    for (const so of this.artifacts) {
      if (so) so.enabled = false
    }
  }
}
