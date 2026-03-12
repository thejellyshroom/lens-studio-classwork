export namespace Conversions {
  export function cmToFeet(cm: number) {
    return cm / 30.48
  }

  export function feetToMile(ft: number) {
    return ft / 5280
  }

  export function pointsToDist(points: vec3[]) {
    let dist = 0
    for (let i = 0; i < points.length - 1; i++) {
      dist += points[i].sub(points[i + 1]).length
    }
    return dist
  }

  export function secToMin(seconds: number) {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return {min, sec}
  }

  export function secToHr(sec: number) {
    return sec / 3600
  }

  export function ftPerSecToMPH(paceFtPerSec: number) {
    return (paceFtPerSec * 3600) / 5280
  }

  export function cmPerSecToMPH(paceCmPerSec: number) {
    return (paceCmPerSec * 3600) / (30.48 * 5280)
  }

  /** cm/s → min/mi (returns Infinity if pace is 0, i.e. standing still). */
  export function cmPerSecToMinPerMile(paceCmPerSec: number): number {
    if (paceCmPerSec <= 0) return Infinity
    const mph = cmPerSecToMPH(paceCmPerSec)
    if (mph <= 0) return Infinity
    return 60 / mph
  }
}
