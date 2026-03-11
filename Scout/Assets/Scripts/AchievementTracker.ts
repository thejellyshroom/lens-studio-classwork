/**
 * Tracks "time since path started" and unlocks achievements (e.g. Touch Grass at 10s).
 * Call pathStarted() when BuildingPathState starts, pathEnded() when it stops.
 */
@component
export class AchievementTracker extends BaseScriptComponent {
  /** When true, all achievements are unlocked from the start (for demos). */
  @input
  unlockAllOnStart: boolean = true

  private pathElapsedSeconds: number = 0
  private unlockedIds: Set<string> = new Set()
  private updateEvent: SceneEvent | undefined

  private static readonly TOUCH_GRASS_SECONDS = 10
  private static readonly TOUCH_GRASS_ID = "touch_grass"

  onAwake() {
    if (this.unlockAllOnStart) {
      this.unlockedIds.add(AchievementTracker.TOUCH_GRASS_ID)
    }
  }

  pathStarted() {
    this.pathElapsedSeconds = 0
    this.updateEvent = this.createEvent("UpdateEvent")
    this.updateEvent.bind(() => this.onUpdate())
  }

  pathEnded() {
    if (this.updateEvent) {
      this.removeEvent(this.updateEvent)
      this.updateEvent = undefined
    }
  }

  private onUpdate() {
    this.pathElapsedSeconds += getDeltaTime()
    if (this.pathElapsedSeconds >= AchievementTracker.TOUCH_GRASS_SECONDS) {
      this.unlockedIds.add(AchievementTracker.TOUCH_GRASS_ID)
    }
  }

  isUnlocked(achievementId: string): boolean {
    return this.unlockedIds.has(achievementId)
  }

  getUnlockedAchievements(): string[] {
    return Array.from(this.unlockedIds)
  }
}
