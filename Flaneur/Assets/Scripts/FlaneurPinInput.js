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
// @input float placementDepth = 200.0
// @input Component.InteractionComponent pinDropInteraction
// @input bool pinDropFromGlobalScreenEvents = false
// @input bool pinDropListenTriggerPrimary = false
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

function dbg(msg) {
  if (script.logPinInputDebug) print("[Flaneur][pin-input] " + msg);
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

function refreshUiBlockersIfNeeded(force) {
  var now = getTime();
  if (!force && !blockersDirty && now - lastBlockerScanTime < 1.0) return;
  blockersDirty = false;
  lastBlockerScanTime = now;
  blockers = [];
  collectBlockersFromRoot(script.pinDropUiBlockerRoot, blockers);
  if (script.pinDropUiBlockerRootExtra && !isNull(script.pinDropUiBlockerRootExtra)) collectBlockersFromRoot(script.pinDropUiBlockerRootExtra, blockers);
}

function screen01ToScreenPx(screen01, cam) {
  var w = cam.getViewportWidth();
  var h = cam.getViewportHeight();
  return new vec2(screen01.x * w, screen01.y * h);
}

function screenPxToScreen01(screenPx, cam) {
  var w = cam.getViewportWidth();
  var h = cam.getViewportHeight();
  if (w <= 0 || h <= 0) return new vec2(0.5, 0.5);
  return new vec2(screenPx.x / w, screenPx.y / h);
}

function dist2(a, b) { var dx = a.x - b.x; var dy = a.y - b.y; return dx * dx + dy * dy; }

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
      return cam.unproject(new vec3(px.x, px.y, script.placementDepth));
    }
  } catch (e2) {}
  return null;
}

function isTapOverPinDropUiBlocker(screen01) {
  if (!script.pinDropUseWorldUiProjectionBlock) return false;
  if (!blockers || blockers.length === 0) return false;
  var cam = tryGetScreenSpaceCamera();
  if (!cam) return false;

  var budget = clampInt(script.pinDropUiWorldProjectionSampleBudget || 0, 0, 5000);
  if (budget <= 0) return false;

  var screenPx = screen01ToScreenPx(screen01, cam);
  var r = Math.max(0.0, script.pinDropWorldUiBlockScreenRadius || 0.0);
  var rPx = r * Math.max(cam.getViewportWidth(), cam.getViewportHeight());
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
    if (dist2(spPx, screenPx) <= rPx2) return true;
    samples++;
  }
  return false;
}

function pinIsAllowedAtScreen01(screen01) {
  refreshUiBlockersIfNeeded(false);
  if (isTapOverPinDropUiBlocker(screen01)) return false;
  return true;
}

function commitFromScreen01(screen01) {
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
      commitFromScreen01(new vec2(0.5, 0.5));
    });
  } catch (e) {}
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
});

