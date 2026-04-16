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
 * 5) Optional: assign "World Camera" (main AR camera). If empty, script tries getSceneObject() → first Camera.
 * 6) Remove or disable the stock "Connected Lenses - Multiplayer Session__PLACE_IN_SCENE" prefab to avoid double sessions.
 *    That only removed a duplicate — Connected Lens stays on via Project settings + this script's Connected Lens Module input.
 *
 * TEST: Host opens lens → shares session → join from second device → tap to drop pins; both should see updates.
 */

// @input Asset.ConnectedLensModule connectedLensModule
// @input SceneObject markersRoot
// @input SceneObject pinTemplate
// @input Component.Camera worldCamera
// @input float placementDepth = 200
// @input bool autoShareOnSoloConnect = true

var FLANEUR_STORE_ID = "flaneur_pins_v1";
var PIN_KEY_PREFIX = "pin:";

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
var markerById = {};

script.createEvent("ConnectedLensEnteredEvent").bind(function () {
  script.connectedLensModule.createSession(options);
});

function shareSession() {
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

  session.getLocalUserId(function (userId) {
    localUserId = userId;
  });

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

  sess.createRealtimeStore(
    opts,
    function (store) {
      bindFlaneurStore(store);
    },
    function (err) {
      print("[Flaneur] createRealtimeStore failed: " + err);
    }
  );
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

function bindFlaneurStore(store) {
  if (!store) {
    return;
  }
  flaneurStore = store;
  rebuildAllMarkersFromStore();
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
  if (template && !isNull(template)) {
    return parent.copySceneObject(template);
  }
  var so = scene.createSceneObject("FlaneurPin");
  so.setParent(parent);
  return so;
}

function makePinId() {
  return "p_" + getTime().toFixed(4) + "_" + Math.floor(Math.random() * 1e9);
}

function upsertPinInStore(record) {
  var key = PIN_KEY_PREFIX + record.id;
  flaneurStore.putString(key, JSON.stringify(record));
}

script.createEvent("TapEvent").bind(function (ev) {
  if (!flaneurStore) {
    print(
      "[Flaneur] No RealtimeStore yet. Flow: host runs lens → shares session (auto if Auto Share on) → second device joins same session → then tap. In Preview, use Connected Lens / multiplayer preview if available."
    );
    return;
  }
  var cam = getWorldCamera();
  if (!cam) {
    print("[Flaneur] No camera; assign World Camera input.");
    return;
  }
  var tap = ev.getTapPosition();
  var depth = script.placementDepth > 0 ? script.placementDepth : 200;
  var world = cam.screenSpaceToWorldSpace(tap, depth);
  var stored = worldPointToStoredVec3(world);
  var rec = {
    id: makePinId(),
    oid: localUserId || "local",
    x: stored.x,
    y: stored.y,
    z: stored.z,
    t: getTime(),
  };
  upsertPinInStore(rec);
  upsertMarkerScene(rec);
});

script.createEvent("TurnOnEvent").bind(function () {
  print("[Flaneur] Tap screen to drop a synced pin (Phase A).");
});

script.shareSession = shareSession;
