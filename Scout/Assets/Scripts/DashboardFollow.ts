/**
 * World-space billboard follow (like SmoothFollow): keeps the dashboard in front of the
 * camera at a fixed distance, always facing the user. Uses Camera + world transform,
 * not screen space. Attach to the dashboard root and assign the main Camera.
 *
 * User repositioning: call startDragging() when the user begins dragging the frame,
 * and finishDragging() when they release. While dragging we don't overwrite position;
 * on release we store their offset so the panel follows from the new spot.
 */
@component
export class DashboardFollow extends BaseScriptComponent {
  @input
  mainCamera: Camera

  @input
  distance: number = 80

  private tr: Transform
  private camTr: Transform
  private initialRot: quat
  private dragging: boolean = false
  public userOffset: vec3 = new vec3(0, 8, 0)

  onAwake() {
    this.tr = this.sceneObject.getTransform()
    this.camTr = this.mainCamera.getTransform()
    this.initialRot = this.tr.getLocalRotation()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  /** Call when the user starts dragging the dashboard (e.g. from Frame’s grab). */
  startDragging() {
    this.dragging = true
  }

  /** Call when the user releases; we keep their offset so the panel follows from the new position. */
  finishDragging() {
    this.dragging = false
    const camPos = this.camTr.getWorldPosition()
    const camForward = this.camTr.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const defaultPos = camPos.add(camForward.uniformScale(this.distance))
    defaultPos.y = camPos.y
    this.userOffset = this.tr.getWorldPosition().sub(defaultPos)
  }

  private getDefaultFollowPos(): vec3 {
    const camPos = this.camTr.getWorldPosition()
    const camForward = this.camTr.getWorldTransform().multiplyDirection(new vec3(0, 0, -1))
    const pos = camPos.add(camForward.uniformScale(this.distance))
    pos.y = camPos.y
    return pos
  }

  private onUpdate() {
    if (this.dragging) return

    const defaultPos = this.getDefaultFollowPos()
    const pos = defaultPos.add(this.userOffset)
    this.tr.setWorldPosition(pos)
    const toCamera = this.camTr.getWorldPosition().sub(pos).normalize()
    this.tr.setWorldRotation(quat.lookAt(toCamera, vec3.up()).multiply(this.initialRot))
  }
}
