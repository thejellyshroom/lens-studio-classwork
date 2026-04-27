/**
 * Flâneur — Store + markers + session wiring.
 *
 * Owns:
 * - Connected Lens / Sync Kit session wiring
 * - RealtimeStore bind (`flaneur_pins_v1`)
 * - Spawn/update/remove pin SceneObjects from store keys (`pin:*`)
 * - Remote pin-drop toasts (via `global.flaneurPinShowToast` when available)
 *
 * Exposes:
 * - `global.flaneurPinApi` (store, prefixes, ids, world<->stored helpers)
 * - `global.flaneurCommitPinAtWorldPosition(worldVec3)`
 * - `global.flaneurPinNotifySidebarOpenChanged(isOpen)` (pin collider occlusion)
 */

// @input Asset.ConnectedLensModule connectedLensModule
// @input SceneObject markersRoot
// @input SceneObject pinStoreCoordinateRoot
// @input SceneObject pinTemplate
// @input Component.Camera worldCamera
// @input bool autoShareOnSoloConnect = true
// @input bool useSpectaclesSyncKit = true
// @input bool logNetworkDebug = false
// @input bool logPinInputDebug = false
// @input bool capturePinPhotos = true

var FLANEUR_STORE_ID = "flaneur_pins_v1";
var PIN_KEY_PREFIX = "pin:";
var REACT_KEY_PREFIX = "react:";
var NAV_KEY_PREFIX = "nav:";

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
var localConnectionId = "";
var localDisplayName = "";
var markerById = {};

var syncKitSc = null;
var syncKitWired = false;
var standaloneWired = false;
var syncKitSpinEvent = null;
var receiverStorePollEvent = null;

var pinCollidersMutedForSidebarUi = false;
var flaneurFallbackOwnerId = "";
var localOriginatedPinIds = {};
var remotePinDropToastSentForId = {};

var pinDropToastPendingMsgs = [];
var pinDropToastFlushEv = null;

var flaneurPeerCompassClientNonce = "";

function navKeyForPeerCompassId(peerCompassId) {
  return NAV_KEY_PREFIX + String(peerCompassId || "");
}

function safeJsonParse(s) {
  if (!s || typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function safeLabel(s) {
  if (s == null) return "";
  var t = String(s);
  // Keep it short enough for HUD labels.
  if (t.length > 32) return t.substring(0, 32) + "…";
  return t;
}

function dbgNet(msg) {
  if (script.logNetworkDebug) print(msg);
}

function dbgPin(msg) {
  if (script.logPinInputDebug) print("[Flaneur][pin-input] " + msg);
}

function getSessionController() {
  try {
    if (typeof global !== "undefined" && global.sessionController) return global.sessionController;
  } catch (e) {}
  return null;
}

function wireSpectaclesSyncKit(sc) {
  if (syncKitWired) return;
  syncKitWired = true;
  syncKitSc = sc;
  dbgNet("[Flaneur] Using Spectacles Sync Kit SessionController.");
  sc.onConnected.add(onSpectaclesSyncConnected);
  sc.onRealtimeStoreCreated.add(onRealtimeStoreCreated);
  sc.onRealtimeStoreUpdated.add(onRealtimeStoreUpdated);
  sc.onRealtimeStoreDeleted.add(onRealtimeStoreDeleted);
  sc.onRealtimeStoreKeyRemoved.add(onSpectaclesSyncStoreKeyRemoved);
  sc.onDisconnected.add(onSpectaclesSyncDisconnected);
}

function applyLocalUserInfoFromSession(info) {
  if (!info) return;
  if (info.userId) localUserId = info.userId;
  if (info.connectionId) localConnectionId = info.connectionId;
  if (info.displayName) localDisplayName = info.displayName;
  publishGlobalApi();
}

function onSpectaclesSyncConnected(s, connectionInfo) {
  session = s;
  if (connectionInfo && connectionInfo.localUserInfo) applyLocalUserInfoFromSession(connectionInfo.localUserInfo);
  var sc = getSessionController();
  if (sc && sc.getLocalUserId) {
    localUserId = sc.getLocalUserId() || localUserId;
    publishGlobalApi();
  } else {
    s.getLocalUserId(function (uid) {
      if (uid) {
        localUserId = uid;
        publishGlobalApi();
      }
    });
  }
  try {
    s.getLocalUserInfo(function (info) {
      applyLocalUserInfoFromSession(info);
    });
  } catch (e) {}

  if (sc && sc.isHost && sc.isHost() === true) {
    onStarterConnectedToMultiplayer(s);
  } else {
    onReceiverConnectedToMultiplayer(s);
  }
}

function stopReceiverStorePoll() {
  if (receiverStorePollEvent) {
    script.removeEvent(receiverStorePollEvent);
    receiverStorePollEvent = null;
  }
}

function startReceiverStorePoll(sess) {
  stopReceiverStorePoll();
  var pollSession = sess;
  var frames = 0;
  var maxFrames = 1800;
  receiverStorePollEvent = script.createEvent("UpdateEvent");
  receiverStorePollEvent.bind(function () {
    frames++;
    if (tryBindExistingFlaneurStore(pollSession)) {
      dbgNet("[Flaneur][net] Receiver: store appeared (poll bind).");
      stopReceiverStorePoll();
      return;
    }
    if (frames >= maxFrames) {
      stopReceiverStorePoll();
      var nStores = pollSession && pollSession.allRealtimeStores ? pollSession.allRealtimeStores.length : -1;
      print("[Flaneur][net] Receiver: gave up waiting for flaneur store after ~30s. session stores=" + nStores + ".");
    }
  });
}

function onSpectaclesSyncDisconnected(sess, disconnectInfo) {
  session = null;
  flaneurStore = null;
  clearAllMarkerObjects();
}

function onSpectaclesSyncStoreKeyRemoved(sess, storeOrRemoval, removalInfoMaybe) {
  var info = removalInfoMaybe || storeOrRemoval;
  if (!info || !info.store || isNull(info.store)) return;
  var st = info.store;
  if (!sess || !sess.getRealtimeStoreInfo) return;
  if (getStoreIdSafe(sess, st) !== FLANEUR_STORE_ID) return;
  if (st !== flaneurStore) bindFlaneurStore(st);
  var key = info.key;
  if (typeof key === "string" && key.indexOf(PIN_KEY_PREFIX) === 0) removeMarkerForKey(key);
}

function bindStandaloneConnectedLens() {
  if (standaloneWired) return;
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
      print("[Flaneur] SessionController not found in time; using standalone Connected Lens.");
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
  if (!script.connectedLensModule) return;
  var invitationType = ConnectedLensModule.SessionShareType.Invitation;
  script.connectedLensModule.shareSession(invitationType, function () {});
}

function onSessionCreated(sess, sessionCreationType) {
  // Legacy standalone path uses script.soloSession / isStarter; keep behavior unchanged.
  if (script.soloSession !== undefined) return;
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
  if (connectionInfo && connectionInfo.localUserInfo) applyLocalUserInfoFromSession(connectionInfo.localUserInfo);
  session.getLocalUserId(function (userId) {
    if (userId) {
      localUserId = userId;
      publishGlobalApi();
    }
  });
  try {
    session.getLocalUserInfo(function (info) {
      applyLocalUserInfoFromSession(info);
    });
  } catch (e) {}

  if (script.soloSession) {
    if (script.autoShareOnSoloConnect) shareSession();
    script.soloSession = false;
    return;
  }
  if (script.isStarter) onStarterConnectedToMultiplayer(sess);
  else onReceiverConnectedToMultiplayer(sess);
}

function onStarterConnectedToMultiplayer(sess) {
  if (tryBindExistingFlaneurStore(sess)) {
    dbgNet("[Flaneur][net] Host path: flaneur store already exists — bound existing.");
    publishGlobalApi();
    refreshLocalDisplayNameFromSession();
    return;
  }
  var opts = RealtimeStoreCreateOptions.create();
  opts.ownership = RealtimeStoreCreateOptions.Ownership.Unowned;
  opts.persistence = RealtimeStoreCreateOptions.Persistence.Session;
  opts.storeId = FLANEUR_STORE_ID;
  var onOk = function (store) {
    dbgNet("[Flaneur][net] createRealtimeStore succeeded.");
    bindFlaneurStore(store);
  };
  var onErr = function (err) {
    print("[Flaneur][net] createRealtimeStore failed: " + err + " — falling back to receiver poll.");
    onReceiverConnectedToMultiplayer(sess);
  };
  try {
    sess.createRealtimeStore(opts, onOk, onErr);
  } catch (e) {
    onErr(e);
  }
}

function onReceiverConnectedToMultiplayer(sess) {
  dbgNet("[Flaneur][net] Receiver connected; waiting for RealtimeStore.");
  if (tryBindExistingFlaneurStore(sess)) return;
  startReceiverStorePoll(sess);
}

function tryBindExistingFlaneurStore(sess) {
  if (!sess || !sess.allRealtimeStores) return false;
  var stores = sess.allRealtimeStores;
  for (var i = 0; i < stores.length; i++) {
    var st = stores[i];
    if (!st || isNull(st)) continue;
    if (flaneurStore === st) return true;
    var sid = getStoreIdSafe(sess, st);
    if (sid === FLANEUR_STORE_ID) {
      bindFlaneurStore(st);
      return true;
    }
  }
  return false;
}

function getFlaneurPinOwnerIdForStore() {
  if (localUserId && String(localUserId).length > 0) return String(localUserId);
  if (!flaneurFallbackOwnerId) flaneurFallbackOwnerId = "c_" + Math.floor(Math.random() * 1e9) + "_" + getTime().toFixed(4);
  return flaneurFallbackOwnerId;
}

function ensurePeerCompassClientNonce() {
  if (!flaneurPeerCompassClientNonce) flaneurPeerCompassClientNonce = "p" + Math.floor(Math.random() * 1e9) + "t" + getTime().toFixed(4);
}

function publishGlobalApi() {
  try {
    if (typeof global === "undefined") return;
    global.flaneurPinApi = {
      getStore: function () { return flaneurStore; },
      pinPrefix: PIN_KEY_PREFIX,
      reactPrefix: REACT_KEY_PREFIX,
      navPrefix: NAV_KEY_PREFIX,
      getLocalUserId: function () { return getFlaneurPinOwnerIdForStore(); },
      getLocalDisplayName: function () { return localDisplayName; },
      getPeerCompassStoreId: function () {
        if (localConnectionId && String(localConnectionId).length > 0) return String(localConnectionId);
        ensurePeerCompassClientNonce();
        return String(getFlaneurPinOwnerIdForStore()) + "~" + flaneurPeerCompassClientNonce;
      },
      setNavTargetPeer: function (peerCompassId, label) {
        if (!flaneurStore) return false;
        var selfPcId = global.flaneurPinApi.getPeerCompassStoreId();
        if (!selfPcId) return false;
        var rec = {
          type: "peer",
          peerId: String(peerCompassId || ""),
          label: safeLabel(label || ""),
          t: getTime(),
        };
        try {
          flaneurStore.putString(navKeyForPeerCompassId(selfPcId), JSON.stringify(rec));
          return true;
        } catch (e) {
          return false;
        }
      },
      setNavTargetPin: function (pinId, label) {
        if (!flaneurStore) return false;
        var selfPcId = global.flaneurPinApi.getPeerCompassStoreId();
        if (!selfPcId) return false;
        var rec = {
          type: "pin",
          pinId: String(pinId || ""),
          label: safeLabel(label || ""),
          t: getTime(),
        };
        try {
          flaneurStore.putString(navKeyForPeerCompassId(selfPcId), JSON.stringify(rec));
          return true;
        } catch (e) {
          return false;
        }
      },
      clearNavTarget: function () {
        if (!flaneurStore) return false;
        var selfPcId = global.flaneurPinApi.getPeerCompassStoreId();
        if (!selfPcId) return false;
        try {
          flaneurStore.putString(
            navKeyForPeerCompassId(selfPcId),
            JSON.stringify({ type: "none", label: "", t: getTime() })
          );
          return true;
        } catch (e) {
          return false;
        }
      },
      getNavRecordForPeerCompassId: function (peerCompassId) {
        if (!flaneurStore) return null;
        var k = navKeyForPeerCompassId(peerCompassId);
        var s = flaneurStore.getString(k);
        var rec = safeJsonParse(s);
        if (!rec || typeof rec !== "object") return null;
        return rec;
      },
      worldPointToStored: function (worldPos) { return worldPointToStoredVec3(worldPos); },
      storedPointToWorld: function (storedVec3) { return storedVec3ToWorldPos(storedVec3); }
    };
    global.flaneurCommitPinAtWorldPosition = commitPinAtWorldPosition;
    global.flaneurPinNotifySidebarOpenChanged = onSidebarOpenChangedForPinMeshOcclusion;
  } catch (e) {}
}

function refreshLocalDisplayNameFromSession() {
  if (!session || !session.getLocalUserInfo) return;
  try {
    session.getLocalUserInfo(function (info) { applyLocalUserInfoFromSession(info); });
  } catch (e) {}
}

function bindFlaneurStore(store) {
  if (!store || isNull(store)) return;
  var hadPreviousBoundStore = !!(flaneurStore && !isNull(flaneurStore));
  flaneurStore = store;
  stopReceiverStorePoll();

  var nKeys = -1;
  try { nKeys = flaneurStore.getAllKeys().length; } catch (eK) {}
  dbgNet("[Flaneur][net] RealtimeStore bound: " + FLANEUR_STORE_ID + (nKeys >= 0 ? " (" + nKeys + " keys)" : ""));

  if (!hadPreviousBoundStore) rebuildAllMarkersFromStore();
  else resyncPinMarkersFromStoreWithoutClear();
  publishGlobalApi();
  refreshLocalDisplayNameFromSession();
}

function getStoreIdSafe(sess, store) {
  try {
    if (!sess || !store || !sess.getRealtimeStoreInfo) return null;
    var inf = sess.getRealtimeStoreInfo(store);
    return inf ? inf.storeId : null;
  } catch (e) {
    return null;
  }
}

function onRealtimeStoreCreated(sess, store, userInfo, creationInfo) {
  if (!store || isNull(store)) return;
  var sid = creationInfo && creationInfo.storeId;
  if (!sid) sid = getStoreIdSafe(sess, store);
  dbgNet("[Flaneur][net] onRealtimeStoreCreated storeId=" + sid);
  if (sid === FLANEUR_STORE_ID) bindFlaneurStore(store);
}

function tryBindFlaneurStoreFromSessionIfNeeded(sess, store) {
  if (!sess || !store || isNull(store) || flaneurStore === store) return;
  if (flaneurStore) return;
  try {
    if (!sess.getRealtimeStoreInfo) return;
    var info = sess.getRealtimeStoreInfo(store);
    if (info && info.storeId === FLANEUR_STORE_ID) bindFlaneurStore(store);
  } catch (eBind) {}
}

function onRealtimeStoreUpdated(sess, store, key, updateInfo) {
  if (!store || isNull(store)) return;
  var sidUp = getStoreIdSafe(sess, store);
  if (sidUp === FLANEUR_STORE_ID && store !== flaneurStore) {
    dbgNet("[Flaneur][net] Store handle changed — repointing.");
    bindFlaneurStore(store);
  }
  tryBindFlaneurStoreFromSessionIfNeeded(sess, store);
  if (store !== flaneurStore) return;
  if (typeof key !== "string" || !key.indexOf) return;
  if (key.indexOf(PIN_KEY_PREFIX) === 0) {
    applyMarkerKey(key);
    maybeNotifyRemotePinDropFromStoreKey(key, updateInfo);
  }
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinStoreKeyUpdated === "function") {
      global.flaneurPinStoreKeyUpdated(key);
    }
  } catch (e) {}
}

function onRealtimeStoreKeyRemoved(sess, removalInfo) {
  if (!removalInfo || !removalInfo.store || isNull(removalInfo.store)) return;
  var st = removalInfo.store;
  if (getStoreIdSafe(sess, st) !== FLANEUR_STORE_ID) return;
  if (st !== flaneurStore) bindFlaneurStore(st);
  var key = removalInfo.key;
  if (typeof key === "string" && key.indexOf(PIN_KEY_PREFIX) === 0) removeMarkerForKey(key);
}

function onRealtimeStoreDeleted(sess, store) {
  if (!store || isNull(store)) return;
  if (getStoreIdSafe(sess, store) !== FLANEUR_STORE_ID) return;
  clearAllMarkerObjects();
  flaneurFallbackOwnerId = "";
  flaneurPeerCompassClientNonce = "";
  localOriginatedPinIds = {};
  remotePinDropToastSentForId = {};
  pinDropToastPendingMsgs = [];
  if (pinDropToastFlushEv) {
    try { script.removeEvent(pinDropToastFlushEv); } catch (eRm2) {}
    pinDropToastFlushEv = null;
  }
  flaneurStore = null;
  try { if (typeof global !== "undefined") global.flaneurPinApi = null; } catch (e) {}
}

function onRealtimeStoreOwnershipUpdated(sess, store, ownerInfo, ownershipUpdateInfo) {}
function onUserJoinedSession(sess, userInfo) { if (script.onUserJoinedSession) script.onUserJoinedSession(sess, userInfo); }
function onUserLeftSession(sess, userInfo) { if (script.onUserLeftSession) script.onUserLeftSession(sess, userInfo); }
function onError(sess, errorCode, description) { print("[Flaneur][Connected Lens] " + errorCode + ": " + description); }

function getMarkersParent() {
  if (script.markersRoot && !isNull(script.markersRoot)) return script.markersRoot;
  return script.getSceneObject();
}

function getPinInstanceParent() {
  var cr = script.pinStoreCoordinateRoot;
  if (cr && !isNull(cr)) return cr;
  return getMarkersParent();
}

function getPinTemplateCopyParent() { return getMarkersParent(); }

function getPinStoreCoordinateRoot() {
  var cr = script.pinStoreCoordinateRoot;
  if (cr && !isNull(cr)) return cr;
  var mr = script.markersRoot;
  if (mr && !isNull(mr)) return mr;
  return null;
}

function worldPointToStoredVec3(worldPos) {
  var root = getPinStoreCoordinateRoot();
  if (root && !isNull(root)) return root.getTransform().getInvertedWorldTransform().multiplyPoint(worldPos);
  return worldPos;
}

function storedVec3ToWorldPos(stored) {
  var root = getPinStoreCoordinateRoot();
  if (root && !isNull(root)) return root.getTransform().getWorldTransform().multiplyPoint(stored);
  return stored;
}

function rebuildAllMarkersFromStore() {
  clearAllMarkerObjects();
  if (!flaneurStore) return;
  var keys = flaneurStore.getAllKeys();
  for (var i = 0; i < keys.length; i++) if (keys[i].indexOf(PIN_KEY_PREFIX) === 0) applyMarkerKey(keys[i]);
  if (pinCollidersMutedForSidebarUi) applyPinColliderOcclusionForSidebar(true);
}

function resyncPinMarkersFromStoreWithoutClear() {
  if (!flaneurStore) return;
  var keys = flaneurStore.getAllKeys();
  var seenIds = {};
  for (var j = 0; j < keys.length; j++) {
    var k2 = keys[j];
    if (k2.indexOf(PIN_KEY_PREFIX) !== 0) continue;
    applyMarkerKey(k2);
    seenIds[k2.substring(PIN_KEY_PREFIX.length)] = true;
  }
  for (var mid in markerById) if (markerById.hasOwnProperty(mid) && !seenIds[mid]) removeMarkerForKey(PIN_KEY_PREFIX + mid);
  if (pinCollidersMutedForSidebarUi) applyPinColliderOcclusionForSidebar(true);
}

function clearAllMarkerObjects() {
  for (var id in markerById) {
    if (!markerById.hasOwnProperty(id)) continue;
    var so = markerById[id];
    if (so && !isNull(so)) so.destroy();
  }
  markerById = {};
}

function removeMarkerForKey(key) {
  var id = key.substring(PIN_KEY_PREFIX.length);
  var so = markerById[id];
  if (so && !isNull(so)) so.destroy();
  delete markerById[id];
}

function ensurePinDropToastFlushLoop() {
  if (pinDropToastFlushEv) return;
  var frames = 0;
  pinDropToastFlushEv = script.createEvent("UpdateEvent");
  pinDropToastFlushEv.bind(function () {
    frames++;
    flushPendingPinDropToasts();
    if (!pinDropToastPendingMsgs.length || frames > 480) {
      if (frames > 480) pinDropToastPendingMsgs = [];
      script.removeEvent(pinDropToastFlushEv);
      pinDropToastFlushEv = null;
    }
  });
}

function flushPendingPinDropToasts() {
  if (!pinDropToastPendingMsgs.length) return;
  if (typeof global === "undefined" || !global.flaneurPinShowToast) return;
  var batch = pinDropToastPendingMsgs;
  pinDropToastPendingMsgs = [];
  for (var i = 0; i < batch.length; i++) {
    try { global.flaneurPinShowToast(batch[i]); } catch (eF) {}
  }
}

function emitPinDropToastForRemoteViewer(msg) {
  try {
    if (typeof global !== "undefined" && global.flaneurPinShowToast) {
      global.flaneurPinShowToast(msg);
      return;
    }
  } catch (e0) {}
  pinDropToastPendingMsgs.push(msg);
  ensurePinDropToastFlushLoop();
}

function isLocalRealtimeStoreUpdater(updateInfo) {
  if (!updateInfo || !updateInfo.updaterInfo) return null;
  var u = updateInfo.updaterInfo;
  try {
    if (localConnectionId && u.connectionId && localConnectionId === u.connectionId) return true;
    if (localUserId && u.userId && String(localUserId) === String(u.userId)) return true;
  } catch (eUp) {}
  return false;
}

function maybeNotifyRemotePinDropFromStoreKey(key, updateInfo) {
  if (!flaneurStore || typeof key !== "string" || key.indexOf(PIN_KEY_PREFIX) !== 0) return;
  var json = flaneurStore.getString(key);
  if (!json) return;
  var data;
  try { data = JSON.parse(json); } catch (eJ) { return; }
  if (!data || !data.id) return;
  if (localOriginatedPinIds[data.id]) return;
  if (remotePinDropToastSentForId[data.id]) return;
  remotePinDropToastSentForId[data.id] = true;
  var updaterClaimsLocal = isLocalRealtimeStoreUpdater(updateInfo) === true;
  var label = "Someone";
  if (!updaterClaimsLocal && updateInfo && updateInfo.updaterInfo && updateInfo.updaterInfo.displayName) label = updateInfo.updaterInfo.displayName;
  else if (data.name) label = data.name;
  else if (data.oid) label = String(data.oid);
  emitPinDropToastForRemoteViewer(label + " dropped a pin!");
}

function applyMarkerKey(key) {
  var json = flaneurStore.getString(key);
  if (!json) return;
  var data;
  try { data = JSON.parse(json); } catch (e) { return; }
  if (!data || !data.id) return;
  upsertMarkerScene(data);
}

function setCollidersEnabledOnSubtree(so, enabled) {
  if (!so || isNull(so)) return;
  try {
    var c1 = so.getComponent("Physics.ColliderComponent");
    if (c1 && !isNull(c1)) c1.enabled = enabled;
  } catch (e0) {}
  try {
    var c2 = so.getComponent("Component.ColliderComponent");
    if (c2 && !isNull(c2)) c2.enabled = enabled;
  } catch (e1) {}
  var nc = so.getChildrenCount();
  for (var i = 0; i < nc; i++) setCollidersEnabledOnSubtree(so.getChild(i), enabled);
}

function applyPinColliderOcclusionForSidebar(isSidebarOpen) {
  pinCollidersMutedForSidebarUi = !!isSidebarOpen;
  var wantColliders = !pinCollidersMutedForSidebarUi;
  for (var id in markerById) {
    if (!markerById.hasOwnProperty(id)) continue;
    var m = markerById[id];
    if (m && !isNull(m)) setCollidersEnabledOnSubtree(m, wantColliders);
  }
}

function onSidebarOpenChangedForPinMeshOcclusion(isSidebarOpen) { applyPinColliderOcclusionForSidebar(!!isSidebarOpen); }

function spawnPinObject() {
  var parent = getPinInstanceParent();
  var copyParent = getPinTemplateCopyParent();
  var template = script.pinTemplate;
  var so;
  if (template && !isNull(template)) {
    so = copyParent.copySceneObject(template);
    try { so.setParent(parent); } catch (ePar) {}
  } else {
    so = scene.createSceneObject("FlaneurPin");
    so.setParent(parent);
  }
  so.enabled = true;
  return so;
}

function upsertMarkerScene(data) {
  var id = data.id;
  var localVec = new vec3(data.x, data.y, data.z);
  var coordRoot = script.pinStoreCoordinateRoot;
  var useColocatedParent = coordRoot && !isNull(coordRoot);
  var so = markerById[id];
  if (!so || isNull(so)) {
    so = spawnPinObject();
    markerById[id] = so;
  }
  var pinParent = getPinInstanceParent();
  if (pinParent && !isNull(pinParent)) {
    try { so.setParent(pinParent); } catch (ePar2) {}
  }
  if (useColocatedParent) so.getTransform().setLocalPosition(localVec);
  else so.getTransform().setWorldPosition(storedVec3ToWorldPos(localVec));
  if (pinCollidersMutedForSidebarUi) setCollidersEnabledOnSubtree(so, false);
}

function makePinId() { return "p_" + getTime().toFixed(4) + "_" + Math.floor(Math.random() * 1e9); }

function upsertPinInStore(record) { flaneurStore.putString(PIN_KEY_PREFIX + record.id, JSON.stringify(record)); }

var lastPinWallTime = -999;
function commitPinAtWorldPosition(worldVec3) {
  if (!worldVec3) return;
  try {
    if (typeof global !== "undefined" && global.flaneurSuppressPinDropUntil && getTime() < global.flaneurSuppressPinDropUntil) {
      dbgPin("Blocked pin commit (suppressed).");
      return;
    }
  } catch (eSup) {}
  if (!flaneurStore) {
    dbgPin("flaneurCommitPinAtWorldPosition: no RealtimeStore.");
    return;
  }
  var t = getTime();
  if (t - lastPinWallTime < 0.25) return;
  lastPinWallTime = t;
  var stored = worldPointToStoredVec3(worldVec3);
  var ownerId = getFlaneurPinOwnerIdForStore();
  var rec = { id: makePinId(), oid: ownerId, name: localDisplayName || localUserId || ownerId || "Player", img: "", x: stored.x, y: stored.y, z: stored.z, t: t };
  localOriginatedPinIds[rec.id] = true;
  upsertPinInStore(rec);
  upsertMarkerScene(rec);
  dbgPin("Committed pin " + rec.id);
  try {
    if (typeof global !== "undefined" && typeof global.flaneurSfxPinDrop === "function") {
      global.flaneurSfxPinDrop();
    }
  } catch (eSfx) {}
  try {
    if (typeof global !== "undefined" && global.flaneurPinShowToast) global.flaneurPinShowToast((localDisplayName || "You") + " dropped a pin!");
  } catch (e) {}
  try {
    if (typeof global !== "undefined" && typeof global.flaneurCapturePinPhotoAsync === "function" && script.capturePinPhotos !== false) {
      global.flaneurCapturePinPhotoAsync(rec.id);
    }
  } catch (eCap) {}
}

script.createEvent("TurnOnEvent").bind(function () {
  publishGlobalApi();
  tryWireMultiplayerBackend();
  flushPendingPinDropToasts();
});

script.shareSession = shareSession;
publishGlobalApi();

