/**
 * Flâneur — Pin social UI: head-anchored toast, collapsible pin list, Spectacles photo previews, reactions.
 *
 * SETUP (add this ScriptComponent next to FlaneurMultiplayerMarkers):
 * 1) World toast — Create SceneObject parented under the SAME world/Device camera as AR (child of camera object).
 *    Assign it to "Toast Anchor". Add Component.Text (world-space size ~6–12 units). Assign to "Toast Text".
 *    The anchor follows the camera each frame using Toast Local Offset (cm-scale: e.g. Y=12, Z=-45).
 * 2) Sidebar — Under your orthographic / screen UI root: FAB SceneObject with InteractionComponent + collider,
 *    circular mesh or image. Assign to "Sidebar Fab".
 * 3) Badge — Small Text object (top-right of FAB in local layout). Assign to "Sidebar Count Badge".
 * 4) Panel — Container with ScreenTransform for expanded list. Assign to "Sidebar Panel". Start disabled.
 * 5) List root — Empty child under panel; rows are parented here. Assign "Sidebar List Root".
 * 6) Row prefab — One row SceneObject (disabled in hierarchy) with children named:
 *    - "PinPhoto" : Component.Image (optional)
 *    - "PinName" : Component.Text
 *    - "PinReacts" : Component.Text (summary)
 *    - "React0", "React1", "React2" : each has InteractionComponent (👍 / ? / ✨)
 *    Assign to "Pin Entry Prefab".
 * 7) Assign "World Camera" (same AR camera as markers).
 *
 * Reactions sync via RealtimeStore keys: react:<pinId>:<yourUserId> → "0" | "1" | "2".
 */

// @input Component.Camera worldCamera
// @input SceneObject toastAnchor
// @input Component.Text toastText
// @input float toastLocalX = 0
// @input float toastLocalY = 12
// @input float toastLocalZ = -48
// @input float toastHoldSeconds = 2.5
// @input float toastFadeSeconds = 0.85
// @input SceneObject sidebarFab
// @input Component.Text sidebarCountBadge
// @input SceneObject sidebarPanel
// @input SceneObject sidebarListRoot
// @input SceneObject pinEntryPrefab

var sidebarOpen = false;
var dynamicRows = [];
var seenPinIds = {};
var seenPinsSeeded = false;
var toastHoldUntil = -1;
var toastFading = false;
var toastFadeT = 0;

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

function updateToastFollowAndFade(dt) {
  if (!script.worldCamera || isNull(script.worldCamera)) {
    return;
  }
  if (script.toastAnchor && !isNull(script.toastAnchor)) {
    var camTr = script.worldCamera.getSceneObject().getTransform();
    var lp = new vec3(script.toastLocalX, script.toastLocalY, script.toastLocalZ);
    var worldP = camTr.getWorldTransform().multiplyPoint(lp);
    script.toastAnchor.getTransform().setWorldPosition(worldP);
    script.toastAnchor.getTransform().setWorldRotation(camTr.getWorldRotation());
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

function wireFab() {
  if (!script.sidebarFab || isNull(script.sidebarFab)) {
    print("[Flaneur][UI] Assign Sidebar Fab (with InteractionComponent).");
    return;
  }
  var ic = script.sidebarFab.getComponent("InteractionComponent");
  if (!ic) {
    print("[Flaneur][UI] Sidebar Fab needs InteractionComponent.");
    return;
  }
  ic.onTap.add(function () {
    sidebarOpen = !sidebarOpen;
    if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
      script.sidebarPanel.enabled = sidebarOpen;
    }
    if (sidebarOpen) {
      rebuildPinList();
    }
  });
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
  sidebarOpen = false;
  if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
    script.sidebarPanel.enabled = false;
  }
  if (script.toastAnchor && !isNull(script.toastAnchor)) {
    script.toastAnchor.enabled = false;
  }
  wireFab();
  updatePinCountBadge();
  print("[Flaneur][UI] Social UI on. Wire toast anchor + sidebar per script header.");
});
