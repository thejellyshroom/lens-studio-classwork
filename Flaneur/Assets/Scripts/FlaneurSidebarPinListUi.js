/**
 * Flâneur — Sidebar pin list UI (pins + reactions).
 *
 * Responsibilities:
 * - Sidebar open/close + badge.
 * - Build/reuse pin rows under a GridLayout, populated from global.flaneurPinApi RealtimeStore.
 * - Editor placeholder images when pin photos are unavailable.
 * - Reactions sync via RealtimeStore keys: react:<pinId>:<yourUserId>.
 * - Per-pin line PinPeerDistance: for each *other* session member, the pin closest to them shows
 *   "{name} is Xm away" (your own closest pin never shows a self line — only other people).
 *
 * Provides globals:
 * - global.flaneurPinStoreKeyUpdated(key)
 * - global.flaneurTogglePinSidebar()
 * - global.flaneurPinSidebarSetOpen(v)
 * - global.flaneurPinSidebarClose()
 * - global.flaneurPinIsSidebarOpen()
 * - global.flaneurPinIsMeshPinSuppressedAfterSidebarClose()
 */

// @input Component.InteractionComponent sidebarToggleInteraction
// @input SceneObject sidebarFab
// @input Component.Text sidebarCountBadge
// @input SceneObject sidebarPanel
// @input SceneObject sidebarBranchRoot
// @input SceneObject sidebarListRoot
// @input SceneObject navigationRoot {"label":"Navigation UI Root"}
// @input Component.Text navigationTargetText {"label":"Navigation > Text"}
// @input SceneObject pinEntryPrefab
// @input SceneObject pinRowSlot0 {"label":"Static Pin Row Slot 0"}
// @input SceneObject pinRowSlot1 {"label":"Static Pin Row Slot 1"}
// @input SceneObject pinRowSlot2 {"label":"Static Pin Row Slot 2"}
// @input SceneObject pinRowSlot3 {"label":"Static Pin Row Slot 3"}
// @input SceneObject pinRowSlot4 {"label":"Static Pin Row Slot 4"}
// @input SceneObject pinRowSlot5 {"label":"Static Pin Row Slot 5"}
// @input SceneObject pinRowSlot6 {"label":"Static Pin Row Slot 6"}
// @input SceneObject pinRowSlot7 {"label":"Static Pin Row Slot 7"}
// @input Asset.Texture sidebarCloseIconTexture
// @input SceneObject headFollowUiRoot
// @input bool logUiDebug = false
// @input bool showPeerClosestPinDistance = true {"label":"Show other players' distance to nearest pin"}
// @input float peerPositionStaleSeconds = 5 {"label":"Ignore peer positions older than (sec)"}
// @input float worldUnitsPerMeter = 100 {"label":"World units per meter (100 if 1 unit = 1 cm)"}
// @input float peerDistanceTextSize = 36 {"label":"Peer distance line: size (higher = bigger; ~30–56 typical)"}
// @input float sidebarPanelLocalY = -999 {"label":"Override Sidebar local Y (-999 = use scene/prefab value)"}

var sidebarOpen = false;
var sidebarToggleBurstT = -999;
var sidebarToggleBurstCount = 0;
var suppressMeshPinAfterSidebarCloseUntil = -1;

var dynamicRows = [];

var pinListRebuildQueued = false;
var pinListRebuildQueuedAtT = -999;

var dbgUiLastT = -999;
var dbgUiBurst = 0;

var lastNavToastRawByPeer = {};
var lastInjectedNavPinId = "";
var lastInjectedNavPinLabel = "";
var selectedNavPinId = "";
var selectedNavPinLabel = "";
var sharedNavPinId = "";
var sharedNavPinLabel = "";
var navSlotPinIds = ["", "", "", "", "", "", "", ""];
var navSlotPinLabels = ["", "", "", "", "", "", "", ""];
var lastPeerDistanceUiT = -999;
/** Pin title row Text.size in `ensurePinRowVisuals`. */
var PIN_ROW_NAME_TEXT_SIZE = 48;

function findScrollWindowScriptComponent() {
  // Prefer user-provided list root (usually the scroll container).
  var root = script.sidebarListRoot;
  if (!root || isNull(root)) {
    root = script.sidebarPanel;
  }
  if (!root || isNull(root)) return null;
  // Common name in the hierarchy.
  var swSo = findNamed(root, "ScrollWindow");
  var comps = getScriptComponents(swSo || root);
  for (var i = 0; i < comps.length; i++) {
    var c = comps[i];
    if (!c || isNull(c)) continue;
    try {
      if (c.name === "ScrollWindow") return c;
    } catch (eName) {}
    // Heuristic: ScrollWindow exposes _scrollPosition vec2 input.
    try {
      if (c._scrollPosition && c._scrollPosition.x !== undefined && c._scrollPosition.y !== undefined) return c;
    } catch (ePos) {}
  }
  return null;
}

function scrollSidebarToTop(reason) {
  var sw = findScrollWindowScriptComponent();
  if (!sw || isNull(sw)) return false;
  try {
    sw._scrollPosition = new vec2(0, 0);
    dbgUi("scroll->top reason=" + (reason || ""));
    return true;
  } catch (e) {
    return false;
  }
}

function possessivePinLabel(name) {
  var n = name ? String(name) : "";
  if (!n) return "Pin";
  var lower = n.toLowerCase();
  var suffix = lower.length > 0 && lower[lower.length - 1] === "s" ? "'" : "'s";
  return n + suffix + " pin";
}

function navStatusText(who, pinOwnerLabel) {
  var owner = pinOwnerLabel ? String(pinOwnerLabel) : "";
  var dest = possessivePinLabel(owner || "Pin");
  var actor = who ? String(who) : "";
  if (actor) return actor + " navigating to " + dest + "!";
  return "Navigating to " + dest;
}

function suppressPinDropForSeconds(seconds) {
  var dur = seconds;
  if (dur === undefined || dur === null || dur <= 0) dur = 0.8;
  try {
    if (typeof global !== "undefined") {
      global.flaneurUiPressActive = true;
      global.flaneurSuppressPinDropUntil = Math.max(global.flaneurSuppressPinDropUntil || 0, getTime() + dur);
    }
  } catch (eSup) {}
}

function releasePinDropSuppressionIfExpired() {
  try {
    if (typeof global !== "undefined") {
      if (!global.flaneurSuppressPinDropUntil || getTime() >= global.flaneurSuppressPinDropUntil) {
        global.flaneurUiPressActive = false;
      }
    }
  } catch (eRel) {}
}

function getScriptComponents(so) {
  if (!so || isNull(so)) return [];
  try {
    return so.getComponents("Component.ScriptComponent") || [];
  } catch (e) {
    return [];
  }
}

function getThisScriptComponent() {
  // RectangleButton callback lists require a ScriptComponent reference (not the script API object).
  // Use the ScriptComponent attached to the same SceneObject as this script.
  var so = script.getSceneObject ? script.getSceneObject() : null;
  if (!so || isNull(so)) return null;
  try {
    var c0 = so.getComponent("Component.ScriptComponent");
    if (c0 && !isNull(c0)) return c0;
  } catch (e0) {}
  var comps = getScriptComponents(so);
  return comps.length > 0 ? comps[0] : null;
}

function findRectangleButtonScriptComponentOnRow(row) {
  if (!row || isNull(row)) return null;
  var comps = getScriptComponents(row);
  for (var i = 0; i < comps.length; i++) {
    var c = comps[i];
    if (!c || isNull(c)) continue;
    try {
      if (c.name === "RectangleButton") return c;
    } catch (eN) {}
  }
  // Fallback: any script component that exposes triggerUpCallbacks/addCallbacks inputs.
  for (var j = 0; j < comps.length; j++) {
    var c2 = comps[j];
    if (!c2 || isNull(c2)) continue;
    try {
      if (c2.triggerUpCallbacks !== undefined && c2.addCallbacks !== undefined) return c2;
    } catch (eP) {}
  }
  return null;
}

function tryAutoBindNavigationTargetText() {
  if (script.navigationTargetText && !isNull(script.navigationTargetText)) return true;
  var root = script.navigationRoot;
  if (!root || isNull(root)) {
    root = findNamed(script.sidebarPanel, "Navigation");
  }
  if (!root || isNull(root)) return false;
  try { script.navigationRoot = root; } catch (eRoot) {}
  try {
    if (typeof global !== "undefined") global.flaneurNavigationUiRoot = root;
  } catch (eGlobalRoot) {}
  var textSo = findNamed(root, "Text");
  if (!textSo || isNull(textSo)) return false;
  var txt = null;
  try { txt = textSo.getComponent("Component.Text") || textSo.getComponent("Text"); } catch (eTxt) { txt = null; }
  if (!txt || isNull(txt)) return false;
  script.navigationTargetText = txt;
  return true;
}

function setNavigationTargetText(label) {
  var t = label ? String(label) : "";
  if (!script.navigationTargetText || isNull(script.navigationTargetText)) {
    tryAutoBindNavigationTargetText();
  }
  if (script.navigationRoot && !isNull(script.navigationRoot)) {
    try {
      if (typeof global !== "undefined") global.flaneurNavigationUiRoot = script.navigationRoot;
    } catch (eRootGlobal) {}
  }
  if (script.navigationTargetText && !isNull(script.navigationTargetText)) {
    try { script.navigationTargetText.text = t; } catch (eSet) {}
  }
}

function pinOwnerLabelFromStore(store, api, pinId, fallbackLabel) {
  var fallback = fallbackLabel ? String(fallbackLabel) : "";
  if (!store || !api || !api.pinPrefix || !pinId) return fallback;
  try {
    var raw = store.getString(String(api.pinPrefix) + String(pinId));
    var rec = raw ? JSON.parse(raw) : null;
    if (rec && rec.name) return String(rec.name);
  } catch (ePin) {}
  return fallback;
}

function selectNavPin(pinId, pinLabel, reason) {
  selectedNavPinId = pinId ? String(pinId) : "";
  selectedNavPinLabel = pinLabel ? String(pinLabel) : "";
  dbgUi("nav: selected pinId=" + selectedNavPinId + " label=" + selectedNavPinLabel + " reason=" + (reason || ""));
}

function navigateToPin(pinId, pinLabel, source) {
  suppressPinDropForSeconds(0.8);
  try { if (typeof global !== "undefined" && typeof global.flaneurSfxButton === "function") global.flaneurSfxButton(); } catch (eSfx) {}
  var id = pinId ? String(pinId) : "";
  var label = pinLabel ? String(pinLabel) : "";
  if (!label && id) {
    try {
      if (typeof global !== "undefined" && global.flaneurPinRowNavLabels && global.flaneurPinRowNavLabels[id]) {
        label = String(global.flaneurPinRowNavLabels[id]);
      }
    } catch (eLabel) {}
  }
  var api = getApi();
  if (!api || !api.setNavTargetPin || !id) {
    print("[Flaneur][UI] nav failed source=" + (source || "") + " api=" + (api ? "ok" : "null") + " pinId=" + id);
    return false;
  }
  var ok = false;
  try { ok = api.setNavTargetPin(id, label) === true; } catch (eNav) { ok = false; }
  print("[Flaneur][UI] nav source=" + (source || "") + " pinId=" + id + " label=" + label + " ok=" + ok);
  if (ok) {
    sharedNavPinId = id;
    sharedNavPinLabel = label;
    setNavigationTargetText(navStatusText("You", label));
  }
  return ok;
}

function setNavSlot(index, pinId, pinLabel) {
  if (index < 0 || index >= navSlotPinIds.length) return;
  navSlotPinIds[index] = pinId ? String(pinId) : "";
  navSlotPinLabels[index] = pinLabel ? String(pinLabel) : "";
  dbgUi("nav: slot " + index + " pinId=" + navSlotPinIds[index] + " label=" + navSlotPinLabels[index]);
}

function navigateToSlot(index) {
  if (index < 0 || index >= navSlotPinIds.length) {
    print("[Flaneur][UI] nav slot failed invalid slot=" + index);
    return;
  }
  navigateToPin(navSlotPinIds[index], navSlotPinLabels[index], "slot" + index);
}

function navigateToSharedNavigationTarget() {
  var id = sharedNavPinId || selectedNavPinId || lastInjectedNavPinId;
  var label = sharedNavPinLabel || selectedNavPinLabel || lastInjectedNavPinLabel;
  return navigateToPin(id, label, "shared");
}

function resetNavigationToPeople() {
  suppressPinDropForSeconds(0.8);
  try { if (typeof global !== "undefined" && typeof global.flaneurSfxButton === "function") global.flaneurSfxButton(); } catch (eSfx) {}
  var api = getApi();
  var ok = false;
  if (api && api.clearNavTarget) {
    try { ok = api.clearNavTarget() === true; } catch (eClear) { ok = false; }
  }
  sharedNavPinId = "";
  sharedNavPinLabel = "";
  setNavigationTargetText("Navigating to people");
  print("[Flaneur][UI] nav reset to people ok=" + ok);
  return ok;
}

function getAssignedStaticPinRowSlots() {
  var slots = [];
  var names = [
    "pinRowSlot0",
    "pinRowSlot1",
    "pinRowSlot2",
    "pinRowSlot3",
    "pinRowSlot4",
    "pinRowSlot5",
    "pinRowSlot6",
    "pinRowSlot7"
  ];
  for (var i = 0; i < names.length; i++) {
    var row = null;
    try { row = script[names[i]]; } catch (e) { row = null; }
    if (row && !isNull(row)) slots.push(row);
  }
  return slots;
}

function sanitizeCallbackSuffix(s) {
  if (!s) return "x";
  // Must be a valid identifier chunk; keep alnum, replace others with underscore.
  return String(s).replace(/[^a-zA-Z0-9_]/g, "_");
}

function ensurePerPinNavCallback(pinId, pinLabel) {
  var suffix = sanitizeCallbackSuffix(pinId);
  var fnName = "flaneurNavToPin__" + suffix;
  try {
    if (typeof script[fnName] === "function") {
      return fnName;
    }
  } catch (e0) {}

  // RectangleButton callbacks often pass no args; closure captures the pin id/label.
  script[fnName] = function () {
    var api = getApi();
    if (!api || !api.setNavTargetPin) {
      dbgUi("nav callback but api missing");
      return;
    }
    var ok = false;
    try {
      ok = api.setNavTargetPin(pinId, pinLabel) === true;
    } catch (eSet) {
      ok = false;
    }
    dbgUi("nav callback pinId=" + pinId + " label=" + pinLabel + " ok=" + ok);
    if (ok) setNavigationTargetText(navStatusText("You", pinLabel));
  };
  return fnName;
}

function wireRectangleButtonToNav(rectBtn, pinId, pinLabel) {
  if (!rectBtn || isNull(rectBtn)) return false;

  // Preferred: wire to runtime API events (more reliable than serialized callback lists).
  // NOTE: `api` is deprecated in Lens Studio, but still functions; use it if available.
  var btnApi = null;
  try {
    btnApi = rectBtn.api;
  } catch (eApi) {
    btnApi = null;
  }
  if (btnApi) {
    try {
      if (btnApi.onInitialized && typeof btnApi.onInitialized.add === "function") {
        btnApi.onInitialized.add(function () {
          try {
            if (btnApi.onTriggerUp && typeof btnApi.onTriggerUp.add === "function") {
              btnApi.onTriggerUp.add(function () {
                var api = getApi();
                if (!api || !api.setNavTargetPin) return;
                var ok = api.setNavTargetPin(pinId, pinLabel) === true;
                if (ok) setNavigationTargetText(navStatusText("You", pinLabel));
                dbgUi("nav triggerUp pinId=" + pinId + " label=" + pinLabel);
              });
              dbgUi("nav: wired RectangleButton via api.onTriggerUp pinId=" + pinId);
              return;
            }
          } catch (eW) {}
          dbgUi("nav: api.onInitialized fired but no onTriggerUp for pinId=" + pinId);
        });
        dbgUi("nav: wired RectangleButton via api.onInitialized pinId=" + pinId);
        return true;
      }
      if (btnApi.onTriggerUp && typeof btnApi.onTriggerUp.add === "function") {
        btnApi.onTriggerUp.add(function () {
          var api = getApi();
          if (!api || !api.setNavTargetPin) return;
          var ok = api.setNavTargetPin(pinId, pinLabel) === true;
          if (ok) setNavigationTargetText(navStatusText("You", pinLabel));
          dbgUi("nav triggerUp pinId=" + pinId + " label=" + pinLabel);
        });
        dbgUi("nav: wired RectangleButton via api.onTriggerUp pinId=" + pinId);
        return true;
      }
    } catch (eBind) {}
  }

  // Fallback: callback lists.
  try {
    if (rectBtn.addCallbacks !== undefined) rectBtn.addCallbacks = true;
    var fnName = ensurePerPinNavCallback(pinId, pinLabel);
    var selfSc = getThisScriptComponent();
    // Force the button to re-read callbacks by toggling enabled.
    try { rectBtn.enabled = false; } catch (eDis) {}
    // Wire multiple callback lists because different UIKit button versions fire different phases.
    // (Some use triggerUp, some use finished, some use valueChange for toggleables.)
    rectBtn.triggerUpCallbacks = [{ scriptComponent: selfSc, functionName: fnName }];
    try { rectBtn.onFinishedCallbacks = [{ scriptComponent: selfSc, functionName: fnName }]; } catch (eFin) {}
    try { rectBtn.onValueChangeCallbacks = [{ scriptComponent: selfSc, functionName: fnName }]; } catch (eVal) {}
    try { rectBtn.triggerDownCallbacks = [{ scriptComponent: selfSc, functionName: fnName }]; } catch (eDown) {}
    try { rectBtn.enabled = true; } catch (eEn) {}
    // Some UIKit buttons require an explicit initialize() after changing callback inputs.
    try {
      var btnApi2 = rectBtn.api;
      if (btnApi2 && typeof btnApi2.initialize === "function") {
        btnApi2.initialize();
      }
    } catch (eInit) {}
    dbgUi(
      "nav: wired RectangleButton via triggerUpCallbacks pinId=" +
        pinId +
        " fn=" +
        fnName +
        " selfSc=" +
        (selfSc ? "ok" : "null")
    );
    return true;
  } catch (eCb) {
    dbgUi("nav: failed wiring RectangleButton pinId=" + pinId + " err=" + eCb);
    return false;
  }
}

function dbgUi(msg) {
  if (!script.logUiDebug) return;
  var t = getTime();
  if (t - dbgUiLastT > 0.25) {
    dbgUiLastT = t;
    dbgUiBurst = 0;
  }
  if (++dbgUiBurst <= 12) print("[Flaneur][UI] " + msg);
}

function shouldIgnoreSecondToggleInBurst() {
  var t = getTime();
  if (t - sidebarToggleBurstT > 0.05) {
    sidebarToggleBurstT = t;
    sidebarToggleBurstCount = 0;
  }
  sidebarToggleBurstCount++;
  return sidebarToggleBurstCount > 1;
}

function runNextFrame(fn) {
  if (!fn) return;
  var ev = script.createEvent("UpdateEvent");
  ev.bind(function () {
    try {
      script.removeEvent(ev);
    } catch (eRm) {}
    fn();
  });
}

function findNamed(so, name) {
  if (!so || isNull(so)) return null;
  if (so.name === name) return so;
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    var f = findNamed(so.getChild(i), name);
    if (f) return f;
  }
  return null;
}

function findNamedFuzzy(so, nameLower) {
  if (!so || isNull(so) || !nameLower) return null;
  try {
    if (so.name) {
      var nm = String(so.name).toLowerCase();
      if (nm === nameLower || nm.indexOf(nameLower) === 0) return so;
    }
  } catch (eNm) {}
  var n = 0;
  try {
    n = so.getChildrenCount();
  } catch (eN) {
    n = 0;
  }
  for (var i = 0; i < n; i++) {
    var f = findNamedFuzzy(so.getChild(i), nameLower);
    if (f) return f;
  }
  return null;
}

function findFirstInteractionComponentDeep(so, depthLeft) {
  if (!so || isNull(so) || depthLeft <= 0) return null;
  try {
    var ic = so.getComponent("InteractionComponent");
    if (ic && !isNull(ic)) return ic;
  } catch (e0) {}
  var n = 0;
  try {
    n = so.getChildrenCount();
  } catch (eN) {
    n = 0;
  }
  for (var i = 0; i < n; i++) {
    var ch = so.getChild(i);
    var found = findFirstInteractionComponentDeep(ch, depthLeft - 1);
    if (found) return found;
  }
  return null;
}

function setEnabledOnSubtree(so, enabled) {
  if (!so || isNull(so)) return;
  try {
    so.enabled = !!enabled;
  } catch (eEn) {}
  var n = 0;
  try {
    n = so.getChildrenCount();
  } catch (eN) {
    n = 0;
  }
  for (var i = 0; i < n; i++) setEnabledOnSubtree(so.getChild(i), enabled);
}

function getSidebarPinListParent() {
  var root = script.sidebarListRoot;
  if (!root || isNull(root)) {
    if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
      var gridSo = findNamed(script.sidebarPanel, "GridLayout");
      if (gridSo && !isNull(gridSo)) return gridSo;
    }
    return null;
  }
  // Guard against accidentally pointing list root at UI root.
  if (script.headFollowUiRoot && !isNull(script.headFollowUiRoot) && root === script.headFollowUiRoot) {
    return null;
  }
  return root;
}

function refreshSpectaclesGridLayout(gridSceneObject) {
  if (!gridSceneObject || isNull(gridSceneObject)) return;
  try {
    var comps = gridSceneObject.getComponents("Component.ScriptComponent");
    if (!comps) return;
    var childCount = 0;
    try {
      childCount = gridSceneObject.getChildrenCount();
    } catch (eCc) {
      childCount = 0;
    }
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      if (c && typeof c.layout === "function") {
        try {
          if (typeof c.rows === "number") {
            var cols = 1;
            try {
              if (typeof c.columns === "number" && isFinite(c.columns) && c.columns > 0) cols = Math.max(1, Math.floor(c.columns));
            } catch (eCols) {}
            var neededRows = Math.max(1, Math.ceil(childCount / cols));
            if (c.rows < neededRows) c.rows = neededRows;
          }
        } catch (eDim) {}
        c.layout();
        try {
          var n = gridSceneObject.getChildrenCount();
          for (var j = 0; j < n; j++) {
            var ch = gridSceneObject.getChild(j);
            if (!ch || isNull(ch)) continue;
            try {
              var tr = ch.getTransform();
              var lp = tr.getLocalPosition();
              lp.z = 0.2 + j * 0.001;
              tr.setLocalPosition(lp);
            } catch (eZ) {}
            try {
              ch.enabled = true;
            } catch (eEn) {}
          }
        } catch (eKids) {}
        return;
      }
    }
  } catch (eGrid) {}
}

function getAnyImageMaterialForDynamicRows() {
  try {
    if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
      var closeSo = findNamed(script.sidebarPanel, "Close");
      if (closeSo && !isNull(closeSo)) {
        var img = closeSo.getComponent("Component.Image");
        if (img && !isNull(img) && img.mainMaterial) return img.mainMaterial;
      }
    }
  } catch (e) {}
  return null;
}

function applyTextureToPinRowImage(img, tex) {
  if (!img || isNull(img) || !tex || isNull(tex)) return;
  try {
    var mat = img.mainMaterial.clone();
    img.mainMaterial = mat;
    mat.mainPass.baseTex = tex;
  } catch (eClone) {
    try {
      img.mainPass.baseTex = tex;
    } catch (ePass) {}
  }
}

function normalizeStoreImageBase64(s) {
  if (!s || typeof s !== "string") return "";
  var i = s.indexOf("base64,");
  if (i >= 0) return s.substring(i + 7);
  return s;
}

function getLocalSnapshotTexture(pinId) {
  if (!pinId) return null;
  try {
    if (
      typeof global !== "undefined" &&
      global.flaneurPinLocalSnapshotTextures &&
      global.flaneurPinLocalSnapshotTextures[String(pinId)]
    ) {
      return global.flaneurPinLocalSnapshotTextures[String(pinId)];
    }
  } catch (e) {}
  return null;
}

function pinRowDisplayName(data) {
  if (!data) return "Player";
  var raw =
    data.name != null && String(data.name).length > 0
      ? data.name
      : data.displayName != null && String(data.displayName).length > 0
        ? data.displayName
        : data.oid != null && String(data.oid).length > 0
          ? data.oid
          : "Player";
  return String(raw);
}

var PEER_STORE_PREFIX_UI = "peer:";

function getPinIdFromRow(row) {
  if (!row || isNull(row)) return "";
  try {
    var nm = String(row.name || "");
    var pfx = "FlaneurPinEntry__";
    if (nm.indexOf(pfx) === 0) return nm.substring(pfx.length);
  } catch (e) {}
  try {
    var rowScripts = getScriptComponents(row);
    for (var si = 0; si < rowScripts.length; si++) {
      var sc = rowScripts[si];
      if (!sc || isNull(sc)) continue;
      try {
        if (sc.name === "FlaneurPinRowNavCallback" && sc.pinId != null && String(sc.pinId).length > 0) {
          return String(sc.pinId);
        }
      } catch (eSc) {}
    }
  } catch (eNav) {}
  return "";
}

function distanceSqStored(ax, ay, az, bx, by, bz) {
  var dx = bx - ax;
  var dy = by - ay;
  var dz = bz - az;
  return dx * dx + dy * dy + dz * dz;
}

function distanceMetersStoredPoints(api, ax, ay, az, bx, by, bz, unitsPerMeter) {
  if (unitsPerMeter === undefined || unitsPerMeter === null || unitsPerMeter <= 0) unitsPerMeter = 100;
  try {
    if (api && api.storedPointToWorld) {
      var wa = api.storedPointToWorld(new vec3(ax, ay, az));
      var wb = api.storedPointToWorld(new vec3(bx, by, bz));
      var dx = wb.x - wa.x;
      var dy = wb.y - wa.y;
      var dz = wb.z - wa.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) / unitsPerMeter;
    }
  } catch (eW) {}
  return Math.sqrt(distanceSqStored(ax, ay, az, bx, by, bz)) / unitsPerMeter;
}

function formatDistanceMeters(m) {
  if (!isFinite(m) || m < 0) return "? m";
  if (m < 10) return m.toFixed(1) + " m";
  return Math.round(m) + " m";
}

function peerDisplayNameFromRecord(rec) {
  if (!rec) return "Someone";
  if (rec.n != null && String(rec.n).length > 0) return String(rec.n);
  if (rec.name != null && String(rec.name).length > 0) return String(rec.name);
  return "Someone";
}

/**
 * For each *remote* peer (not local compass id), find their closest pin in stored space.
 * Returns map pinId -> single label string (possibly multiple peers joined by " · ").
 */
function buildPinIdToClosestPeerLines(store, api) {
  var out = {};
  if (!store || !api || script.showPeerClosestPinDistance === false) return out;

  var myPeerId = "";
  try {
    if (api.getPeerCompassStoreId) myPeerId = String(api.getPeerCompassStoreId() || "");
  } catch (e1) {}
  if (!myPeerId) {
    try {
      myPeerId = String(api.getLocalUserId() || "");
    } catch (e2) {}
  }

  var pinPfx = "pin:";
  try {
    pinPfx = api.pinPrefix || pinPfx;
  } catch (eP) {}

  var keys = store.getAllKeys();
  var pins = [];
  var ki;
  for (ki = 0; ki < keys.length; ki++) {
    var kk = keys[ki];
    if (kk.indexOf(pinPfx) !== 0) continue;
    var jsn = store.getString(kk);
    var d = null;
    try {
      d = jsn ? JSON.parse(jsn) : null;
    } catch (eJ) {
      d = null;
    }
    if (d && d.id != null && d.x !== undefined && d.y !== undefined && d.z !== undefined) {
      pins.push(d);
    }
  }
  if (!pins.length) return out;

  var staleSec = script.peerPositionStaleSeconds;
  if (staleSec === undefined || staleSec === null || staleSec <= 0) staleSec = 5;
  var uPerM = script.worldUnitsPerMeter;
  if (uPerM === undefined || uPerM === null || uPerM <= 0) uPerM = 100;
  var now = getTime();

  var byPinLists = {};

  for (ki = 0; ki < keys.length; ki++) {
    var pk = keys[ki];
    if (typeof pk !== "string" || pk.indexOf(PEER_STORE_PREFIX_UI) !== 0) continue;
    var peerKeyId = pk.substring(PEER_STORE_PREFIX_UI.length);
    if (!peerKeyId || String(peerKeyId) === String(myPeerId)) continue;

    var raw = store.getString(pk);
    var rec = null;
    try {
      rec = raw ? JSON.parse(raw) : null;
    } catch (eP) {
      rec = null;
    }
    if (!rec || rec.stale === true) continue;
    if (rec.t !== undefined && now - rec.t > staleSec) continue;
    if (rec.x === undefined || rec.y === undefined || rec.z === undefined) continue;

    var bestId = null;
    var bestSq = -1;
    var bestMeters = 0;
    var pi;
    for (pi = 0; pi < pins.length; pi++) {
      var pin = pins[pi];
      var pid = String(pin.id);
      var sq = distanceSqStored(rec.x, rec.y, rec.z, pin.x, pin.y, pin.z);
      if (!isFinite(sq)) continue;
      var meters = distanceMetersStoredPoints(api, rec.x, rec.y, rec.z, pin.x, pin.y, pin.z, uPerM);
      if (bestId === null || sq < bestSq || (sq === bestSq && pid < String(bestId))) {
        bestSq = sq;
        bestId = pin.id;
        bestMeters = meters;
      }
    }
    if (bestId === null) continue;
    var line = peerDisplayNameFromRecord(rec) + " is " + formatDistanceMeters(bestMeters) + " away";
    var bid = String(bestId);
    if (!byPinLists[bid]) byPinLists[bid] = [];
    byPinLists[bid].push(line);
  }

  for (var idk in byPinLists) {
    if (!byPinLists.hasOwnProperty(idk)) continue;
    out[idk] = byPinLists[idk].join(" · ");
  }
  return out;
}

/**
 * Lens Studio Text uses `size` for point size; `fontSize` is not applied on many builds.
 */
function applyTextPointSize(textComp, px) {
  if (!textComp || isNull(textComp) || px === undefined || px === null) return;
  try {
    textComp.sizeToFit = false;
  } catch (e0) {}
  try {
    textComp.size = px;
  } catch (e1) {}
  try {
    textComp.fontSize = px;
  } catch (e2) {}
}

/** Default when `peerDistanceTextSize` is missing or invalid. */
var PEER_DISTANCE_TEXT_DEFAULT = 36;
/**
 * Fixed Text.size on the component; Spectacles/UIKit often ignores it for this row, so we scale `PinPeerDistance`
 * by (want / base). That keeps one slider and roughly linear sizing: doubling the input ~doubles on-screen height.
 */
var PEER_DISTANCE_MESH_BASE_PX = 22;

function configurePeerDistanceTextVisual(peerSo, peerTxt) {
  if (!peerTxt || isNull(peerTxt)) return;
  var want = script.peerDistanceTextSize;
  if (want === undefined || want === null || !isFinite(want) || want <= 0) want = PEER_DISTANCE_TEXT_DEFAULT;
  try {
    peerTxt.sizeToFit = false;
  } catch (e0) {}
  applyTextPointSize(peerTxt, PEER_DISTANCE_MESH_BASE_PX);
  var sc = want / PEER_DISTANCE_MESH_BASE_PX;
  if (sc < 0.55) sc = 0.55;
  if (sc > 6) sc = 6;
  if (peerSo && !isNull(peerSo)) {
    try {
      peerSo.getTransform().setLocalScale(new vec3(sc, sc, 1));
    } catch (eTr) {}
  }
}

function refreshPinRowPeerDistanceLabels() {
  var api = getApi();
  var st = api && api.getStore ? api.getStore() : null;
  var byPin = {};
  if (script.showPeerClosestPinDistance !== false && api && st) {
    byPin = buildPinIdToClosestPeerLines(st, api);
  }

  function applyOneRow(row) {
    if (!row || isNull(row)) return;
    try {
      if (!row.enabled) return;
    } catch (eEn) {}
    var pid = getPinIdFromRow(row);
    if (!pid) return;
    var visuals = ensurePinRowVisuals(row);
    var peerRoot = visuals.peerDistRoot;
    var peerTxt = visuals.peerDistText;
    if (!peerRoot || !peerTxt) return;
    var s = byPin[pid] || "";
    try {
      peerTxt.text = s;
      peerRoot.enabled = s.length > 0;
    } catch (eT) {}
    if (s.length > 0) {
      configurePeerDistanceTextVisual(peerRoot, peerTxt);
      try {
        setEnabledOnSubtree(peerRoot, true);
      } catch (eSub) {}
    }
  }

  var staticSlots = getAssignedStaticPinRowSlots();
  if (staticSlots.length > 0) {
    for (var i = 0; i < staticSlots.length; i++) applyOneRow(staticSlots[i]);
    return;
  }
  for (var j = 0; j < dynamicRows.length; j++) applyOneRow(dynamicRows[j]);
}

function ensurePinRowVisuals(row) {
  if (!row || isNull(row)) return { img: null, text: null, peerDistText: null, peerDistRoot: null };

  var imgSo = findNamed(row, "PinPhoto") || findNamedFuzzy(row, "pinphoto") || findNamed(row, "Logo") || findNamedFuzzy(row, "logo");
  var nameSo = findNamed(row, "PinName") || findNamedFuzzy(row, "pinname");
  var peerSo = findNamed(row, "PinPeerDistance") || findNamedFuzzy(row, "pinpeerdistance");

  if (!imgSo) {
    imgSo = scene.createSceneObject("PinPhoto");
    imgSo.setParent(row);
    imgSo.getTransform().setLocalPosition(new vec3(-0.0, 1.0, 0.2));
  }
  try {
    imgSo.getTransform().setLocalScale(new vec3(10.0, 10.0, 1.0));
  } catch (eImgScale) {}
  if (!nameSo) {
    nameSo = scene.createSceneObject("PinName");
    nameSo.setParent(row);
    nameSo.getTransform().setLocalPosition(new vec3(5.8, -4.9, 0.05));
  }
  if (!peerSo) {
    peerSo = scene.createSceneObject("PinPeerDistance");
    peerSo.setParent(row);
  }
  try {
    peerSo.getTransform().setLocalPosition(new vec3(8.8, -6.35, 0.05));
  } catch (ePeerPos) {}

  var imgComp = imgSo.getComponent("Component.Image") || imgSo.getComponent("Image");
  if (!imgComp) {
    try {
      imgComp = imgSo.createComponent("Component.Image");
    } catch (eImgC) {}
  }
  if (imgComp && !imgComp.mainMaterial) {
    var mat = getAnyImageMaterialForDynamicRows();
    if (mat) {
      try {
        imgComp.mainMaterial = mat.clone();
      } catch (eMat) {
        try {
          imgComp.mainMaterial = mat;
        } catch (eMat2) {}
      }
    }
  }

  var textComp = nameSo.getComponent("Component.Text") || nameSo.getComponent("Text");
  if (!textComp) {
    try {
      textComp = nameSo.createComponent("Component.Text");
    } catch (eTxtC) {}
  }
  if (textComp) {
    try {
      textComp.horizontalAlignment = HorizontalAlignment.Left;
      textComp.renderOrder = 61;
      textComp.depthTest = false;
    } catch (eAlign) {}
    applyTextPointSize(textComp, PIN_ROW_NAME_TEXT_SIZE);
  }

  var peerTxt = peerSo.getComponent("Component.Text") || peerSo.getComponent("Text");
  if (!peerTxt) {
    try {
      peerTxt = peerSo.createComponent("Component.Text");
    } catch (ePc) {}
  }
  if (peerTxt) {
    try {
      peerTxt.horizontalAlignment = HorizontalAlignment.Left;
      try {
        if (typeof VerticalAlignment !== "undefined" && VerticalAlignment.Center !== undefined) {
          peerTxt.verticalAlignment = VerticalAlignment.Center;
        }
      } catch (eVa) {}
      peerTxt.renderOrder = 62;
      peerTxt.depthTest = false;
      peerTxt.text = "";
    } catch (ePt0) {}
    configurePeerDistanceTextVisual(peerSo, peerTxt);
  }
  try {
    peerSo.enabled = false;
  } catch (ePd0) {}

  try {
    if (imgComp) imgComp.renderOrder = 60;
  } catch (eRo1) {}

  setEnabledOnSubtree(imgSo, true);
  setEnabledOnSubtree(nameSo, true);
  return { img: imgComp, text: textComp, peerDistText: peerTxt, peerDistRoot: peerSo };
}

function updatePinCountBadge() {
  var api = getApi();
  if (!api || !script.sidebarCountBadge || isNull(script.sidebarCountBadge)) return;
  var st = api.getStore();
  if (!st) {
    script.sidebarCountBadge.text = "0";
    return;
  }
  var keys = st.getAllKeys();
  var n = 0;
  for (var i = 0; i < keys.length; i++) if (keys[i].indexOf(api.pinPrefix) === 0) n++;
  script.sidebarCountBadge.text = String(n);
}

function clearDynamicRows() {
  for (var i = 0; i < dynamicRows.length; i++) {
    var r = dynamicRows[i];
    if (r && !isNull(r)) r.destroy();
  }
  dynamicRows = [];
}

function reactionCounts(store, api, pinId) {
  var keys = store.getAllKeys();
  var pfx = api.reactPrefix + pinId + ":";
  var c0 = 0, c1 = 0, c2 = 0;
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k.indexOf(pfx) !== 0) continue;
    var v = store.getString(k);
    if (v === "0") c0++; else if (v === "1") c1++; else if (v === "2") c2++;
  }
  return [c0, c1, c2];
}

function getApi() {
  try {
    if (typeof global !== "undefined" && global.flaneurPinApi) return global.flaneurPinApi;
  } catch (e) {}
  return null;
}

function sendReaction(pinId, kind) {
  var api = getApi();
  if (!api) return;
  var st = api.getStore();
  if (!st) return;
  var uid = api.getLocalUserId() || "local";
  st.putString(api.reactPrefix + pinId + ":" + uid, String(kind));
}

function wireReactButton(so, pinId, kind) {
  if (!so || isNull(so)) return;
  var ic = so.getComponent("InteractionComponent");
  if (!ic) return;
  ic.onTap.add(function () { sendReaction(pinId, kind); });
}

function setupPinRow(row, data, store, api, slotIndex) {
  var label = pinRowDisplayName(data);

  var rawImg = data && data.img != null ? String(data.img) : "";
  if (!rawImg && store && api && data && data.id) {
    var imgPfx = "pinimg:";
    try {
      imgPfx = api.pinImgPrefix || imgPfx;
    } catch (ePfx) {}
    try {
      var aux = store.getString(imgPfx + String(data.id)) || "";
      if (aux) rawImg = aux;
    } catch (eAux) {}
  }
  var wantPlaceholder = false;
  try { wantPlaceholder = global.deviceInfoSystem && global.deviceInfoSystem.isEditor && global.deviceInfoSystem.isEditor(); } catch (eEd) {}

  var rc = reactionCounts(store, api, data.id);
  var sumSo = findNamed(row, "PinReacts");
  if (sumSo) {
    var stx = sumSo.getComponent("Component.Text");
    if (stx) stx.text = "👍 " + rc[0] + "   ? " + rc[1] + "   ✨ " + rc[2];
  }
  wireReactButton(findNamed(row, "React0"), data.id, 0);
  wireReactButton(findNamed(row, "React1"), data.id, 1);
  wireReactButton(findNamed(row, "React2"), data.id, 2);

  // Navigation target: PinEntry uses Spectacles UIKit RectangleButton (ScriptComponent callback lists),
  // not InteractionComponent. Wire its triggerUpCallbacks to call back into THIS script instance.
  if (api && api.setNavTargetPin && data && data.id) {
    var pinId = String(data.id);
    var pinLabel = String(label || "");
    lastInjectedNavPinId = pinId;
    lastInjectedNavPinLabel = pinLabel;
    if (slotIndex !== undefined && slotIndex !== null && slotIndex >= 0) {
      setNavSlot(slotIndex, pinId, pinLabel);
    }
    if (!selectedNavPinId) {
      selectNavPin(pinId, pinLabel, "first-row");
    }
    try { row.name = "FlaneurPinEntry__" + pinId; } catch (eRowName) {}
    try {
      if (typeof global !== "undefined") {
        global.flaneurPinRowNavLabels = global.flaneurPinRowNavLabels || {};
        global.flaneurPinRowNavLabels[pinId] = pinLabel;
      }
    } catch (eRowLabel) {}
    var rectBtn = findRectangleButtonScriptComponentOnRow(row);
    if (!rectBtn) {
      dbgUi("nav: missing RectangleButton ScriptComponent on row pinId=" + pinId);
    }
    // Push pin id/label into the per-row FlaneurPinRowNavCallback script (prefab embeds it).
    // Avoid sc.api here: Lens Studio warns it is deprecated and can expose read-only objects.
    var rowNavCallbackSc = null;
    try {
      var rowScripts = getScriptComponents(row);
      dbgUi("nav: row scriptComponents=" + rowScripts.length + " pinId=" + pinId);
      var injected = 0;
      for (var si = 0; si < rowScripts.length; si++) {
        var sc = rowScripts[si];
        if (!sc || isNull(sc)) continue;
        var isRowCb = false;
        try { if (sc.name === "FlaneurPinRowNavCallback") isRowCb = true; } catch (eName) {}
        try { if (sc.flaneurPinRowNavCallback === true) isRowCb = true; } catch (eMark) {}
        try { if (typeof sc.flaneurNavToMe === "function") isRowCb = true; } catch (eFn) {}
        if (!isRowCb) continue;
        if (!rowNavCallbackSc) rowNavCallbackSc = sc;
        if (typeof sc.setPin === "function") {
          try { sc.setPin(pinId, pinLabel); } catch (eSet) {
            dbgUi("nav: setPin threw err=" + eSet + " pinId=" + pinId);
          }
        }
        // Also write the @input fields directly on the ScriptComponent as a
        // fallback (different LS versions expose script fields differently).
        try { sc.pinId = pinId; } catch (e1a) {}
        try { sc.pinLabel = pinLabel; } catch (e1b) {}
        injected++;
        dbgUi("nav: injected row pin pinId=" + pinId + " label=" + pinLabel);
      }
      if (injected === 0) {
        dbgUi("nav: WARNING no FlaneurPinRowNavCallback found on row pinId=" + pinId);
      }
    } catch (ePop) {
      dbgUi("nav: row inject threw err=" + ePop);
    }
    if (rectBtn) {
      var wiredRowCallback = false;
      if (rowNavCallbackSc && !isNull(rowNavCallbackSc)) {
        try {
          if (rectBtn.addCallbacks !== undefined) rectBtn.addCallbacks = true;
          rectBtn.triggerUpCallbacks = [{ scriptComponent: rowNavCallbackSc, functionName: "flaneurNavToMe" }];
          try { rectBtn.triggerDownCallbacks = [{ scriptComponent: rowNavCallbackSc, functionName: "flaneurNavToMe" }]; } catch (eDown) {}
          try { rectBtn.onFinishedCallbacks = [{ scriptComponent: rowNavCallbackSc, functionName: "flaneurNavToMe" }]; } catch (eFin) {}
          try {
            var btnApi = rectBtn.api;
            if (btnApi && typeof btnApi.initialize === "function") btnApi.initialize();
          } catch (eInit) {}
          wiredRowCallback = true;
          dbgUi("nav: runtime wired RectangleButton -> row callback pinId=" + pinId);
        } catch (eWireRow) {
          dbgUi("nav: row callback wire threw err=" + eWireRow + " pinId=" + pinId);
        }
      }
      if (!wiredRowCallback) {
        var runtimeWired = wireRectangleButtonToNav(rectBtn, pinId, pinLabel);
        dbgUi("nav: runtime wire result=" + runtimeWired + " pinId=" + pinId);
      }
    }
  }

  // After wiring callbacks, enable visuals and populate UI fields.
  setEnabledOnSubtree(row, true);
  var visuals = ensurePinRowVisuals(row);
  if (visuals && visuals.text) {
    try { visuals.text.text = label; } catch (e0) {}
  }

  if (rawImg.length > 0 && visuals && visuals.img) {
    var payload2 = normalizeStoreImageBase64(rawImg);
    Base64.decodeTextureAsync(
      payload2,
      function (tex) {
        applyTextureToPinRowImage(visuals.img, tex);
      },
      function (err) {
        if (script.logUiDebug) dbgUi("pin img decode failed pinId=" + data.id + " err=" + err + " len=" + payload2.length);
      }
    );
  } else if (visuals && visuals.img) {
    var localTex = getLocalSnapshotTexture(data.id);
    if (localTex && !isNull(localTex)) {
      applyTextureToPinRowImage(visuals.img, localTex);
    } else if (wantPlaceholder && script.sidebarCloseIconTexture && !isNull(script.sidebarCloseIconTexture)) {
      applyTextureToPinRowImage(visuals.img, script.sidebarCloseIconTexture);
    }
  }

  if (visuals && visuals.peerDistRoot) {
    try {
      visuals.peerDistRoot.enabled = false;
      if (visuals.peerDistText) visuals.peerDistText.text = "";
    } catch (ePdHide) {}
  }
  lastPeerDistanceUiT = -999;
}

function requestPinListRebuild(reason) {
  if (!sidebarOpen) return;
  var now = getTime();
  if (pinListRebuildQueued && now - pinListRebuildQueuedAtT < 0.1) return;
  pinListRebuildQueued = true;
  pinListRebuildQueuedAtT = now;
  runNextFrame(function () {
    pinListRebuildQueued = false;
    rebuildPinListImmediate(reason || "queued");
  });
}

function rebuildPinListImmediate(reason) {
  var api = getApi();
  var parent = getSidebarPinListParent();
  if (!api || !parent || isNull(parent)) return;
  selectedNavPinId = "";
  selectedNavPinLabel = "";
  for (var sClr = 0; sClr < navSlotPinIds.length; sClr++) {
    navSlotPinIds[sClr] = "";
    navSlotPinLabels[sClr] = "";
  }

  var st = api.getStore();
  if (!st) { clearDynamicRows(); return; }

  var pref = script.pinEntryPrefab;
  if (!pref || isNull(pref)) return;

  var keys = st.getAllKeys();
  var rows = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.indexOf(api.pinPrefix) !== 0) continue;
    var json = st.getString(key);
    if (!json) continue;
    try {
      var data = JSON.parse(json);
      if (data && data.id) rows.push(data);
    } catch (e) {}
  }
  rows.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
  dbgUi("rebuild pins=" + rows.length + " reason=" + reason);

  var staticSlots = getAssignedStaticPinRowSlots();
  if (staticSlots.length > 0) {
    dbgUi("rebuild using static row slots=" + staticSlots.length);
    clearDynamicRows();
    for (var ss = 0; ss < staticSlots.length; ss++) {
      var slotRow = staticSlots[ss];
      if (!slotRow || isNull(slotRow)) continue;
      if (ss < rows.length) {
        try { if (slotRow.getParent() !== parent) slotRow.setParent(parent); } catch (eSlotPar) {}
        setEnabledOnSubtree(slotRow, true);
        setupPinRow(slotRow, rows[ss], st, api, ss);
      } else {
        setEnabledOnSubtree(slotRow, false);
      }
    }
    updatePinCountBadge();
    refreshSpectaclesGridLayout(parent);
    runNextFrame(function () {
      scrollSidebarToTop("rebuild-static");
      refreshPinRowPeerDistanceLabels();
    });
    return;
  }

  for (var d = dynamicRows.length - 1; d >= rows.length; d--) {
    try { if (dynamicRows[d] && !isNull(dynamicRows[d])) dynamicRows[d].destroy(); } catch (eDx) {}
    dynamicRows.pop();
  }
  while (dynamicRows.length < rows.length) {
    var newRow = parent.copySceneObject(pref);
    newRow.enabled = true;
    newRow.setParent(parent);
    setEnabledOnSubtree(newRow, true);
    dynamicRows.push(newRow);
  }
  for (var j = 0; j < dynamicRows.length; j++) {
    var rr = dynamicRows[j];
    if (!rr || isNull(rr)) continue;
    try { if (rr.getParent() !== parent) rr.setParent(parent); } catch (ePar) {}
    setEnabledOnSubtree(rr, true);
  }

  updatePinCountBadge();
  runNextFrame(function () {
    for (var k = 0; k < dynamicRows.length; k++) setupPinRow(dynamicRows[k], rows[k], st, api, -1);
    refreshSpectaclesGridLayout(parent);
    scrollSidebarToTop("rebuild-dynamic");
    refreshPinRowPeerDistanceLabels();
  });
}

function rebuildPinList() {
  requestPinListRebuild("call");
}

function onStoreKeyUpdated(key) {
  var api = getApi();
  if (!api) return;
  var st = api.getStore();
  if (!st) return;
  if (typeof key === "string" && key.indexOf("peer:") === 0) {
    if (sidebarOpen && script.showPeerClosestPinDistance !== false) lastPeerDistanceUiT = -999;
    if (script.logUiDebug !== true) return;
  }

  if (typeof key === "string" && api.navPrefix && key.indexOf(String(api.navPrefix)) === 0) {
    var peerId = key.substring(String(api.navPrefix).length);
    var raw = "";
    try {
      raw = st.getString(key) || "";
    } catch (eRaw) {
      raw = "";
    }
    if (lastNavToastRawByPeer[peerId] === raw) {
      return;
    }
    lastNavToastRawByPeer[peerId] = raw;
    var rec = null;
    try {
      rec = raw ? JSON.parse(raw) : null;
    } catch (eJ) {
      rec = null;
    }
    if (!rec || !rec.type || rec.type === "none") {
      return;
    }
    var who = "Someone";
    try {
      var peerJson = st.getString("peer:" + String(peerId));
      var peerRec = peerJson ? JSON.parse(peerJson) : null;
      if (peerRec && peerRec.n) {
        who = String(peerRec.n);
      }
    } catch (eP) {}
    var label = rec.label ? String(rec.label) : "";
    if (rec.type === "pin") {
      label = pinOwnerLabelFromStore(st, api, rec.pinId, label || "Pin");
      sharedNavPinId = rec.pinId ? String(rec.pinId) : "";
      sharedNavPinLabel = label;
      setNavigationTargetText(navStatusText(who, label));
      try { if (typeof global !== "undefined" && typeof global.flaneurSfxRemoteNav === "function") global.flaneurSfxRemoteNav(); } catch (eSfxR) {}
    } else {
      if (!label) label = "a friend";
      setNavigationTargetText(who + " navigating to " + label + "!");
    }
    return;
  }

  if (key.indexOf(api.reactPrefix) === 0) {
    if (sidebarOpen) requestPinListRebuild("react");
    updatePinCountBadge();
    return;
  }
  var pinImgPfx = "pinimg:";
  try {
    pinImgPfx = api.pinImgPrefix || pinImgPfx;
  } catch (eImgPfx) {}
  if (typeof key === "string" && key.indexOf(pinImgPfx) === 0) {
    if (sidebarOpen) requestPinListRebuild("pinimg");
    return;
  }
  if (key.indexOf(api.pinPrefix) !== 0) return;
  if (sidebarOpen) requestPinListRebuild("pin");
  updatePinCountBadge();
}

function enableAncestorsUpToDepth(leaf, maxUp) {
  if (!leaf || isNull(leaf)) return;
  var chain = [];
  var cur = leaf;
  for (var u = 0; u < maxUp && cur && !isNull(cur); u++) {
    chain.push(cur);
    cur = cur.getParent();
  }
  for (var i = chain.length - 1; i >= 0; i--) {
    try { chain[i].enabled = true; } catch (e0) {}
  }
}

function applySidebarPanelLocalYFromScript() {
  var y = script.sidebarPanelLocalY;
  if (y === undefined || y === null || y <= -500) return;
  var pan = script.sidebarPanel;
  if (!pan || isNull(pan)) return;
  try {
    var tr = pan.getTransform();
    var lp = tr.getLocalPosition();
    tr.setLocalPosition(new vec3(lp.x, y, lp.z));
  } catch (ePy) {}
}

function applySidebarOpenState(isOpen) {
  var wasOpen = sidebarOpen;
  sidebarOpen = !!isOpen;
  if (wasOpen && !sidebarOpen) suppressMeshPinAfterSidebarCloseUntil = getTime() + 0.08;

  var br = script.sidebarBranchRoot;
  var pan = script.sidebarPanel;
  if (br && !isNull(br)) {
    try { br.enabled = sidebarOpen; } catch (e1) {}
  } else if (sidebarOpen && pan && !isNull(pan)) {
    enableAncestorsUpToDepth(pan, 24);
  }
  if (pan && !isNull(pan)) {
    try { pan.enabled = sidebarOpen; } catch (e2) {}
  }
  if (sidebarOpen) {
    applySidebarPanelLocalYFromScript();
    lastPeerDistanceUiT = -999;
    scrollSidebarToTop("open");
    requestPinListRebuild("open");
  }
  updatePinCountBadge();

  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinNotifySidebarOpenChanged === "function") {
      global.flaneurPinNotifySidebarOpenChanged(sidebarOpen);
    }
  } catch (eNotify) {}
}

function toggleSidebarPanel() { applySidebarOpenState(!sidebarOpen); }

function exposeSidebarMethodsForRoundButtonCallbacks() {
  script.flaneurToggleSidebar = function () {
    if (shouldIgnoreSecondToggleInBurst()) return;
    try { if (typeof global !== "undefined" && typeof global.flaneurSfxButton === "function") global.flaneurSfxButton(); } catch (eSfx) {}
    toggleSidebarPanel();
  };
  script.flaneurSidebarSetOpen = function (value) {
    if (shouldIgnoreSecondToggleInBurst()) return;
    var on = value === true || value === 1 || value === "1" || value === "true" ? true : (value === false || value === 0 || value === "0" || value === "false" ? false : !!value);
    applySidebarOpenState(on);
  };
  script.flaneurSidebarClose = function () { applySidebarOpenState(false); };
  script.flaneurNavToLastInjectedPin = function () {
    navigateToPin(lastInjectedNavPinId, lastInjectedNavPinLabel, "lastInjected");
  };
  script.flaneurNavToSelectedPin = function () {
    navigateToPin(selectedNavPinId || lastInjectedNavPinId, selectedNavPinLabel || lastInjectedNavPinLabel, "selected");
  };
  script.flaneurNavToSharedTarget = function () { navigateToSharedNavigationTarget(); };
  script.flaneurResetNavigation = function () { resetNavigationToPeople(); };
  script.flaneurSuppressPinDrop = function () { suppressPinDropForSeconds(0.8); };
  script.flaneurNavToPinId = function (pinId) {
    navigateToPin(pinId, "", "byId");
  };
  script.flaneurNavSlot0 = function () { navigateToSlot(0); };
  script.flaneurNavSlot1 = function () { navigateToSlot(1); };
  script.flaneurNavSlot2 = function () { navigateToSlot(2); };
  script.flaneurNavSlot3 = function () { navigateToSlot(3); };
  script.flaneurNavSlot4 = function () { navigateToSlot(4); };
  script.flaneurNavSlot5 = function () { navigateToSlot(5); };
  script.flaneurNavSlot6 = function () { navigateToSlot(6); };
  script.flaneurNavSlot7 = function () { navigateToSlot(7); };

  try {
    global.flaneurTogglePinSidebar = function () { script.flaneurToggleSidebar(); };
    global.flaneurPinSidebarSetOpen = function (v) { script.flaneurSidebarSetOpen(v); };
    global.flaneurPinSidebarClose = function () { script.flaneurSidebarClose(); };
    global.flaneurPinIsSidebarOpen = function () { return sidebarOpen; };
    global.flaneurPinIsMeshPinSuppressedAfterSidebarClose = function () { return getTime() < suppressMeshPinAfterSidebarCloseUntil; };
    global.flaneurNavToLastInjectedPin = function () { script.flaneurNavToLastInjectedPin(); };
    global.flaneurNavToSelectedPin = function () { script.flaneurNavToSelectedPin(); };
    global.flaneurNavToSharedTarget = function () { script.flaneurNavToSharedTarget(); };
    global.flaneurResetNavigation = function () { script.flaneurResetNavigation(); };
    global.flaneurSuppressPinDrop = function () { script.flaneurSuppressPinDrop(); };
    global.flaneurNavToPinId = function (pinId) { script.flaneurNavToPinId(pinId); };
    global.flaneurSetNavigationTargetLabel = function (label) { setNavigationTargetText(navStatusText("You", label)); };
    global.flaneurNavSlot0 = function () { script.flaneurNavSlot0(); };
    global.flaneurNavSlot1 = function () { script.flaneurNavSlot1(); };
    global.flaneurNavSlot2 = function () { script.flaneurNavSlot2(); };
    global.flaneurNavSlot3 = function () { script.flaneurNavSlot3(); };
    global.flaneurNavSlot4 = function () { script.flaneurNavSlot4(); };
    global.flaneurNavSlot5 = function () { script.flaneurNavSlot5(); };
    global.flaneurNavSlot6 = function () { script.flaneurNavSlot6(); };
    global.flaneurNavSlot7 = function () { script.flaneurNavSlot7(); };
    global.flaneurUiPressBegin = function () { global.flaneurUiPressActive = true; };
    global.flaneurUiPressEnd = function () { global.flaneurUiPressActive = false; };
  } catch (e) {}
}

function wireSidebarToggle() {
  var wired = false;
  if (script.sidebarToggleInteraction && !isNull(script.sidebarToggleInteraction)) {
    script.sidebarToggleInteraction.onTap.add(function () { toggleSidebarPanel(); });
    wired = true;
  }
  if (!wired && script.sidebarFab && !isNull(script.sidebarFab)) {
    var ic = script.sidebarFab.getComponent("InteractionComponent");
    if (ic) {
      ic.onTap.add(function () { toggleSidebarPanel(); });
      wired = true;
    }
  }
}

function stashPinEntryPrefabOutsideGrid() {
  var pref = script.pinEntryPrefab;
  if (!pref || isNull(pref)) return;
  var grid = getSidebarPinListParent();
  if (!grid || isNull(grid)) return;
  try {
    if (pref.getParent() !== grid) return;
    var stash = script.headFollowUiRoot && !isNull(script.headFollowUiRoot) ? script.headFollowUiRoot : script.getSceneObject();
    pref.setParent(stash);
    pref.enabled = false;
  } catch (eStash) {}
}

function applySidebarCloseIconFromInput() {
  if (!script.sidebarCloseIconTexture || isNull(script.sidebarCloseIconTexture)) return;
  if (!script.sidebarPanel || isNull(script.sidebarPanel)) return;
  var closeSo = findNamed(script.sidebarPanel, "Close");
  if (!closeSo || isNull(closeSo)) return;
  var img = closeSo.getComponent("Component.Image");
  if (!img || isNull(img)) return;
  try { img.mainPass.baseTex = script.sidebarCloseIconTexture; } catch (eCloseTex) {}
}

script.createEvent("TurnOnEvent").bind(function () {
  try { global.flaneurPinStoreKeyUpdated = onStoreKeyUpdated; } catch (e) {}
  exposeSidebarMethodsForRoundButtonCallbacks();
  tryAutoBindNavigationTargetText();
  try {
    if (typeof global !== "undefined" && script.navigationRoot && !isNull(script.navigationRoot)) {
      global.flaneurNavigationUiRoot = script.navigationRoot;
    }
  } catch (eNavRoot) {}
  stashPinEntryPrefabOutsideGrid();
  if (script.pinEntryPrefab && !isNull(script.pinEntryPrefab)) {
    try { script.pinEntryPrefab.enabled = false; } catch (ePref) {}
  }
  sidebarOpen = false;
  if (script.sidebarBranchRoot && !isNull(script.sidebarBranchRoot)) {
    try { script.sidebarBranchRoot.enabled = false; } catch (eBr) {}
  }
  if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
    script.sidebarPanel.enabled = false;
  }
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinNotifySidebarOpenChanged === "function") {
      global.flaneurPinNotifySidebarOpenChanged(false);
    }
  } catch (eInit) {}
  wireSidebarToggle();
  applySidebarCloseIconFromInput();
  updatePinCountBadge();
});

script.createEvent("UpdateEvent").bind(function () {
  releasePinDropSuppressionIfExpired();
  if (sidebarOpen && script.showPeerClosestPinDistance !== false) {
    var t = getTime();
    if (t - lastPeerDistanceUiT >= 0.2) {
      lastPeerDistanceUiT = t;
      refreshPinRowPeerDistanceLabels();
    }
  }
});

