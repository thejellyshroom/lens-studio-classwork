// Component decorator - marks this class as a Lens Studio component
@component
export class SliderScaleController extends BaseScriptComponent {
    // Reference to the UI slider component that controls the scale
    @input
    slider: any;
    
    // Minimum scale multiplier (when slider is at 0)
    @input
    minScale: number = 1;
    
    // Maximum scale multiplier (when slider is at 1)
    @input
    maxScale: number = 10;
    
    // Reference to the currently active 3D object being scaled
    private currentMesh: SceneObject = null;
    
    // Stores the original scale of the mesh before any slider adjustments
    // Used as a baseline for calculating new scales
    private baseScale: vec3;
    
    // Lifecycle method - called when the component wakes up
    onAwake() {
        // Create a delayed event to ensure slider component is fully initialized
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            // Verify slider exists and has the value change event
            if (this.slider && this.slider.onValueChange) {
                // Listen for slider value changes (0 to 1 range)
                // When slider moves, update the mesh scale
                this.slider.onValueChange.add((value: number) => {
                    this.updateScale(value);
                });
                
                // Initialize slider to minimum scale position (value = 0)
                // Only reset if slider isn't already at 0
                if (this.slider.currentValue !== 0) {
                    this.slider.updateCurrentValue(0);
                }
            }
        });
        // Wait 0.1 seconds before setting up slider to ensure UI is ready
        delayedEvent.reset(0.1);
    }
    
    // Called by SpawnShape component when a new shape is selected
    // Sets which 3D object the slider should control
    setActiveMesh(mesh: SceneObject) {
        print("Setting active mesh: " + mesh.name);
        this.currentMesh = mesh;
        if (this.currentMesh) {
            // Store the mesh's original/default scale as the baseline
            this.baseScale = this.currentMesh.getTransform().getLocalScale();
            // Reset the mesh to minimum scale when first selected
            this.updateScale(0);
            // Reset slider UI to starting position (0)
            if (this.slider) {
                this.slider.updateCurrentValue(0);
            }
        }
    }
    
    // Updates the 3D mesh scale based on slider value
    // @param sliderValue - Number between 0 and 1 from the slider
    updateScale(sliderValue: number) {
        // Ensure there's a mesh to scale
        if (!this.currentMesh) {
            print("No current mesh to scale");
            return;
        }
        
        // Convert slider value (0-1) to scale multiplier (minScale to maxScale)
        // Formula: min + (max - min) * sliderValue
        // Example: if min=1, max=10, value=0.5 → 1 + (10-1)*0.5 = 5.5x scale
        const scaleMultiplier = this.minScale + (this.maxScale - this.minScale) * sliderValue;
        
        // Apply the multiplier uniformly to all axes (x, y, z) of the base scale
        const newScale = this.baseScale.uniformScale(scaleMultiplier);
        
        // Update the mesh's transform with the new scale
        this.currentMesh.getTransform().setLocalScale(newScale);
        print("Scale updated to: " + scaleMultiplier);
    }
}