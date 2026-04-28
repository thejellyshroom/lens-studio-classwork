/**
 * Flâneur — Pin input + UI blocker sampling.
 *
 * Owns:
 * - Listening for taps / trigger primary (optional)
 * - (Optional) global screen pin events
 * - UI blocker sampling to prevent pin drops "through" UI
 *
 * Calls:
 * - `global.flaneurCommitPinAtWorldPosition(worldVec3)`
 *
 * Exposes:
 * - `global.flaneurPinIsScreenOverBlockerUi(screenPos01Vec2)` used by other systems if needed
 */

// @input Component.Camera worldCamera
// @input Component.DeviceTracking deviceTracking
// @input bool pinDropUseWorldMesh = true
// @input bool pinDropUseScreenSpaceFallback = false
// @input float placementDepth = 200.0
// @input float worldMeshRayDistance = 5000.0
// @input Component.InteractionComponent pinDropInteraction
// @input bool pinDropFromGlobalScreenEvents = false
// @input bool pinDropListenTriggerPrimary = false
// @input bool pinDropListenSikTrigger = true
// @input bool editorTouchBlockingForPreview = false
// @input SceneObject pinDropUiBlockerRoot
// @input SceneObject pinDropUiBlockerRootExtra
// @input bool pinDropUseWorldUiProjectionBlock = true
// @input float pinDropWorldUiBlockScreenRadius = 0.11
// @input int pinDropUiWorldProjectionSampleBudget = 400
// @input Component.Camera pinDropUiScreenSpaceCamera
// @input bool logPinInputDebug = false

var blockers = [];
var blockersDirty = true;
var lastBlockerScanTime = -999;
var SIK = null;
var InteractorTriggerType = null;
var InteractorInputType = null;
var sikModulesLoaded = false;
var sikModulesAttempted = false;
var sikTriggerActive = false;
var lastSikRay = null;
var lastSikStatusLog = -999;

function dbg(msg) {
  if (script.logPinInputDebug) print("[Flaneur][pin-input] " + msg);
}

function info(msg) {
  print("[Flaneur][pin-input] " + msg);
}

function clampInt(v, lo, hi) {
  v = Math.floor(v);
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function isValidSo(so) { return so && !isNull(so); }

function tryGetScreenSpaceCamera() {
  if (script.pinDropUiScreenSpaceCamera && !isNull(script.pinDropUiScreenSpaceCamera)) return script.pinDropUiScreenSpaceCamera;
  if (script.worldCamera && !isNull(script.worldCamera)) return script.worldCamera;
  return null;
}

function collectBlockersFromRoot(root, outArr) {
  if (!isValidSo(root)) return;
  outArr.push(root);
  var n = root.getChildrenCount();
  for (var i = 0; i < n; i++) collectBlockersFromRoot(root.getChild(i), outArr);
}

function getGlobalNavigationUiRoot() {
  try {
    if (typeof global !== "undefined" && global.flaneurNavigationUiRoot && !isNull(global.flaneurNavigationUiRoot)) {
      return global.flaneurNavigationUiRoot;
    }
  } catch (eRoot) {}
  return null;
}

function refreshUiBlockersIfNeeded(force) {
  var now = getTime();
  if (!force && !blockersDirty && now - lastBlockerScanTime < 1.0) return;
  blockersDirty = false;
  lastBlockerScanTime = now;
  blockers = [];
  collectBlockersFromRoot(script.pinDropUiBlockerRoot, blockers);
  if (script.pinDropUiBlockerRootExtra && !isNull(script.pinDropUiBlockerRootExtra)) collectBlockersFromRoot(script.pinDropUiBlockerRootExtra, blockers);
  collectBlockersFromRoot(getGlobalNavigationUiRoot(), blockers);
}

function getCameraViewportSize(cam) {
  if (!cam || isNull(cam)) return null;
  try {
    if (typeof cam.getViewportWidth === "function" && typeof cam.getViewportHeight === "function") {
      var w = cam.getViewportWidth();
      var h = cam.getViewportHeight();
      if (w > 0 && h > 0) return new vec2(w, h);
    }
  } catch (eViewport) {}
  return null;
}

function screen01ToScreenPx(screen01, cam) {
  var viewport = getCameraViewportSize(cam);
  if (!viewport) return null;
  return new vec2(screen01.x * viewport.x, screen01.y * viewport.y);
}

function screenPxToScreen01(screenPx, cam) {
  var viewport = getCameraViewportSize(cam);
  if (!viewport) return null;
  return new vec2(screenPx.x / viewport.x, screenPx.y / viewport.y);
}

function dist2(a, b) { var dx = a.x - b.x; var dy = a.y - b.y; return dx * dx + dy * dy; }

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

function tryGetWorldPositionFromScreen01(screen01) {
  var cam = script.worldCamera;
  if (!cam || isNull(cam)) return null;
  // Lens Studio Camera projection helpers vary by template; use unproject if available.
  try {
    if (cam.screenSpaceToWorldSpace) {
      return cam.screenSpaceToWorldSpace(new vec3(screen01.x, screen01.y, script.placementDepth));
    }
  } catch (e1) {}
  try {
    if (cam.unproject) {
      var px = screen01ToScreenPx(screen01, cam);
      if (!px) return null;
      return cam.unproject(new vec3(px.x, px.y, script.placementDepth));
    }
  } catch (e2) {}
  return null;
}

function tryGetWorldRayFromScreen01(screen01) {
  var cam = script.worldCamera;
  if (!cam || isNull(cam)) return null;
  var maxDist = script.worldMeshRayDistance;
  if (maxDist === undefined || maxDist === null || maxDist <= 0) maxDist = 5000;
  try {
    if (cam.screenSpaceToWorldSpace) {
      return {
        from: cam.screenSpaceToWorldSpace(new vec3(screen01.x, screen01.y, 1.0)),
        to: cam.screenSpaceToWorldSpace(new vec3(screen01.x, screen01.y, maxDist)),
      };
    }
  } catch (eScreenRay) {}
  try {
    if (cam.unproject) {
      var px = screen01ToScreenPx(screen01, cam);
      if (!px) return null;
      return {
        from: cam.unproject(new vec3(px.x, px.y, 1.0)),
        to: cam.unproject(new vec3(px.x, px.y, maxDist)),
      };
    }
  } catch (eUnprojectRay) {}
  try {
    var camTr = cam.getSceneObject().getTransform();
    var from = camTr.getWorldPosition();
    var dir = camTr.back || camTr.forward;
    if (!dir) return null;
    return { from: from, to: from.add(dir.uniformScale(maxDist)) };
  } catch (eFallbackRay) {}
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

function commitWorldMeshFromRay(from, to, sourceLabel) {
  if (script.pinDropUseWorldMesh === false) return false;
  if (!pinIsAllowedAtScreen01(new vec2(0.5, 0.5))) {
    dbg("Blocked world mesh ray pin drop (UI blocker).");
    return true;
  }
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
    if (tracker.raycastWorldMesh) {
      var rayHits = tracker.raycastWorldMesh(from, to);
      if (rayHits && rayHits.length > 0 && rayHits[0] && rayHits[0].position) {
        return commitWorldPosition(rayHits[0].position, sourceLabel || "SIK world mesh raycast");
      }
    }
  } catch (eRay) {
    dbg("SIK raycastWorldMesh failed: " + eRay);
  }
  dbg("No world mesh hit from SIK hand ray. Scan surfaces and confirm World Mesh + DeviceTracking are enabled.");
  return false;
}

function commitWorldMeshFromScreen01(screen01) {
  if (script.pinDropUseWorldMesh === false) return false;
  if (!pinIsAllowedAtScreen01(screen01)) {
    dbg("Blocked world mesh pin drop (UI blocker).");
    return true;
  }
  var tracker = tryGetDeviceTracking();
  if (!tracker || isNull(tracker)) {
    dbg("No DeviceTracking assigned for world mesh pin drop.");
    return false;
  }
  try {
    if (tracker.hitTestWorldMesh) {
      var hits = tracker.hitTestWorldMesh(screen01);
      if (hits && hits.length > 0 && hits[0] && hits[0].position) {
        return commitWorldPosition(hits[0].position, "world mesh hitTest");
      }
    }
  } catch (eHit) {
    dbg("hitTestWorldMesh failed: " + eHit);
  }
  try {
    if (tracker.raycastWorldMesh) {
      var ray = tryGetWorldRayFromScreen01(screen01);
      if (ray && ray.from && ray.to) {
        var rayHits = tracker.raycastWorldMesh(ray.from, ray.to);
        if (rayHits && rayHits.length > 0 && rayHits[0] && rayHits[0].position) {
          return commitWorldPosition(rayHits[0].position, "world mesh raycast");
        }
      }
    }
  } catch (eRay) {
    dbg("raycastWorldMesh failed: " + eRay);
  }
  dbg("No world mesh hit at screen " + screen01.x.toFixed(2) + "," + screen01.y.toFixed(2) + ". Scan surfaces and confirm World Mesh + DeviceTracking are enabled.");
  return false;
}

function isTapOverPinDropUiBlocker(screen01) {
  if (!script.pinDropUseWorldUiProjectionBlock) return false;
  if (!blockers || blockers.length === 0) return false;
  var cam = tryGetScreenSpaceCamera();
  if (!cam) return false;

  var budget = clampInt(script.pinDropUiWorldProjectionSampleBudget || 0, 0, 5000);
  if (budget <= 0) return false;

  var viewport = getCameraViewportSize(cam);
  if (!viewport) return false;
  var screenPx = screen01ToScreenPx(screen01, cam);
  if (!screenPx) return false;
  var r = Math.max(0.0, script.pinDropWorldUiBlockScreenRadius || 0.0);
  var rPx = r * Math.max(viewport.x, viewport.y);
  var rPx2 = rPx * rPx;

  // Sample a subset of blockers by budget; stable stride over array.
  var n = blockers.length;
  var stride = Math.max(1, Math.floor(n / Math.max(1, budget)));
  var samples = 0;

  for (var i = 0; i < n && samples < budget; i += stride) {
    var so = blockers[i];
    if (!isValidSo(so) || !so.enabled) continue;
    var tr = so.getTransform();
    if (!tr) continue;
    var wpos = tr.getWorldPosition();
    var sp01 = null;
    try {
      if (cam.worldSpaceToScreenSpace) sp01 = cam.worldSpaceToScreenSpace(wpos);
      else if (cam.project) {
        var sp = cam.project(wpos);
        sp01 = screenPxToScreen01(new vec2(sp.x, sp.y), cam);
      }
    } catch (eP) {}
    if (!sp01) continue;
    var spPx = screen01ToScreenPx(new vec2(sp01.x, sp01.y), cam);
    if (!spPx) continue;
    if (dist2(spPx, screenPx) <= rPx2) return true;
    samples++;
  }
  return false;
}

function isTapOverNavigationUi(screen01) {
  var navRoot = getGlobalNavigationUiRoot();
  if (!isValidSo(navRoot) || !navRoot.enabled) return false;
  var cam = tryGetScreenSpaceCamera();
  if (!cam) return false;
  var viewport = getCameraViewportSize(cam);
  if (!viewport) return false;
  var screenPx = screen01ToScreenPx(screen01, cam);
  if (!screenPx) return false;
  var r = Math.max(script.pinDropWorldUiBlockScreenRadius || 0.0, 0.18);
  var rPx = r * Math.max(viewport.x, viewport.y);
  var rPx2 = rPx * rPx;
  var stack = [navRoot];
  var visited = 0;
  while (stack.length > 0 && visited < 500) {
    var so = stack.pop();
    visited++;
    if (!isValidSo(so) || !so.enabled) continue;
    try {
      var sp01 = null;
      var wpos = so.getTransform().getWorldPosition();
      if (cam.worldSpaceToScreenSpace) sp01 = cam.worldSpaceToScreenSpace(wpos);
      else if (cam.project) {
        var sp = cam.project(wpos);
        sp01 = screenPxToScreen01(new vec2(sp.x, sp.y), cam);
      }
      if (sp01) {
        var spPx = screen01ToScreenPx(new vec2(sp01.x, sp01.y), cam);
        if (!spPx) continue;
        if (dist2(spPx, screenPx) <= rPx2) return true;
      }
    } catch (eProj) {}
    try {
      var n = so.getChildrenCount();
      for (var i = 0; i < n; i++) stack.push(so.getChild(i));
    } catch (eChildren) {}
  }
  return false;
}

function pinIsAllowedAtScreen01(screen01) {
  try {
    if (typeof global !== "undefined") {
      if (global.flaneurUiPressActive === true) {
        dbg("Blocked pin drop (uiPressActive).");
        return false;
      }
      if (global.flaneurSuppressPinDropUntil && getTime() < global.flaneurSuppressPinDropUntil) {
        dbg("Blocked pin drop (suppressed).");
        return false;
      }
      if (typeof global.flaneurPinIsSidebarOpen === "function" && global.flaneurPinIsSidebarOpen()) {
        dbg("Blocked pin drop (sidebar open).");
        return false;
      }
      if (
        typeof global.flaneurPinIsMeshPinSuppressedAfterSidebarClose === "function" &&
        global.flaneurPinIsMeshPinSuppressedAfterSidebarClose()
      ) {
        dbg("Blocked pin drop (sidebar close suppression).");
        return false;
      }
    }
  } catch (eUi) {}
  refreshUiBlockersIfNeeded(false);
  if (isTapOverNavigationUi(screen01)) {
    dbg("Blocked pin drop (navigation UI).");
    return false;
  }
  if (isTapOverPinDropUiBlocker(screen01)) return false;
  return true;
}

function commitFromScreen01(screen01, skipWorldMesh) {
  if (skipWorldMesh !== true && commitWorldMeshFromScreen01(screen01)) {
    return;
  }
  if (script.pinDropUseWorldMesh !== false && script.pinDropUseScreenSpaceFallback !== true) {
    return;
  }
  if (!pinIsAllowedAtScreen01(screen01)) {
    dbg("Blocked pin drop (UI blocker).");
    return;
  }
  var world = tryGetWorldPositionFromScreen01(screen01);
  if (!world) {
    dbg("Failed to compute world point from screen.");
    return;
  }
  try {
    if (typeof global !== "undefined" && typeof global.flaneurCommitPinAtWorldPosition === "function") {
      global.flaneurCommitPinAtWorldPosition(world);
    }
  } catch (e) {}
}

function getPrimaryScreen01FromInteractionEvent(e) {
  // Try common fields used by SIK / interaction templates.
  try {
    if (e && e.screenPosition) return new vec2(e.screenPosition.x, e.screenPosition.y);
  } catch (e0) {}
  try {
    if (e && e.position && typeof e.position.x === "number") return new vec2(e.position.x, e.position.y);
  } catch (e1) {}
  return new vec2(0.5, 0.5);
}

function bindInteraction() {
  if (!script.pinDropInteraction || isNull(script.pinDropInteraction)) return;
  try {
    if (script.pinDropInteraction.onTap) {
      script.pinDropInteraction.onTap.add(function (e) {
        commitFromScreen01(getPrimaryScreen01FromInteractionEvent(e));
      });
      return;
    }
  } catch (eA) {}
  // Fallback: TapEvent on this component (older patterns)
  try {
    script.createEvent("TapEvent").bind(function (e) {
      commitFromScreen01(getPrimaryScreen01FromInteractionEvent(e));
    });
  } catch (eB) {}
}

function bindTriggerPrimaryIfEnabled() {
  if (!script.pinDropListenTriggerPrimary) return;
  try {
    script.createEvent("TriggerPrimaryEvent").bind(function () {
      if (!commitWorldMeshFromScreen01(new vec2(0.5, 0.5))) {
        commitFromScreen01(new vec2(0.5, 0.5), true);
      }
    });
  } catch (e) {}
}

function updateSikTriggerPinInput() {
  if (script.pinDropListenSikTrigger === false) return;
  var interactors = getSikInteractors();
  var triggered = false;
  var currentRay = null;
  for (var i = 0; i < interactors.length; i++) {
    var interactor = interactors[i];
    if (isSikInteractorTriggered(interactor)) {
      triggered = true;
      currentRay = getRayFromSikInteractor(interactor) || currentRay;
      break;
    }
  }
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
    commitWorldMeshFromScreen01(new vec2(0.5, 0.5));
  }
  if (script.logPinInputDebug) {
    var now = getTime();
    if (now - lastSikStatusLog > 3.0) {
      lastSikStatusLog = now;
      dbg("SIK status loaded=" + sikModulesLoaded + " interactors=" + interactors.length + " triggerActive=" + sikTriggerActive);
    }
  }
}

function bindGlobalScreenPinEventsIfEnabled() {
  if (!script.pinDropFromGlobalScreenEvents) return;
  try {
    if (typeof global !== "undefined") {
      global.flaneurGlobalScreenPinDrop = function (screen01) {
        if (!screen01) screen01 = new vec2(0.5, 0.5);
        commitFromScreen01(screen01);
      };
    }
  } catch (e) {}
}

function setEditorTouchBlockingForPreview(enabled) {
  // This is a best-effort no-op if unavailable.
  try {
    if (typeof global !== "undefined" && global.deviceInfoSystem && global.deviceInfoSystem.isEditor && global.deviceInfoSystem.isEditor()) {
      // Some templates gate touch blocking behind InteractionKit settings; leave as-is if not found.
    }
  } catch (e) {}
}

script.createEvent("TurnOnEvent").bind(function () {
  try {
    if (typeof global !== "undefined") {
      global.flaneurPinIsScreenOverBlockerUi = function (screen01) {
        refreshUiBlockersIfNeeded(false);
        return isTapOverPinDropUiBlocker(screen01 || new vec2(0.5, 0.5));
      };
    }
  } catch (e) {}
  setEditorTouchBlockingForPreview(!!script.editorTouchBlockingForPreview);
  bindInteraction();
  bindTriggerPrimaryIfEnabled();
  bindGlobalScreenPinEventsIfEnabled();
  refreshUiBlockersIfNeeded(true);
  dbg("ready worldMesh=" + (script.pinDropUseWorldMesh !== false) + " triggerPrimary=" + (script.pinDropListenTriggerPrimary === true) + " sikTrigger=" + (script.pinDropListenSikTrigger !== false) + " deviceTracking=" + !!tryGetDeviceTracking());
});

script.createEvent("UpdateEvent").bind(function () {
  updateSikTriggerPinInput();
});

