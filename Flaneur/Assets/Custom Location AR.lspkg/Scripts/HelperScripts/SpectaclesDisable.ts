/**
 * To enable use of this component on Spectacles, the segmentation effect needs
 * to be disabled.
 */
@component
export class SpectaclesDisable extends BaseScriptComponent {
  @input segmentationEffect: SceneObject

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      if (
        global.deviceInfoSystem.isSpectacles() &&
        global.deviceInfoSystem.isEditor()
      ) {
        print(
          "The segmentation effect is not designed for Spectacles and will be disabled on device."
        )
      }

      if (global.deviceInfoSystem.isSpectacles()) {
        this.segmentationEffect.enabled = false
      }
    })
  }
}
