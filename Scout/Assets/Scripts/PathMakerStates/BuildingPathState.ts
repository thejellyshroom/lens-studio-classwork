import {Conversions} from "../Conversions"
import {EasingFunctions} from "../Helpers/EasingFunctions"
import {FinishSmoothPath} from "../Helpers/FinishSmoothPath"
import {GetVectorsFromQuaternion} from "../Helpers/GetVectorsFromQuaternion"
import {HermiteSpline} from "../Helpers/HermiteSpline"
import {LinearAlgebra} from "../Helpers/LinearAlgebra"
import {ResampleCurve} from "../Helpers/ResampleCurve"
import {LensInitializer} from "../LensInitializer"
import {LineController} from "../LineController"
import {PathBuilder} from "../PathBuilder"
import {PathmakingPlayerFeedback} from "../PathmakingPlayerFeedback"
import {LookAtFloorBehavior} from "../PathPrevewBehaviors/LookAtFloorBehavior"
import {PaintOnFloorBehavior} from "../PathPrevewBehaviors/PaintOnFloorBehavior"
import {PlayerPaceCalculator} from "../PlayerPaceCalculator"
import {UI} from "../UI"
import {ArtifactRecording} from "../ArtifactRecording"
import {AchievementTracker} from "../AchievementTracker"
import {Inventory} from "../Inventory"
import {IPathMakerState} from "./IPathMakerState"

export interface ActiveCollectible {
  achievementId: string
  sceneObject: SceneObject
  position: vec3
}

export class BuildingPathState implements IPathMakerState {
  constructor(
    protected ownerScript: ScriptComponent,
    protected cameraTransform: Transform,
    protected cameraOffsetTransform: Transform,
    protected pathRmv: RenderMeshVisual,
    protected pathDistanceText: Text,
    protected startPosition: vec3,
    protected startRotation: quat,
    protected startObject: SceneObject,
    protected ui: UI,
    protected paceCalculator: PlayerPaceCalculator,
    protected pathmakingPlayerFeedback: PathmakingPlayerFeedback,
    protected bigMoveDistanceThreshold: number,
    protected hermiteResolution: number,
    protected resampleResoluton: number,
    protected onFinishAsSprint: (
      startPosition: vec3,
      startRotation: quat,
      startObject: SceneObject,
      pathPoints: vec3[],
      lastVisualPoints: vec3[]
    ) => void,
    protected onFinishAsLoop: (
      startPosition: vec3,
      startRotation: quat,
      startObject: SceneObject,
      splinePoints: {position: vec3; rotation: quat}[]
    ) => void,
    protected pfbSpawnObject: ObjectPrefab | undefined,
    protected spawnOffsetInFront: number,
    protected microphoneRecorder: any,
    protected achievementTracker: AchievementTracker | undefined,
    protected inventory: Inventory | undefined,
    protected pfbTouchGrassCollectible: ObjectPrefab | undefined,
    protected soundController: any
  ) {
    this.startTransform = this.startObject.getTransform()
  }

  protected static readonly collectibleCollectRadiusCm = 150
  protected static readonly collectibleNearbyRadiusCm = 500
  protected static readonly collectibleSpawnAheadCm = 280
  protected static readonly TOUCH_GRASS_ID = "touch_grass"

  protected previewZOffset = 300
  protected static distanceToMakeLoopXZ = 200
  protected static distanceToMakeLoopY = 50
  protected startTransform: Transform

  // To clear on stop()
  protected finishClickedRemover: (() => void) | undefined
  protected loopClickedRemover: (() => void) | undefined
  protected resetClickedRemover: (() => void) | undefined
  protected spawnClickedRemover: (() => void) | undefined
  protected recordVoiceConfirmRemover: (() => void) | undefined
  protected recordVoiceRerecordRemover: (() => void) | undefined
  protected recordVoiceCancelRemover: (() => void) | undefined
  protected recordVoiceDoneRemover: (() => void) | undefined
  protected updateEvent: SceneEvent | undefined
  protected trailHeadTransform: Transform | undefined
  protected spawnedObjects: SceneObject[] = []
  protected pendingArtifact: {spawnPos: vec3; spawnRot: quat} | null = null
  /** Recording captured when user taps Done; used when they tap Confirm so each artifact gets the right copy. */
  protected pendingRecordingFrames: any[] | null = null
  protected activeCollectibles: ActiveCollectible[] = []
  protected touchGrassSpawnedThisPath = false
  protected placeFromInventoryRemover: (() => void) | undefined
  protected pendingPlaceFromInventoryAchievementId: string | null = null

  // To clear on start()
  protected prevCameraPositionForVisual: vec3 | undefined
  protected prevCameraPositionForPath: vec3 | undefined
  protected prevTrailHeadPos: vec3 | undefined
  protected prevTrailHeadRot: quat | undefined
  protected previewLookPoints: vec3[] = []
  protected paintPts: vec3[] = []
  protected lookPts: vec3[] = []
  protected previewPoints: vec3[] = []
  protected pathPoints: vec3[] = []
  protected pathLength: number = 0
  protected visualTargetCrossedStartLine = false
  protected cameraCrossedStartLine = false
  protected cameraMovedFromStartLine = false

  protected isUiShown: boolean = false
  protected isLoop: boolean = false

  protected paintPreview: PaintOnFloorBehavior
  protected lookPreview: LookAtFloorBehavior

  private smallMoveDistanceThreshold = 3

  start() {
    this.visualTargetCrossedStartLine = false
    this.prevCameraPositionForVisual = this.startPosition.uniformScale(1)
    this.prevCameraPositionForPath = LensInitializer.getInstance().getPlayerGroundPos()
    this.prevTrailHeadPos = undefined
    this.prevTrailHeadRot = undefined
    this.previewLookPoints = []
    this.paintPts = []
    this.lookPts = []
    this.previewPoints = []
    this.pathPoints = []
    this.pathLength = 0
    this.isLoop = false
    this.isUiShown = false
    const lineCtrl = this.startObject.getComponent(LineController.getTypeName())
    if (!lineCtrl) {
      throw new Error(`StartFinishLine cannot be found on object with name ${this.startObject.name}`)
    }
    lineCtrl.setRealVisual()
    this.ui.initLoopUi(this.startTransform)
    this.ui.showDuringPathCreationUi()
    this.isUiShown = true

    this.finishClickedRemover = this.ui.finishPathClicked.add(() => {
      this.onFinishAsSprint(
        this.startPosition,
        this.startRotation,
        this.startObject,
        this.pathPoints,
        this.previewPoints
      )
    })
    this.loopClickedRemover = this.ui.loopPathClicked.add(() => {
      const smoothPoints = FinishSmoothPath.finishSmoothPath(
        this.pathPoints,
        this.startTransform,
        this.cameraTransform,
        this.bigMoveDistanceThreshold,
        this.hermiteResolution,
        this.resampleResoluton
      )
      this.pathPoints = smoothPoints.pathPoints
      const splinePoints = smoothPoints.splinePoints

      this.pathRmv.enabled = false
      this.onFinishAsLoop(this.startPosition, this.startRotation, this.startObject, splinePoints)
    })

    this.addStartPointToPath()
    this.addStartPointToVisual()
    this.paintPreview = new PaintOnFloorBehavior(this.previewZOffset, this.cameraTransform)
    this.lookPreview = new LookAtFloorBehavior(this.previewZOffset, this.cameraTransform)
    this.paintPreview.start(this.displaceForward(this.prevCameraPositionForPath))
    this.lookPreview.start()
    this.paceCalculator.start(this.prevCameraPositionForPath)

    this.resetClickedRemover = this.ui.resetPathClicked.add(() => {
      this.reset()
    })

    if (this.pfbSpawnObject) {
      this.spawnClickedRemover = this.ui.spawnObjectClicked.add(() => {
        // Single "Place artifact" button: if user has inventory, place-from-inventory flow (voice then place, no consumption); else show message or normal place
        if (this.inventory && this.inventory.hasAny()) {
          const entries = this.inventory.getEntries()
          if (entries.length > 0) {
            this.onPlaceFromInventoryRequested(entries[0].achievementId)
            return
          }
        }
        if (this.inventory && typeof this.ui.showNoCollectedArtifacts === "function") {
          this.ui.showNoCollectedArtifacts()
          return
        }
        this.onSpawnObjectRequested()
      })
    }

    this.pathmakingPlayerFeedback.start([
      this.startPosition.add(this.startTransform.forward.uniformScale(50)),
      this.startPosition
    ])
    if (this.achievementTracker) {
      this.achievementTracker.pathStarted()
    }
    this.touchGrassSpawnedThisPath = false
    // Optional: separate "Place from inventory" button can still fire placeFromInventoryClicked;
    // the main "Place artifact" button (spawnObjectClicked) already handles both flows when inventory.hasAny()
    if (this.ui.placeFromInventoryClicked && this.inventory) {
      this.placeFromInventoryRemover = this.ui.placeFromInventoryClicked.add(() => {
        const entries = this.inventory.getEntries()
        if (entries.length > 0) this.onPlaceFromInventoryRequested(entries[0].achievementId)
      })
    }
    this.updateEvent = this.ownerScript.createEvent("UpdateEvent")
    this.updateEvent.bind(() => {
      this.onUpdate()
    })
  }

  reset() {
    this.pathRmv.enabled = false
    this.spawnedObjects.forEach((so) => so.destroy())
    this.spawnedObjects = []
    this.startObject.destroy()
    this.pathmakingPlayerFeedback.stop()
  }

  private static readonly spawnExtraForwardCm = 200

  private onSpawnObjectRequested() {
    if (!this.pfbSpawnObject) return
    const camPos = this.cameraTransform.getWorldPosition()
    const groundY = LensInitializer.getInstance().getPlayerGroundPos().y
    const flatAhead = LinearAlgebra.flatNor(this.cameraTransform.back)
    const totalForward = this.spawnOffsetInFront + BuildingPathState.spawnExtraForwardCm
    const spawnPos = new vec3(camPos.x, groundY, camPos.z).add(flatAhead.uniformScale(totalForward))
    const spawnRot = quat.lookAt(flatAhead, vec3.up())

    if (this.microphoneRecorder && this.ui.recordVoicePackageUI) {
      this.pendingArtifact = {spawnPos, spawnRot}
      this.ui.showRecordVoicePackageUI()
      this.subscribeRecordVoiceEvents()
    } else {
      this.placeArtifactAt(spawnPos, spawnRot, null)
    }
  }

  private subscribeRecordVoiceEvents() {
    this.recordVoiceConfirmRemover = this.ui.recordVoiceConfirmClicked.add(() => {
      this.onRecordVoiceConfirm()
    })
    this.recordVoiceRerecordRemover = this.ui.recordVoiceRerecordClicked.add(() => {
      this.ui.showRecordVoicePackageUI()
    })
    this.recordVoiceCancelRemover = this.ui.recordVoiceCancelClicked.add(() => {
      this.onRecordVoiceCancel()
    })
    this.recordVoiceDoneRemover = this.ui.recordVoiceDoneClicked.add(() => {
      this.pendingRecordingFrames = this.microphoneRecorder != null ? this.microphoneRecorder.getRecordedFramesCopy() : []
      print("[BuildingPathState] Done: captured " + (this.pendingRecordingFrames ? this.pendingRecordingFrames.length : 0) + " frames")
    })
  }

  private unsubscribeRecordVoiceEvents() {
    this.recordVoiceConfirmRemover?.()
    this.recordVoiceConfirmRemover = undefined
    this.recordVoiceRerecordRemover?.()
    this.recordVoiceRerecordRemover = undefined
    this.recordVoiceCancelRemover?.()
    this.recordVoiceCancelRemover = undefined
    this.recordVoiceDoneRemover?.()
    this.recordVoiceDoneRemover = undefined
  }

  private onRecordVoiceConfirm() {
    try {
      if (!this.pendingArtifact) return
      const frames = this.pendingRecordingFrames != null ? this.pendingRecordingFrames : (this.microphoneRecorder != null ? this.microphoneRecorder.getRecordedFramesCopy() : [])
      this.pendingRecordingFrames = null
      const prefabOverride =
        this.pendingPlaceFromInventoryAchievementId === BuildingPathState.TOUCH_GRASS_ID
          ? this.pfbTouchGrassCollectible
          : undefined
      const pfb = prefabOverride != null ? prefabOverride : this.pfbSpawnObject
      if (!pfb) {
        this.pendingArtifact = null
        this.pendingPlaceFromInventoryAchievementId = null
        return
      }
      // Place-from-inventory: we do NOT call inventory.takeOne — nothing is consumed
      print("[BuildingPathState] Confirm: placing artifact with " + (frames ? frames.length : 0) + " frames")
      this.placeArtifactAt(this.pendingArtifact.spawnPos, this.pendingArtifact.spawnRot, frames, prefabOverride)
      this.pendingArtifact = null
      this.pendingPlaceFromInventoryAchievementId = null
    } finally {
      this.unsubscribeRecordVoiceEvents()
      this.ui.hideRecordVoice()
      this.ui.showDuringPathCreationUi()
    }
  }

  private onRecordVoiceCancel() {
    this.pendingArtifact = null
    this.pendingPlaceFromInventoryAchievementId = null
    this.pendingRecordingFrames = null
    this.unsubscribeRecordVoiceEvents()
    this.ui.hideRecordVoice()
    this.ui.showDuringPathCreationUi()
  }

  private placeArtifactAt(spawnPos: vec3, spawnRot: quat, recordingFrames: any[] | null, prefabOverride?: ObjectPrefab) {
    const pfb = prefabOverride != null ? prefabOverride : this.pfbSpawnObject
    if (!pfb) return
    const so = pfb.instantiate(null)
    so.getTransform().setWorldPosition(spawnPos)
    so.getTransform().setWorldRotation(spawnRot)
    if (recordingFrames && recordingFrames.length > 0) {
      const comp = this.getArtifactRecordingComponent(so)
      if (comp) {
        comp.setFrames(recordingFrames)
        if (this.microphoneRecorder) comp.setMicrophoneRecorder(this.microphoneRecorder)
        print("[BuildingPathState] placeArtifactAt: set " + recordingFrames.length + " frames on ArtifactRecording")
      } else {
        print("[BuildingPathState] placeArtifactAt: no ArtifactRecording component on prefab instance")
      }
    }
    this.spawnedObjects.push(so)
  }

  private getCollectibleSpawnPosition(): vec3 {
    const camPos = this.cameraTransform.getWorldPosition()
    const groundY = LensInitializer.getInstance().getPlayerGroundPos().y
    const flatAhead = LinearAlgebra.flatNor(this.cameraTransform.back)
    const totalForward = this.spawnOffsetInFront + BuildingPathState.spawnExtraForwardCm
    return new vec3(camPos.x, groundY, camPos.z).add(flatAhead.uniformScale(totalForward))
  }

  private getCollectibleSpawnRotation(): quat {
    const flatAhead = LinearAlgebra.flatNor(this.cameraTransform.back)
    return quat.lookAt(flatAhead, vec3.up())
  }

  private trySpawnTouchGrassCollectible() {
    if (
      !this.achievementTracker ||
      !this.achievementTracker.isUnlocked(BuildingPathState.TOUCH_GRASS_ID) ||
      this.touchGrassSpawnedThisPath ||
      !this.pfbTouchGrassCollectible
    ) {
      return
    }
    this.touchGrassSpawnedThisPath = true
    const spawnPos = this.getCollectibleSpawnPosition()
    const spawnRot = this.getCollectibleSpawnRotation()
    const so = this.pfbTouchGrassCollectible.instantiate(null)
    so.getTransform().setWorldPosition(spawnPos)
    so.getTransform().setWorldRotation(spawnRot)
    this.activeCollectibles.push({
      achievementId: BuildingPathState.TOUCH_GRASS_ID,
      sceneObject: so,
      position: spawnPos
    })
    if (this.soundController && typeof this.soundController.playSound === "function") {
      this.soundController.playSound("collectible_appeared")
    }
  }

  private updateCollectiblesProximity(playerPos: vec3) {
    const toRemove: number[] = []
    for (let i = 0; i < this.activeCollectibles.length; i++) {
      const ac = this.activeCollectibles[i]
      const dist = playerPos.distance(ac.position)
      if (dist < BuildingPathState.collectibleCollectRadiusCm) {
        ac.sceneObject.destroy()
        if (this.inventory) this.inventory.addCollected(ac.achievementId)
        if (this.soundController && typeof this.soundController.playSound === "function") {
          this.soundController.playSound("collectible_collected")
        }
        toRemove.push(i)
      }
    }
    for (let j = toRemove.length - 1; j >= 0; j--) {
      this.activeCollectibles.splice(toRemove[j], 1)
    }
  }

  private updateCollectibleNearbyIndicator(playerPos: vec3) {
    if (!this.ui.showCollectibleNearby || !this.ui.hideCollectibleNearby) return
    let nearest: { distanceCm: number; position: vec3 } | null = null
    for (let i = 0; i < this.activeCollectibles.length; i++) {
      const ac = this.activeCollectibles[i]
      const dist = playerPos.distance(ac.position)
      if (dist <= BuildingPathState.collectibleNearbyRadiusCm && dist > BuildingPathState.collectibleCollectRadiusCm) {
        if (!nearest || dist < nearest.distanceCm) {
          nearest = { distanceCm: dist, position: ac.position }
        }
      }
    }
    if (nearest) {
      this.ui.showCollectibleNearby(nearest.distanceCm, nearest.position)
    } else {
      this.ui.hideCollectibleNearby()
    }
  }

  private onPlaceFromInventoryRequested(achievementId: string) {
    if (!this.inventory || !this.pfbTouchGrassCollectible) return
    const entries = this.inventory.getEntries()
    const hasEntry = entries.some((e) => e.achievementId === achievementId && e.count > 0)
    if (!hasEntry) return
    this.pendingPlaceFromInventoryAchievementId = achievementId
    const spawnPos = this.getCollectibleSpawnPosition()
    const spawnRot = this.getCollectibleSpawnRotation()
    this.pendingArtifact = { spawnPos, spawnRot }
    this.ui.hideRecordVoice?.()
    if (this.microphoneRecorder && this.ui.recordVoicePackageUI) {
      this.ui.showRecordVoicePackageUI()
      this.subscribeRecordVoiceEvents()
    } else {
      // No record-voice UI: place immediately; do not consume from inventory
      this.placeArtifactAt(spawnPos, spawnRot, null, this.pfbTouchGrassCollectible)
      this.pendingArtifact = null
      this.pendingPlaceFromInventoryAchievementId = null
    }
  }

  /** Finds ArtifactRecording on the prefab instance, root or any child (must exist on prefab; we do not createComponent). */
  private getArtifactRecordingComponent(so: SceneObject): ArtifactRecording | null {
    const byName = this.findArtifactRecordingByTypeName(so, 0, 10)
    if (byName) return byName
    return this.findArtifactRecordingByDuckType(so, 0, 10)
  }

  private findArtifactRecordingByTypeName(so: SceneObject, depth: number, maxDepth: number): ArtifactRecording | null {
    if (depth > maxDepth) return null
    const soAny = so as any
    for (const name of ["ArtifactRecording", "Script.ArtifactRecording"]) {
      const comp = soAny.getComponent(name) as ArtifactRecording | null
      if (comp) return comp
    }
    for (let i = 0; i < so.getChildrenCount(); i++) {
      const found = this.findArtifactRecordingByTypeName(so.getChild(i), depth + 1, maxDepth)
      if (found) return found
    }
    return null
  }

  /** Fallback: find any component that has setFrames/getFrames (ArtifactRecording interface). */
  private findArtifactRecordingByDuckType(so: SceneObject, depth: number, maxDepth: number): ArtifactRecording | null {
    if (depth > maxDepth) return null
    const soAny = so as any
    if (typeof soAny.getAllComponents === "function") {
      const components = soAny.getAllComponents()
      for (let c = 0; c < components.length; c++) {
        const comp = components[c]
        if (comp && typeof comp.setFrames === "function" && typeof comp.getFrames === "function") {
          return comp as ArtifactRecording
        }
      }
    }
    for (let i = 0; i < so.getChildrenCount(); i++) {
      const found = this.findArtifactRecordingByDuckType(so.getChild(i), depth + 1, maxDepth)
      if (found) return found
    }
    return null
  }

  stop() {
    if (this.achievementTracker) {
      this.achievementTracker.pathEnded()
    }
    this.activeCollectibles.forEach((ac) => ac.sceneObject.destroy())
    this.activeCollectibles = []
    this.placeFromInventoryRemover?.()
    this.placeFromInventoryRemover = undefined
    this.pendingPlaceFromInventoryAchievementId = null
    this.ui.hideCollectibleNearby?.()
    this.finishClickedRemover?.()
    this.finishClickedRemover = undefined
    this.loopClickedRemover?.()
    this.loopClickedRemover = undefined
    this.resetClickedRemover?.()
    this.resetClickedRemover = undefined
    this.spawnClickedRemover?.()
    this.spawnClickedRemover = undefined
    this.unsubscribeRecordVoiceEvents()
    this.pendingArtifact = null
    this.pendingRecordingFrames = null
    this.ui.hideRecordVoice()
    if (this.updateEvent) {
      this.ownerScript.removeEvent(this.updateEvent)
      this.updateEvent = undefined
    }
    if (this.trailHeadTransform) {
      this.trailHeadTransform.getSceneObject().destroy()
      this.trailHeadTransform = undefined
    }
    this.paintPreview.stop()
    this.lookPreview.stop()
    this.pathmakingPlayerFeedback.stop()
  }

  private onUpdate() {
    if (getDeltaTime() < 0.00000000001) {
      // we're in a capture loop
      return
    }

    // During-path-creation UI is shown for the whole building phase (from start()); loop UI still toggles by proximity
    const nPos = LensInitializer.getInstance().getPlayerGroundPos()

    this.trySpawnTouchGrassCollectible()
    this.updateCollectiblesProximity(nPos)
    this.updateCollectibleNearbyIndicator(nPos)

    // Make the high density visual ahead of us
    const smallMoved = nPos.sub(this.prevCameraPositionForVisual)
    const smallDistanceMoved = smallMoved.length
    const nPosVisual = this.displaceForward(nPos)

    this.setPreviewPoints(nPos, nPosVisual)

    if (smallDistanceMoved > this.smallMoveDistanceThreshold && this.checkVisualTargetCrossedStartLine(nPosVisual)) {
      // Make flat and vertical distance checks for loop viability
      const toStart = this.startPosition.sub(nPosVisual)
      const toStartY = toStart.y
      toStart.y = 0
      const toStartXZ = toStart.length

      if (
        toStartXZ < BuildingPathState.distanceToMakeLoopXZ &&
        Math.abs(toStartY) < BuildingPathState.distanceToMakeLoopY
      ) {
        if (this.pathPoints.length > 4) {
          this.ensureLoopUiShown()
        } else {
          this.ensureLoopUiHidden()
        }
      } else {
        this.ensureLoopUiHidden()
      }

      // Update old positions
      this.prevCameraPositionForVisual = nPos
    }

    // Make the low density path behind us
    // Because the start transform is the first point, start drawing once we've moved from start
    const bigMoved = nPos.sub(this.prevCameraPositionForPath)
    const bigDistanceMoved = bigMoved.length

    if (
      bigDistanceMoved > this.bigMoveDistanceThreshold &&
      this.checkCameraCrossedStartLine(nPos, 0) &&
      this.checkCameraMovedFromStartLine(nPos, this.bigMoveDistanceThreshold)
    ) {
      // Update our path distance
      this.pathLength += bigDistanceMoved
      const pathDistFt = Conversions.cmToFeet(this.pathLength)
      this.pathDistanceText.text = pathDistFt.toFixed(1) + "'"

      // Push a subset of points to the path array
      this.pathPoints.push(nPos)

      // Early on, cleanup the start points to curve smoothly from the center of the start line
      if (this.pathPoints.length == 7) {
        this.cleanupStartPointsToPath()
      }

      if (this.pathPoints.length > 2) {
        this.pathRmv.enabled = true
        this.pathRmv.mesh = PathBuilder.buildFromPoints(this.pathPoints, 60)
      }

      this.prevCameraPositionForPath = nPos
    }
  }

  setPreviewPoints(nPos: vec3, nPosVisual: vec3) {
    // To prevent visual from drawing from start back to player,
    // While cam has not yet passed start,
    // Ensure visual is really passed start, otherwise don't update
    const updatePreviewPoints = this.checkCameraCrossedStartLine(nPos, 0) ? true : this.checkCrossedStart(nPosVisual, 0)
    if (!updatePreviewPoints) {
      return
    }

    // If camera has not crossed start, but visual has
    // Adjust object count to our distance from start to visual
    let objCount = 6
    if (!this.checkCameraCrossedStartLine(nPos, 0) && this.checkCrossedStart(nPosVisual, 0)) {
      const distancePerObj = this.previewZOffset / objCount
      const availableDistance = nPosVisual.distance(this.startPosition)
      objCount = Math.floor(availableDistance / distancePerObj)
      objCount = Math.max(objCount, 2)
    }

    const startPos = this.checkCameraCrossedStartLine(nPos, 0) ? nPos : this.startPosition

    const lookBehavior = this.lookPreview.getBehavior()
    if (lookBehavior && lookBehavior.pos && lookBehavior.rot && lookBehavior.vel) {
      this.lookPts = this.drawCurveFromBehavior(startPos, lookBehavior)
    }

    const paintBehavior = this.paintPreview.getBehavior(nPosVisual)
    if (paintBehavior) {
      if (paintBehavior.pos) {
        this.paintPts.unshift(paintBehavior.pos)
        // Pop the points that are behind the camera
        for (let i = this.paintPts.length - 1; i >= 0; i--) {
          const camToPt = this.paintPts[i].sub(nPos).normalize()
          const camFwd = LinearAlgebra.flatNor(this.cameraTransform.back)

          // Snap all points to our current ground
          this.paintPts[i].y = nPos.y

          const dot = camToPt.dot(camFwd)
          if (dot < 0) {
            this.paintPts.pop()
          }
        }
      }
    }

    this.previewPoints = []
    const size = Math.min(this.lookPts.length, this.paintPts.length)
    if (size > 2) {
      // Array goes from head (index 0) to start position (index size-1)
      for (let i = 0; i < size; i++) {
        const t = 1 - i / (size - 1)
        const paintWeight = EasingFunctions.easeOutQuart(t)
        const lookWeight = 1 - paintWeight

        const pos = this.lookPts[i].uniformScale(lookWeight).add(this.paintPts[i].uniformScale(paintWeight))
        this.previewPoints.push(pos)
      }

      // Re-emphasize start position prior to resampling
      this.previewPoints.push(startPos)

      // Resample
      this.previewPoints = ResampleCurve.resampleCurve(this.previewPoints, objCount)

      this.pathmakingPlayerFeedback.update(this.previewPoints)
    }
  }

  // This draws a curve from the look point to us
  drawCurveFromBehavior(startPos: vec3, behavior: {pos: vec3; rot: quat; vel: number}) {
    const posA = behavior.pos
    const fwdA = LinearAlgebra.flatNor(
      GetVectorsFromQuaternion.getInstance().getVectorsFromQuaternion(behavior.rot).forward
    )

    const posB = startPos
    const fwdB = LinearAlgebra.flatNor(this.cameraTransform.forward)

    const dir = posA.sub(posB)
    const mag = dir.length

    const resolution = Math.floor(mag / 15)
    const curveScale = Math.max(50, Math.min(resolution * 50, behavior.vel / 2))

    const curvePoints: vec3[] = HermiteSpline.interpolateHermite(posA, fwdA, posB, fwdB, resolution, curveScale)

    return curvePoints
  }

  private cleanupStartPointsToPath() {
    this.pathPoints = HermiteSpline.drawCurve(
      this.startPosition,
      this.startTransform.forward,
      this.pathPoints[this.pathPoints.length - 1],
      LinearAlgebra.flatNor(this.cameraTransform.back),
      this.hermiteResolution
    )
  }

  private addStartPointToPath() {
    this.pathPoints.push(this.startPosition.uniformScale(1))
  }

  private addStartPointToVisual() {
    this.previewPoints.unshift(this.startPosition)
  }

  private displaceForward(cameraPosOnSurface: vec3) {
    return cameraPosOnSurface.add(LinearAlgebra.flatNor(this.cameraTransform.back).uniformScale(this.previewZOffset))
  }

  private checkCameraMovedFromStartLine(cameraPosOnSurface: vec3, distance: number) {
    if (this.cameraMovedFromStartLine) {
      return true
    }
    this.cameraMovedFromStartLine = this.startPosition.distance(cameraPosOnSurface) > distance
    return this.cameraMovedFromStartLine
  }

  private checkCameraCrossedStartLine(cameraPosOnSurface: vec3, offset: number) {
    if (this.cameraCrossedStartLine) {
      return true
    }
    this.cameraCrossedStartLine = this.checkCrossedStart(cameraPosOnSurface, offset)
    return this.cameraCrossedStartLine
  }

  private checkCrossedStart(pos: vec3, offset: number) {
    const startLineForward = this.startTransform.forward
    const offsetStartPos = this.startPosition.add(startLineForward.uniformScale(offset))
    const cameraPosToStart = pos.sub(offsetStartPos)
    return startLineForward.angleTo(cameraPosToStart) <= Math.PI / 2
  }

  private checkBehindStart(pos: vec3, offset: number) {
    const startLineForward = this.startTransform.forward
    const offsetStartPos = this.startPosition.sub(startLineForward.uniformScale(offset))
    const cameraPosToStart = pos.sub(offsetStartPos)
    return startLineForward.angleTo(cameraPosToStart) > Math.PI / 2
  }

  private checkVisualTargetCrossedStartLine(targetPosOnSurface: vec3) {
    if (this.visualTargetCrossedStartLine) {
      return true
    }
    this.visualTargetCrossedStartLine = this.checkCrossedStart(targetPosOnSurface, 0)
    return this.visualTargetCrossedStartLine
  }

  private ensureUiShown() {
    if (this.isUiShown) {
      return
    }
    this.isUiShown = true
    this.ui.showDuringPathCreationUi()
  }

  private ensureUiHidden() {
    if (!this.isUiShown) {
      return
    }
    this.isUiShown = false
    this.ui.hideUi()
  }

  private ensureLoopUiShown() {
    if (this.isLoop) {
      return
    }
    this.isLoop = true
    this.ui.showLoopUi()
  }

  private ensureLoopUiHidden() {
    if (!this.isLoop) {
      return
    }
    this.isLoop = false
    this.ui.hideLoopUi()
  }
}
