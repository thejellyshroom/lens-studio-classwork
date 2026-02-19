// Component decorator - marks this class as a Lens Studio component
@component
export class SpawnShape extends BaseScriptComponent {
    // Reference to the cylinder 3D mesh visual component
    @input
    cylinderMesh: RenderMeshVisual;
    
    // Reference to the box/cube 3D mesh visual component
    @input
    boxMesh: RenderMeshVisual;
    
    // Reference to the sphere 3D mesh visual component
    @input
    sphereMesh: RenderMeshVisual;
    
    // Reference to the UI button that selects the cylinder shape
    @input
    cylinderButton: any;
    
    // Reference to the UI button that selects the sphere shape
    @input
    sphereButton: any;
    
    // Reference to the UI button that selects the cube shape
    @input
    cubeButton: any;
    
    // Reference to the slider controller that handles scaling of the active shape
    @input
    sliderScaleController: any;
    
    // Tracks which mesh is currently visible and being manipulated
    private activeMesh: RenderMeshVisual | null = null;
    
    // Lifecycle method - called when the component wakes up
    onAwake() {
        // Start with all shapes hidden
        this.hideAllMeshes();
        
        // Create a delayed event to ensure button components are fully initialized
        // before binding event listeners
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            // Set up cylinder button - when pressed (value becomes 1), show cylinder
            this.cylinderButton.onValueChange.add((value: number) => {
                if (value === 1) this.showCylinder();
            });
            
            // Set up sphere button - when pressed (value becomes 1), show sphere
            this.sphereButton.onValueChange.add((value: number) => {
                if (value === 1) this.showSphere();
            });
            
            // Set up cube button - when pressed (value becomes 1), show cube/box
            this.cubeButton.onValueChange.add((value: number) => {
                if (value === 1) this.showBox();
            });
        });
        // Wait 0.1 seconds before binding button events to ensure UI is ready
        delayedEvent.reset(0.1);
    }
    
    // Helper method to hide all three shape meshes
    // Ensures only one shape is visible at a time
    hideAllMeshes() {
        this.cylinderMesh.enabled = false;
        this.boxMesh.enabled = false;
        this.sphereMesh.enabled = false;
    }
    
    // Show the cylinder shape and set it as the active mesh
    showCylinder() {
        // First hide all other shapes
        this.hideAllMeshes();
        // Enable (show) the cylinder mesh
        this.cylinderMesh.enabled = true;
        // Set cylinder as the currently active mesh for color/scale operations
        this.activeMesh = this.cylinderMesh;
        // Tell the slider controller which mesh it should scale
        this.sliderScaleController.setActiveMesh(this.cylinderMesh.getSceneObject());
    }
    
    // Show the box/cube shape and set it as the active mesh
    showBox() {
        // First hide all other shapes
        this.hideAllMeshes();
        // Enable (show) the box mesh
        this.boxMesh.enabled = true;
        // Set box as the currently active mesh for color/scale operations
        this.activeMesh = this.boxMesh;
        // Tell the slider controller which mesh it should scale
        this.sliderScaleController.setActiveMesh(this.boxMesh.getSceneObject());
    }
    
    // Show the sphere shape and set it as the active mesh
    showSphere() {
        // First hide all other shapes
        this.hideAllMeshes();
        // Enable (show) the sphere mesh
        this.sphereMesh.enabled = true;
        // Set sphere as the currently active mesh for color/scale operations
        this.activeMesh = this.sphereMesh;
        // Tell the slider controller which mesh it should scale
        this.sliderScaleController.setActiveMesh(this.sphereMesh.getSceneObject());
    }
    
    /**
     * Apply color to the currently active mesh
     * @param color - A vec4 containing RGBA values (each component 0-1)
     */
public setColor(color: vec4) {
    // Check if there's an active mesh to apply color to
    if (!this.activeMesh) {
        print("SpawnShape: No active mesh to color");
        return;
    }
    
    // Get the material pass which contains color properties
    const mainPass = this.activeMesh.mainPass;
    if (mainPass) {
        // Different material types use different property names for color
        // Try baseColor first (used by PBR materials)
        if (mainPass.baseColor !== undefined) {
            mainPass.baseColor = color;
            print("SpawnShape: Color applied via baseColor - RGBA(" + 
                  color.x.toFixed(2) + ", " + 
                  color.y.toFixed(2) + ", " + 
                  color.z.toFixed(2) + ", " + 
                  color.w.toFixed(2) + ")");
        } 
        // If baseColor doesn't exist, try mainColor (used by other material types)
        else if (mainPass.mainColor !== undefined) {
            mainPass.mainColor = color;
            print("SpawnShape: Color applied via mainColor - RGBA(" + 
                  color.x.toFixed(2) + ", " + 
                  color.y.toFixed(2) + ", " + 
                  color.z.toFixed(2) + ", " + 
                  color.w.toFixed(2) + ")");
        } 
        // If neither property exists, the material doesn't support coloring
        else {
            print("SpawnShape: ERROR - No color property found on material!");
        }
    } else {
        print("SpawnShape: No mainPass found on mesh");
    }
}

    /**
     * Get the currently active mesh
     * @returns The currently visible and active RenderMeshVisual, or null if none is active
     */
    public getActiveMesh(): RenderMeshVisual | null {
        return this.activeMesh;
    }
}