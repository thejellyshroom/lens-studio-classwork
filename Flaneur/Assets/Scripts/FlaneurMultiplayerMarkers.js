/**
 * Flâneur — Phase A: Connected Lens session + RealtimeStore-backed shared pins.
 *
 * SETUP IN LENS STUDIO:
 * 1) Add Empty Scene Object (e.g. "Flaneur_Multiplayer").
 * 2) Add this script + assign Connected Lens Module (same asset as the official example prefab).
 * 3) Optional: assign "Markers Root" — **parent** for spawned pin copies (stable hierarchy, template copies, etc.).
 *    If empty, pins parent to this object (fine for a first test).
 *    **Pin Store Coordinate Root** (optional): **RealtimeStore** x/y/z are **local in this object’s space** (same as
 *    Snap’s Colocated / Located At content root). For **Connected Custom Location**, Snap documents **Custom Location
 *    Group is not supported** — a `LocationRoot` with **CustomLocationGroupComponent** and multiple trackables can
 *    desync from colocated multiplayer; prefer a **single** Located At on **ColocatedWorld** for that flow.
 *    When Pin Store Coordinate Root is set (e.g. **ColocatedWorld**), spawned pins **parent there** and use
 *    **setLocalPosition(x,y,z)** so placement matches the store (no mixed parent vs. storage frame). **Markers Root**
 *    is then optional/legacy for that mode. `SetEnabledOnReady` on ColocatedWorld only toggles its configured child
 *    objects — dynamically added pin copies stay enabled via this script.
 *    If Pin Store Coordinate Root is empty, pins parent under Markers Root and coords use that root (legacy).
 *    Keep **Pin Template** near origin (0,0,0) with the template **disabled** in Hierarchy so copies spawn enabled.
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
 * SPECTACLES INTERACTION KIT (required for Interactable / RoundButton / SIK UI):
 * Your scene must include **SpectaclesInteractionKit.prefab** from the Spectacles Interaction Kit package (the
 * prefab intended to be placed in the scene — it registers **MouseInteractor** for Lens Studio Preview / editor and
 * **HandInteractor** rigs for device). If this prefab is missing, SIK **Interactable**s never receive targeting:
 * buttons look fine but never hover or click in Simulator or Preview. This is independent of Flâneur scripts.
 * Enabling **SIK Examples** alone does not substitute for that core prefab. After the kit is in the scene, on
 * **head‑follow world UI** set **Ignore Interaction Plane** on Interactables as needed; keep **Editor Touch
 * Blocking For Preview** OFF here (`touchBlocking` blocks UI).
 *
 * SPECTACLES PREVIEW (Lens Studio) + SIK:
 * Mouse goes through MouseInteractor → Interactables; global Tap/Touch on this script often never fires.
 * - Turn ON "Log Pin Input Debug" once to see which path (if any) receives input.
 * - Turn ON "Log Network Debug" for RealtimeStore / pin-key / remote-toast trace logs (noisy).
 * - Assign "Pin Drop Interaction": any object with InteractionComponent + collider (e.g. full-screen UI Image
 *   under Orthographic Camera, or a large quad in world). That surface receives Preview clicks.
 * - Or double-tap in the Preview panel (DoubleTapEvent).
 *
 * WITH SIK / ON-SCREEN UI + PIN DROP:
 * - **Spawn Object at World Mesh On Tap**: keep **Pin Drop From Global Screen Events OFF**; that script queues **TapEvent**
 *   and runs mesh hit + `flaneurCommitPinAtWorldPosition` in **LateUpdate** (default) so SIK buttons get the tap first.
 *   Turn **Defer Mesh Tap To Late Update** OFF only if debugging ordering.
 * - **SIK RoundButton / sidebar:** leave **Pin Drop Listen Trigger Primary OFF** (default). When the sidebar is open,
 *   `flaneurPinNotifySidebarOpenChanged` disables **pin colliders** if your template has them (helps SIK depth order).
 * - **Pin Drop UI Blocker Root Extra** = your **UI** parent. Blocking = **ScreenTransform.containsScreenPoint** plus many
 *   **SceneObject positions** under those roots projected to screen (**Pin Drop UI World Projection Sample Budget** + **Pin Drop
 *   World UI Block Screen Radius**). SIK nodes often lack colliders/meshes on every object—dense transforms catch taps better.
 *   If UI uses another camera for layout, assign **Pin Drop UI Screen Space Camera**.
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
// @input SceneObject pinStoreCoordinateRoot
// @input SceneObject pinTemplate
// @input Component.Camera worldCamera
// @input float placementDepth = 200
// @input bool autoShareOnSoloConnect = true
// @input bool useSpectaclesSyncKit = true
// @input Component.InteractionComponent pinDropInteraction
// @input bool logPinInputDebug = false
// @input bool logNetworkDebug = false
// @input bool capturePinPhotos = true
// @input bool pinDropFromGlobalScreenEvents = false
// @input bool editorTouchBlockingForPreview = false
// @input SceneObject pinDropUiBlockerRoot
// @input SceneObject pinDropUiBlockerRootExtra
// @input bool pinDropListenTriggerPrimary = false
// @input bool pinDropUseWorldUiProjectionBlock = true
// @input float pinDropWorldUiBlockScreenRadius = 0.26
// @input int pinDropUiWorldProjectionSampleBudget = 400
// @input Component.Camera pinDropUiScreenSpaceCamera

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
/** Same session as `UserInfo.connectionId` — reliable for “who wrote this store key”. */
var localConnectionId = "";
var localDisplayName = "";
var markerById = {};
var syncKitSc = null;
var syncKitWired = false;
var standaloneWired = false;
var syncKitSpinEvent = null;
var receiverStorePollEvent = null;
var pinDropUiBlockerRects = [];
var pinDropUiBlockerWorldPoints = [];
var pinDropUiBlockerWarned = false;
var pinCollidersMutedForSidebarUi = false;
/** When Connected Lens user id is not ready yet, pins still need a *per-client* oid for sync + toasts. */
var flaneurFallbackOwnerId = "";
/** Pin ids written from this client (commit + photo refresh). Dual preview can reuse the same `userId` on both panes — oid matching would wrongly skip remote toasts. */
var localOriginatedPinIds = {};
/** One head toast per pin id for *other* users' drops (lives in markers so it never depends on Social UI TurnOn / seed). */
var remotePinDropToastSentForId = {};
var pinDropToastPendingMsgs = [];
var pinDropToastFlushEv = null;
/** Appended to `peer:*` store id when `localConnectionId` is empty so dual preview panes don’t share one key. */
var flaneurPeerCompassClientNonce = "";

function dbgNet(msg) {
  if (script.logNetworkDebug) {
    print(msg);
  }
}

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
  var budget = script.pinDropUiWorldProjectionSampleBudget;
  if (budget === undefined || budget < 24) {
    budget = 400;
  }
  if (budget > 900) {
    budget = 900;
  }
  var budgetRef = { n: budget };
  if (script.pinDropUiBlockerRoot && !isNull(script.pinDropUiBlockerRoot)) {
    collectScreenTransformsUnder(script.pinDropUiBlockerRoot, pinDropUiBlockerRects);
    collectWorldPositionsUnderBlockerForUiTap(script.pinDropUiBlockerRoot, pinDropUiBlockerWorldPoints, 0, budgetRef);
  }
  if (script.pinDropUiBlockerRootExtra && !isNull(script.pinDropUiBlockerRootExtra)) {
    collectScreenTransformsUnder(script.pinDropUiBlockerRootExtra, pinDropUiBlockerRects);
    collectWorldPositionsUnderBlockerForUiTap(script.pinDropUiBlockerRootExtra, pinDropUiBlockerWorldPoints, 0, budgetRef);
  }
}

function collectWorldPositionsUnderBlockerForUiTap(so, outPts, depth, budgetRef) {
  if (!so || isNull(so) || depth > 72) {
    return;
  }
  if (!so.enabled) {
    return;
  }
  if (budgetRef && budgetRef.n <= 0) {
    return;
  }
  try {
    outPts.push(so.getTransform().getWorldPosition());
    if (budgetRef) {
      budgetRef.n--;
    }
  } catch (e3) {}
  if (budgetRef && budgetRef.n <= 0) {
    return;
  }
  var n = so.getChildrenCount();
  for (var i = 0; i < n; i++) {
    collectWorldPositionsUnderBlockerForUiTap(so.getChild(i), outPts, depth + 1, budgetRef);
    if (budgetRef && budgetRef.n <= 0) {
      break;
    }
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
  var rad = script.pinDropWorldUiBlockScreenRadius > 0.02 ? script.pinDropWorldUiBlockScreenRadius : 0.26;
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
  var camProj = getCameraForUiScreenProjection();
  if (camProj && !isNull(camProj) && isTapNearWorldUiProjectionBlocker(camProj, screenNorm)) {
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
  dbgNet("[Flaneur] Using Spectacles Sync Kit SessionController (no duplicate createSession).");
  sc.onConnected.add(onSpectaclesSyncConnected);
  sc.onRealtimeStoreCreated.add(onRealtimeStoreCreated);
  sc.onRealtimeStoreUpdated.add(onRealtimeStoreUpdated);
  sc.onRealtimeStoreDeleted.add(onRealtimeStoreDeleted);
  sc.onRealtimeStoreKeyRemoved.add(onSpectaclesSyncStoreKeyRemoved);
  sc.onDisconnected.add(onSpectaclesSyncDisconnected);
}

function applyLocalUserInfoFromSession(info) {
  if (!info) {
    return;
  }
  if (info.userId) {
    localUserId = info.userId;
  }
  if (info.connectionId) {
    localConnectionId = info.connectionId;
  }
  if (info.displayName) {
    localDisplayName = info.displayName;
  }
  publishGlobalApi();
}

function onSpectaclesSyncConnected(s, connectionInfo) {
  session = s;
  if (connectionInfo && connectionInfo.localUserInfo) {
    applyLocalUserInfoFromSession(connectionInfo.localUserInfo);
  }
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
  // Only strict true is the store creator. Anything else (false **or** undefined) must
  // use the joiner path: tryBind + poll until the host’s store appears (dual preview /
  // SessionController timing can leave isHost unset briefly or on the second client).
  if (sc && sc.isHost() === true) {
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

/** Joiner: host store may appear in session slightly after onConnected; poll until bind or timeout. */
function startReceiverStorePoll(sess) {
  stopReceiverStorePoll();
  var pollSession = sess;
  if (!pollSession || isNull(pollSession)) {
    pollSession = session;
  }
  if (!pollSession || isNull(pollSession)) {
    return;
  }
  var frames = 0;
  var maxFrames = 1800;
  receiverStorePollEvent = script.createEvent("UpdateEvent");
  receiverStorePollEvent.bind(function () {
    if (flaneurStore) {
      stopReceiverStorePoll();
      return;
    }
    frames++;
    if (frames > maxFrames) {
      var nStores = (pollSession && pollSession.allRealtimeStores) ? pollSession.allRealtimeStores.length : -1;
      print("[Flaneur][net] Receiver: gave up waiting for flaneur store after ~30s. session stores=" + nStores + ". Host may never have created it — check host logs for 'RealtimeStore bound: flaneur_pins_v1'.");
      stopReceiverStorePoll();
      return;
    }
    if (frames % 120 === 0) {
      var n = (pollSession && pollSession.allRealtimeStores) ? pollSession.allRealtimeStores.length : -1;
      var ids = [];
      if (pollSession && pollSession.allRealtimeStores) {
        for (var i = 0; i < pollSession.allRealtimeStores.length; i++) {
          ids.push(getStoreIdSafe(pollSession, pollSession.allRealtimeStores[i]) || "?");
        }
      }
      dbgNet("[Flaneur][net] Poll waiting for flaneur store (" + (frames / 60).toFixed(0) + "s). stores=" + n + " ids=[" + ids.join(",") + "]");
    }
    try {
      if (tryBindExistingFlaneurStore(pollSession)) {
        dbgNet("[Flaneur][net] Receiver: RealtimeStore appeared in session (poll bind).");
        stopReceiverStorePoll();
      }
    } catch (ePoll) {}
  });
}

function onSpectaclesSyncDisconnected(sess, disconnectInfo) {
  stopReceiverStorePoll();
  clearAllMarkerObjects();
  flaneurFallbackOwnerId = "";
  localOriginatedPinIds = {};
  remotePinDropToastSentForId = {};
  pinDropToastPendingMsgs = [];
  if (pinDropToastFlushEv) {
    try {
      script.removeEvent(pinDropToastFlushEv);
    } catch (eRm) {}
    pinDropToastFlushEv = null;
  }
  flaneurStore = null;
  session = null;
  localUserId = "";
  localConnectionId = "";
  localDisplayName = "";
  flaneurPeerCompassClientNonce = "";
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
  if (!st || isNull(st) || getStoreIdSafe(sess, st) !== FLANEUR_STORE_ID) {
    return;
  }
  if (st !== flaneurStore) {
    bindFlaneurStore(st);
  }
  var key = info.key;
  if (typeof key === "string" && key.indexOf(PIN_KEY_PREFIX) === 0) {
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

  if (connectionInfo && connectionInfo.localUserInfo) {
    applyLocalUserInfoFromSession(connectionInfo.localUserInfo);
  }
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
  // If another client already created the store (dual preview where both sides think they
  // are host is common), bind that one instead of creating a duplicate.
  if (tryBindExistingFlaneurStore(sess)) {
    dbgNet("[Flaneur][net] Host path: flaneur store already exists — bound existing.");
    return;
  }

  var opts = RealtimeStoreCreateOptions.create();
  opts.storeId = FLANEUR_STORE_ID;
  opts.ownership = RealtimeStoreCreateOptions.Ownership.Unowned;
  opts.persistence = RealtimeStoreCreateOptions.Persistence.Session;
  opts.allowOwnershipTakeOver = true;
  opts.initialStore = GeneralDataStore.create();

  var onOk = function (store) {
    dbgNet("[Flaneur][net] createRealtimeStore succeeded.");
    bindFlaneurStore(store);
  };
  var onErr = function (err) {
    print("[Flaneur][net] createRealtimeStore failed: " + err + " — falling back to receiver poll.");
    // If creation failed (e.g. store already exists), behave like a joiner.
    if (!tryBindExistingFlaneurStore(sess)) {
      startReceiverStorePoll(sess);
    }
  };

  dbgNet("[Flaneur][net] Host path: creating flaneur store (" + FLANEUR_STORE_ID + ")…");
  if (syncKitSc && syncKitSc.createStore) {
    syncKitSc.createStore(opts, onOk, onErr);
  } else {
    sess.createRealtimeStore(opts, onOk, onErr);
  }
}

function onReceiverConnectedToMultiplayer(sess) {
  var isHostFlag = null;
  try {
    if (syncKitSc && typeof syncKitSc.isHost === "function") {
      isHostFlag = syncKitSc.isHost();
    }
  } catch (eH) {}
  dbgNet("[Flaneur][net] Receiver path entered (isHost=" + String(isHostFlag) + "). allRealtimeStores=" + ((sess && sess.allRealtimeStores) ? sess.allRealtimeStores.length : "?"));
  if (tryBindExistingFlaneurStore(sess)) {
    stopReceiverStorePoll();
    return;
  }
  dbgNet("[Flaneur][net] Receiver connected; waiting for RealtimeStore (poll up to ~10s).");
  startReceiverStorePoll(sess);
}

function tryBindExistingFlaneurStore(sess) {
  if (!sess || !sess.allRealtimeStores) {
    return false;
  }
  var stores = sess.allRealtimeStores;
  for (var i = 0; i < stores.length; i++) {
    var st = stores[i];
    if (!st || isNull(st)) {
      continue;
    }
    if (flaneurStore === st) {
      return true;
    }
    var sid = getStoreIdSafe(sess, st);
    if (sid === FLANEUR_STORE_ID) {
      bindFlaneurStore(st);
      return true;
    }
  }
  return false;
}

function getFlaneurPinOwnerIdForStore() {
  if (localUserId && String(localUserId).length > 0) {
    return String(localUserId);
  }
  if (!flaneurFallbackOwnerId) {
    flaneurFallbackOwnerId = "c_" + Math.floor(Math.random() * 1e9) + "_" + getTime().toFixed(4);
  }
  return flaneurFallbackOwnerId;
}

function ensurePeerCompassClientNonce() {
  if (!flaneurPeerCompassClientNonce) {
    flaneurPeerCompassClientNonce = "p" + Math.floor(Math.random() * 1e9) + "t" + getTime().toFixed(4);
  }
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
        return getFlaneurPinOwnerIdForStore();
      },
      getLocalDisplayName: function () {
        return localDisplayName;
      },
      /**
       * Unique per Connected Lens **connection** (dual preview / Spectacles). Prefer for `peer:*` store keys.
       * If `connectionId` is missing (common in Preview), appends a per-runtime nonce so two panes never
       * overwrite a single `peer:<userId>` entry.
       */
      getPeerCompassStoreId: function () {
        if (localConnectionId && String(localConnectionId).length > 0) {
          return String(localConnectionId);
        }
        ensurePeerCompassClientNonce();
        return String(getFlaneurPinOwnerIdForStore()) + "~" + flaneurPeerCompassClientNonce;
      },
      isScreenOverBlockerUi: function (n) {
        refreshPinDropUiBlockers();
        return isTapOverPinDropUiBlocker(n);
      },
      commitPinAtWorldPosition: commitPinAtWorldPosition,
      /** Same space as pin keys when `pinStoreCoordinateRoot` is set (e.g. ColocatedWorld). */
      worldPointToStored: function (worldPos) {
        return worldPointToStoredVec3(worldPos);
      },
      storedPointToWorld: function (storedVec3) {
        return storedVec3ToWorldPos(storedVec3);
      },
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
      applyLocalUserInfoFromSession(info);
    });
  } catch (e) {}
}

function bindFlaneurStore(store) {
  if (!store || isNull(store)) {
    return;
  }
  if (flaneurStore === store) {
    return;
  }
  // Do NOT return early when two GeneralDataStore references share the same logical
  // storeId (Connected Lens / Sync Kit can hand a poll-bound handle, then a second
  // handle from onRealtimeStoreCreated). Updates are delivered on the canonical ref —
  // if we keep the stale one, `store !== flaneurStore` drops every remote key update.
  var hadPreviousBoundStore = !!(flaneurStore && !isNull(flaneurStore));
  flaneurStore = store;
  stopReceiverStorePoll();
  var nKeys = -1;
  try {
    var ks = flaneurStore.getAllKeys();
    nKeys = ks ? ks.length : 0;
  } catch (eK) {}
  if (hadPreviousBoundStore) {
    dbgNet(
      "[Flaneur][net] RealtimeStore repointed: " +
        FLANEUR_STORE_ID +
        (nKeys >= 0 ? " (" + nKeys + " keys) — soft-resync pins (keep SceneObjects)." : " — soft-resync pins.")
    );
    resyncPinMarkersFromStoreWithoutClear();
  } else {
    dbgNet(
      "[Flaneur][net] RealtimeStore bound: " +
        FLANEUR_STORE_ID +
        (nKeys >= 0 ? " (" + nKeys + " existing keys) — rebuilding markers." : ".")
    );
    rebuildAllMarkersFromStore();
  }
  publishGlobalApi();
  refreshLocalDisplayNameFromSession();
}

function getStoreIdSafe(sess, store) {
  try {
    if (!sess || !store || !sess.getRealtimeStoreInfo) {
      return null;
    }
    var inf = sess.getRealtimeStoreInfo(store);
    return inf ? inf.storeId : null;
  } catch (e) {
    return null;
  }
}

function onRealtimeStoreCreated(sess, store, userInfo, creationInfo) {
  if (!store || isNull(store)) {
    return;
  }
  var sid = creationInfo && creationInfo.storeId;
  if (!sid) {
    sid = getStoreIdSafe(sess, store);
  }
  dbgNet("[Flaneur][net] onRealtimeStoreCreated storeId=" + sid + " by=" + (userInfo && userInfo.displayName ? userInfo.displayName : "?"));
  if (sid === FLANEUR_STORE_ID) {
    bindFlaneurStore(store);
  }
}

function onRealtimeStoreUpdated(sess, store, key, updateInfo) {
  if (!store || isNull(store)) {
    return;
  }
  var sidUp = getStoreIdSafe(sess, store);
  if (sidUp === FLANEUR_STORE_ID && store !== flaneurStore) {
    dbgNet("[Flaneur][net] Flaneur store handle changed — repointing from update (key=" + String(key) + ").");
    bindFlaneurStore(store);
  }
  tryBindFlaneurStoreFromSessionIfNeeded(sess, store);
  if (store !== flaneurStore) {
    return;
  }
  if (typeof key !== "string" || !key.indexOf) {
    return;
  }
  if (key.indexOf(PIN_KEY_PREFIX) === 0) {
    dbgNet("[Flaneur][net] Store pin key update: " + key);
    applyMarkerKey(key);
    maybeNotifyRemotePinDropFromStoreKey(key, updateInfo);
  }
  try {
    if (typeof global !== "undefined" && global.flaneurPinStoreKeyUpdated) {
      global.flaneurPinStoreKeyUpdated(key);
    }
  } catch (e) {}
}

function onRealtimeStoreKeyRemoved(sess, removalInfo) {
  if (!removalInfo || !removalInfo.store || isNull(removalInfo.store)) {
    return;
  }
  var st = removalInfo.store;
  if (getStoreIdSafe(sess, st) !== FLANEUR_STORE_ID) {
    return;
  }
  if (st !== flaneurStore) {
    bindFlaneurStore(st);
  }
  var key = removalInfo.key;
  if (typeof key === "string" && key.indexOf(PIN_KEY_PREFIX) === 0) {
    removeMarkerForKey(key);
  }
}

function onRealtimeStoreDeleted(sess, store) {
  if (!store || isNull(store)) {
    return;
  }
  if (getStoreIdSafe(sess, store) !== FLANEUR_STORE_ID) {
    return;
  }
  clearAllMarkerObjects();
  flaneurFallbackOwnerId = "";
  flaneurPeerCompassClientNonce = "";
  localOriginatedPinIds = {};
  remotePinDropToastSentForId = {};
  pinDropToastPendingMsgs = [];
  if (pinDropToastFlushEv) {
    try {
      script.removeEvent(pinDropToastFlushEv);
    } catch (eRm2) {}
    pinDropToastFlushEv = null;
  }
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

/** SceneObject parent for pin copies: colocated root when store uses it, else Markers Root. */
function getPinInstanceParent() {
  var cr = script.pinStoreCoordinateRoot;
  if (cr && !isNull(cr)) {
    return cr;
  }
  return getMarkersParent();
}

/**
 * Parent used only for `copySceneObject(template)` — keep Markers Root / script object so template
 * copies (e.g. Tube) instantiate reliably. ColocatedWorld as copy parent can fail or drop visuals.
 */
function getPinTemplateCopyParent() {
  return getMarkersParent();
}

/** World ↔ stored vec3 for RealtimeStore; may differ from Markers Root (see header). */
function getPinStoreCoordinateRoot() {
  var cr = script.pinStoreCoordinateRoot;
  if (cr && !isNull(cr)) {
    return cr;
  }
  var mr = script.markersRoot;
  if (mr && !isNull(mr)) {
    return mr;
  }
  return null;
}

function tryBindFlaneurStoreFromSessionIfNeeded(sess, store) {
  if (!sess || !store || isNull(store) || flaneurStore === store) {
    return;
  }
  if (flaneurStore) {
    return;
  }
  try {
    if (!sess.getRealtimeStoreInfo) {
      return;
    }
    var info = sess.getRealtimeStoreInfo(store);
    if (info && info.storeId === FLANEUR_STORE_ID) {
      dbgNet("Bound RealtimeStore from onRealtimeStoreUpdated (joiner / late path).");
      bindFlaneurStore(store);
    }
  } catch (eBind) {}
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

function getCameraForUiScreenProjection() {
  if (script.pinDropUiScreenSpaceCamera && !isNull(script.pinDropUiScreenSpaceCamera)) {
    return script.pinDropUiScreenSpaceCamera;
  }
  return getWorldCamera();
}

function worldPointToStoredVec3(worldPos) {
  var root = getPinStoreCoordinateRoot();
  if (root && !isNull(root)) {
    var inv = root.getTransform().getInvertedWorldTransform();
    return inv.multiplyPoint(worldPos);
  }
  return worldPos;
}

function storedVec3ToWorldPos(stored) {
  var root = getPinStoreCoordinateRoot();
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
  if (pinCollidersMutedForSidebarUi) {
    applyPinColliderOcclusionForSidebar(true);
  }
}

/**
 * Same as iterating `applyMarkerKey` for all pin keys, but **without** destroying existing SceneObjects.
 * Use when Connected Lens hands a **new GeneralDataStore handle** for the same logical store (common on
 * every `onRealtimeStoreUpdated` in some builds) — full `rebuildAllMarkersFromStore` would clear `markerById`,
 * recreate every pin, and flood pin-input debug logs.
 */
function resyncPinMarkersFromStoreWithoutClear() {
  if (!flaneurStore) {
    return;
  }
  var keys = flaneurStore.getAllKeys();
  var seenIds = {};
  var j;
  for (j = 0; j < keys.length; j++) {
    var k2 = keys[j];
    if (k2.indexOf(PIN_KEY_PREFIX) !== 0) {
      continue;
    }
    applyMarkerKey(k2);
    seenIds[k2.substring(PIN_KEY_PREFIX.length)] = true;
  }
  for (var mid in markerById) {
    if (!markerById.hasOwnProperty(mid)) {
      continue;
    }
    if (!seenIds[mid]) {
      removeMarkerForKey(PIN_KEY_PREFIX + mid);
    }
  }
  if (pinCollidersMutedForSidebarUi) {
    applyPinColliderOcclusionForSidebar(true);
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

function flushPendingPinDropToasts() {
  if (!pinDropToastPendingMsgs.length) {
    return;
  }
  if (typeof global === "undefined" || !global.flaneurPinShowToast) {
    return;
  }
  var batch = pinDropToastPendingMsgs;
  pinDropToastPendingMsgs = [];
  for (var i = 0; i < batch.length; i++) {
    try {
      global.flaneurPinShowToast(batch[i]);
    } catch (eF) {}
  }
}

function ensurePinDropToastFlushLoop() {
  if (pinDropToastFlushEv) {
    return;
  }
  var frames = 0;
  pinDropToastFlushEv = script.createEvent("UpdateEvent");
  pinDropToastFlushEv.bind(function () {
    frames++;
    flushPendingPinDropToasts();
    if (!pinDropToastPendingMsgs.length || frames > 480) {
      if (frames > 480) {
        pinDropToastPendingMsgs = [];
      }
      script.removeEvent(pinDropToastFlushEv);
      pinDropToastFlushEv = null;
    }
  });
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

/**
 * @returns {boolean|null} true if updater is this client, false if another client, null if unknown
 */
function isLocalRealtimeStoreUpdater(updateInfo) {
  if (!updateInfo || !updateInfo.updaterInfo) {
    return null;
  }
  var u = updateInfo.updaterInfo;
  try {
    if (localConnectionId && u.connectionId && localConnectionId === u.connectionId) {
      return true;
    }
    if (localUserId && u.userId && String(localUserId) === String(u.userId)) {
      return true;
    }
  } catch (eUp) {}
  return false;
}

/**
 * Called from `onRealtimeStoreUpdated` only — toast for remote drops.
 * Do **not** skip based on `updateInfo.updaterInfo`: dual preview / Sync Kit often reports the local
 * connection as the updater for every key write. Skips only when this client originated the pin id
 * (`localOriginatedPinIds`, set before `putString`).
 */
function maybeNotifyRemotePinDropFromStoreKey(key, updateInfo) {
  if (!flaneurStore || typeof key !== "string" || key.indexOf(PIN_KEY_PREFIX) !== 0) {
    return;
  }
  var json = flaneurStore.getString(key);
  if (!json) {
    return;
  }
  var data;
  try {
    data = JSON.parse(json);
  } catch (eJ) {
    return;
  }
  if (!data || !data.id) {
    return;
  }
  if (localOriginatedPinIds[data.id]) {
    if (script.logNetworkDebug) {
      print("[Flaneur][toast] skip (local pin id / photo refresh) pin=" + data.id);
    }
    return;
  }
  if (remotePinDropToastSentForId[data.id]) {
    return;
  }
  remotePinDropToastSentForId[data.id] = true;
  var updaterClaimsLocal = isLocalRealtimeStoreUpdater(updateInfo) === true;
  var label = "Someone";
  if (!updaterClaimsLocal && updateInfo && updateInfo.updaterInfo && updateInfo.updaterInfo.displayName) {
    label = updateInfo.updaterInfo.displayName;
  } else if (data.name) {
    label = data.name;
  } else if (data.oid) {
    label = String(data.oid);
  }
  if (script.logNetworkDebug) {
    print("[Flaneur][toast] show remote pin=" + data.id + " label=" + label + " updaterClaimsLocal=" + updaterClaimsLocal);
  }
  emitPinDropToastForRemoteViewer(label + " dropped a pin!");
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

function setCollidersEnabledOnSubtree(so, enabled) {
  if (!so || isNull(so)) {
    return;
  }
  try {
    var c1 = so.getComponent("Physics.ColliderComponent");
    if (c1 && !isNull(c1)) {
      c1.enabled = enabled;
    }
  } catch (e0) {}
  try {
    var c2 = so.getComponent("Component.ColliderComponent");
    if (c2 && !isNull(c2)) {
      c2.enabled = enabled;
    }
  } catch (e1) {}
  var nc = so.getChildrenCount();
  for (var i = 0; i < nc; i++) {
    setCollidersEnabledOnSubtree(so.getChild(i), enabled);
  }
}

function applyPinColliderOcclusionForSidebar(isSidebarOpen) {
  pinCollidersMutedForSidebarUi = !!isSidebarOpen;
  var wantColliders = !pinCollidersMutedForSidebarUi;
  for (var id in markerById) {
    if (!markerById.hasOwnProperty(id)) {
      continue;
    }
    var m = markerById[id];
    if (m && !isNull(m)) {
      setCollidersEnabledOnSubtree(m, wantColliders);
    }
  }
}

function onSidebarOpenChangedForPinMeshOcclusion(isSidebarOpen) {
  applyPinColliderOcclusionForSidebar(!!isSidebarOpen);
}

function upsertMarkerScene(data) {
  var id = data.id;
  var localVec = new vec3(data.x, data.y, data.z);
  var coordRoot = script.pinStoreCoordinateRoot;
  var useColocatedParent = coordRoot && !isNull(coordRoot);
  var so = markerById[id];
  var isNewScene = false;
  if (!so || isNull(so)) {
    so = spawnPinObject();
    markerById[id] = so;
    isNewScene = true;
  }
  var pinParent = getPinInstanceParent();
  if (pinParent && !isNull(pinParent)) {
    try {
      so.setParent(pinParent);
    } catch (ePar) {}
  }
  if (isNewScene) {
    dbgNet(
      "[Flaneur][net] Spawned pin scene object id=" + id +
      " parent=" + (so.getParent() ? so.getParent().name : "?") +
      " template=" + (script.pinTemplate && !isNull(script.pinTemplate) ? "yes" : "empty")
    );
  }
  if (useColocatedParent) {
    so.getTransform().setLocalPosition(localVec);
  } else {
    var worldPos = storedVec3ToWorldPos(localVec);
    so.getTransform().setWorldPosition(worldPos);
  }
  // Log only when the marker is first created — store updates (e.g. photo `img` re-write) call here every time and would flood the console.
  if (script.logPinInputDebug && isNewScene) {
    if (useColocatedParent) {
      dbgPin(
        "Pin local (store frame) " +
          localVec.x +
          ", " +
          localVec.y +
          ", " +
          localVec.z +
          " parent=" +
          (so.getParent() ? so.getParent().name : "?")
      );
    } else {
      var wp = storedVec3ToWorldPos(localVec);
      dbgPin("Pin world pos " + wp.x + ", " + wp.y + ", " + wp.z + " parent=" + (so.getParent() ? so.getParent().name : "?"));
    }
  }
  if (pinCollidersMutedForSidebarUi) {
    setCollidersEnabledOnSubtree(so, false);
  }
}

function spawnPinObject() {
  var parent = getPinInstanceParent();
  var copyParent = getPinTemplateCopyParent();
  var template = script.pinTemplate;
  var so;
  if (template && !isNull(template)) {
    so = copyParent.copySceneObject(template);
    try {
      so.setParent(parent);
    } catch (ePar) {}
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
          try {
            if (typeof global !== "undefined" && typeof global.flaneurPinStoreKeyUpdated === "function") {
              global.flaneurPinStoreKeyUpdated(key);
            }
          } catch (eUiNotify) {}
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
  var ownerId = getFlaneurPinOwnerIdForStore();
  var rec = {
    id: makePinId(),
    oid: ownerId,
    name: localDisplayName || localUserId || ownerId || "Player",
    img: "",
    x: stored.x,
    y: stored.y,
    z: stored.z,
    t: t,
  };
  localOriginatedPinIds[rec.id] = true;
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
    global.flaneurPinNotifySidebarOpenChanged = onSidebarOpenChangedForPinMeshOcclusion;
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
  dbgNet("[Flaneur] Pin drop wired to InteractionComponent (recommended for Spectacles Preview).");
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
  try {
    if (
      typeof global.flaneurPinIsMeshPinSuppressedAfterSidebarClose === "function" &&
      global.flaneurPinIsMeshPinSuppressedAfterSidebarClose()
    ) {
      dbgPin("Skipped pin drop (brief window after sidebar close).");
      return;
    }
  } catch (eSupClose) {}
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
    dbgNet(
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
  dbgNet(
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
  flushPendingPinDropToasts();
  dbgNet(
    "[Flaneur] Pin bridge: flaneurPinIsScreenOverBlockerUi + flaneurCommitPinAtWorldPosition; optional Pin Drop UI Screen Space Camera; projection budget + radius for SIK."
  );
});

script.shareSession = shareSession;

publishPinDropGlobals();
