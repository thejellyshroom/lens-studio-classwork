/**
 * Flâneur — Pin social UI: head-anchored toast, collapsible pin list, Spectacles photo previews, reactions.
 *
 * SETUP (add this ScriptComponent next to FlaneurMultiplayerMarkers):
 * 1) Head-follow UI — Prefer one **Head Follow UI Root** empty (toast + Next + sidebar parented under it, NOT under the
 *    camera). The script moves that root toward a camera-local offset each frame. If "Head Follow UI Root" is unset,
 *    it falls back to moving **Toast Anchor** only (legacy). **Toast Text** still lives on the toast object you enable
 *    for messages. Follow uses **fast** response when you move straight (horizontal forward) and **slower** smoothing
 *    for strafe and yaw so lateral motion and turns feel softer. On **FlaneurMultiplayerMarkers**, set **Pin Drop UI Blocker
 *    Root Extra** to your **UI** object (parent of Toast / Next / Sidebar) so **Spawn Object at World Mesh On Tap** skips
 *    mesh hits when tapping that UI (`flaneurPinIsScreenOverBlockerUi`). On **FlaneurMultiplayerMarkers** leave **Pin Drop
 *    Listen Trigger Primary** OFF so SIK RoundButton keeps primary input; increase **Pin Drop World UI Block Screen Radius**
 *    slightly if taps near Next still place pins.
 * 2) Sidebar toggle — Pick ONE callback path (do **not** stack two on the same Trigger Up):
 *    A) **RoundButton (toggleable):** use **On Value Changed Callbacks** → **`flaneurSidebarSetOpen`** (SIK passes on/off).
 *       OR **Trigger Up** → **`flaneurToggleSidebar`** only. Never put **both** `flaneurSidebarSetOpen` and `flaneurToggleSidebar`
 *       on the same Trigger Up—they run in order and the second undoes the first (sidebar stays closed). If you already
 *       wired both, this script debounces extra calls within ~50ms so one survives.
 *    B) Raw **InteractionComponent**: assign "Sidebar Toggle Interaction", OR "Sidebar Fab" with IC on root.
 * 3) Badge — Small Text (pin count). Assign to "Sidebar Count Badge".
 * 4) Panel — SIK / UI Starter vertical layout container for the list. Assign "Sidebar Panel". Start disabled.
 *    If the **Sidebar** branch is disabled in the Hierarchy (common), assign **Sidebar Branch Root** to that parent object
 *    (e.g. the empty named Sidebar above the panel). Open/close then toggles that root so the list can appear. While the
 *    sidebar is open, **FlaneurMultiplayerMarkers** temporarily disables **pin colliders** so SIK rays hit the panel/close
 *    button instead of pins in front of the UI.
 * 5) List root — Empty child under the panel where cloned rows parent. Assign "Sidebar List Root".
 * 6) Row prefab — Disabled template with children: PinPhoto (Image), PinName (Text), PinReacts (Text),
 *    React0 / React1 / React2 (each with InteractionComponent).
 * 7) "World Camera" = same AR camera as FlaneurMultiplayerMarkers.
 *
 * Reactions sync via RealtimeStore keys: react:<pinId>:<yourUserId> → "0" | "1" | "2".
 */

// @input Component.Camera worldCamera
// @input SceneObject toastAnchor
// @input SceneObject headFollowUiRoot
// @input Component.Text toastText
// @input float toastLocalX = 0
// @input float toastLocalY = 12
// @input float toastLocalZ = -48
// @input float toastFollowSmoothTime = 0.22
// @input float toastStraightFollowSmoothTime = 0.035
// @input float followLateralSpeedRef = 0.14
// @input float followYawDegPerSecRef = 38
// @input float toastHoldSeconds = 2.5
// @input float toastFadeSeconds = 0.85
// @input Component.InteractionComponent sidebarToggleInteraction
// @input SceneObject sidebarFab
// @input Component.Text sidebarCountBadge
// @input SceneObject sidebarPanel
// @input SceneObject sidebarBranchRoot
// @input SceneObject sidebarListRoot
// @input SceneObject pinEntryPrefab

var sidebarOpen = false;
var sidebarCbBurstT = -999;
var sidebarCbBurstCount = 0;

function shouldIgnoreSecondSidebarCallbackInBurst() {
  var t = getTime();
  if (t - sidebarCbBurstT > 0.05) {
    sidebarCbBurstT = t;
    sidebarCbBurstCount = 0;
  }
  sidebarCbBurstCount++;
  return sidebarCbBurstCount > 1;
}
var dynamicRows = [];
var seenPinIds = {};
var seenPinsSeeded = false;
var toastHoldUntil = -1;
var toastFading = false;
var toastFadeT = 0;

var followPrevCamPos = null;
var followPrevCamFwdH = null;
var followHasPrev = false;

function clamp01(x) {
  if (x < 0) {
    return 0;
  }
  if (x > 1) {
    return 1;
  }
  return x;
}

function vec3Len(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function getFollowRoot() {
  if (script.headFollowUiRoot && !isNull(script.headFollowUiRoot)) {
    return script.headFollowUiRoot;
  }
  if (script.toastAnchor && !isNull(script.toastAnchor)) {
    return script.toastAnchor;
  }
  return null;
}

function trySeedExistingPins() {
  if (seenPinsSeeded) {
    return;
  }
  var api = getApi();
  if (!api || !api.getStore()) {
    return;
  }
  seenPinsSeeded = true;
  var st = api.getStore();
  var keys = st.getAllKeys();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.indexOf(api.pinPrefix) !== 0) {
      continue;
    }
    var json = st.getString(key);
    if (!json) {
      continue;
    }
    try {
      var d = JSON.parse(json);
      if (d && d.id) {
        seenPinIds[d.id] = true;
      }
    } catch (e) {}
  }
}

function findNamed(so, name) {
  if (!so || isNull(so)) {
    return null;
  }
  if (so.name === name) {
    return so;
  }
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    var f = findNamed(so.getChild(i), name);
    if (f) {
      return f;
    }
  }
  return null;
}

function getApi() {
  try {
    if (typeof global !== "undefined" && global.flaneurPinApi) {
      return global.flaneurPinApi;
    }
  } catch (e) {}
  return null;
}

function showToast(msg) {
  if (!script.toastText || isNull(script.toastText)) {
    return;
  }
  script.toastText.text = msg;
  var c = script.toastText.textFill.color;
  c.w = 1;
  script.toastText.textFill.color = c;
  if (script.toastAnchor && !isNull(script.toastAnchor)) {
    script.toastAnchor.enabled = true;
  }
  toastHoldUntil = getTime() + (script.toastHoldSeconds > 0 ? script.toastHoldSeconds : 2.5);
  toastFading = false;
  toastFadeT = script.toastFadeSeconds > 0 ? script.toastFadeSeconds : 0.85;
}

function expSmoothFactor(dt, smoothTime) {
  var st = smoothTime > 0.01 ? smoothTime : 0.18;
  return 1 - Math.exp(-dt / st);
}

function updateToastFollowAndFade(dt) {
  if (!script.worldCamera || isNull(script.worldCamera)) {
    return;
  }
  var followRoot = getFollowRoot();
  if (followRoot && !isNull(followRoot)) {
    var camTr = script.worldCamera.getSceneObject().getTransform();
    var camWorld = camTr.getWorldTransform();
    var camPos = camWorld.multiplyPoint(new vec3(0, 0, 0));
    var lp = new vec3(script.toastLocalX, script.toastLocalY, script.toastLocalZ);
    var targetP = camWorld.multiplyPoint(lp);
    var targetR = camTr.getWorldRotation();
    var fwdWorld = camWorld.multiplyDirection(new vec3(0, 0, -1));
    var fx = fwdWorld.x;
    var fz = fwdWorld.z;
    var fhLen = Math.sqrt(fx * fx + fz * fz);
    var fwdH;
    if (fhLen > 1e-4) {
      fwdH = new vec3(fx / fhLen, 0, fz / fhLen);
    } else {
      fwdH = new vec3(0, 0, -1);
    }
    var lateralSpeed = 0;
    var yawDegPerSec = 0;
    var epsDt = dt > 1e-5 ? dt : 1 / 60;
    if (followHasPrev && followPrevCamPos && followPrevCamFwdH) {
      var dx = camPos.x - followPrevCamPos.x;
      var dy = camPos.y - followPrevCamPos.y;
      var dz = camPos.z - followPrevCamPos.z;
      var par = dx * fwdH.x + dy * fwdH.y + dz * fwdH.z;
      var lx = dx - fwdH.x * par;
      var ly = dy - fwdH.y * par;
      var lz = dz - fwdH.z * par;
      lateralSpeed = Math.sqrt(lx * lx + ly * ly + lz * lz) / epsDt;
      var dotFH =
        followPrevCamFwdH.x * fwdH.x + followPrevCamFwdH.y * fwdH.y + followPrevCamFwdH.z * fwdH.z;
      if (dotFH > 1) {
        dotFH = 1;
      }
      if (dotFH < -1) {
        dotFH = -1;
      }
      var crossY =
        followPrevCamFwdH.x * fwdH.z - followPrevCamFwdH.z * fwdH.x;
      var yawRad = Math.atan2(crossY, dotFH);
      yawDegPerSec = (Math.abs(yawRad) / epsDt) * (180 / Math.PI);
    }
    var refLat = script.followLateralSpeedRef > 1e-4 ? script.followLateralSpeedRef : 0.14;
    var refYaw = script.followYawDegPerSecRef > 1e-2 ? script.followYawDegPerSecRef : 38;
    var blendLat = clamp01(lateralSpeed / refLat);
    var blendRot = clamp01(yawDegPerSec / refYaw);
    var tauStraight =
      script.toastStraightFollowSmoothTime > 1e-4 ? script.toastStraightFollowSmoothTime : 0.035;
    var tauLateral = script.toastFollowSmoothTime > 0.01 ? script.toastFollowSmoothTime : 0.22;
    var kFast = expSmoothFactor(dt, tauStraight);
    var kSlow = expSmoothFactor(dt, tauLateral);
    var kFwd = kFast;
    var kLatBlend = kFast + (kSlow - kFast) * blendLat;
    var kRotBlend = kFast + (kSlow - kFast) * blendRot;
    var tr = followRoot.getTransform();
    var curP = tr.getWorldPosition();
    var ex = targetP.x - curP.x;
    var ey = targetP.y - curP.y;
    var ez = targetP.z - curP.z;
    var ePar = ex * fwdH.x + ey * fwdH.y + ez * fwdH.z;
    var eFwdX = fwdH.x * ePar;
    var eFwdY = fwdH.y * ePar;
    var eFwdZ = fwdH.z * ePar;
    var eLatX = ex - eFwdX;
    var eLatY = ey - eFwdY;
    var eLatZ = ez - eFwdZ;
    var newP = new vec3(
      curP.x + eFwdX * kFwd + eLatX * kLatBlend,
      curP.y + eFwdY * kFwd + eLatY * kLatBlend,
      curP.z + eFwdZ * kFwd + eLatZ * kLatBlend
    );
    tr.setWorldPosition(newP);
    var curR = tr.getWorldRotation();
    var newR = quat.slerp(curR, targetR, kRotBlend);
    tr.setWorldRotation(newR);
    followPrevCamPos = new vec3(camPos.x, camPos.y, camPos.z);
    followPrevCamFwdH = new vec3(fwdH.x, fwdH.y, fwdH.z);
    followHasPrev = true;
  }
  if (!script.toastText || isNull(script.toastText)) {
    return;
  }
  var c = script.toastText.textFill.color;
  var now = getTime();
  if (toastHoldUntil > 0 && now >= toastHoldUntil) {
    toastFading = true;
    toastHoldUntil = -1;
  }
  if (toastFading) {
    var spd = toastFadeT > 0.01 ? 1 / toastFadeT : 2;
    c.w = Math.max(0, c.w - dt * spd);
    script.toastText.textFill.color = c;
    if (c.w <= 0.02) {
      toastFading = false;
      script.toastText.text = "";
      if (script.toastAnchor && !isNull(script.toastAnchor)) {
        script.toastAnchor.enabled = false;
      }
    }
  }
}

function updatePinCountBadge() {
  var api = getApi();
  if (!api || !script.sidebarCountBadge || isNull(script.sidebarCountBadge)) {
    return;
  }
  var st = api.getStore();
  if (!st) {
    script.sidebarCountBadge.text = "0";
    return;
  }
  var keys = st.getAllKeys();
  var n = 0;
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(api.pinPrefix) === 0) {
      n++;
    }
  }
  script.sidebarCountBadge.text = String(n);
}

function clearDynamicRows() {
  for (var i = 0; i < dynamicRows.length; i++) {
    var r = dynamicRows[i];
    if (r && !isNull(r)) {
      r.destroy();
    }
  }
  dynamicRows = [];
}

function reactionCounts(store, api, pinId) {
  var keys = store.getAllKeys();
  var pfx = api.reactPrefix + pinId + ":";
  var c0 = 0;
  var c1 = 0;
  var c2 = 0;
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k.indexOf(pfx) !== 0) {
      continue;
    }
    var v = store.getString(k);
    if (v === "0") {
      c0++;
    } else if (v === "1") {
      c1++;
    } else if (v === "2") {
      c2++;
    }
  }
  return [c0, c1, c2];
}

function sendReaction(pinId, kind) {
  var api = getApi();
  if (!api) {
    return;
  }
  var st = api.getStore();
  if (!st) {
    return;
  }
  var uid = api.getLocalUserId() || "local";
  var key = api.reactPrefix + pinId + ":" + uid;
  st.putString(key, String(kind));
}

function wireReactButton(so, pinId, kind) {
  if (!so || isNull(so)) {
    return;
  }
  var ic = so.getComponent("InteractionComponent");
  if (!ic) {
    return;
  }
  ic.onTap.add(function () {
    sendReaction(pinId, kind);
  });
}

function setupPinRow(row, data, store, api) {
  var nameSo = findNamed(row, "PinName");
  if (nameSo) {
    var nt = nameSo.getComponent("Component.Text");
    if (nt) {
      nt.text = data.name || data.oid || "Player";
    }
  }
  var imgSo = findNamed(row, "PinPhoto");
  if (imgSo && data.img) {
    var img = imgSo.getComponent("Component.Image");
    if (img) {
      Base64.decodeTextureAsync(
        data.img,
        function (tex) {
          img.mainPass.baseTex = tex;
        },
        function () {}
      );
    }
  }
  var rc = reactionCounts(store, api, data.id);
  var sumSo = findNamed(row, "PinReacts");
  if (sumSo) {
    var stx = sumSo.getComponent("Component.Text");
    if (stx) {
      stx.text = "👍 " + rc[0] + "   ? " + rc[1] + "   ✨ " + rc[2];
    }
  }
  wireReactButton(findNamed(row, "React0"), data.id, 0);
  wireReactButton(findNamed(row, "React1"), data.id, 1);
  wireReactButton(findNamed(row, "React2"), data.id, 2);
}

function rebuildPinList() {
  var api = getApi();
  if (!api || !script.sidebarListRoot || isNull(script.sidebarListRoot)) {
    return;
  }
  var st = api.getStore();
  if (!st) {
    clearDynamicRows();
    return;
  }
  var pref = script.pinEntryPrefab;
  if (!pref || isNull(pref)) {
    print("[Flaneur][UI] Assign Pin Entry Prefab for the sidebar list.");
    return;
  }
  clearDynamicRows();
  var keys = st.getAllKeys();
  var rows = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.indexOf(api.pinPrefix) !== 0) {
      continue;
    }
    var json = st.getString(key);
    if (!json) {
      continue;
    }
    var data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      continue;
    }
    if (!data || !data.id) {
      continue;
    }
    rows.push(data);
  }
  rows.sort(function (a, b) {
    return (b.t || 0) - (a.t || 0);
  });
  var parent = script.sidebarListRoot;
  for (var j = 0; j < rows.length; j++) {
    var row = parent.copySceneObject(pref);
    row.enabled = true;
    row.setParent(parent);
    setupPinRow(row, rows[j], st, api);
    dynamicRows.push(row);
  }
  updatePinCountBadge();
}

function onStoreKeyUpdated(key) {
  var api = getApi();
  if (!api) {
    return;
  }
  var st = api.getStore();
  if (!st) {
    return;
  }
  if (key.indexOf(api.reactPrefix) === 0) {
    if (sidebarOpen) {
      rebuildPinList();
    }
    updatePinCountBadge();
    return;
  }
  if (key.indexOf(api.pinPrefix) !== 0) {
    return;
  }
  var json = st.getString(key);
  if (!json) {
    return;
  }
  var data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return;
  }
  if (!data || !data.id) {
    return;
  }
  var isNew = !seenPinIds[data.id];
  if (isNew) {
    seenPinIds[data.id] = true;
    var me = api.getLocalUserId();
    if (data.oid && me && data.oid !== me) {
      showToast((data.name || "Someone") + " dropped a pin!");
    }
  }
  if (sidebarOpen) {
    rebuildPinList();
  }
  updatePinCountBadge();
}

function enableAncestorsUpToDepth(leaf, maxUp) {
  if (!leaf || isNull(leaf)) {
    return;
  }
  var chain = [];
  var cur = leaf;
  var u;
  for (u = 0; u < maxUp && cur && !isNull(cur); u++) {
    chain.push(cur);
    cur = cur.getParent();
  }
  for (var i = chain.length - 1; i >= 0; i--) {
    try {
      chain[i].enabled = true;
    } catch (e0) {}
  }
}

function applySidebarOpenState(isOpen) {
  sidebarOpen = !!isOpen;
  var br = script.sidebarBranchRoot;
  var pan = script.sidebarPanel;
  if (br && !isNull(br)) {
    try {
      br.enabled = sidebarOpen;
    } catch (e1) {}
  } else if (sidebarOpen && pan && !isNull(pan)) {
    enableAncestorsUpToDepth(pan, 24);
  }
  if (pan && !isNull(pan)) {
    try {
      pan.enabled = sidebarOpen;
    } catch (e2) {}
  }
  if (sidebarOpen) {
    rebuildPinList();
  }
  updatePinCountBadge();
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinNotifySidebarOpenChanged === "function") {
      global.flaneurPinNotifySidebarOpenChanged(sidebarOpen);
    }
  } catch (eNotify) {}
}

function toggleSidebarPanel() {
  applySidebarOpenState(!sidebarOpen);
}

function exposeSidebarMethodsForRoundButtonCallbacks() {
  script.flaneurToggleSidebar = function () {
    if (shouldIgnoreSecondSidebarCallbackInBurst()) {
      return;
    }
    toggleSidebarPanel();
  };
  script.flaneurSidebarSetOpen = function (value) {
    if (shouldIgnoreSecondSidebarCallbackInBurst()) {
      return;
    }
    if (arguments.length === 0) {
      applySidebarOpenState(true);
      return;
    }
    var on;
    if (value === true || value === 1 || value === "1" || value === "true") {
      on = true;
    } else if (value === false || value === 0 || value === "0" || value === "false") {
      on = false;
    } else {
      on = !!value;
    }
    applySidebarOpenState(on);
  };
  try {
    global.flaneurTogglePinSidebar = function () {
      script.flaneurToggleSidebar();
    };
    global.flaneurPinSidebarSetOpen = function (v) {
      script.flaneurSidebarSetOpen(v);
    };
    global.flaneurPinIsSidebarOpen = function () {
      return sidebarOpen;
    };
  } catch (e) {}
}

function wireSidebarToggle() {
  var wired = false;
  if (script.sidebarToggleInteraction && !isNull(script.sidebarToggleInteraction)) {
    script.sidebarToggleInteraction.onTap.add(function () {
      toggleSidebarPanel();
    });
    print("[Flaneur][UI] Sidebar: wired to Sidebar Toggle Interaction (onTap).");
    wired = true;
  }
  if (!wired && script.sidebarFab && !isNull(script.sidebarFab)) {
    var ic = script.sidebarFab.getComponent("InteractionComponent");
    if (ic) {
      ic.onTap.add(function () {
        toggleSidebarPanel();
      });
      print("[Flaneur][UI] Sidebar: wired to Sidebar Fab InteractionComponent.");
      wired = true;
    }
  }
  if (!wired) {
    print(
      "[Flaneur][UI] Sidebar: RoundButton → onValueChangeCallbacks → flaneurSidebarSetOpen, OR triggerUp → flaneurToggleSidebar only (not both on same Trigger Up)."
    );
  }
}

script.createEvent("UpdateEvent").bind(function (ev) {
  trySeedExistingPins();
  var dt = 1 / 60;
  try {
    if (ev && ev.getDeltaTime) {
      dt = ev.getDeltaTime();
    }
  } catch (e) {}
  updateToastFollowAndFade(dt);
});

script.createEvent("TurnOnEvent").bind(function () {
  try {
    global.flaneurPinShowToast = showToast;
    global.flaneurPinStoreKeyUpdated = onStoreKeyUpdated;
  } catch (e) {}
  exposeSidebarMethodsForRoundButtonCallbacks();
  sidebarOpen = false;
  if (script.sidebarBranchRoot && !isNull(script.sidebarBranchRoot)) {
    try {
      script.sidebarBranchRoot.enabled = false;
    } catch (eBr) {}
  }
  if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
    script.sidebarPanel.enabled = false;
  }
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinNotifySidebarOpenChanged === "function") {
      global.flaneurPinNotifySidebarOpenChanged(false);
    }
  } catch (eInit) {}
  if (script.toastAnchor && !isNull(script.toastAnchor)) {
    script.toastAnchor.enabled = false;
  }
  wireSidebarToggle();
  updatePinCountBadge();
  print(
    "[Flaneur][UI] Social UI on. RoundButton: use onValueChanged → flaneurSidebarSetOpen OR triggerUp → flaneurToggleSidebar (not both). Sidebar Branch Root if branch disabled in Hierarchy."
  );
});
