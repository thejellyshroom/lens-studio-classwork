/**
 * Flâneur — Peer direction compasses (Phase B minimal loop).
 *
 * What this does
 * - Publishes your **world camera / head** position into the same RealtimeStore as pins (`flaneur_pins_v1`),
 *   in the **same stored space** as pin coordinates (`peer:<id>` → JSON `{ x,y,z,t,n }`).
 *   The id is **`getPeerCompassStoreId()`** (connection id when available), not raw user id — so dual preview
 *   doesn’t collapse two clients into one `peer:` key.
 * - Spawns a small arrow per **other** session member and yaw-rotates it on a HUD mount so it points at them
 *   on the horizontal plane (works with ColocatedWorld / pin store root).
 *
 * Custom Location AR (Asset Library)
 * - That package is for **location lock / mesh hint** states, not multiplayer bearing. You *can* reuse its
 *   **Location Icon** materials on your needle mesh for look-only; compass logic does not depend on it.
 * - Keep pins + compasses working **before** location lock (see repo secondary rule).
 *
 * SETUP IN LENS STUDIO
 * 1) Add this component next to `FlaneurMultiplayerMarkers` (same scene object is fine).
 * 2) **World Camera** — same AR camera as markers / social UI.
 * 3) **Compass Mount** — assign any SceneObject; with **Reparent Mount To World Camera** on (default), it is parented
 *    under **World Camera** each frame so HUD offsets are in **view space** (otherwise a mount under ColocatedWorld
 *    drifts off-screen). **Apply Hud Placement** sets local position: small +X / +Y / negative Z = in front of face.
 * 4) **Needle Template** — mesh whose **local +Z** axis should extend toward the peer (cone/arrow tip along +Z).
 *    Disable it in the hierarchy; copies are enabled at runtime. Rotation uses **world** space so parent mount offsets don’t skew bearing.
 * 5) Ensure **Pin Store Coordinate Root** on markers matches your colocated root (same as pins) so positions align.
 * 6) Tune **Publish Interval** (default ~5 Hz). Distance hiding is **off** unless you enable **Limit Compass By Distance**; colocated units are often hundreds apart.
 *
 * TEST: Multiplayer / Mocked Online session with two clients; move in world — each sees one needle tracking the other.
 */

// @input Component.Camera worldCamera
// @input SceneObject compassMount {"label":"Compass Mount (reparented under camera when option below is on)"}
// @input SceneObject needleTemplate {"label":"Needle Template (+Z forward, disabled in hierarchy)"}
// @input bool reparentCompassMountToWorldCamera = true {"label":"Reparent Mount To World Camera (fixes off-screen)"}
// @input bool applyHudPlacementFromScript = true {"label":"Apply Hud Placement (camera-local position)"}
// @input float compassHudLocalX = 6 {"label":"Hud local X (smaller = toward center; flip sign for left/right)"}
// @input float compassHudLocalY = 7 {"label":"Hud local Y (up)"}
// @input float compassHudLocalZ = -18 {"label":"Hud local Z (neg = in front; closer to 0 = nearer camera)"}
// @input float compassNeedleExtraEulerX = 90 {"label":"Needle extra euler X (deg, after aim-at-peer)"}
// @input float publishInterval = 0.2
// @input float staleSeconds = 5
// @input bool limitCompassByDistance = false {"label":"Limit Compass By Distance (off unless you need it)"}
// @input float maxWorldDistance = 5000 {"label":"Max horizontal distance (only if limit above is on)"}
// @input float needleUniformScale = 0.1 {"label":"Needle world uniform scale (see setWorldScale)"}
// @input float stackSpacing = 6
// @input bool peerCompassEnabled = true
// @input bool compassBearingHorizontalOnly = false
// @input Component.Text compassTargetText {"label":"Compass > Text (shows current nav target label)"}
// @input bool logCompassDebug = false

var PEER_PREFIX = "peer:";
var NAV_PREFIX = "nav:";
var lastPublishTime = -999;
var peerNeedles = {};
var warnedMissingTemplate = false;
var warnedCopyFail = false;
var warnedPeersHiddenByMaxDist = false;
var lastCompassStatusLog = -999;
var lastHudDebugLog = -999;
var NEEDLE_WORLD_SCALE_FALLBACK = 0.1;

var navNeedleId = "__nav__";
var warnedMissingCompassTargetText = false;
var lastNavDebugLog = -999;

function getNeedleWorldUniformScale() {
  var sc = script.needleUniformScale;
  if (sc === undefined || sc === null || sc <= 0) {
    return NEEDLE_WORLD_SCALE_FALLBACK;
  }
  return sc;
}

function safeJsonParse(s) {
  if (!s || typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function safeString(s) {
  if (s == null) return "";
  return String(s);
}

function degToRad(deg) {
  return (deg || 0) * Math.PI / 180;
}

function possessivePinLabel(name) {
  var n = safeString(name || "");
  if (!n) return "Pin";
  var lower = n.toLowerCase();
  var suffix = lower.length > 0 && lower[lower.length - 1] === "s" ? "'" : "'s";
  return n + suffix + " pin";
}

function findNamed(so, name) {
  if (!so || isNull(so)) return null;
  if (so.name === name) return so;
  var n = 0;
  try {
    n = so.getChildrenCount();
  } catch (eN) {
    n = 0;
  }
  for (var i = 0; i < n; i++) {
    var f = findNamed(so.getChild(i), name);
    if (f) return f;
  }
  return null;
}

function tryAutoBindCompassTargetText() {
  if (script.compassTargetText && !isNull(script.compassTargetText)) return true;
  // Heuristic: user said it's under Compass > Text.
  var mount = script.compassMount;
  var compassSo = null;
  if (mount && !isNull(mount)) {
    compassSo = mount.getParent(); // often Compass is parent of mount/needles
    if (compassSo && !isNull(compassSo) && String(compassSo.name).toLowerCase().indexOf("compass") < 0) {
      compassSo = mount;
    }
  }
  var textSo = findNamed(compassSo, "Text") || findNamed(script.getSceneObject(), "Text");
  if (!textSo || isNull(textSo)) return false;
  var txt = textSo.getComponent("Component.Text") || textSo.getComponent("Text");
  if (!txt) return false;
  script.compassTargetText = txt;
  return true;
}

function setCompassTargetText(label) {
  if (!script.compassTargetText || isNull(script.compassTargetText)) {
    if (!tryAutoBindCompassTargetText()) return;
  }
  try {
    script.compassTargetText.text = label || "";
  } catch (e) {}
}

/** Big meshes often live on children with inflated localScale; normalize so world scale input actually bites. */
function setAllDescendantsLocalScaleToOne(so) {
  if (!so || isNull(so)) {
    return;
  }
  var n = so.getChildrenCount();
  var i;
  for (i = 0; i < n; i++) {
    var ch = so.getChild(i);
    if (!ch || isNull(ch)) {
      continue;
    }
    try {
      ch.getTransform().setLocalScale(new vec3(1, 1, 1));
    } catch (e0) {}
    setAllDescendantsLocalScaleToOne(ch);
  }
}

function applyNeedleHudWorldSize(needleSo) {
  if (!needleSo || isNull(needleSo)) {
    return;
  }
  var s = getNeedleWorldUniformScale();
  try {
    setAllDescendantsLocalScaleToOne(needleSo);
    needleSo.getTransform().setWorldScale(new vec3(s, s, s));
  } catch (eW) {}
}

function myPeerStoreId(api) {
  if (api && api.getPeerCompassStoreId) {
    try {
      return String(api.getPeerCompassStoreId());
    } catch (eM) {}
  }
  if (api && api.getLocalUserId) {
    return String(api.getLocalUserId());
  }
  return "";
}

/** Spectacles / editor: mount or an ancestor may be disabled (SetEnabledOnReady). */
function ensureCompassHierarchyEnabled() {
  var m = script.compassMount;
  var steps = 0;
  while (m && !isNull(m) && steps < 12) {
    try {
      m.enabled = true;
    } catch (e0) {}
    m = m.getParent();
    steps++;
  }
}

function ensureCompassMountUnderWorldCamera() {
  if (script.reparentCompassMountToWorldCamera !== true) {
    return;
  }
  var cam = script.worldCamera;
  var mount = script.compassMount;
  if (!cam || isNull(cam) || !mount || isNull(mount)) {
    return;
  }
  var camSo;
  try {
    camSo = cam.getSceneObject();
  } catch (eC) {
    return;
  }
  if (!camSo || isNull(camSo)) {
    return;
  }
  try {
    var par = mount.getParent();
    if (par !== camSo) {
      mount.setParent(camSo);
      dbgCompass("Reparented compass mount under World Camera (was off-camera space).");
    }
  } catch (eP) {}
}

/** Camera-local HUD: small +X/+Y and negative Z keep the cluster inside a typical AR frustum. */
function applyCompassHudPlacement() {
  var cam = script.worldCamera;
  var mount = script.compassMount;
  if (!mount || isNull(mount)) {
    return;
  }
  ensureCompassMountUnderWorldCamera();
  if (script.applyHudPlacementFromScript !== true) {
    return;
  }
  var lx = script.compassHudLocalX;
  var ly = script.compassHudLocalY;
  var lz = script.compassHudLocalZ;
  if (lx === undefined || lx === null) {
    lx = 6;
  }
  if (ly === undefined || ly === null) {
    ly = 7;
  }
  if (lz === undefined || lz === null) {
    lz = -18;
  }
  try {
    var tr = mount.getTransform();
    tr.setLocalPosition(new vec3(lx, ly, lz));
    tr.setLocalRotation(quat.fromEulerAngles(0, 0, 0));
  } catch (ePl) {}

  if (script.logCompassDebug && cam && !isNull(cam)) {
    var tdbg = getTime();
    if (tdbg - lastHudDebugLog > 4) {
      lastHudDebugLog = tdbg;
      try {
        var mw = mount.getTransform().getWorldPosition();
        var cw = cam.getSceneObject().getTransform().getWorldPosition();
        var dx = mw.x - cw.x;
        var dy = mw.y - cw.y;
        var dz = mw.z - cw.z;
        dbgCompass(
          "hud world mount=" +
            mw.x.toFixed(1) +
            "," +
            mw.y.toFixed(1) +
            "," +
            mw.z.toFixed(1) +
            " deltaFromCam=" +
            dx.toFixed(1) +
            "," +
            dy.toFixed(1) +
            "," +
            dz.toFixed(1)
        );
      } catch (eH) {}
    }
  }
}

function getApi() {
  try {
    if (typeof global !== "undefined" && global.flaneurPinApi) {
      return global.flaneurPinApi;
    }
  } catch (e) {}
  return null;
}

function getStore() {
  var api = getApi();
  if (!api || !api.getStore) {
    return null;
  }
  return api.getStore();
}

function dbgCompass(msg) {
  if (script.logCompassDebug) {
    print("[Flaneur][compass] " + msg);
  }
}

function spawnNeedleForPeer(peerId) {
  var mount = script.compassMount;
  var tmpl = script.needleTemplate;
  if (!mount || isNull(mount) || !tmpl || isNull(tmpl)) {
    return null;
  }
  ensureCompassHierarchyEnabled();
  var so = null;
  var copyRoots = [mount, script.getSceneObject(), tmpl.getParent && tmpl.getParent()];
  var r;
  for (r = 0; r < copyRoots.length; r++) {
    var root = copyRoots[r];
    if (!root || isNull(root)) {
      continue;
    }
    try {
      so = root.copySceneObject(tmpl);
    } catch (e) {
      so = null;
    }
    if (so && !isNull(so)) {
      break;
    }
  }
  if (!so || isNull(so)) {
    if (!warnedCopyFail) {
      warnedCopyFail = true;
      print("[Flaneur][compass] copySceneObject failed for needle — check Needle Template (try child of Compass Mount).");
    }
    return null;
  }
  so.enabled = true;
  try {
    so.setParent(mount);
  } catch (e2) {}
  try {
    var ch = so.getChildrenCount();
    var c;
    for (c = 0; c < ch; c++) {
      var chSo = so.getChild(c);
      if (chSo && !isNull(chSo)) {
        chSo.enabled = true;
      }
    }
  } catch (eCh) {}
  applyNeedleHudWorldSize(so);
  peerNeedles[peerId] = so;
  dbgCompass("Spawned needle for peer id=" + peerId);
  return so;
}

function destroyNeedle(peerId) {
  var so = peerNeedles[peerId];
  if (so && !isNull(so)) {
    try {
      so.destroy();
    } catch (e) {}
  }
  delete peerNeedles[peerId];
}

function clearAllNeedles() {
  for (var id in peerNeedles) {
    if (peerNeedles.hasOwnProperty(id)) {
      destroyNeedle(id);
    }
  }
}

function publishLocalPeerPose() {
  if (script.peerCompassEnabled !== true) {
    return;
  }
  var store = getStore();
  var cam = script.worldCamera;
  var api = getApi();
  if (!store || !cam || isNull(cam) || !api || !api.worldPointToStored) {
    return;
  }
  var selfId = myPeerStoreId(api);
  if (!selfId) {
    return;
  }
  var now = getTime();
  if (now - lastPublishTime < script.publishInterval) {
    return;
  }
  lastPublishTime = now;
  var worldPos;
  try {
    worldPos = cam.getSceneObject().getTransform().getWorldPosition();
  } catch (eW) {
    return;
  }
  var stored = api.worldPointToStored(worldPos);
  var key = PEER_PREFIX + selfId;
  var nameStr = "";
  if (api.getLocalDisplayName) {
    try {
      nameStr = api.getLocalDisplayName() || "";
    } catch (eN) {}
  }
  var rec = {
    x: stored.x,
    y: stored.y,
    z: stored.z,
    t: now,
    n: nameStr,
  };
  try {
    store.putString(key, JSON.stringify(rec));
  } catch (ePut) {}
}

/**
 * Unit direction from `fromW` to `peerW` in world space. When horizontalOnly, Y is flattened (classic HUD compass).
 */
function directionWorldToPeer(fromW, peerW, horizontalOnly) {
  var dx = peerW.x - fromW.x;
  var dy = peerW.y - fromW.y;
  var dz = peerW.z - fromW.z;
  if (horizontalOnly) {
    dy = 0;
  }
  var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.05) {
    return null;
  }
  return new vec3(dx / len, dy / len, dz / len);
}

/**
 * Orients the needle so **local +Z** aligns with `dirWorld`, then applies extra **local X** euler (cone tilt).
 * Mount rotation is ignored here — we must bake mesh correction into the needle world rotation each frame.
 */
function aimNeedleWorldPlusZAtDirection(needleSo, dirWorld) {
  if (!needleSo || isNull(needleSo) || !dirWorld) {
    return;
  }
  var tr = needleSo.getTransform();
  var localPlusZ = new vec3(0, 0, 1);
  var q;
  try {
    q = quat.rotationFromTo(localPlusZ, dirWorld);
  } catch (eQ) {
    return;
  }
  var rx = script.compassNeedleExtraEulerX;
  if (rx === undefined || rx === null) {
    rx = 0;
  }
  try {
    if (Math.abs(rx) > 1e-4) {
      var qTilt = quat.fromEulerAngles(degToRad(rx), 0, 0);
      q = q.multiply(qTilt);
    }
    tr.setWorldRotation(q);
  } catch (eW) {}
}

function updatePeerNeedlesLayout() {
  if (script.peerCompassEnabled !== true) {
    clearAllNeedles();
    return;
  }
  var store = getStore();
  var cam = script.worldCamera;
  var api = getApi();
  var mount = script.compassMount;
  if (!store || !cam || isNull(cam) || !api || !api.storedPointToWorld) {
    clearAllNeedles();
    return;
  }
  var myId = myPeerStoreId(api);
  if (!myId) {
    clearAllNeedles();
    return;
  }
  if (!mount || isNull(mount)) {
    return;
  }
  ensureCompassHierarchyEnabled();
  if (!script.needleTemplate || isNull(script.needleTemplate)) {
    if (!warnedMissingTemplate) {
      warnedMissingTemplate = true;
      print("[Flaneur][compass] Assign Needle Template (disabled SceneObject, +Z forward).");
    }
    return;
  }

  // Determine a local navigation target from the store (set by UI).
  var navRec = safeJsonParse(store.getString(NAV_PREFIX + myId));
  var wantNav = navRec && navRec.type && navRec.type !== "none";
  if (!script.compassTargetText || isNull(script.compassTargetText)) {
    if (script.logCompassDebug && !warnedMissingCompassTargetText) {
      warnedMissingCompassTargetText = true;
      print("[Flaneur][compass] Assign Compass Target Text input (Compass > Text) to show target label.");
    }
  }

  var keys = store.getAllKeys();
  var peerIds = [];
  var i;
  var now = getTime();
  var staleCutoff = script.staleSeconds > 0 ? script.staleSeconds : 5;
  var maxDistCap = script.maxWorldDistance;
  var useDistCap =
    script.limitCompassByDistance === true &&
    maxDistCap !== undefined &&
    maxDistCap !== null &&
    maxDistCap > 0;

  for (i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k.indexOf(PEER_PREFIX) !== 0) {
      continue;
    }
    var pid = k.substring(PEER_PREFIX.length);
    if (pid === myId) {
      continue;
    }
    var json = store.getString(k);
    if (!json) {
      continue;
    }
    var data;
    try {
      data = JSON.parse(json);
    } catch (eJ) {
      continue;
    }
    if (!data || typeof data.x !== "number") {
      continue;
    }
    if (now - (data.t || 0) > staleCutoff) {
      continue;
    }
    peerIds.push(pid);
  }
  peerIds.sort();

  var camTr = cam.getSceneObject().getTransform();
  var camPos = camTr.getWorldPosition();
  var flatOnly = script.compassBearingHorizontalOnly === true;

  var seen = {};
  var spacing = script.stackSpacing > 0 ? script.stackSpacing : 6;
  var debugFirstPeerDistH = -1;
  var dbgSpawnMiss = false;

  // Default target text behavior (your request):
  // - If no explicit nav target is set, show the "other peer" name (first available).
  if (!wantNav) {
    var defaultLabel = "";
    if (peerIds.length > 0) {
      try {
        var pj = store.getString(PEER_PREFIX + peerIds[0]);
        var pd = safeJsonParse(pj);
        if (pd && pd.n) defaultLabel = safeString(pd.n);
      } catch (eD) {}
      if (!defaultLabel) defaultLabel = "Friend";
    }
    setCompassTargetText(defaultLabel);
  }

  // If we're navigating to something specific, show a single primary needle at the top.
  if (wantNav) {
    var navNeedle = peerNeedles[navNeedleId];
    if (!navNeedle || isNull(navNeedle)) {
      navNeedle = spawnNeedleForPeer(navNeedleId);
    }
    if (navNeedle && !isNull(navNeedle)) {
      seen[navNeedleId] = true;
      navNeedle.enabled = true;
      try {
        navNeedle.getTransform().setLocalPosition(new vec3(0, 0, 0));
      } catch (eLP) {}

      var navLabel = safeString(navRec.label || "");
      var targetWorld = null;

      if (navRec.type === "peer" && navRec.peerId) {
        var peerJson = store.getString(PEER_PREFIX + String(navRec.peerId));
        var peerData = safeJsonParse(peerJson);
        if (peerData && typeof peerData.x === "number") {
          targetWorld = api.storedPointToWorld(new vec3(peerData.x, peerData.y, peerData.z));
          if (!navLabel) navLabel = safeString(peerData.n || "Friend");
        }
      } else if (navRec.type === "pin" && navRec.pinId && api.pinPrefix) {
        var pinJson = store.getString(String(api.pinPrefix) + String(navRec.pinId));
        var pinData = safeJsonParse(pinJson);
        if (pinData && typeof pinData.x === "number") {
          targetWorld = api.storedPointToWorld(new vec3(pinData.x, pinData.y, pinData.z));
          // For pins, show "<owner>'s pin" rather than the raw pin label.
          navLabel = possessivePinLabel(pinData.name || navLabel || "Pin");
        }
      }

      setCompassTargetText(navLabel);
      if (targetWorld) {
        // Use the user's head/camera as the bearing origin. The needle itself is a camera-attached HUD object,
        // so using the needle's HUD world position can skew direction as the HUD mount moves.
        var navDir = directionWorldToPeer(camPos, targetWorld, flatOnly);
        if (navDir) {
          aimNeedleWorldPlusZAtDirection(navNeedle, navDir);
        }
        if (script.logCompassDebug) {
          var tNavLog = getTime();
          if (tNavLog - lastNavDebugLog > 1.0) {
            lastNavDebugLog = tNavLog;
            dbgCompass(
              "nav type=" +
                navRec.type +
                " label=" +
                navLabel +
                " target=" +
                targetWorld.x.toFixed(2) +
                "," +
                targetWorld.y.toFixed(2) +
                "," +
                targetWorld.z.toFixed(2) +
                " cam=" +
                camPos.x.toFixed(2) +
                "," +
                camPos.y.toFixed(2) +
                "," +
                camPos.z.toFixed(2) +
                " dir=" +
                (navDir ? navDir.x.toFixed(2) + "," + navDir.y.toFixed(2) + "," + navDir.z.toFixed(2) : "null")
            );
          }
        }
      }
    }
  }

  for (i = 0; i < peerIds.length; i++) {
    var id = peerIds[i];
    seen[id] = true;
    var key = PEER_PREFIX + id;
    var json2 = store.getString(key);
    if (!json2) {
      continue;
    }
    var d2;
    try {
      d2 = JSON.parse(json2);
    } catch (e2) {
      continue;
    }
    var peerWorld = api.storedPointToWorld(new vec3(d2.x, d2.y, d2.z));
    var distH = Math.sqrt(
      (peerWorld.x - camPos.x) * (peerWorld.x - camPos.x) +
        (peerWorld.z - camPos.z) * (peerWorld.z - camPos.z)
    );
    if (i === 0) {
      debugFirstPeerDistH = distH;
    }
    if (useDistCap && distH > maxDistCap) {
      var soFar = peerNeedles[id];
      if (soFar && !isNull(soFar)) {
        soFar.enabled = false;
      }
      continue;
    }

    var needle = peerNeedles[id];
    if (!needle || isNull(needle)) {
      needle = spawnNeedleForPeer(id);
    }
    if (!needle || isNull(needle)) {
      dbgSpawnMiss = true;
      continue;
    }
    needle.enabled = true;
    var tr = needle.getTransform();
    // Stack peer needles below nav needle if it exists.
    var stackIndex = wantNav ? i + 1 : i;
    tr.setLocalPosition(new vec3(0, stackIndex * spacing, 0));
    applyNeedleHudWorldSize(needle);
    var dir = directionWorldToPeer(camPos, peerWorld, flatOnly);
    if (dir === null) {
      try {
        tr.setLocalRotation(quat.fromEulerAngles(0, 0, 0));
      } catch (eR) {}
      continue;
    }
    aimNeedleWorldPlusZAtDirection(needle, dir);
  }

  for (var nid in peerNeedles) {
    if (!peerNeedles.hasOwnProperty(nid)) {
      continue;
    }
    if (!seen[nid]) {
      destroyNeedle(nid);
    }
  }

  if (script.logCompassDebug) {
    var tlog = getTime();
    if (tlog - lastCompassStatusLog > 2.5) {
      lastCompassStatusLog = tlog;
      var nNeed = 0;
      for (var q in peerNeedles) {
        if (peerNeedles.hasOwnProperty(q)) {
          nNeed++;
        }
      }
      var blockedByDist =
        peerIds.length > 0 &&
        nNeed === 0 &&
        useDistCap &&
        debugFirstPeerDistH >= 0 &&
        debugFirstPeerDistH > maxDistCap &&
        !dbgSpawnMiss;
      if (blockedByDist && !warnedPeersHiddenByMaxDist) {
        warnedPeersHiddenByMaxDist = true;
        print(
          "[Flaneur][compass] Peers hidden by distance cap: distH≈" +
            debugFirstPeerDistH.toFixed(0) +
            " > max=" +
            maxDistCap +
            ". Turn **off** Limit Compass By Distance, or raise Max World Distance."
        );
      }
      dbgCompass(
        "status store=" +
          !!store +
          " myId=" +
          myId +
          " otherPeers=" +
          peerIds.length +
          " needles=" +
          nNeed +
          " distH1=" +
          debugFirstPeerDistH.toFixed(1) +
          " distLimitOn=" +
          useDistCap +
          " maxDist=" +
          (useDistCap ? String(maxDistCap) : "n/a") +
          " spawnFail=" +
          dbgSpawnMiss +
          (blockedByDist ? " BLOCKED_BY_MAX_DIST" : "")
      );
    }
  }
}

script.createEvent("UpdateEvent").bind(function () {
  applyCompassHudPlacement();
  publishLocalPeerPose();
  updatePeerNeedlesLayout();
});

script.createEvent("TurnOnEvent").bind(function () {
  warnedMissingTemplate = false;
  warnedPeersHiddenByMaxDist = false;
  lastHudDebugLog = -999;
  dbgCompass("Peer compass TurnOn.");
});
