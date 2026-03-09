/**
 * Dashboard timer for hiking flow. Replaces DashboardJava.js.
 * startHike() = start timer + fire hikeStarted (wire to pathMaker.start).
 * pauseHike() / endHike() = pause timer / end and fire hikeEnded (wire to go home).
 */
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

@component
export class HikingDashboard extends BaseScriptComponent {
  @input
  @allowUndefined
  elapsedText: Text

  @input
  @allowUndefined
  paceText: Text

  @input
  @allowUndefined
  distanceText: Text

  @input
  @allowUndefined
  altText: Text

  get hikeStarted() {
    return this.hikeStartedEvent.publicApi()
  }

  get hikeEnded() {
    return this.hikeEndedEvent.publicApi()
  }

  private hikeStartedEvent: Event = new Event()
  private hikeEndedEvent: Event = new Event()

  private isRunning = false
  private isPaused = false
  private startTimeMs: number = 0
  private pausedElapsedMs: number = 0
  private updateEvent: SceneEvent | null = null

  onAwake() {
    this.updateEvent = this.createEvent("UpdateEvent")
    this.updateEvent.bind(() => this.onUpdate())
    this.updateEvent.enabled = false
  }

  startHike() {
    if (this.isRunning && !this.isPaused) return
    if (!this.isRunning) {
      this.startTimeMs = Date.now()
      this.pausedElapsedMs = 0
    }
    this.isRunning = true
    this.isPaused = false
    this.updateEvent.enabled = true
    this.hikeStartedEvent.invoke()
    this.refreshElapsedText()
  }

  pauseHike() {
    if (!this.isRunning) return
    this.isPaused = true
    this.pausedElapsedMs = this.getElapsedMs()
    this.updateEvent.enabled = false
    this.refreshElapsedText()
  }

  endHike() {
    this.isRunning = false
    this.isPaused = false
    this.updateEvent.enabled = false
    this.hikeEndedEvent.invoke()
    this.refreshElapsedText()
  }

  private getElapsedMs(): number {
    if (!this.isRunning) return this.pausedElapsedMs
    if (this.isPaused) return this.pausedElapsedMs
    return this.pausedElapsedMs + (Date.now() - this.startTimeMs)
  }

  private onUpdate() {
    this.refreshElapsedText()
  }

  private refreshElapsedText() {
    if (!this.elapsedText) return
    const totalSeconds = Math.floor(this.getElapsedMs() / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const mm = minutes < 10 ? "0" + minutes : "" + minutes
    const ss = seconds < 10 ? "0" + seconds : "" + seconds
    this.elapsedText.text = hours + ":" + mm + ":" + ss
  }
}
