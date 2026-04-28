const assert = require("assert");
const fs = require("fs");
const path = require("path");

const scriptPath = path.join(__dirname, "..", "Assets", "Scripts", "FlaneurPinInput.js");
const source = fs.readFileSync(scriptPath, "utf8");

assert.match(source, /@input Component\.DeviceTracking deviceTracking/, "FlaneurPinInput should accept DeviceTracking for world mesh placement.");
assert.match(source, /@input bool pinDropUseWorldMesh/, "FlaneurPinInput should expose a world mesh placement toggle.");
assert.match(source, /hitTestWorldMesh/, "FlaneurPinInput should use screen-position world mesh hit testing.");
assert.match(source, /raycastWorldMesh/, "FlaneurPinInput should fall back to a camera-forward world mesh raycast.");
assert.match(source, /TriggerPrimaryEvent[\s\S]*commitWorldMeshFromScreen01/, "TriggerPrimaryEvent should drive world mesh placement at center screen.");
assert.match(source, /SpectaclesInteractionKit\.lspkg\/SIK/, "FlaneurPinInput should use SIK directly for Spectacles hand trigger input.");
assert.match(source, /getInteractorsByType/, "FlaneurPinInput should inspect SIK interactors even when no target is hovered.");
assert.match(source, /commitWorldMeshFromRay/, "FlaneurPinInput should raycast the world mesh from the hand interactor ray.");
assert.match(source, /lastSikRay[\s\S]*commitWorldMeshFromRay[\s\S]*lastSikRay = null;[\s\S]*return;/, "SIK release should not fall back to center-screen placement after a hand ray miss.");
assert.match(source, /flaneurPinIsSidebarOpen/, "FlaneurPinInput should block pin drops while the sidebar is open.");
assert.match(source, /flaneurPinIsMeshPinSuppressedAfterSidebarClose/, "FlaneurPinInput should honor sidebar-close mesh pin suppression.");
assert.match(source, /getCameraViewportSize/, "FlaneurPinInput should guard camera viewport helpers on Spectacles.");
assert.match(source, /typeof cam\.getViewportWidth === "function"/, "FlaneurPinInput should check viewport methods before calling them.");
assert.match(source, /No world mesh hit/, "FlaneurPinInput should log no-hit cases when debug logging is enabled.");

console.log("FlaneurPinInput world mesh placement checks passed.");
