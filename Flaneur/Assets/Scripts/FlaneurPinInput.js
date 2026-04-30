/**
 * Flaneur — Spectacles SIK pin input.
 *
 * Owns:
 * - Watching SIK interactor trigger release
 * - Raycasting the released hand ray against the Spectacles world mesh
 *
 * Calls:
 * - `global.flaneurCommitPinAtWorldPosition(worldVec3)`
 */

// @input Component.Camera worldCamera
// @input Component.DeviceTracking deviceTracking
// @input float worldMeshRayDistance = 5000.0
// @input bool placementPreviewEnabled = true
// @input SceneObject placementPreviewReticleTemplate
// @input float placementPreviewReticleScale = 1.0
// @input bool logPinInputDebug = false

var SIK = null;
var InteractorTriggerType = null;
var InteractorInputType = null;
var sikModulesLoaded = false;
var sikModulesAttempted = false;
var sikTriggerActive = false;
var lastSikRay = null;
var lastSikStatusLog = -999;
var placementPreviewReticle = null;

function dbg(msg) {
  if (script.logPinInputDebug) print("[Flaneur][pin-input] " + msg);
}

function tryGetDeviceTracking() {
  if (script.deviceTracking && !isNull(script.deviceTracking)) return script.deviceTracking;
  try {
    if (script.worldCamera && !isNull(script.worldCamera)) {
      var camSo = script.worldCamera.getSceneObject();
      if (camSo && !isNull(camSo)) {
        return camSo.getComponent("Component.DeviceTracking") || camSo.getComponent("DeviceTracking");
      }
    }
  } catch (eCamTracker) {}
  return null;
}

function loadSikModulesIfNeeded() {
  if (sikModulesAttempted) return sikModulesLoaded;
  sikModulesAttempted = true;
  try {
    var sikModule = require("SpectaclesInteractionKit.lspkg/SIK");
    SIK = sikModule.SIK;
    var interactorModule = require("SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor");
    InteractorTriggerType = interactorModule.InteractorTriggerType;
    InteractorInputType = interactorModule.InteractorInputType;
    sikModulesLoaded = !!(SIK && SIK.InteractionManager);
  } catch (eSik) {
    sikModulesLoaded = false;
    dbg("SIK trigger input unavailable: " + eSik);
  }
  return sikModulesLoaded;
}

function getSikInteractors() {
  if (!loadSikModulesIfNeeded()) return [];
  try {
    var targeted = SIK.InteractionManager.getTargetingInteractors();
    if (targeted && targeted.length > 0) return targeted;
  } catch (eTargeted) {}
  try {
    if (InteractorInputType && InteractorInputType.All !== undefined) {
      var all = SIK.InteractionManager.getInteractorsByType(InteractorInputType.All);
      if (all && all.length > 0) return all;
    }
  } catch (eAll) {}
  return [];
}

function isSikInteractorTriggered(interactor) {
  if (!interactor) return false;
  try {
    if (InteractorTriggerType && InteractorTriggerType.None !== undefined) {
      return interactor.currentTrigger !== InteractorTriggerType.None;
    }
    return !!interactor.currentTrigger;
  } catch (eTrigger) {
    return false;
  }
}

function getRayFromSikInteractor(interactor) {
  if (!interactor) return null;
  try {
    if (interactor.startPoint && interactor.endPoint) {
      return { from: interactor.startPoint, to: interactor.endPoint };
    }
  } catch (ePoints) {}
  return null;
}

function pinDropIsSuppressed() {
  try {
    if (typeof global === "undefined") return false;
    if (global.flaneurUiPressActive === true) {
      dbg("Blocked pin drop (uiPressActive).");
      return true;
    }
    if (global.flaneurSuppressPinDropUntil && getTime() < global.flaneurSuppressPinDropUntil) {
      dbg("Blocked pin drop (suppressed).");
      return true;
    }
    if (typeof global.flaneurPinIsSidebarOpen === "function" && global.flaneurPinIsSidebarOpen()) {
      dbg("Blocked pin drop (sidebar open).");
      return true;
    }
    if (
      typeof global.flaneurPinIsMeshPinSuppressedAfterSidebarClose === "function" &&
      global.flaneurPinIsMeshPinSuppressedAfterSidebarClose()
    ) {
      dbg("Blocked pin drop (sidebar close suppression).");
      return true;
    }
  } catch (eUi) {}
  return false;
}

function getPlacementPreviewReticle() {
  if (placementPreviewReticle && !isNull(placementPreviewReticle)) return placementPreviewReticle;
  var template = script.placementPreviewReticleTemplate;
  if (!template || isNull(template)) {
    dbg("No placement preview reticle template assigned.");
    return null;
  }
  try {
    placementPreviewReticle = script.getSceneObject().copySceneObject(template);
    placementPreviewReticle.name = "FlaneurPlacementReticle";
    placementPreviewReticle.enabled = false;
  } catch (eCopy) {
    placementPreviewReticle = null;
    dbg("Failed to copy placement preview reticle: " + eCopy);
  }
  return placementPreviewReticle;
}

function hidePlacementPreview() {
  if (placementPreviewReticle && !isNull(placementPreviewReticle)) placementPreviewReticle.enabled = false;
}

function commitWorldPosition(world, sourceLabel) {
  if (!world) return false;
  try {
    if (typeof global !== "undefined" && typeof global.flaneurCommitPinAtWorldPosition === "function") {
      global.flaneurCommitPinAtWorldPosition(world);
      dbg("Committed pin from " + sourceLabel + " at " + world.x.toFixed(1) + "," + world.y.toFixed(1) + "," + world.z.toFixed(1));
      return true;
    }
  } catch (eCommit) {
    dbg("Failed to commit pin from " + sourceLabel + ": " + eCommit);
  }
  dbg("No flaneurCommitPinAtWorldPosition global yet.");
  return false;
}

function clampRayToConfiguredDistance(from, to) {
  var maxDist = script.worldMeshRayDistance;
  if (maxDist === undefined || maxDist === null || maxDist <= 0) maxDist = 5000;
  var dx = to.x - from.x;
  var dy = to.y - from.y;
  var dz = to.z - from.z;
  var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len <= 1e-3 || len <= maxDist) return to;
  var invLen = 1.0 / len;
  return from.add(new vec3(dx * invLen, dy * invLen, dz * invLen).uniformScale(maxDist));
}

function hitWorldMeshFromRay(from, to) {
  var tracker = tryGetDeviceTracking();
  if (!tracker || isNull(tracker) || !from || !to) return null;
  try {
    if (tracker.raycastWorldMesh) {
      var rayHits = tracker.raycastWorldMesh(from, clampRayToConfiguredDistance(from, to));
      if (rayHits && rayHits.length > 0 && rayHits[0] && rayHits[0].position) return rayHits[0];
    }
  } catch (eRay) {}
  return null;
}

function updatePlacementPreviewFromRay(ray) {
  if (script.placementPreviewEnabled === false || !ray) {
    hidePlacementPreview();
    return null;
  }
  var hit = hitWorldMeshFromRay(ray.from, ray.to);
  if (!hit || !hit.position) {
    hidePlacementPreview();
    return null;
  }
  var reticle = getPlacementPreviewReticle();
  if (!reticle || isNull(reticle)) return hit;
  reticle.enabled = true;
  try {
    var tr = reticle.getTransform();
    tr.setWorldPosition(hit.position);
    if (hit.normal) tr.setWorldRotation(quat.lookAt(vec3.forward(), hit.normal));
    var sc = script.placementPreviewReticleScale;
    if (sc === undefined || sc === null || sc <= 0) sc = 1.0;
    tr.setWorldScale(new vec3(sc, sc, sc));
  } catch (eTr) {}
  return hit;
}

function commitWorldMeshFromRay(from, to, sourceLabel) {
  if (pinDropIsSuppressed()) return true;
  var tracker = tryGetDeviceTracking();
  if (!tracker || isNull(tracker)) {
    dbg("No DeviceTracking assigned for world mesh ray pin drop.");
    return false;
  }
  if (!from || !to) {
    dbg("No SIK ray available for world mesh pin drop.");
    return false;
  }
  try {
    var hit = hitWorldMeshFromRay(from, to);
    if (hit && hit.position) {
      return commitWorldPosition(hit.position, sourceLabel || "SIK world mesh raycast");
    }
  } catch (eRay) {
    dbg("SIK raycastWorldMesh failed: " + eRay);
  }
  dbg("No world mesh hit from SIK hand ray. Scan surfaces and confirm World Mesh + DeviceTracking are enabled.");
  return false;
}

function updateSikTriggerPinInput() {
  var interactors = getSikInteractors();
  var triggered = false;
  var currentRay = null;
  for (var i = 0; i < interactors.length; i++) {
    var interactor = interactors[i];
    currentRay = getRayFromSikInteractor(interactor) || currentRay;
    if (isSikInteractorTriggered(interactor)) {
      triggered = true;
      currentRay = getRayFromSikInteractor(interactor) || currentRay;
      break;
    }
  }
  if (currentRay) updatePlacementPreviewFromRay(currentRay);
  else hidePlacementPreview();
  if (triggered) {
    if (currentRay) lastSikRay = currentRay;
    sikTriggerActive = true;
    return;
  }
  if (sikTriggerActive) {
    sikTriggerActive = false;
    if (lastSikRay) {
      commitWorldMeshFromRay(lastSikRay.from, lastSikRay.to, "SIK trigger release");
      lastSikRay = null;
      return;
    }
    dbg("SIK trigger released without a usable ray.");
  }
  if (script.logPinInputDebug) {
    var now = getTime();
    if (now - lastSikStatusLog > 3.0) {
      lastSikStatusLog = now;
      dbg("SIK status loaded=" + sikModulesLoaded + " interactors=" + interactors.length + " triggerActive=" + sikTriggerActive);
    }
  }
}

script.createEvent("TurnOnEvent").bind(function () {
  dbg("ready sikTrigger=true worldMeshRaycast=true deviceTracking=" + !!tryGetDeviceTracking());
});

script.createEvent("UpdateEvent").bind(function () {
  updateSikTriggerPinInput();
});
