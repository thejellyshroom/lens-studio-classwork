/**
 * Flâneur — Sidebar pin list UI (pins + reactions).
 *
 * Responsibilities:
 * - Sidebar open/close + badge.
 * - Build/reuse pin rows under a GridLayout, populated from global.flaneurPinApi RealtimeStore.
 * - Editor placeholder images when pin photos are unavailable.
 * - Reactions sync via RealtimeStore keys: react:<pinId>:<yourUserId>.
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
// @input SceneObject pinEntryPrefab
// @input Asset.Texture sidebarCloseIconTexture
// @input SceneObject headFollowUiRoot
// @input bool logUiDebug = false

var sidebarOpen = false;
var sidebarToggleBurstT = -999;
var sidebarToggleBurstCount = 0;
var suppressMeshPinAfterSidebarCloseUntil = -1;

var dynamicRows = [];

var pinListRebuildQueued = false;
var pinListRebuildQueuedAtT = -999;

var dbgUiLastT = -999;
var dbgUiBurst = 0;

function dbgUi(msg) {
  if (!script.logUiDebug) return;
  var t = getTime();
  if (t - dbgUiLastT > 0.25) {
    dbgUiLastT = t;
    dbgUiBurst = 0;
  }
  if (++dbgUiBurst <= 6) print("[Flaneur][UI] " + msg);
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

function ensurePinRowVisuals(row) {
  if (!row || isNull(row)) return { img: null, text: null };

  var imgSo = findNamed(row, "PinPhoto") || findNamedFuzzy(row, "pinphoto");
  var nameSo = findNamed(row, "PinName") || findNamedFuzzy(row, "pinname");

  if (!imgSo) {
    imgSo = scene.createSceneObject("PinPhoto");
    imgSo.setParent(row);
    imgSo.getTransform().setLocalPosition(new vec3(-3.2, 0.0, 0.05));
  }
  if (!nameSo) {
    nameSo = scene.createSceneObject("PinName");
    nameSo.setParent(row);
    nameSo.getTransform().setLocalPosition(new vec3(2.6, -0.9, 0.05));
  }

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
      textComp.sizeToFit = false;
      textComp.fontSize = 28;
      textComp.horizontalAlignment = HorizontalAlignment.Left;
      textComp.renderOrder = 61;
      textComp.depthTest = false;
    } catch (eAlign) {}
  }
  try {
    if (imgComp) imgComp.renderOrder = 60;
  } catch (eRo1) {}

  setEnabledOnSubtree(imgSo, true);
  setEnabledOnSubtree(nameSo, true);
  return { img: imgComp, text: textComp };
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

function setupPinRow(row, data, store, api) {
  setEnabledOnSubtree(row, true);
  var visuals = ensurePinRowVisuals(row);

  if (visuals && visuals.text) {
    try { visuals.text.text = pinRowDisplayName(data); } catch (e0) {}
  }

  var rawImg = data && data.img != null ? String(data.img) : "";
  var wantPlaceholder = false;
  try { wantPlaceholder = global.deviceInfoSystem && global.deviceInfoSystem.isEditor && global.deviceInfoSystem.isEditor(); } catch (eEd) {}

  if (rawImg.length > 0 && visuals && visuals.img) {
    var payload = normalizeStoreImageBase64(rawImg);
    Base64.decodeTextureAsync(payload, function (tex) { applyTextureToPinRowImage(visuals.img, tex); }, function () {});
  } else if (wantPlaceholder && visuals && visuals.img && script.sidebarCloseIconTexture && !isNull(script.sidebarCloseIconTexture)) {
    applyTextureToPinRowImage(visuals.img, script.sidebarCloseIconTexture);
  }

  var rc = reactionCounts(store, api, data.id);
  var sumSo = findNamed(row, "PinReacts");
  if (sumSo) {
    var stx = sumSo.getComponent("Component.Text");
    if (stx) stx.text = "👍 " + rc[0] + "   ? " + rc[1] + "   ✨ " + rc[2];
  }
  wireReactButton(findNamed(row, "React0"), data.id, 0);
  wireReactButton(findNamed(row, "React1"), data.id, 1);
  wireReactButton(findNamed(row, "React2"), data.id, 2);
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
    for (var k = 0; k < dynamicRows.length; k++) setupPinRow(dynamicRows[k], rows[k], st, api);
    refreshSpectaclesGridLayout(parent);
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
  if (typeof key === "string" && key.indexOf("peer:") === 0 && script.logUiDebug !== true) return;

  if (key.indexOf(api.reactPrefix) === 0) {
    if (sidebarOpen) requestPinListRebuild("react");
    updatePinCountBadge();
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
  if (sidebarOpen) requestPinListRebuild("open");
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
    toggleSidebarPanel();
  };
  script.flaneurSidebarSetOpen = function (value) {
    if (shouldIgnoreSecondToggleInBurst()) return;
    var on = value === true || value === 1 || value === "1" || value === "true" ? true : (value === false || value === 0 || value === "0" || value === "false" ? false : !!value);
    applySidebarOpenState(on);
  };
  script.flaneurSidebarClose = function () { applySidebarOpenState(false); };

  try {
    global.flaneurTogglePinSidebar = function () { script.flaneurToggleSidebar(); };
    global.flaneurPinSidebarSetOpen = function (v) { script.flaneurSidebarSetOpen(v); };
    global.flaneurPinSidebarClose = function () { script.flaneurSidebarClose(); };
    global.flaneurPinIsSidebarOpen = function () { return sidebarOpen; };
    global.flaneurPinIsMeshPinSuppressedAfterSidebarClose = function () { return getTime() < suppressMeshPinAfterSidebarCloseUntil; };
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

