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
 *       wired both, **flaneurToggleSidebar** debounces a duplicate within ~50ms; **flaneurSidebarSetOpen** does not (explicit
 *       close / false always runs).
 *    **Custom sidebar close:** Turn off the UIKit Frame built-in close if you like, add your own control, and wire
 *    **Trigger Up** / **onTap** to **`flaneurSidebarClose`**, **`global.flaneurPinSidebarClose`**, or **`flaneurSidebarSetOpen(false)`**
 *    (same script instance as the FAB / RoundButton callbacks). Closing opens a short global window so deferred mesh
 *    taps do not place a pin on the same gesture (`flaneurPinIsMeshPinSuppressedAfterSidebarClose`).
 *    **SIK “no hover / no click” anywhere:** First confirm **SpectaclesInteractionKit.prefab** (Spectacles Interaction
 *    Kit package) is placed in the scene — without it there is no **MouseInteractor** / hand rig and **all**
 *    Interactables are dead in Preview and Simulator. Then on **head‑follow world UI** set **Ignore Interaction
 *    Plane** ON on each **Interactable** so plane tests do not reject rays. Keep **Editor Touch Blocking For Preview**
 *    OFF on **FlaneurMultiplayerMarkers** (`touchBlocking` swallows UI). Disable huge debug colliders in front of UI.
 *    B) Raw **InteractionComponent**: assign "Sidebar Toggle Interaction", OR "Sidebar Fab" with IC on root.
 * 3) Badge — Small Text (pin count). Assign to "Sidebar Count Badge".
 * 4) Panel — SIK / UI Starter vertical layout container for the list. Assign "Sidebar Panel". Start disabled.
 *    If the **Sidebar** branch is disabled in the Hierarchy (common), assign **Sidebar Branch Root** to that parent object
 *    (e.g. the empty named Sidebar above the panel). Open/close then toggles that root so the list can appear. While the
 *    sidebar is open, **FlaneurMultiplayerMarkers** temporarily disables **pin colliders** so SIK rays hit the panel/close
 *    button instead of pins in front of the UI.
 * 5) List root — SceneObject that owns the Spectacles UIKit **GridLayout** (typically **Sidebar → Content → GridLayout**).
 *    Assign "Sidebar List Root" to that GridLayout object (not the head-follow UI root). If it matches **Head Follow UI Root**
 *    by mistake, the script falls back to the first child named **GridLayout** under **Sidebar Panel**.
 * 6) Row prefab — Disabled template with children: **PinPhoto** (Image) and **PinName** (Text), or **Logo** (Image) + **Name** (Text).
 *    Optional: PinReacts (Text), React0 / React1 / React2 (InteractionComponent).
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
// @input Asset.Texture sidebarCloseIconTexture
// @input bool logUiDebug = false
//     "Optional: assign Image.png (or an X icon). Forces Close → Image mainPass.baseTex at runtime if SIK/material loses the link."

var sidebarOpen = false;
var sidebarToggleBurstT = -999;
var sidebarToggleBurstCount = 0;
/** Brief window after sidebar closes so deferred mesh tap (same finger as Close) does not place a pin. */
var suppressMeshPinAfterSidebarCloseUntil = -1;

function shouldIgnoreSecondToggleInBurst() {
  var t = getTime();
  if (t - sidebarToggleBurstT > 0.05) {
    sidebarToggleBurstT = t;
    sidebarToggleBurstCount = 0;
  }
  sidebarToggleBurstCount++;
  return sidebarToggleBurstCount > 1;
}
var dynamicRows = [];
var toastHoldUntil = -1;
var toastFading = false;
var toastFadeT = 0;

var followPrevCamPos = null;
var followPrevCamFwdH = null;
var followHasPrev = false;

var dbgUiLastT = -999;
var dbgUiBurst = 0;

// Coalesce rebuilds to avoid flicker (store often fires bursts of updates).
var pinListRebuildQueued = false;
var pinListRebuildQueuedAtT = -999;
function dbgUi(msg) {
  var on = !!script.logUiDebug;
  if (!on) {
    try {
      if (global.deviceInfoSystem && global.deviceInfoSystem.isEditor && global.deviceInfoSystem.isEditor()) {
        on = true;
      }
    } catch (eEdDbg) {}
  }
  if (!on) return;
  // Rate limit to avoid peer:* spam drowning pin logs.
  var t = getTime();
  if (t - dbgUiLastT > 0.25) {
    dbgUiLastT = t;
    dbgUiBurst = 0;
  }
  dbgUiBurst++;
  if (dbgUiBurst > 6) {
    return;
  }
  print("[Flaneur][UI] " + msg);
}

function requestPinListRebuild(reason) {
  if (!sidebarOpen) {
    return;
  }
  var now = getTime();
  // If we already queued a rebuild very recently, ignore duplicates.
  if (pinListRebuildQueued && now - pinListRebuildQueuedAtT < 0.1) {
    return;
  }
  pinListRebuildQueued = true;
  pinListRebuildQueuedAtT = now;
  runNextFrame(function () {
    pinListRebuildQueued = false;
    rebuildPinListImmediate(reason || "queued");
  });
}

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

function findNamedCaseInsensitive(so, nameLower) {
  if (!so || isNull(so) || !nameLower) {
    return null;
  }
  if (so.name && String(so.name).toLowerCase() === nameLower) {
    return so;
  }
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    var f = findNamedCaseInsensitive(so.getChild(i), nameLower);
    if (f) {
      return f;
    }
  }
  return null;
}

function findNamedFuzzy(so, nameLower) {
  if (!so || isNull(so) || !nameLower) {
    return null;
  }
  try {
    if (so.name) {
      var nm = String(so.name).toLowerCase();
      // copySceneObject can produce names like "Name (1)" or "Logo(Clone)"
      if (nm === nameLower || nm.indexOf(nameLower) === 0) {
        return so;
      }
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
    if (f) {
      return f;
    }
  }
  return null;
}

/** Depth-first: first component of type on self, then children (handles Image/Text on nested objects). */
function findFirstComponentDeep(so, primaryType, altType) {
  if (!so || isNull(so)) {
    return null;
  }
  var c = so.getComponent(primaryType);
  if (!c && altType) {
    c = so.getComponent(altType);
  }
  if (c) {
    return c;
  }
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    var found = findFirstComponentDeep(so.getChild(i), primaryType, altType);
    if (found) {
      return found;
    }
  }
  return null;
}

function normalizeStoreImageBase64(s) {
  if (!s || typeof s !== "string") {
    return "";
  }
  var i = s.indexOf("base64,");
  if (i >= 0) {
    return s.substring(i + 7);
  }
  return s;
}

function pinRowDisplayName(data) {
  if (!data) {
    return "Player";
  }
  var raw =
    data.name != null && String(data.name).length > 0
      ? data.name
      : data.Name != null && String(data.Name).length > 0
        ? data.Name
        : data.displayName != null && String(data.displayName).length > 0
          ? data.displayName
          : data.oid != null && String(data.oid).length > 0
            ? data.oid
            : null;
  if (raw != null) {
    return String(raw);
  }
  return "Player";
}

function sceneObjectSelfOrAncestorNameMatches(so, namesLower) {
  var cur = so;
  while (cur && !isNull(cur)) {
    var nm = cur.name ? String(cur.name).toLowerCase() : "";
    for (var i = 0; i < namesLower.length; i++) {
      if (nm === namesLower[i]) {
        return true;
      }
    }
    cur = cur.getParent();
  }
  return false;
}

function eachTextComponentUnder(root, visitFn) {
  if (!root || isNull(root) || !visitFn) {
    return;
  }
  var types = ["Component.Text", "Text"];
  for (var t = 0; t < types.length; t++) {
    try {
      var arr = root.getComponents(types[t]);
      if (arr && arr.length) {
        for (var i = 0; i < arr.length; i++) {
          visitFn(arr[i]);
        }
      }
    } catch (eG) {}
  }
  var n = root.getChildrenCount();
  for (var j = 0; j < n; j++) {
    eachTextComponentUnder(root.getChild(j), visitFn);
  }
}

/**
 * Pin rows often bundle UIKit + custom labels; strict findNamed("Name") fails if names differ after copy.
 * Collect all Text under the row and prefer components under a "Name" / "PinName" hierarchy.
 */
function setAuthorTextOnPinRow(row, label) {
  var texts = [];
  eachTextComponentUnder(row, function (tx) {
    if (!tx || isNull(tx)) {
      return;
    }
    for (var d = 0; d < texts.length; d++) {
      if (texts[d] === tx) {
        return;
      }
    }
    texts.push(tx);
  });
  var preferred = [];
  var nameHints = ["name", "pinname", "author"];
  for (var p = 0; p < texts.length; p++) {
    var comp = texts[p];
    var so = null;
    try {
      so = comp.getSceneObject();
    } catch (eSo) {}
    if (so && sceneObjectSelfOrAncestorNameMatches(so, nameHints)) {
      preferred.push(comp);
    }
  }
  var targets = preferred;
  if (targets.length === 0) {
    var nameRoot =
      findNamed(row, "PinName") ||
      findNamed(row, "Name") ||
      findNamedCaseInsensitive(row, "pinname") ||
      findNamedCaseInsensitive(row, "name");
    if (nameRoot) {
      var under = [];
      eachTextComponentUnder(nameRoot, function (tx) {
        if (!tx || isNull(tx)) {
          return;
        }
        under.push(tx);
      });
      if (under.length > 0) {
        targets = under;
      }
    }
  }
  if (targets.length === 0) {
    targets = texts.length === 1 ? texts : [];
  }
  if (targets.length === 0 && texts.length > 0) {
    targets = texts;
  }
  for (var k = 0; k < targets.length; k++) {
    try {
      targets[k].text = label;
    } catch (eTxt) {}
  }
}

/** Cloned rows often share one material; without a per-row clone, last decoded texture wins for every cell. */
function applyTextureToPinRowImage(img, tex) {
  if (!img || isNull(img) || !tex || isNull(tex)) {
    return;
  }
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

function setEnabledOnSubtree(so, enabled) {
  if (!so || isNull(so)) {
    return;
  }
  try {
    so.enabled = !!enabled;
  } catch (eEn) {}
  var n = 0;
  try {
    n = so.getChildrenCount();
  } catch (eN) {
    n = 0;
  }
  for (var i = 0; i < n; i++) {
    setEnabledOnSubtree(so.getChild(i), enabled);
  }
}

function getAnyImageMaterialForDynamicRows() {
  // Best-effort: reuse Close button's image material so dynamically created images render.
  try {
    if (script.sidebarPanel && !isNull(script.sidebarPanel)) {
      var closeSo = findNamed(script.sidebarPanel, "Close");
      if (closeSo && !isNull(closeSo)) {
        var img = closeSo.getComponent("Component.Image");
        if (img && !isNull(img) && img.mainMaterial) {
          return img.mainMaterial;
        }
      }
    }
  } catch (e) {}
  return null;
}

function ensurePinRowVisuals(row) {
  if (!row || isNull(row)) {
    return { img: null, text: null };
  }

  // UIKit RectangleButton clones often only contain a Collider child. Ensure our own renderable children exist.
  var imgSo =
    findNamed(row, "PinPhoto") ||
    findNamedFuzzy(row, "pinphoto") ||
    findNamed(row, "Logo") ||
    findNamedFuzzy(row, "logo");
  var nameSo =
    findNamed(row, "PinName") ||
    findNamedFuzzy(row, "pinname") ||
    findNamed(row, "Name") ||
    findNamedFuzzy(row, "name");

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
      // Defaults for dynamically created Text can be huge; match the PinEntry template intent.
      textComp.sizeToFit = false;
      textComp.fontSize = 28;
      textComp.horizontalAlignment = HorizontalAlignment.Left;
    } catch (eAlign) {}
  }

  // Make sure the two visuals render on top of the sidebar panel consistently.
  try {
    if (imgComp) {
      imgComp.renderOrder = 60;
    }
  } catch (eRo1) {}
  try {
    if (textComp) {
      textComp.renderOrder = 61;
      textComp.depthTest = false;
    }
  } catch (eRo2) {}

  setEnabledOnSubtree(imgSo, true);
  setEnabledOnSubtree(nameSo, true);

  return { img: imgComp, text: textComp };
}

function runNextFrame(fn) {
  if (!fn) {
    return;
  }
  var ev = script.createEvent("UpdateEvent");
  ev.bind(function () {
    try {
      script.removeEvent(ev);
    } catch (eRm) {}
    fn();
  });
}

/** Sidebar > Content > GridLayout, or explicit Sidebar List Root (must not be the head-follow UI root). */
function getSidebarPinListParent() {
  var root = script.sidebarListRoot;
  var head = script.headFollowUiRoot;
  if (root && !isNull(root) && head && !isNull(head) && root === head) {
    root = null;
  }
  if ((!root || isNull(root)) && script.sidebarPanel && !isNull(script.sidebarPanel)) {
    var gridSo = findNamed(script.sidebarPanel, "GridLayout");
    if (gridSo && !isNull(gridSo)) {
      return gridSo;
    }
  }
  if (root && !isNull(root)) {
    return root;
  }
  return null;
}

/** Spectacles UIKit GridLayout only runs layout() once on start; call again after adding row children. */
function refreshSpectaclesGridLayout(gridSceneObject) {
  if (!gridSceneObject || isNull(gridSceneObject)) {
    return;
  }
  try {
    var comps = gridSceneObject.getComponents("Component.ScriptComponent");
    if (!comps) {
      return;
    }
    var childCount = 0;
    try {
      childCount = gridSceneObject.getChildrenCount();
    } catch (eCc) {
      childCount = 0;
    }
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      if (c && typeof c.layout === "function") {
        // If the GridLayout has a small fixed row count (e.g. 3), the scroll/content window can clip
        // and it looks like "different" items show each open. Expand the layout to fit all children.
        try {
          if (typeof c.rows === "number") {
            var cols = 1;
            try {
              if (typeof c.columns === "number" && isFinite(c.columns) && c.columns > 0) {
                cols = Math.max(1, Math.floor(c.columns));
              }
            } catch (eCols) {}
            // Ensure enough rows to include all children given current columns.
            var neededRows = Math.max(1, Math.ceil(childCount / cols));
            if (c.rows < neededRows) {
              c.rows = neededRows;
            }
          }
        } catch (eDim) {}
        c.layout();
        // GridLayout sets Z=0 on children; nudge forward + stable ordering to avoid depth fights / panel occlusion.
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

/**
 * If the row template sits under the GridLayout, it still consumes a cell. Stash it under the head-follow UI root
 * (disabled) so only spawned rows are grid children.
 */
function stashPinEntryPrefabOutsideGrid() {
  var pref = script.pinEntryPrefab;
  if (!pref || isNull(pref)) {
    return;
  }
  var grid = getSidebarPinListParent();
  if (!grid || isNull(grid)) {
    return;
  }
  try {
    var par = pref.getParent();
    if (par !== grid) {
      return;
    }
    var stash =
      script.headFollowUiRoot && !isNull(script.headFollowUiRoot)
        ? script.headFollowUiRoot
        : script.getSceneObject();
    pref.setParent(stash);
    pref.enabled = false;
  } catch (eStash) {}
}

function applySidebarCloseIconFromInput() {
  if (!script.sidebarCloseIconTexture || isNull(script.sidebarCloseIconTexture)) {
    return;
  }
  if (!script.sidebarPanel || isNull(script.sidebarPanel)) {
    return;
  }
  var closeSo = findNamed(script.sidebarPanel, "Close");
  if (!closeSo || isNull(closeSo)) {
    return;
  }
  var img = closeSo.getComponent("Component.Image");
  if (!img || isNull(img)) {
    return;
  }
  try {
    img.mainPass.baseTex = script.sidebarCloseIconTexture;
  } catch (eCloseTex) {}
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
  // If the prefab is disabled in the hierarchy (template), some children can remain disabled after copy.
  // Force-enable the entire row subtree so Text/Image components actually render.
  setEnabledOnSubtree(row, true);
  var visuals = ensurePinRowVisuals(row);

  // Prefer exact Name/PinName nodes so we don't accidentally hit UIKit button labels.
  var label = pinRowDisplayName(data);
  dbgUi(
    "setupPinRow id=" +
      (data && data.id ? data.id : "?") +
      " label=" +
      label +
      " imgLen=" +
      (data && data.img ? String(data.img).length : 0)
  );
  var nameRoot =
    findNamed(row, "PinName") ||
    findNamed(row, "Name") ||
    findNamedCaseInsensitive(row, "pinname") ||
    findNamedCaseInsensitive(row, "name") ||
    findNamedFuzzy(row, "pinname") ||
    findNamedFuzzy(row, "name");
  dbgUi(" nameRoot=" + (nameRoot ? nameRoot.name : "null") + " row=" + (row ? row.name : "?"));
  // Quick structural check if we can't find expected children (kept small to avoid log spam).
  if (!nameRoot) {
    try {
      var c0 = row && !isNull(row) ? row.getChildrenCount() : -1;
      var names = [];
      var lim = Math.min(c0, 8);
      for (var i0 = 0; i0 < lim; i0++) {
        var ch = row.getChild(i0);
        names.push(ch ? ch.name : "?");
      }
      dbgUi(" row children=" + c0 + " first=" + names.join(", "));
    } catch (eDump) {}
  }
  if (visuals && visuals.text) {
    try {
      visuals.text.text = label;
      dbgUi(" set PinName text on ensured child OK");
    } catch (eEnsName) {}
  } else if (nameRoot) {
    try {
      var t0 = nameRoot.getComponent("Component.Text") || nameRoot.getComponent("Text");
      if (t0) {
        t0.text = label;
        dbgUi(" set Name text direct OK");
      } else {
        setAuthorTextOnPinRow(nameRoot, label);
        dbgUi(" set Name text deep OK");
      }
    } catch (eName0) {
      setAuthorTextOnPinRow(nameRoot, label);
      dbgUi(" set Name text deep (catch) OK");
    }
  } else {
    setAuthorTextOnPinRow(row, label);
    dbgUi(" set Name text row fallback OK");
  }
  // Confirm what the Name node currently displays (helps detect UIKit overwrites).
  try {
    var checkRoot =
      findNamed(row, "PinName") ||
      findNamed(row, "Name") ||
      findNamedCaseInsensitive(row, "pinname") ||
      findNamedCaseInsensitive(row, "name");
    var checkText = checkRoot ? (checkRoot.getComponent("Component.Text") || checkRoot.getComponent("Text")) : null;
    if (checkText) {
      dbgUi(" Name node now='" + String(checkText.text) + "'");
    } else {
      dbgUi(" Name node has no Text component");
    }
  } catch (eCheck) {}
  var rawImg = data && data.img != null ? String(data.img) : "";
  var wantPlaceholder = false;
  try {
    if (global.deviceInfoSystem && global.deviceInfoSystem.isEditor && global.deviceInfoSystem.isEditor()) {
      wantPlaceholder = true;
    }
  } catch (eEd) {}

  if (rawImg.length > 0) {
    var imgNode =
      findNamed(row, "PinPhoto") ||
      findNamed(row, "Logo") ||
      findNamedCaseInsensitive(row, "pinphoto") ||
      findNamedCaseInsensitive(row, "logo") ||
      findNamedFuzzy(row, "pinphoto") ||
      findNamedFuzzy(row, "logo");
    var img = (visuals && visuals.img) ? visuals.img : (imgNode ? findFirstComponentDeep(imgNode, "Component.Image", "Image") : null);
    if (!img) {
      img = findFirstComponentDeep(row, "Component.Image", "Image");
    }
    if (img) {
      var payload = normalizeStoreImageBase64(rawImg);
      Base64.decodeTextureAsync(
        payload,
        function (tex) {
          applyTextureToPinRowImage(img, tex);
          dbgUi(" set row image from store OK");
        },
        function () {}
      );
    } else {
      dbgUi(" image node found but no Image component");
    }
  } else if (wantPlaceholder) {
    // Editor can't capture stills; show any assigned texture as a placeholder (randomness not required yet).
    var imgNode2 =
      findNamed(row, "PinPhoto") ||
      findNamed(row, "Logo") ||
      findNamedCaseInsensitive(row, "pinphoto") ||
      findNamedCaseInsensitive(row, "logo") ||
      findNamedFuzzy(row, "pinphoto") ||
      findNamedFuzzy(row, "logo");
    var img2 = (visuals && visuals.img) ? visuals.img : (imgNode2 ? findFirstComponentDeep(imgNode2, "Component.Image", "Image") : null);
    if (!img2) {
      img2 = findFirstComponentDeep(row, "Component.Image", "Image");
    }
    if (img2 && script.sidebarCloseIconTexture && !isNull(script.sidebarCloseIconTexture)) {
      applyTextureToPinRowImage(img2, script.sidebarCloseIconTexture);
      dbgUi(" set row placeholder image OK");
    } else {
      dbgUi(" placeholder: missing Image component or sidebarCloseIconTexture not set");
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

function rebuildPinListImmediate(reason) {
  var api = getApi();
  var parent = getSidebarPinListParent();
  if (!api || !parent || isNull(parent)) {
    dbgUi("rebuildPinList: missing api/parent (api=" + (!!api) + " parent=" + (parent ? parent.name : "null") + ")");
    return;
  }
  var st = api.getStore();
  if (!st) {
    dbgUi("rebuildPinList: no store yet");
    clearDynamicRows();
    return;
  }
  var pref = script.pinEntryPrefab;
  if (!pref || isNull(pref)) {
    print("[Flaneur][UI] Assign Pin Entry Prefab for the sidebar list.");
    return;
  }
  // Reuse existing row objects to avoid flicker/alternating visibility on close/open bursts.
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
  dbgUi("rebuildPinList: pins=" + rows.length + " parent=" + parent.name + " pref=" + pref.name + " reason=" + (reason || "?"));
  // Remove extras
  for (var d = dynamicRows.length - 1; d >= rows.length; d--) {
    try {
      if (dynamicRows[d] && !isNull(dynamicRows[d])) {
        dynamicRows[d].destroy();
      }
    } catch (eDx) {}
    dynamicRows.pop();
  }
  // Add missing
  while (dynamicRows.length < rows.length) {
    var newRow = parent.copySceneObject(pref);
    newRow.enabled = true;
    newRow.setParent(parent);
    setEnabledOnSubtree(newRow, true);
    dynamicRows.push(newRow);
  }
  // Ensure correct parent + enabled (in case the panel toggled)
  for (var j = 0; j < dynamicRows.length; j++) {
    var rr = dynamicRows[j];
    if (!rr || isNull(rr)) continue;
    try {
      if (rr.getParent() !== parent) {
        rr.setParent(parent);
      }
    } catch (ePar) {}
    setEnabledOnSubtree(rr, true);
  }
  updatePinCountBadge();
  runNextFrame(function () {
    dbgUi("rebuildPinList: applying row contents on next frame, dynamicRows=" + dynamicRows.length);
    for (var k = 0; k < dynamicRows.length; k++) {
      setupPinRow(dynamicRows[k], rows[k], st, api);
    }
    refreshSpectaclesGridLayout(parent);
    runNextFrame(function () {
      dbgUi("rebuildPinList: reapplying author text on following frame");
      for (var k2 = 0; k2 < dynamicRows.length; k2++) {
        setAuthorTextOnPinRow(dynamicRows[k2], pinRowDisplayName(rows[k2]));
      }
    });
  });
}

function rebuildPinList() {
  requestPinListRebuild("call");
}

function onStoreKeyUpdated(key) {
  var api = getApi();
  if (!api) {
    dbgUi("onStoreKeyUpdated: no api key=" + String(key));
    return;
  }
  var st = api.getStore();
  if (!st) {
    dbgUi("onStoreKeyUpdated: no store key=" + String(key));
    return;
  }
  // Ignore peer spam unless explicitly debugging.
  if (typeof key === "string" && key.indexOf("peer:") === 0 && script.logUiDebug !== true) {
    return;
  }
  dbgUi("onStoreKeyUpdated: " + String(key) + " sidebarOpen=" + sidebarOpen);
  if (key.indexOf(api.reactPrefix) === 0) {
    if (sidebarOpen) {
      requestPinListRebuild("react");
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
  // Pin-drop head toast is handled in FlaneurMultiplayerMarkers (store update path) so it
  // never depends on this script’s TurnOn order or a pre-seed of “seen” ids.
  if (sidebarOpen) {
    requestPinListRebuild("pin");
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
  var wasOpen = sidebarOpen;
  sidebarOpen = !!isOpen;
  if (wasOpen && !sidebarOpen) {
    suppressMeshPinAfterSidebarCloseUntil = getTime() + 0.08;
  }
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
    requestPinListRebuild("open");
  } else {
    // Keep rows alive while closed; just disable via sidebar root.
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
    if (shouldIgnoreSecondToggleInBurst()) {
      return;
    }
    toggleSidebarPanel();
  };
  script.flaneurSidebarSetOpen = function (value) {
    // Defensive: many setups accidentally wire BOTH onValueChanged (setOpen) and triggerUp (toggle).
    // In that case Lens Studio fires both callbacks in the same gesture, causing open→close instantly.
    if (shouldIgnoreSecondToggleInBurst()) {
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
  script.flaneurSidebarClose = function () {
    applySidebarOpenState(false);
  };
  try {
    global.flaneurTogglePinSidebar = function () {
      script.flaneurToggleSidebar();
    };
    global.flaneurPinSidebarSetOpen = function (v) {
      script.flaneurSidebarSetOpen(v);
    };
    global.flaneurPinSidebarClose = function () {
      script.flaneurSidebarClose();
    };
    global.flaneurPinIsSidebarOpen = function () {
      return sidebarOpen;
    };
    global.flaneurPinIsMeshPinSuppressedAfterSidebarClose = function () {
      return getTime() < suppressMeshPinAfterSidebarCloseUntil;
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
  stashPinEntryPrefabOutsideGrid();
  if (script.pinEntryPrefab && !isNull(script.pinEntryPrefab)) {
    try {
      script.pinEntryPrefab.enabled = false;
    } catch (ePref) {}
  }
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
  applySidebarCloseIconFromInput();
  updatePinCountBadge();
  print(
    "[Flaneur][UI] Social UI on. SIK needs SpectaclesInteractionKit.prefab in scene (MouseInteractor + hands). Then RoundButton: onValueChanged → flaneurSidebarSetOpen OR triggerUp → flaneurToggleSidebar only; world UI: Ignore Interaction Plane on Interactables; markers: Editor Touch Blocking OFF."
  );
});
