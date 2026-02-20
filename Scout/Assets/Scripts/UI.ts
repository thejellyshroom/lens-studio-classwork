import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Conversions} from "./Conversions"
import {LoopController} from "./LoopController"

@component
export class UI extends BaseScriptComponent {
  @input
  camObj: SceneObject

  @input
  homeUI: SceneObject

  @input
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
  tutorialUI: SceneObject

  @input
  tutorialAnimationPlayer: AnimationPlayer

  @input
  tutorialText: Text

  @input
  @allowUndefined
  recordVoicePackageUI: SceneObject

  @input
  @allowUndefined
  recordVoiceConfirmUI: SceneObject

  get createPathClicked() {
    return this.createPathClickedEvent.publicApi()
  }

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

  private createPathClickedEvent: Event = new Event()
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

  private warningTr = null
  private tutorialTr = null
  private homeTr = null
  private duringPathCreationUiTr: Transform = null
  private goToStartUiTr: Transform = null
  private endSessionUiTr: Transform = null
  private recordVoicePackageTr: Transform = null
  private recordVoiceConfirmTr: Transform = null
  private currentActiveTr: Transform = null

  private tutorialStepCount: number = 0

  private loopUiController: LoopController | undefined

  onAwake() {
    this.warningTr = this.warningTutorialUI.getTransform()
    this.tutorialTr = this.tutorialUI.getTransform()
    this.homeTr = this.homeUI.getTransform()
    this.duringPathCreationUiTr = this.duringPathCreationUI.getTransform()
    this.goToStartUiTr = this.goToStartUI.getTransform()
    this.endSessionUiTr = this.endSessionUI.getTransform()
    if (this.recordVoicePackageUI) this.recordVoicePackageTr = this.recordVoicePackageUI.getTransform()
    if (this.recordVoiceConfirmUI) this.recordVoiceConfirmTr = this.recordVoiceConfirmUI.getTransform()

    this.hide(this.tutorialTr)
    this.hide(this.homeTr)
    this.hide(this.duringPathCreationUiTr)
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

  showHomeUi() {
    this.tryHideCurrentActive()
    this.currentActiveTr = this.homeTr
    this.show(this.currentActiveTr)
  }

  showTutorialUi() {
    this.tryHideCurrentActive()
    this.tutorialStepCount = 0
    this.currentActiveTr = this.warningTr
    this.show(this.currentActiveTr)
  }

  showDuringPathCreationUi() {
    this.tryHideCurrentActive()
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

  onProgressTutorial() {
    if (this.tutorialStepCount === 0) {
      this.tryHideCurrentActive()
      this.currentActiveTr = this.tutorialTr
      this.show(this.currentActiveTr)
    } else if (this.tutorialStepCount === 1) {
      this.tutorialAnimationPlayer.setClipEnabled("Sprint_Layer", false)
      this.tutorialAnimationPlayer.setClipEnabled("Loop_Layer", true)
      this.tutorialText.text = "MAKE A LOOP"
    } else if (this.tutorialStepCount === 2) {
      this.hide(this.tutorialTr)
      this.tutorialCompleteEvent.invoke()
    }
    this.tutorialStepCount += 1
  }

  onCreatePathButton() {
    this.hide(this.homeTr)
    this.createPathClickedEvent.invoke()
  }

  onFinishCreatePathButton() {
    this.hide(this.duringPathCreationUiTr)

    if (this.loopUiController.getIsInLoopZone()) {
      this.loopUiController.onLock()
      this.loopPathClickedEvent.invoke()
    } else {
      this.finishPathClickedEvent.invoke()
    }
  }

  onResetCreatePathButton() {
    this.hide(this.duringPathCreationUiTr)
    this.resetPathClickedEvent.invoke()
  }

  onSpawnObjectButton() {
    this.spawnObjectClickedEvent.invoke()
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
