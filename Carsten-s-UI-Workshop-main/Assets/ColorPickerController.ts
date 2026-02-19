import { SpawnShape } from "SpawnShape";

// Component decorator - marks this class as a Lens Studio component
@component
export class ColorPickerController extends BaseScriptComponent {
    // Reference to the UI element that displays the currently selected color
    @input
    @hint("The Sample Color Indicator object that shows the selected color")
    sampleColorIndicator: SceneObject;
    
    // Reference to the SpawnShape component that will receive the color updates
    @input
    spawnShape: SpawnShape;
    
    // Toggle between real-time color updates (true) or manual updates only (false)
    @input
    @hint("Update color continuously (real-time) or only on demand")
    continuousUpdate: boolean = true;
    
    // Event that runs every frame to check for color changes
    private updateEvent: SceneEvent;
    
    // Stores the previously applied color to detect when the color has changed
    private lastColor: vec4 = new vec4(0, 0, 0, 0);
    
    // Lifecycle method - called when the component wakes up
    onAwake() {
        print("=== ColorPickerController: onAwake called ===");
        // Set up the initialization to run when the lens starts
        this.createEvent("OnStartEvent").bind(() => {
            this.initialize();
        });
    }
    
    // Initialization method - sets up the color picker and determines update mode
    initialize() {
        print("=== ColorPickerController: initialize called ===");
        print("ColorPickerController: continuousUpdate = " + this.continuousUpdate);
        
        // Verify that the sample color indicator was assigned in the Inspector
        if (!this.sampleColorIndicator) {
            print("ColorPickerController: ERROR - Sample Color Indicator NOT ASSIGNED!");
            return;
        }
        print("ColorPickerController: Sample Color Indicator assigned: " + this.sampleColorIndicator.name);
        
        // Verify that the spawn shape component was assigned in the Inspector
        if (!this.spawnShape) {
            print("ColorPickerController: ERROR - SpawnShape NOT ASSIGNED!");
            return;
        }
        print("ColorPickerController: SpawnShape assigned");
        
        // If continuous update is enabled, set up an event that runs every frame
        if (this.continuousUpdate) {
            print("ColorPickerController: Setting up continuous update");
            // Create an update event that fires every frame
            this.updateEvent = this.createEvent("UpdateEvent");
            // Bind the color checking method to run on each update
            this.updateEvent.bind(() => {
                this.updateColorIfChanged();
            });
            print("ColorPickerController: Update event bound successfully");
        } else {
            // Manual mode - color will only update when applyColor() is explicitly called
            print("ColorPickerController: Continuous update is OFF");
        }
        
        print("=== ColorPickerController: Initialized ===");
    }
    
    // Checks if the color has changed and updates the spawned shape if it has
    // Only used when continuousUpdate is true
    private updateColorIfChanged() {
        // Get the currently selected color from the color picker
        const color = this.getSelectedColor();
        if (!color) {
            return;
        }
        
        // Compare current color with the last applied color to avoid redundant updates
        if (!this.colorsEqual(color, this.lastColor)) {
            // Log the new color values for debugging
            print("ColorPickerController: Color changed! RGBA(" + 
                  color.x.toFixed(2) + ", " + 
                  color.y.toFixed(2) + ", " + 
                  color.z.toFixed(2) + ", " + 
                  color.w.toFixed(2) + ")");
            // Apply the new color to the spawned shape
            this.spawnShape.setColor(color);
            // Update the stored color to the new value
            this.lastColor = color;
        }
    }
    
    // Helper method to compare two colors with tolerance for floating-point precision
    // Returns true if colors are effectively the same
    private colorsEqual(c1: vec4, c2: vec4): boolean {
        // Small threshold to account for floating-point rounding errors
        const epsilon = 0.01;
        // Check if all four components (R, G, B, A) are within the epsilon threshold
        return Math.abs(c1.x - c2.x) < epsilon &&
               Math.abs(c1.y - c2.y) < epsilon &&
               Math.abs(c1.z - c2.z) < epsilon &&
               Math.abs(c1.w - c2.w) < epsilon;
    }
    
    // Retrieves the current color from the sample color indicator's material
    // Returns a vec4 (RGBA) color or null if the color cannot be retrieved
    private getSelectedColor(): vec4 | null {
        // Get the RenderMeshVisual component which contains the material/color info
        const renderMesh = this.sampleColorIndicator.getComponent(
            "Component.RenderMeshVisual"
        ) as RenderMeshVisual;
        
        // Verify the component exists
        if (!renderMesh) {
            print("ColorPickerController: No RenderMeshVisual!");
            return null;
        }
        
        // Get the main material pass (where color properties are stored)
        const mainPass = renderMesh.mainPass;
        if (!mainPass) {
            print("ColorPickerController: No mainPass!");
            return null;
        }
        
        // Return the main color property if it exists
        if (mainPass.mainColor) {
            return mainPass.mainColor;
        }
        
        print("ColorPickerController: No mainColor found!");
        return null;
    }
    
    // Public method to manually apply the current color to the spawned shape
    // Used when continuousUpdate is false or when explicitly triggered
    public applyColor() {
        print("ColorPickerController: applyColor() called");
        // Get the current selected color
        const color = this.getSelectedColor();
        if (color) {
            // Apply it to the spawned shape
            this.spawnShape.setColor(color);
            // Update the stored last color
            this.lastColor = color;
        }
    }
}