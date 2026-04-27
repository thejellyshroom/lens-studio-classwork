/**
 * Flâneur — per-row nav callback for UIKit RectangleButton.
 *
 * Attach this script component to the SAME SceneObject as the PinEntry RectangleButton.
 * Then in RectangleButton -> triggerUpCallbacks, set:
 *   scriptComponent: (this component)
 *   functionName: flaneurNavToMe
 *
 * This avoids needing RectangleButton to pass args to the callback.
 *
 * The hosting list UI (FlaneurSidebarPinListUi) injects pin id/label at runtime
 * by writing to this ScriptComponent's fields. The pinId/pinLabel inputs are
 * kept as a fallback so callbacks still work if you wire them directly in the
 * Inspector for a single test row.
 */
// @input string pinId
// @input string pinLabel

var ROW_PIN_PREFIX = "FlaneurPinEntry__";
var navPinId = "";
var navPinLabel = "";

script.setPin = function (id, label) {
  navPinId = id ? String(id) : "";
  navPinLabel = label ? String(label) : "";
};

script.getPinId = function () { return navPinId; };
script.getPinLabel = function () { return navPinLabel; };

// Marker so external scripts can identify this component without relying on
// instanceof / asset checks.
script.flaneurPinRowNavCallback = true;

function pinIdFromRowName() {
  try {
    var so = script.getSceneObject ? script.getSceneObject() : null;
    if (!so || isNull(so) || !so.name) return "";
    var name = String(so.name);
    var idx = name.indexOf(ROW_PIN_PREFIX);
    if (idx < 0) return "";
    return name.substring(idx + ROW_PIN_PREFIX.length);
  } catch (eName) {
    return "";
  }
}

function labelForPinId(id) {
  if (!id) return "";
  try {
    if (typeof global !== "undefined" && global.flaneurPinRowNavLabels) {
      return global.flaneurPinRowNavLabels[id] ? String(global.flaneurPinRowNavLabels[id]) : "";
    }
  } catch (eLabel) {}
  return "";
}

script.flaneurNavToMe = function () {
  var id = navPinId;
  var label = navPinLabel;
  if (!id) {
    try { id = script.pinId ? String(script.pinId) : ""; } catch (eId) { id = ""; }
  }
  if (!label) {
    try { label = script.pinLabel ? String(script.pinLabel) : ""; } catch (eLb) { label = ""; }
  }
  if (!id) {
    id = pinIdFromRowName();
  }
  if (!label && id) {
    label = labelForPinId(id);
  }
  print("[Flaneur][nav] flaneurNavToMe fired pinId=" + id + " label=" + label);
  var api = null;
  try {
    if (typeof global !== "undefined" && global.flaneurPinApi) api = global.flaneurPinApi;
  } catch (e) {}
  if (!api || !api.setNavTargetPin) {
    print("[Flaneur][nav] Missing flaneurPinApi.setNavTargetPin");
    return;
  }
  if (!id) {
    print("[Flaneur][nav] No pinId assigned on FlaneurPinRowNavCallback");
    return;
  }
  var ok = false;
  try {
    ok = api.setNavTargetPin(id, label) === true;
  } catch (eSet) {
    ok = false;
  }
  print("[Flaneur][nav] setNavTargetPin ok=" + ok);
  try {
    if (ok && typeof global !== "undefined" && global.flaneurSetNavigationTargetLabel) {
      global.flaneurSetNavigationTargetLabel(label || "Pin");
    }
  } catch (eT) {}
};
