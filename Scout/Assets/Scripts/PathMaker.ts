import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {MicrophoneRecorder} from "Microphone.lspkg/Scripts/MicrophoneRecorder"
import {SurfaceDetection} from "../Surface Detection/Scripts/SurfaceDetection"
import {AchievementTracker} from "./AchievementTracker"
import {PathData} from "./BuiltPathData"
import {Inventory} from "./Inventory"
import {LineController} from "./LineController"
import {BuildingPathState} from "./PathMakerStates/BuildingPathState"
import {IdleState} from "./PathMakerStates/IdleState"
import {IPathMakerState} from "./PathMakerStates/IPathMakerState"
import {PlacingFinishState} from "./PathMakerStates/PlacingFinishState"
import {PlacingStartState} from "./PathMakerStates/PlacingStartState"
import {PathmakingPlayerFeedback} from "./PathmakingPlayerFeedback"
import {PlayerPaceCalculator} from "./PlayerPaceCalculator"
import {SoundController} from "./SoundController"
import {UI} from "./UI"

@component
export class PathMaker extends BaseScriptComponent {
  @input
  pathRmv: RenderMeshVisual

  @input
  pfbSurfaceDetection: ObjectPrefab

  @input
  pfbLine: ObjectPrefab

  @input
  @allowUndefined
  camObj: SceneObject

  @input
  camObjOffset: SceneObject

  @input
  @allowUndefined
  pathDistText: Text

  /** When set, path distance is also written here (e.g. dashboard distance text). */
  @input
  @allowUndefined
  pathDistTextDashboard: Text

  @input
  finalPathDistText: Text

  @input
  playerPaceCalculator: PlayerPaceCalculator

  @input
  pathmakingPlayerFeedback: PathmakingPlayerFeedback

  @input
  protected readonly ui: UI

  @input
  protected readonly placingStartFinishLinesForwardDisplace: number = 200

  @input
  @allowUndefined
  pfbSpawnObject: ObjectPrefab

  @input
  spawnOffsetInFront: number = 80

  @input
  @allowUndefined
  microphoneRecorder: MicrophoneRecorder

  @input
  @allowUndefined
  achievementTracker: AchievementTracker

  @input
  @allowUndefined
  inventory: Inventory

  @input
  @allowUndefined
  pfbTouchGrassCollectible: ObjectPrefab

  @input
  @allowUndefined
  pfbArtifact1: ObjectPrefab

  @input
  @allowUndefined
  pfbArtifact2: ObjectPrefab

  @input
  @allowUndefined
  pfbArtifact3: ObjectPrefab

  @input
  @allowUndefined
  soundController: SoundController

  private camTr: Transform = null
  private camOffsetTr: Transform = null
  private currentState: IPathMakerState = new IdleState()

  protected bigMoveDistanceThreshold = 40
  protected hermiteResolution = 12
  protected resampleResoluton = 4

  private surfaceDetection: SurfaceDetection | undefined

  get pathMade(): PublicApi<PathData> {
    return this.pathMadeEvent.publicApi()
  }

  protected pathMadeEvent: Event<PathData> = new Event<PathData>()

  public init() {
    this.camTr = this.camObj.getTransform()
    this.camOffsetTr = this.camObjOffset.getTransform()
  }

  /** Stops the current path state and returns to idle (e.g. when user taps End on dashboard). */
  public stop() {
    this.currentState.stop()
    this.currentState = new IdleState()
    this.currentState.start()
  }

  public start() {
    this.startStartPlacementState()

    this.ui.resetPathClicked.add(() => {
      // reset path
      if (this.surfaceDetection) {
        this.surfaceDetection.reset()
      }
      this.startStartPlacementState()
    })
  }

  private startStartPlacementState() {
    this.currentState.stop()
    if (!this.surfaceDetection) {
      this.surfaceDetection = this.pfbSurfaceDetection
        .instantiate(null)
        .getChild(0)
        .getComponent("ScriptComponent") as SurfaceDetection
    }
    this.currentState = new PlacingStartState(
      this,
      this.surfaceDetection,
      this.pfbLine,
      this.camTr,
      this.placingStartFinishLinesForwardDisplace,
      (startPosition, startRotation, startObject) => {
        this.startBuildingPathState(startPosition, startRotation, startObject)
      }
    )
    this.currentState.start()
  }

  private startBuildingPathState(startPosition: vec3, startRotation: quat, startObject: SceneObject) {
    this.currentState.stop()
    this.currentState = new BuildingPathState(
      this,
      this.camTr,
      this.camOffsetTr,
      this.pathRmv,
      this.pathDistText,
      this.pathDistTextDashboard,
      startPosition,
      startRotation,
      startObject,
      this.ui,
      this.playerPaceCalculator,
      this.pathmakingPlayerFeedback,
      this.bigMoveDistanceThreshold,
      this.hermiteResolution,
      this.resampleResoluton,
      (startPosition, startRotation, startObject, pathPoints, lastVisualPoints) => {
        this.startFinishPlacementState(startObject, startPosition, startRotation, pathPoints, lastVisualPoints)
      },
      (startPosition, startRotation, startObject, splinePoints) => {
        // NOTE: Use this line anywhere you want a stack trace
        // print(`${new Error().stack}`);
        this.finishLoop(startObject, startPosition, startRotation, splinePoints)
      },
      this.pfbSpawnObject,
      this.spawnOffsetInFront,
      this.microphoneRecorder,
      this.achievementTracker,
      this.inventory,
      this.pfbTouchGrassCollectible,
      this.pfbArtifact1,
      this.pfbArtifact2,
      this.pfbArtifact3,
      this.soundController
    )
    this.currentState.start()
  }

  private startFinishPlacementState(
    startObject: SceneObject,
    startPosition: vec3,
    startRotation: quat,
    pathPoints: vec3[],
    lastVisualPoints: vec3[]
  ) {
    this.currentState.stop()
    this.currentState = new PlacingFinishState(
      startObject,
      this,
      this.surfaceDetection,
      this.pfbLine,
      this.camTr,
      this.placingStartFinishLinesForwardDisplace,
      pathPoints,
      lastVisualPoints,
      this.pathRmv,
      this.bigMoveDistanceThreshold,
      this.hermiteResolution,
      this.resampleResoluton,

      (finishPosition, finishRotation, finishObject, splinePoints: {position: vec3; rotation: quat}[]) => {
        const finishCtrl = finishObject.getComponent(LineController.getTypeName())
        finishCtrl.setRealVisual()
        this.finishSprint(
          startObject,
          startPosition,
          startRotation,
          finishObject,
          finishPosition,
          finishRotation,
          splinePoints
        )
      }
    )
    this.currentState.start()
  }

  protected finishLoop(
    startObject: SceneObject,
    startPosition: vec3,
    startRotation: quat,
    splinePoints: {position: vec3; rotation}[]
  ) {
    this.currentState.stop()
    this.currentState = new IdleState()
    this.currentState.start()
    this.pathMadeEvent.invoke({
      isLoop: true,
      startObject,
      startPosition,
      startRotation,
      splinePoints
    })
  }

  private finishSprint(
    startObject: SceneObject,
    startPosition: vec3,
    startRotation: quat,
    finishObject: SceneObject,
    finishPosition: vec3,
    finishRotation: quat,
    splinePoints: {position: vec3; rotation}[]
  ) {
    this.currentState.stop()
    this.currentState = new IdleState()
    this.currentState.start()
    this.pathMadeEvent.invoke({
      isLoop: false,
      startObject,
      finishObject,
      startPosition,
      startRotation,
      finishPosition,
      finishRotation,
      splinePoints
    })
  }
}
