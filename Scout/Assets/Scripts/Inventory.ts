/**
 * Holds collected achievement artifacts. Add when user collects in world; take when placing from inventory.
 */
@component
export class Inventory extends BaseScriptComponent {
  private counts: Map<string, number> = new Map()

  addCollected(achievementId: string) {
    const n = this.counts.get(achievementId) || 0
    this.counts.set(achievementId, n + 1)
  }

  takeOne(achievementId: string): boolean {
    const n = this.counts.get(achievementId) || 0
    if (n <= 0) return false
    if (n === 1) {
      this.counts.delete(achievementId)
    } else {
      this.counts.set(achievementId, n - 1)
    }
    return true
  }

  hasAny(): boolean {
    return this.counts.size > 0
  }

  getEntries(): { achievementId: string; count: number }[] {
    const out: { achievementId: string; count: number }[] = []
    this.counts.forEach((count, achievementId) => {
      out.push({ achievementId, count })
    })
    return out
  }
}
