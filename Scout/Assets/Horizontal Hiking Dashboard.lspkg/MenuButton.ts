// ============================================================
//  MENU CONTROLLER — Snap Spectacles / Lens Studio v5.7+
//
//  Menu show/hide uses transform position (y off-screen) so it closes reliably.
//  Uses BaseButton so Start/Pause/End and artifact buttons work like other UIKit buttons.
//
//  IMPORTANT: Each button (Menu, Close, Start, Pause, End) must have "Add Callbacks"
//  enabled on its RectangleButton component in the Inspector, or onTriggerUp won't fire.
// ============================================================

import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton"

const MENU_HIDDEN_Y = 10000
const MENU_VISIBLE_Y = -12

@component
export class MenuController extends BaseScriptComponent {

  @input('SceneObject')
  menuToggleGroup: SceneObject

  @input('Component.ScriptComponent')
  menuButton: BaseButton

  @input('Component.ScriptComponent')
  closeButton: BaseButton

  @input('Component.ScriptComponent')
  startButton: BaseButton

  @input('Component.ScriptComponent')
  pauseButton: BaseButton

  @input('Component.ScriptComponent')
  endButton: BaseButton

  @input('Component.ScriptComponent')
  dashboardScript: ScriptComponent & any

  @input('Component.ScriptComponent')
  @allowUndefined
  scoutUi: ScriptComponent & { onArtifactChoice1Button?: () => void; onArtifactChoice2Button?: () => void; onArtifactChoice3Button?: () => void }

  @input('Component.ScriptComponent')
  @allowUndefined
  artifact1Button: BaseButton

  @input('Component.ScriptComponent')
  @allowUndefined
  artifact2Button: BaseButton

  @input('Component.ScriptComponent')
  @allowUndefined
  artifact3Button: BaseButton

  @input('Component.ScriptComponent')
  @allowUndefined
  communityArtifactsToggleButton: BaseButton

  @input('Component.ScriptComponent')
  @allowUndefined
  communityArtifactsManager: ScriptComponent & { toggleCommunityArtifacts?: () => void }

  private menuTr: Transform = null
  private menuVisible = false

  onAwake() {
    const startEvent = this.createEvent("OnStartEvent")
    startEvent.bind(() => {
      this.init()
    })
  }

  init() {
    if (!this.menuToggleGroup) return
    this.menuTr = this.menuToggleGroup.getTransform()
    this.hideMenu()

    const addTriggerOnce = (btn: BaseButton, fn: () => void) => {
      if (!btn) return
      if (btn.onTriggerUp) {
        btn.onTriggerUp.add(fn)
        return
      }
      if (btn.onTriggerDown) btn.onTriggerDown.add(fn)
    }
    addTriggerOnce(this.menuButton, () => { this.toggleMenu() })
    addTriggerOnce(this.closeButton, () => { this.hideMenu() })

    addTriggerOnce(this.startButton, () => {
      if (this.dashboardScript && typeof this.dashboardScript.startHike === "function") {
        this.dashboardScript.startHike()
      }
    })
    addTriggerOnce(this.pauseButton, () => {
      if (this.dashboardScript && typeof this.dashboardScript.pauseHike === "function") {
        this.dashboardScript.pauseHike()
      }
    })
    addTriggerOnce(this.endButton, () => {
      if (this.dashboardScript && typeof this.dashboardScript.endHike === "function") {
        this.dashboardScript.endHike()
      }
    })

    if (this.scoutUi && this.scoutUi.onArtifactChoice1Button) {
      addTriggerOnce(this.artifact1Button, () => { this.scoutUi.onArtifactChoice1Button() })
      addTriggerOnce(this.artifact2Button, () => { this.scoutUi.onArtifactChoice2Button() })
      addTriggerOnce(this.artifact3Button, () => { this.scoutUi.onArtifactChoice3Button() })
    }

    if (this.communityArtifactsManager && this.communityArtifactsManager.toggleCommunityArtifacts) {
      addTriggerOnce(this.communityArtifactsToggleButton, () => {
        this.communityArtifactsManager.toggleCommunityArtifacts()
      })
    }
  }

  private toggleMenu() {
    if (this.menuVisible) {
      this.hideMenu()
    } else {
      this.showMenu()
    }
  }

  private showMenu() {
    if (!this.menuTr) return
    const p = this.menuTr.getLocalPosition()
    p.x = 0
    p.y = MENU_VISIBLE_Y
    p.z = 0
    this.menuTr.setLocalPosition(p)
    this.menuVisible = true
  }

  private hideMenu() {
    if (!this.menuTr) return
    const p = this.menuTr.getLocalPosition()
    p.y = MENU_HIDDEN_Y
    this.menuTr.setLocalPosition(p)
    this.menuVisible = false
  }
}
