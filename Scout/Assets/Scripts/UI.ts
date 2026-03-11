import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Conversions} from "./Conversions"
import {LoopController} from "./LoopController"

/**
 * Scout UI — flow: Warning tutorial → Dashboard (or pathmaking). No home/tutorial panels.
 * Kept: warning tutorial, record voice, artifact selection, noCollectedArtifacts,
 * collectibleNearby, loop/goToStart/endSession. During-path "keep moving" UI is optional;
 * End on the hiking dashboard calls onFinishCreatePathButton() (finish path).
 */
@component
export class UI extends BaseScriptComponent {
  @input
  camObj: SceneObject

  @input
  @allowUndefined
  duringPathCreationUI: SceneObject

  @input
  goToStartUI: SceneObject

  @input
  goToStartUiDistance: Text

  @input
  endSessionUI: SceneObject

  @input
  pfbLoopUi: ObjectPrefab

  @input
  backplateSo: SceneObject

  @input
  warningTutorialUI: SceneObject

  @input
  @allowUndefined
  recordVoicePackageUI: SceneObject

  @input
  @allowUndefined
  recordVoiceConfirmUI: SceneObject

  @input
  @allowUndefined
  collectibleNearbyUI: SceneObject

  @input
  @allowUndefined
  collectibleNearbyText: Text

  @input
  @allowUndefined
  noCollectedArtifactsUI: SceneObject

  @input
  @allowUndefined
  artifactSelectionUI: SceneObject

  get resetPathClicked() {
    return this.resetPathClickedEvent.publicApi()
  }

  get finishPathClicked() {
    return this.finishPathClickedEvent.publicApi()
  }

  get loopPathClicked() {
    return this.loopPathClickedEvent.publicApi()
  }

  get tutorialComplete() {
    return this.tutorialCompleteEvent.publicApi()
  }

  get endSessionClicked() {
    return this.endSessionClickedEvent.publicApi()
  }

  get spawnObjectClicked() {
    return this.spawnObjectClickedEvent.publicApi()
  }

  get recordVoiceConfirmClicked() {
    return this.recordVoiceConfirmClickedEvent.publicApi()
  }

  get recordVoiceRerecordClicked() {
    return this.recordVoiceRerecordClickedEvent.publicApi()
  }

  get recordVoiceCancelClicked() {
    return this.recordVoiceCancelClickedEvent.publicApi()
  }

  get recordVoiceDoneClicked() {
    return this.recordVoiceDoneClickedEvent.publicApi()
  }

  get placeFromInventoryClicked() {
    return this.placeFromInventoryClickedEvent.publicApi()
  }

  get artifactChoice1Clicked() {
    return this.artifactChoice1ClickedEvent.publicApi()
  }

  get artifactChoice2Clicked() {
    return this.artifactChoice2ClickedEvent.publicApi()
  }

  get artifactChoice3Clicked() {
    return this.artifactChoice3ClickedEvent.publicApi()
  }

  private resetPathClickedEvent: Event = new Event()
  private finishPathClickedEvent: Event = new Event()
  private loopPathClickedEvent: Event = new Event()
  private tutorialCompleteEvent: Event = new Event()
  private endSessionClickedEvent: Event = new Event()
  private spawnObjectClickedEvent: Event = new Event()
  private recordVoiceConfirmClickedEvent: Event = new Event()
  private recordVoiceRerecordClickedEvent: Event = new Event()
  private recordVoiceCancelClickedEvent: Event = new Event()
  private recordVoiceDoneClickedEvent: Event = new Event()
  private placeFromInventoryClickedEvent: Event = new Event()
  private artifactChoice1ClickedEvent: Event = new Event()
  private artifactChoice2ClickedEvent: Event = new Event()
  private artifactChoice3ClickedEvent: Event = new Event()

  private warningTr: Transform = null
  private duringPathCreationUiTr: Transform | null = null
  private goToStartUiTr: Transform = null
  private endSessionUiTr: Transform = null
  private recordVoicePackageTr: Transform = null
  private recordVoiceConfirmTr: Transform = null
  private collectibleNearbyTr: Transform | null = null
  private noCollectedArtifactsTr: Transform | null = null
  private artifactSelectionTr: Transform | null = null
  private currentActiveTr: Transform = null

  private loopUiController: LoopController | undefined

  onAwake() {
    this.warningTr = this.warningTutorialUI.getTransform()
    if (this.duringPathCreationUI) this.duringPathCreationUiTr = this.duringPathCreationUI.getTransform()
    this.goToStartUiTr = this.goToStartUI.getTransform()
    this.endSessionUiTr = this.endSessionUI.getTransform()
    if (this.recordVoicePackageUI) this.recordVoicePackageTr = this.recordVoicePackageUI.getTransform()
    if (this.recordVoiceConfirmUI) this.recordVoiceConfirmTr = this.recordVoiceConfirmUI.getTransform()
    if (this.collectibleNearbyUI) this.collectibleNearbyTr = this.collectibleNearbyUI.getTransform()
    if (this.collectibleNearbyTr) this.hide(this.collectibleNearbyTr)
    if (this.noCollectedArtifactsUI) this.noCollectedArtifactsTr = this.noCollectedArtifactsUI.getTransform()
    if (this.noCollectedArtifactsTr) this.hide(this.noCollectedArtifactsTr)
    if (this.artifactSelectionUI) this.artifactSelectionTr = this.artifactSelectionUI.getTransform()
    if (this.artifactSelectionTr) this.hide(this.artifactSelectionTr)

    this.hide(this.warningTr)
    if (this.duringPathCreationUiTr) this.hide(this.duringPathCreationUiTr)
    this.hide(this.goToStartUiTr)
    this.hide(this.endSessionUiTr)
    if (this.recordVoicePackageTr) this.hide(this.recordVoicePackageTr)
    if (this.recordVoiceConfirmTr) this.hide(this.recordVoiceConfirmTr)
  }

  showRecordVoicePackageUI() {
    if (!this.recordVoicePackageTr) return
    if (this.recordVoiceConfirmTr) this.hide(this.recordVoiceConfirmTr)
    this.show(this.recordVoicePackageTr)
  }

  showRecordVoiceConfirm() {
    if (!this.recordVoiceConfirmTr) return
    if (this.recordVoicePackageTr) this.hide(this.recordVoicePackageTr)
    this.tryHideCurrentActive()
    this.currentActiveTr = this.recordVoiceConfirmTr
    this.show(this.currentActiveTr)
  }

  hideRecordVoicePackageUI() {
    if (this.recordVoicePackageTr) this.hide(this.recordVoicePackageTr)
  }

  hideRecordVoice() {
    if (this.recordVoicePackageTr) this.hide(this.recordVoicePackageTr)
    if (this.recordVoiceConfirmTr) this.hide(this.recordVoiceConfirmTr)
    if (this.currentActiveTr === this.recordVoiceConfirmTr) {
      this.currentActiveTr = null
    }
  }

  onRecordVoiceDoneButton() {
    this.showRecordVoiceConfirm()
    this.recordVoiceDoneClickedEvent.invoke()
  }

  onRecordVoiceConfirmButton() {
    this.hideRecordVoice()
    this.recordVoiceConfirmClickedEvent.invoke()
    this.showDuringPathCreationUi()
  }

  onRecordVoiceRerecordButton() {
    if (this.recordVoiceConfirmTr) this.hide(this.recordVoiceConfirmTr)
    this.currentActiveTr = null
    this.recordVoiceRerecordClickedEvent.invoke()
    this.showRecordVoicePackageUI()
  }

  onRecordVoiceCancelButton() {
    this.hideRecordVoice()
    this.recordVoiceCancelClickedEvent.invoke()
  }

  /** Shows the warning tutorial panel only. Wire a button to onProgressTutorial to dismiss and complete. */
  showTutorialUi() {
    this.tryHideCurrentActive()
    this.currentActiveTr = this.warningTr
    this.show(this.currentActiveTr)
  }

  showDuringPathCreationUi() {
    this.tryHideCurrentActive()
    if (!this.duringPathCreationUiTr) {
      this.currentActiveTr = null
      return
    }
    this.currentActiveTr = this.duringPathCreationUiTr
    this.show(this.currentActiveTr)
  }

  showEndSessionUi() {
    this.tryHideCurrentActive()
    this.currentActiveTr = this.endSessionUiTr
    this.show(this.currentActiveTr)
  }

  showGoToStartUi(distance: number) {
    this.tryHideCurrentActive()
    const pathDistFt = Conversions.cmToFeet(distance)
    this.goToStartUiDistance.text = pathDistFt.toFixed(1) + "'"
    this.currentActiveTr = this.goToStartUiTr
    this.show(this.currentActiveTr)
  }

  initLoopUi(startTr: Transform) {
    if (!this.loopUiController) {
      this.loopUiController = this.pfbLoopUi.instantiate(null).getComponent("ScriptComponent") as LoopController
    }
    this.loopUiController.start(startTr)
  }

  showLoopUi() {
    this.loopUiController.show()
  }

  hideLoopUi() {
    this.loopUiController.hide()
  }

  hideUi() {
    this.tryHideCurrentActive()
    this.currentActiveTr = null
  }

  /** Dismiss warning and complete tutorial (wire to the warning panel’s button). */
  onProgressTutorial() {
    if (this.warningTr) this.hide(this.warningTr)
    if (this.currentActiveTr === this.warningTr) this.currentActiveTr = null
    this.tutorialCompleteEvent.invoke()
  }

  onFinishCreatePathButton() {
    if (this.duringPathCreationUiTr) this.hide(this.duringPathCreationUiTr)

    if (this.loopUiController && this.loopUiController.getIsInLoopZone()) {
      this.loopUiController.onLock()
      this.loopPathClickedEvent.invoke()
    } else {
      this.finishPathClickedEvent.invoke()
    }
  }

  onResetCreatePathButton() {
    if (this.duringPathCreationUiTr) this.hide(this.duringPathCreationUiTr)
    this.resetPathClickedEvent.invoke()
  }

  onSpawnObjectButton() {
    this.spawnObjectClickedEvent.invoke()
  }

  onPlaceFromInventoryButton() {
    this.placeFromInventoryClickedEvent.invoke()
  }

  onArtifactChoice1Button() {
    this.artifactChoice1ClickedEvent.invoke()
  }

  onArtifactChoice2Button() {
    this.artifactChoice2ClickedEvent.invoke()
  }

  onArtifactChoice3Button() {
    this.artifactChoice3ClickedEvent.invoke()
  }

  showCollectibleNearby(distanceCm: number, _worldPosition: vec3) {
    if (!this.collectibleNearbyTr) return
    const meters = (distanceCm / 100).toFixed(1)
    if (this.collectibleNearbyText) this.collectibleNearbyText.text = "Achievement unlocked! Touch grass for the first time — " + meters + " m"
    const localPos = this.collectibleNearbyTr.getLocalPosition()
    localPos.x = 0
    localPos.y = -5
    localPos.z = 0
    this.collectibleNearbyTr.setLocalPosition(localPos)
  }

  hideCollectibleNearby() {
    if (!this.collectibleNearbyTr) return
    const localPos = this.collectibleNearbyTr.getLocalPosition()
    localPos.y = 10000
    this.collectibleNearbyTr.setLocalPosition(localPos)
  }

  showArtifactSelection() {
    if (!this.artifactSelectionTr) return
    this.tryHideCurrentActive()
    this.currentActiveTr = this.artifactSelectionTr
    this.show(this.currentActiveTr)
  }

  hideArtifactSelection() {
    if (!this.artifactSelectionTr) return
    if (this.currentActiveTr === this.artifactSelectionTr) {
      this.currentActiveTr = null
    }
    this.hide(this.artifactSelectionTr)
  }

  showNoCollectedArtifacts() {
    if (!this.noCollectedArtifactsTr) return
    // Overlay only: do not hide path-creation UI or change currentActiveTr
    this.showOverlay(this.noCollectedArtifactsTr)
    const evt = this.createEvent("DelayedCallbackEvent")
    evt.bind(() => this.hideNoCollectedArtifacts())
    evt.reset(1)
  }

  hideNoCollectedArtifacts() {
    if (!this.noCollectedArtifactsTr) return
    this.hideOverlay(this.noCollectedArtifactsTr)
    // Path-creation UI was never hidden, so do not call showDuringPathCreationUi()
  }

  /** Shows a transform on screen without hiding current UI or enabling backplate (for overlays). */
  private showOverlay(tr: Transform) {
    const localPos = tr.getLocalPosition()
    localPos.x = 0
    localPos.y = -5
    localPos.z = 0
    tr.setLocalPosition(localPos)
    this.centerScreenTransform(tr.getSceneObject())
  }

  /** Hides overlay by moving off-screen without changing backplate (current UI stays as-is). */
  private hideOverlay(tr: Transform) {
    const localPos = tr.getLocalPosition()
    localPos.y = 10000
    tr.setLocalPosition(localPos)
  }

  onStopWalkingButton() {
    this.hide(this.endSessionUiTr)
    this.endSessionClickedEvent.invoke()
  }

  private hide(tr: Transform) {
    const localPos = tr.getLocalPosition()
    localPos.y = 10000
    tr.setLocalPosition(localPos)
    this.backplateSo.enabled = false
  }

  private show(tr: Transform) {
    const localPos = tr.getLocalPosition()
    localPos.x = 0
    localPos.y = -5
    localPos.z = 0
    tr.setLocalPosition(localPos)
    this.centerScreenTransform(tr.getSceneObject())
    this.backplateSo.enabled = true
  }

  private centerScreenTransform(so: SceneObject) {
    const st = so.getComponent("Component.ScreenTransform") as ScreenTransform
    if (st && st.anchors) {
      st.anchors.setCenter(new vec2(0, 0))
    }
    for (let i = 0; i < so.getChildrenCount(); i++) {
      this.centerScreenTransform(so.getChild(i))
    }
  }

  private tryHideCurrentActive() {
    if (this.currentActiveTr) {
      this.hide(this.currentActiveTr)
    }
  }
}
