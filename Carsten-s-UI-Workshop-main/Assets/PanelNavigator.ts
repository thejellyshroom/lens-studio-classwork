import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";

// Component decorator - marks this class as a Lens Studio component that can be attached to scene objects
@component
export class PanelNavigator extends BaseScriptComponent {
  // @input decorator - creates an editable field in the Lens Studio Inspector
  // Reference to the first panel (spawn shape UI)
  @input
  spawnShapePanel: SceneObject | undefined;

  // Reference to the second panel (change size UI)
  @input
  changeSizePanel: SceneObject | undefined;

  // Reference to the third panel (change color UI)
  @input
  changeColorPanel: SceneObject | undefined;

  // Reference to the first "Next" button (navigates from spawn panel to size panel)
  @input
  nextButton: BaseButton | undefined;

  // Reference to the second "Next" button (navigates from size panel to color panel)
  @input
  nextButton2: BaseButton | undefined;

  // Reference to the color picker controller (handles color selection logic)
  @input
   colorPickerController: any

  // Lifecycle method - called when the component wakes up
  onAwake() {
    // Create an event listener that triggers when the lens starts
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart();
    });
  }

  // Initialization method - runs once when the lens starts
  onStart() {
    // Log debug information to verify component setup
    print("=== PanelNavigator Starting ===");
    print("spawnShapePanel assigned: " + (this.spawnShapePanel !== undefined));
    print("changeSizePanel assigned: " + (this.changeSizePanel !== undefined));
    print("changeColorPanel assigned: " + (this.changeColorPanel !== undefined));
    
    // Hide all panels to start with a clean slate
    this.hideAllPanels();
    
    // Make the first panel (spawn shape) visible as the starting panel
    if (this.spawnShapePanel) {
      this.spawnShapePanel.enabled = true;
      print("SpawnShapePanel is now visible");
    }

    // Set up the first navigation button
    // When pressed, this button moves from the spawn panel to the size panel
    if (this.nextButton) {
      print("NextButton 1 connected");
      this.nextButton.onTriggerUp.add(() => {
        print("NextButton 1 pressed - switching to ChangeSizePanel");
        this.switchToChangeSizePanel();
      });
    } else {
      print("WARNING: NextButton 1 is not assigned!");
    }

    // Set up the second navigation button
    // When pressed, this button moves from the size panel to the color panel
    if (this.nextButton2) {
      print("NextButton 2 connected");
      this.nextButton2.onTriggerUp.add(() => {
        print("NextButton 2 pressed - switching to ChangeColorPanell");
        this.switchToChangeColorPanel();
      });
    } else {
      print("WARNING: NextButton 2 is not assigned!");
    }
  }

  // Helper method to hide all three panels
  // This ensures only one panel is visible at a time
  hideAllPanels() {
    print("hideAllPanels called");
    // Disable (hide) the spawn shape panel
    if (this.spawnShapePanel) {
      this.spawnShapePanel.enabled = false;
      print("  - spawnShapePanel disabled");
    }
    // Disable (hide) the change size panel
    if (this.changeSizePanel) {
      this.changeSizePanel.enabled = false;
      print("  - changeSizePanel disabled");
    }
    // Disable (hide) the change color panel
    if (this.changeColorPanel) {
      this.changeColorPanel.enabled = false;
      print("  - changeColorPanel disabled");
    }
  }

  // Navigation method to switch to the size adjustment panel
  switchToChangeSizePanel() {
    print("Switching to ChangeSizePanel...");
    // First hide all panels
    this.hideAllPanels();
    
    // Then enable (show) only the change size panel
    if (this.changeSizePanel) {
      this.changeSizePanel.enabled = true;
      print("ChangeSizePanel enabled: " + this.changeSizePanel.enabled);
    } else {
      print("ERROR: changeSizePanel is undefined!");
    }
  }

  // Navigation method to switch to the color selection panel
  switchToChangeColorPanel() {
    print("Switching to ChangeColorPanel...");

    // Apply the currently selected color before switching panels
    if (this.colorPickerController) {
      this.colorPickerController.applyColor();
    }

    // Hide all panels first
    this.hideAllPanels();
    
    // Then enable (show) only the change color panel
    if (this.changeColorPanel) {
      this.changeColorPanel.enabled = true;
      print("ChangeColorPanel enabled: " + this.changeColorPanel.enabled);
      print("ChangeColorPanel name: " + this.changeColorPanel.name);
    } else {
      print("ERROR: ChangeColorPanel is undefined!");
    }
  }
}