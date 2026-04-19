/**
 * Flâneur — Phase A: Connected Lens session + RealtimeStore-backed shared pins.
 *
 * SETUP IN LENS STUDIO:
 * 1) Add Empty Scene Object (e.g. "Flaneur_Multiplayer").
 * 2) Add this script + assign Connected Lens Module (same asset as the official example prefab).
 * 3) Optional: assign "Markers Root" to your shared world root (e.g. child of Device Tracking / world space).
 *    If empty, pins parent to this object (fine for a first test).
 * 4) Optional: assign "Pin Template" — a SIMPLE object only (e.g. small Box/Sphere mesh you add).
 *    Do NOT use AR Navigation Kit objects (ARNavigation, etc.): they need navigationDataComponent and will error when copied.
 *    If empty, spawns empty SceneObjects (sync still works; add a template for visibility).
 *    If the template is disabled in the hierarchy (so it stays hidden in-editor), copies are still forced enabled at runtime.
 * 5) Optional: assign "World Camera" (main AR camera). If empty, script tries getSceneObject() → first Camera.
 * 6) Remove or disable the stock "Connected Lenses - Multiplayer Session__PLACE_IN_SCENE" prefab to avoid double sessions.
 *    That only removed a duplicate — Connected Lens stays on via Project settings + this script's Connected Lens Module input.
 *
 * SPECTACLES SYNC KIT (dual preview / Spectacles):
 * - Set "Use Spectacles Sync Kit" ON (default). SessionController already calls createSession; this script hooks global.sessionController instead.
 * - Start flow: use Sync Kit Start Menu → Multiplayer (needs internet) OR Singleplayer with "Mocked Online" if you need a mock session without buttons in preview.
 * - Manual Singleplayer hides the menu without calling init() — there is no RealtimeStore in that mode.
 *
 * SPECTACLES PREVIEW (Lens Studio) + SIK:
 * Mouse goes through MouseInteractor → Interactables; global Tap/Touch on this script often never fires.
 * - Turn ON "Log Pin Input Debug" once to see which path (if any) receives input.
 * - Assign "Pin Drop Interaction": any object with InteractionComponent + collider (e.g. full-screen UI Image
 *   under Orthographic Camera, or a large quad in world). That surface receives Preview clicks.
 * - Or double-tap in the Preview panel (DoubleTapEvent).
 *
 * WITH SIK / ON-SCREEN UI + PIN DROP:
 * - **Spawn Object at World Mesh On Tap**: keep **Pin Drop From Global Screen Events OFF**; that script handles **TapEvent**
 *   and calls `flaneurPinIsScreenOverBlockerUi` then `flaneurCommitPinAtWorldPosition` when **Skip Instantiate When Flaneur Pins**
 *   is ON. Pins still use **Pin Template**.
 * - **SIK RoundButton:** leave **Pin Drop Listen Trigger Primary OFF** (default). If ON, this script also handles
 *   **TriggerPrimaryEvent** and competes with SIK for the same input—buttons often stop receiving hits.
 * - **Pin Drop UI Blocker Root Extra** = your **UI** parent (Toast / Next / Sidebar). Uses **ScreenTransform** hits plus
 *   **world mesh/text/collider** positions projected to screen (**Pin Drop World UI Block Screen Radius**) for head-anchored SIK.
 * - Optional **Pin Drop From Global Screen Events** for legacy depth drops on this script. **Pin Drop UI Blocker Root** = SIK canvas if needed.
 * - "Editor Touch Blocking For Preview" stays OFF by default (touchBlocking blocks UI in Preview).
 *
 * TEST: Host opens lens → shares session → join from second device → tap to drop pins; both should see updates.
 *
 * PIN PHOTOS (Spectacles): Uses `require("LensStudio:CameraModule")` and still-image `requestImage` — no Camera Module
 * asset in the Inspector. Still images are not supported in the Lens Studio editor; run on device.
 */

// @input Asset.ConnectedLensModule connectedLensModule
// @input SceneObject markersRoot
// @input SceneObject pinTemplate
// @input Component.Camera worldCamera
// @input float placementDepth = 200
// @input bool autoShareOnSoloConnect = true
// @input bool useSpectaclesSyncKit = true
// @input Component.InteractionComponent pinDropInteraction
// @input bool logPinInputDebug = false
// @input bool capturePinPhotos = true
// @input bool pinDropFromGlobalScreenEvents = false
// @input bool editorTouchBlockingForPreview = false
// @input SceneObject pinDropUiBlockerRoot
// @input SceneObject pinDropUiBlockerRootExtra
// @input bool pinDropListenTriggerPrimary = false
// @input bool pinDropUseWorldUiProjectionBlock = true
// @input float pinDropWorldUiBlockScreenRadius = 0.11

var FLANEUR_STORE_ID = "flaneur_pins_v1";
var PIN_KEY_PREFIX = "pin:";
var REACT_KEY_PREFIX = "react:";

var options = ConnectedLensSessionOptions.create();
options.onConnected = onConnected;
options.onSessionCreated = onSessionCreated;
options.onUserJoinedSession = onUserJoinedSession;
options.onUserLeftSession = onUserLeftSession;
options.onError = onError;
options.onRealtimeStoreCreated = onRealtimeStoreCreated;
options.onRealtimeStoreUpdated = onRealtimeStoreUpdated;
options.onRealtimeStoreDeleted = onRealtimeStoreDeleted;
options.onRealtimeStoreOwnershipUpdated = onRealtimeStoreOwnershipUpdated;
options.onRealtimeStoreKeyRemoved = onRealtimeStoreKeyRemoved;

var session;
var flaneurStore;
var localUserId = "";
var localDisplayName = "";
var markerById = {};
var syncKitSc = null;
var syncKitWired = false;
var standaloneWired = false;
var syncKitSpinEvent = null;
var pinDropUiBlockerRects = [];
var pinDropUiBlockerWorldPoints = [];
var pinDropUiBlockerWarned = false;

function collectScreenTransformsUnder(so, outList) {
  if (!so || isNull(so)) {
    return;
  }
  var st = so.getComponent("Component.ScreenTransform");
  if (st && !isNull(st)) {
    outList.push(st);
  }
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    collectScreenTransformsUnder(so.getChild(i), outList);
  }
}

function refreshPinDropUiBlockers() {
  pinDropUiBlockerRects = [];
  pinDropUiBlockerWorldPoints = [];
  if (script.pinDropUiBlockerRoot && !isNull(script.pinDropUiBlockerRoot)) {
    collectScreenTransformsUnder(script.pinDropUiBlockerRoot, pinDropUiBlockerRects);
    collectWorldPositionsUnderBlockerForUiTap(script.pinDropUiBlockerRoot, pinDropUiBlockerWorldPoints, 0);
  }
  if (script.pinDropUiBlockerRootExtra && !isNull(script.pinDropUiBlockerRootExtra)) {
    collectScreenTransformsUnder(script.pinDropUiBlockerRootExtra, pinDropUiBlockerRects);
    collectWorldPositionsUnderBlockerForUiTap(script.pinDropUiBlockerRootExtra, pinDropUiBlockerWorldPoints, 0);
  }
}

function shouldSampleWorldPositionForUiBlock(so) {
  if (!so || isNull(so)) {
    return false;
  }
  try {
    if (so.getComponent("Component.RenderMeshVisual")) {
      return true;
    }
  } catch (e0) {}
  try {
    if (so.getComponent("Component.Text")) {
      return true;
    }
  } catch (e1) {}
  try {
    if (so.getComponent("Physics.ColliderComponent")) {
      return true;
    }
  } catch (e2) {}
  try {
    if (so.getComponent("Component.ColliderComponent")) {
      return true;
    }
  } catch (e2b) {}
  return false;
}

function collectWorldPositionsUnderBlockerForUiTap(so, outPts, depth) {
  if (!so || isNull(so) || depth > 64) {
    return;
  }
  if (!so.enabled) {
    return;
  }
  if (shouldSampleWorldPositionForUiBlock(so)) {
    try {
      outPts.push(so.getTransform().getWorldPosition());
    } catch (e3) {}
  }
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    collectWorldPositionsUnderBlockerForUiTap(so.getChild(i), outPts, depth + 1);
  }
}

function isTapNearWorldUiProjectionBlocker(cam, screenNorm) {
  if (
    script.pinDropUseWorldUiProjectionBlock === false ||
    !cam ||
    isNull(cam) ||
    !screenNorm ||
    !pinDropUiBlockerWorldPoints ||
    pinDropUiBlockerWorldPoints.length === 0
  ) {
    return false;
  }
  var rad = script.pinDropWorldUiBlockScreenRadius > 0.02 ? script.pinDropWorldUiBlockScreenRadius : 0.11;
  var rad2 = rad * rad;
  var snx = screenNorm.x;
  var sny = screenNorm.y;
  var j;
  for (j = 0; j < pinDropUiBlockerWorldPoints.length; j++) {
    var wp = pinDropUiBlockerWorldPoints[j];
    if (!wp) {
      continue;
    }
    try {
      var sp = cam.worldSpaceToScreenSpace(wp);
      if (sp.x < -0.25 || sp.x > 1.25 || sp.y < -0.25 || sp.y > 1.25) {
        continue;
      }
      var dx = sp.x - snx;
      var dy = sp.y - sny;
      if (dx * dx + dy * dy <= rad2) {
        return true;
      }
    } catch (e4) {}
  }
  return false;
}

function isTapOverPinDropUiBlocker(screenNorm) {
  if (!screenNorm) {
    return false;
  }
  for (var i = 0; i < pinDropUiBlockerRects.length; i++) {
    var st = pinDropUiBlockerRects[i];
    if (!st || isNull(st)) {
      continue;
    }
    try {
      if (st.containsScreenPoint(screenNorm)) {
        return true;
      }
    } catch (e) {}
  }
  var camW = getWorldCamera();
  if (camW && !isNull(camW) && isTapNearWorldUiProjectionBlocker(camW, screenNorm)) {
    return true;
  }
  return false;
}

function getSessionController() {
  try {
    if (typeof global !== "undefined" && global.sessionController) {
      return global.sessionController;
    }
  } catch (e) {}
  return null;
}

function wireSpectaclesSyncKit(sc) {
  if (syncKitWired) {
    return;
  }
  syncKitWired = true;
  syncKitSc = sc;
  print("[Flaneur] Using Spectacles Sync Kit SessionController (no duplicate createSession).");
  sc.onConnected.add(onSpectaclesSyncConnected);
  sc.onRealtimeStoreCreated.add(onRealtimeStoreCreated);
  sc.onRealtimeStoreUpdated.add(onRealtimeStoreUpdated);
  sc.onRealtimeStoreDeleted.add(onRealtimeStoreDeleted);
  sc.onRealtimeStoreKeyRemoved.add(onSpectaclesSyncStoreKeyRemoved);
  sc.onDisconnected.add(onSpectaclesSyncDisconnected);
}

function onSpectaclesSyncConnected(s, connectionInfo) {
  session = s;
  if (connectionInfo && connectionInfo.localUserInfo && connectionInfo.localUserInfo.displayName) {
    localDisplayName = connectionInfo.localUserInfo.displayName;
  }
  var sc = getSessionController();
  if (sc && sc.getLocalUserId) {
    localUserId = sc.getLocalUserId() || "";
  } else {
    s.getLocalUserId(function (uid) {
      localUserId = uid;
    });
  }
  try {
    s.getLocalUserInfo(function (info) {
      if (info && info.displayName) {
        localDisplayName = info.displayName;
        publishGlobalApi();
      }
    });
  } catch (e) {}
  if (sc && sc.isHost() === true) {
    onStarterConnectedToMultiplayer(s);
  } else if (sc && sc.isHost() === false) {
    onReceiverConnectedToMultiplayer(s);
  } else {
    tryBindExistingFlaneurStore(s);
  }
}

function onSpectaclesSyncDisconnected(sess, disconnectInfo) {
  clearAllMarkerObjects();
  flaneurStore = null;
  session = null;
  localUserId = "";
  localDisplayName = "";
  try {
    if (typeof global !== "undefined") {
      global.flaneurPinApi = null;
    }
  } catch (e) {}
}

/** Sync Kit passes (session, store, removalInfo); standalone options pass (session, removalInfo). */
function onSpectaclesSyncStoreKeyRemoved(sess, storeOrRemoval, removalInfoMaybe) {
  var st;
  var info;
  if (removalInfoMaybe !== undefined && removalInfoMaybe !== null && removalInfoMaybe.key !== undefined) {
    st = storeOrRemoval;
    info = removalInfoMaybe;
  } else {
    info = storeOrRemoval;
    st = info.store;
  }
  if (st !== flaneurStore) {
    return;
  }
  var key = info.key;
  if (key.indexOf(PIN_KEY_PREFIX) === 0) {
    removeMarkerForKey(key);
  }
}

function bindStandaloneConnectedLens() {
  if (standaloneWired) {
    return;
  }
  standaloneWired = true;
  if (!script.connectedLensModule) {
    print("[Flaneur] Standalone mode: assign Connected Lens Module or enable Use Spectacles Sync Kit.");
    return;
  }
  script.createEvent("ConnectedLensEnteredEvent").bind(function () {
    script.connectedLensModule.createSession(options);
  });
}

function tryWireMultiplayerBackend() {
  var wantSync = script.useSpectaclesSyncKit !== false;
  if (!wantSync) {
    bindStandaloneConnectedLens();
    return;
  }
  var sc = getSessionController();
  if (sc && sc.onConnected && typeof sc.onConnected.add === "function") {
    wireSpectaclesSyncKit(sc);
    return;
  }
  var frames = 0;
  syncKitSpinEvent = script.createEvent("UpdateEvent");
  syncKitSpinEvent.bind(function () {
    frames++;
    var sc2 = getSessionController();
    if (sc2 && sc2.onConnected && typeof sc2.onConnected.add === "function") {
      script.removeEvent(syncKitSpinEvent);
      syncKitSpinEvent = null;
      wireSpectaclesSyncKit(sc2);
      return;
    }
    if (frames >= 240) {
      script.removeEvent(syncKitSpinEvent);
      syncKitSpinEvent = null;
      print("[Flaneur] SessionController not found in time; using standalone Connected Lens (assign module + disable Use Spectacles Sync Kit to skip wait).");
      bindStandaloneConnectedLens();
    }
  });
}

function shareSession() {
  if (syncKitSc && syncKitSc.shareInvite) {
    try {
      syncKitSc.shareInvite();
    } catch (e) {
      print("[Flaneur] shareInvite failed: " + e);
    }
    return;
  }

  var invitationType = ConnectedLensModule.SessionShareType.Invitation;

  function onSessionShared(sess, snapcodeTexture) {
    if (invitationType === ConnectedLensModule.SessionShareType.Snapcode) {
      if (script.snapcodeImage) {
        script.snapcodeImage.mainPass.baseTex = snapcodeTexture;
      } else {
        print("[Flaneur] Assign snapcode Image component for Snapcode invites.");
      }
    }
  }

  script.connectedLensModule.shareSession(invitationType, onSessionShared);
}

function onSessionCreated(sess, sessionCreationType) {
  if (script.soloSession !== undefined) {
    return;
  }

  if (sessionCreationType == ConnectedLensSessionOptions.SessionCreationType.MultiplayerReceiver) {
    script.soloSession = false;
  } else if (
    sessionCreationType == ConnectedLensSessionOptions.SessionCreationType.New ||
    sessionCreationType == ConnectedLensSessionOptions.SessionCreationType.NewSoloMode
  ) {
    script.isStarter = true;
    script.soloSession = true;
  }
}

function onConnected(sess, connectionInfo) {
  session = sess;

  if (connectionInfo && connectionInfo.localUserInfo && connectionInfo.localUserInfo.displayName) {
    localDisplayName = connectionInfo.localUserInfo.displayName;
  }
  session.getLocalUserId(function (userId) {
    localUserId = userId;
  });
  try {
    session.getLocalUserInfo(function (info) {
      if (info && info.displayName) {
        localDisplayName = info.displayName;
        publishGlobalApi();
      }
    });
  } catch (e) {}

  if (script.soloSession) {
    onStarterConnectedToSolo(sess);
    script.soloSession = false;
    return;
  }

  if (script.isStarter) {
    onStarterConnectedToMultiplayer(sess);
  } else {
    onReceiverConnectedToMultiplayer(sess);
  }
}

function onStarterConnectedToSolo(sess) {
  if (script.autoShareOnSoloConnect) {
    shareSession();
  }
}

function onStarterConnectedToMultiplayer(sess) {
  var opts = RealtimeStoreCreateOptions.create();
  opts.storeId = FLANEUR_STORE_ID;
  opts.ownership = RealtimeStoreCreateOptions.Ownership.Unowned;
  opts.persistence = RealtimeStoreCreateOptions.Persistence.Session;
  opts.allowOwnershipTakeOver = true;
  opts.initialStore = GeneralDataStore.create();

  var onOk = function (store) {
    bindFlaneurStore(store);
  };
  var onErr = function (err) {
    print("[Flaneur] createRealtimeStore failed: " + err);
  };

  if (syncKitSc && syncKitSc.createStore) {
    syncKitSc.createStore(opts, onOk, onErr);
  } else {
    sess.createRealtimeStore(opts, onOk, onErr);
  }
}

function onReceiverConnectedToMultiplayer(sess) {
  if (!tryBindExistingFlaneurStore(sess)) {
    print("[Flaneur] Receiver connected; waiting for RealtimeStore (onRealtimeStoreCreated).");
  }
}

function tryBindExistingFlaneurStore(sess) {
  var stores = sess.allRealtimeStores;
  for (var i = 0; i < stores.length; i++) {
    var info = sess.getRealtimeStoreInfo(stores[i]);
    if (info.storeId === FLANEUR_STORE_ID) {
      bindFlaneurStore(stores[i]);
      return true;
    }
  }
  return false;
}

function publishGlobalApi() {
  try {
    if (typeof global === "undefined") {
      return;
    }
    global.flaneurPinApi = {
      getStore: function () {
        return flaneurStore;
      },
      pinPrefix: PIN_KEY_PREFIX,
      reactPrefix: REACT_KEY_PREFIX,
      getLocalUserId: function () {
        return localUserId;
      },
      getLocalDisplayName: function () {
        return localDisplayName;
      },
      isScreenOverBlockerUi: function (n) {
        refreshPinDropUiBlockers();
        return isTapOverPinDropUiBlocker(n);
      },
      commitPinAtWorldPosition: commitPinAtWorldPosition,
    };
    publishPinDropGlobals();
  } catch (e) {}
}

function refreshLocalDisplayNameFromSession() {
  if (!session || !session.getLocalUserInfo) {
    return;
  }
  try {
    session.getLocalUserInfo(function (info) {
      if (info && info.displayName) {
        localDisplayName = info.displayName;
        publishGlobalApi();
      }
    });
  } catch (e) {}
}

function bindFlaneurStore(store) {
  if (!store) {
    return;
  }
  flaneurStore = store;
  rebuildAllMarkersFromStore();
  publishGlobalApi();
  refreshLocalDisplayNameFromSession();
}

function onRealtimeStoreCreated(sess, store, userInfo, creationInfo) {
  if (creationInfo.storeId === FLANEUR_STORE_ID) {
    bindFlaneurStore(store);
  }
}

function onRealtimeStoreUpdated(sess, store, key, updateInfo) {
  if (store !== flaneurStore) {
    return;
  }
  if (key.indexOf(PIN_KEY_PREFIX) === 0) {
    applyMarkerKey(key);
  }
  try {
    if (typeof global !== "undefined" && global.flaneurPinStoreKeyUpdated) {
      global.flaneurPinStoreKeyUpdated(key);
    }
  } catch (e) {}
}

function onRealtimeStoreKeyRemoved(sess, removalInfo) {
  if (!removalInfo.store || removalInfo.store !== flaneurStore) {
    return;
  }
  var key = removalInfo.key;
  if (key.indexOf(PIN_KEY_PREFIX) === 0) {
    removeMarkerForKey(key);
  }
}

function onRealtimeStoreDeleted(sess, store) {
  if (store !== flaneurStore) {
    return;
  }
  clearAllMarkerObjects();
  flaneurStore = null;
  try {
    if (typeof global !== "undefined") {
      global.flaneurPinApi = null;
    }
  } catch (e) {}
}

function onRealtimeStoreOwnershipUpdated(sess, store, ownerInfo, ownershipUpdateInfo) {}

function onUserJoinedSession(sess, userInfo) {
  if (script.onUserJoinedSession) {
    script.onUserJoinedSession(sess, userInfo);
  }
}

function onUserLeftSession(sess, userInfo) {
  if (script.onUserLeftSession) {
    script.onUserLeftSession(sess, userInfo);
  }
}

function onError(sess, errorCode, description) {
  print("[Flaneur][Connected Lens] " + errorCode + ": " + description);
}

function getMarkersParent() {
  if (script.markersRoot && !isNull(script.markersRoot)) {
    return script.markersRoot;
  }
  return script.getSceneObject();
}

function getWorldCamera() {
  if (script.worldCamera && !isNull(script.worldCamera)) {
    return script.worldCamera;
  }
  var cam = script.getSceneObject().getComponent("Component.Camera");
  if (cam) {
    return cam;
  }
  return null;
}

function worldPointToStoredVec3(worldPos) {
  var root = script.markersRoot;
  if (root && !isNull(root)) {
    var inv = root.getTransform().getInvertedWorldTransform();
    return inv.multiplyPoint(worldPos);
  }
  return worldPos;
}

function storedVec3ToWorldPos(stored) {
  var root = script.markersRoot;
  if (root && !isNull(root)) {
    var mat = root.getTransform().getWorldTransform();
    return mat.multiplyPoint(stored);
  }
  return stored;
}

function rebuildAllMarkersFromStore() {
  clearAllMarkerObjects();
  if (!flaneurStore) {
    return;
  }
  var keys = flaneurStore.getAllKeys();
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k.indexOf(PIN_KEY_PREFIX) === 0) {
      applyMarkerKey(k);
    }
  }
}

function clearAllMarkerObjects() {
  for (var id in markerById) {
    if (markerById.hasOwnProperty(id)) {
      var so = markerById[id];
      if (so && !isNull(so)) {
        so.destroy();
      }
    }
  }
  markerById = {};
}

function removeMarkerForKey(key) {
  var id = key.substring(PIN_KEY_PREFIX.length);
  var so = markerById[id];
  if (so && !isNull(so)) {
    so.destroy();
  }
  delete markerById[id];
}

function applyMarkerKey(key) {
  var json = flaneurStore.getString(key);
  if (!json) {
    return;
  }
  var data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    print("[Flaneur] Bad pin JSON for " + key);
    return;
  }
  if (!data || !data.id) {
    return;
  }
  upsertMarkerScene(data);
}

function upsertMarkerScene(data) {
  var id = data.id;
  var worldPos = storedVec3ToWorldPos(new vec3(data.x, data.y, data.z));
  var so = markerById[id];
  if (!so || isNull(so)) {
    so = spawnPinObject();
    markerById[id] = so;
  }
  so.getTransform().setWorldPosition(worldPos);
}

function spawnPinObject() {
  var parent = getMarkersParent();
  var template = script.pinTemplate;
  var so;
  if (template && !isNull(template)) {
    so = parent.copySceneObject(template);
  } else {
    so = scene.createSceneObject("FlaneurPin");
    so.setParent(parent);
  }
  so.enabled = true;
  return so;
}

function makePinId() {
  return "p_" + getTime().toFixed(4) + "_" + Math.floor(Math.random() * 1e9);
}

function upsertPinInStore(record) {
  var key = PIN_KEY_PREFIX + record.id;
  flaneurStore.putString(key, JSON.stringify(record));
}

function getSpectaclesCameraModule() {
  try {
    return require("LensStudio:CameraModule");
  } catch (e) {
    return null;
  }
}

function capturePinPhotoAsync(pinId) {
  if (script.capturePinPhotos === false) {
    return;
  }
  var camMod = getSpectaclesCameraModule();
  if (!camMod) {
    return;
  }
  try {
    if (global.deviceInfoSystem.isEditor()) {
      return;
    }
  } catch (e) {}
  var req = CameraModule.createImageRequest();
  var p = camMod.requestImage(req);
  if (!p || typeof p.then !== "function") {
    return;
  }
  p.then(
    function (frame) {
      if (!flaneurStore || !frame || !frame.texture) {
        return;
      }
      Base64.encodeTextureAsync(
        frame.texture,
        function (b64) {
          if (!flaneurStore || !b64) {
            return;
          }
          if (b64.length > 400000) {
            print("[Flaneur] Pin photo skipped (encoded size too large for store).");
            return;
          }
          var key = PIN_KEY_PREFIX + pinId;
          var json = flaneurStore.getString(key);
          if (!json) {
            return;
          }
          var data;
          try {
            data = JSON.parse(json);
          } catch (e) {
            return;
          }
          data.img = b64;
          flaneurStore.putString(key, JSON.stringify(data));
        },
        function () {
          print("[Flaneur] Pin photo encode failed.");
        },
        CompressionQuality.LowQuality,
        EncodingType.Jpg
      );
    },
    function () {
      print("[Flaneur] Pin photo capture unavailable (expected in Editor / non-Spectacles).");
    }
  );
}

var lastPinWallTime = -999;

/**
 * Normalized screen pos (0–1). TapEvent / DoubleTapEvent; TouchStartEvent for devices that omit TapEvent.
 * TouchEndEvent is not used for pin drop (avoids a second placement when lifting off UI).
 */
function dbgPin(msg) {
  if (script.logPinInputDebug) {
    print("[Flaneur][pin-input] " + msg);
  }
}

function commitPinAtWorldPosition(worldVec3) {
  if (!worldVec3) {
    return;
  }
  if (!flaneurStore) {
    dbgPin("flaneurCommitPinAtWorldPosition: no RealtimeStore.");
    return;
  }
  var t = getTime();
  if (t - lastPinWallTime < 0.25) {
    return;
  }
  lastPinWallTime = t;
  var stored = worldPointToStoredVec3(worldVec3);
  var rec = {
    id: makePinId(),
    oid: localUserId || "local",
    name: localDisplayName || localUserId || "Player",
    img: "",
    x: stored.x,
    y: stored.y,
    z: stored.z,
    t: t,
  };
  upsertPinInStore(rec);
  upsertMarkerScene(rec);
  dbgPin("Committed pin " + rec.id);
  try {
    if (typeof global !== "undefined" && global.flaneurPinShowToast) {
      global.flaneurPinShowToast((localDisplayName || "You") + " dropped a pin!");
    }
  } catch (e) {}
  capturePinPhotoAsync(rec.id);
}

function publishPinDropGlobals() {
  try {
    if (typeof global === "undefined") {
      return;
    }
    global.flaneurPinIsScreenOverBlockerUi = function (screenNorm) {
      refreshPinDropUiBlockers();
      return isTapOverPinDropUiBlocker(screenNorm);
    };
    global.flaneurCommitPinAtWorldPosition = commitPinAtWorldPosition;
  } catch (ePub) {}
}

function tryEnableEditorTouchForLens() {
  if (script.editorTouchBlockingForPreview !== true) {
    return;
  }
  try {
    if (global.deviceInfoSystem.isEditor()) {
      global.touchSystem.touchBlocking = true;
      dbgPin("Set touchSystem.touchBlocking = true (Preview only; can block SIK UI—disable if UI stops receiving taps).");
    }
  } catch (e) {
    dbgPin("touchBlocking not set: " + e);
  }
}

function wirePinDropInteractionComponent() {
  var ic = script.pinDropInteraction;
  if (!ic || isNull(ic)) {
    return;
  }
  ic.onTap.add(function (args) {
    dbgPin("InteractionComponent.onTap");
    tryDropPinAtNormalizedScreen(args.position);
  });
  print("[Flaneur] Pin drop wired to InteractionComponent (recommended for Spectacles Preview).");
}

function tryDropPinAtNormalizedScreen(screenNorm) {
  if (!flaneurStore) {
    if (syncKitSc) {
      print(
        "[Flaneur] No RealtimeStore yet. With Sync Kit: open Start Menu → Multiplayer (internet) or Singleplayer + Mocked Online; manual Singleplayer never starts a session. Then tap."
      );
    } else {
      print(
        "[Flaneur] No RealtimeStore yet. Flow: host runs lens → shares session (auto if Auto Share on) → second device joins same session → then tap."
      );
    }
    return;
  }
  refreshPinDropUiBlockers();
  if (isTapOverPinDropUiBlocker(screenNorm)) {
    dbgPin("Skipped pin drop (tap on UI under Pin Drop UI Blocker Root).");
    return;
  }
  if (
    script.pinDropFromGlobalScreenEvents === true &&
    (!script.pinDropUiBlockerRoot || isNull(script.pinDropUiBlockerRoot)) &&
    (!script.pinDropUiBlockerRootExtra || isNull(script.pinDropUiBlockerRootExtra)) &&
    !pinDropUiBlockerWarned
  ) {
    pinDropUiBlockerWarned = true;
    print(
      "[Flaneur] Pin Drop From Global Screen Events is ON but Pin Drop UI Blocker Root (and Extra) are empty—assign SIK screen root and/or head UI root so buttons are not treated as pin drops."
    );
  }

  var cam = getWorldCamera();
  if (!cam) {
    print("[Flaneur] No camera; assign World Camera input.");
    return;
  }
  var sn = screenNorm;
  if (!sn) {
    sn = new vec2(0.5, 0.5);
  }
  var depth = script.placementDepth > 0 ? script.placementDepth : 200;
  var world = cam.screenSpaceToWorldSpace(sn, depth);
  commitPinAtWorldPosition(world);
}

function bindGlobalScreenPinEventsIfEnabled() {
  if (script.pinDropFromGlobalScreenEvents !== true) {
    print(
      "[Flaneur] Pin drops: Interaction + TriggerPrimary; global Tap off (use Spawn Object at World Mesh On Tap + flaneur globals for mesh hits)."
    );
    return;
  }
  script.createEvent("TapEvent").bind(function (ev) {
    dbgPin("TapEvent");
    tryDropPinAtNormalizedScreen(ev.getTapPosition());
  });
  script.createEvent("TouchStartEvent").bind(function (ev) {
    dbgPin("TouchStartEvent");
    tryDropPinAtNormalizedScreen(ev.getTouchPosition());
  });
  script.createEvent("DoubleTapEvent").bind(function (ev) {
    dbgPin("DoubleTapEvent");
    tryDropPinAtNormalizedScreen(ev.getTapPosition());
  });
  print(
    "[Flaneur] Global screen pin events ON (depth placement). Prefer OFF when using Spawn Object at World Mesh On Tap."
  );
}

bindGlobalScreenPinEventsIfEnabled();

if (script.pinDropListenTriggerPrimary === true) {
  script.createEvent("TriggerPrimaryEvent").bind(function (ev) {
    dbgPin("TriggerPrimaryEvent");
    var p = ev.position;
    if (!p || (p.x === 0 && p.y === 0)) {
      p = new vec2(0.5, 0.5);
    }
    tryDropPinAtNormalizedScreen(p);
  });
}

script.createEvent("TurnOnEvent").bind(function () {
  refreshPinDropUiBlockers();
  publishPinDropGlobals();
  tryEnableEditorTouchForLens();
  wirePinDropInteractionComponent();
  tryWireMultiplayerBackend();
  print(
    "[Flaneur] Pin bridge: Spawn Object at World Mesh On Tap → flaneurPinIsScreenOverBlockerUi / flaneurCommitPinAtWorldPosition. TriggerPrimary pin drop is OFF by default (SIK). Tune Pin Drop World UI Block Screen Radius for head UI."
  );
});

script.shareSession = shareSession;

publishPinDropGlobals();
