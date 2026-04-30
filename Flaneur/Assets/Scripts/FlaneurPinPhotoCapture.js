/**
 * Flâneur — Pin photo capture + store writeback.
 *
 * Owns:
 * - Copying a preview/render-target texture for Editor thumbnails
 * - Copying a CameraModule frame on-device for world-only thumbnails
 * - Base64 encode texture -> store `img` field back into `pin:*` JSON
 *
 * Exposes:
 * - `global.flaneurCapturePinPhotoAsync(pinId)`
 *
 * Notes:
 * - On device, scene capture/live targets include HUD UI in this project. Use CameraModule for world-only capture.
 * - After writing store, we call `global.flaneurPinStoreKeyUpdated(key)` if present
 *   so the sidebar can refresh immediately even if store update callbacks don't fire locally.
 */

// @input bool capturePinPhotos = true
// @input Asset.Texture previewSnapshotTexture {"label":"Preview Snapshot Texture (world-only render target preferred)"}
// @input bool usePreviewSceneTargetFallback = true {"label":"Editor fallback: Scene capture/live target"}
// @input bool useCameraModuleOnDevice = true {"label":"Use CameraModule on device for world-only capture"}
// @input int snapshotImageSmallerDimension = 256 {"label":"CameraModule frame smaller dimension"}
// @input int maxSnapshotBase64Chars = 60000 {"label":"Max thumbnail base64 chars for store"}
// @input bool logPinInputDebug = false

var cameraModule = null;
var cameraTexture = null;
var cameraFrameRegistration = null;
var cameraStartAttempted = false;

function dbg(msg) {
  if (script.logPinInputDebug) print("[Flaneur][pin-photo] " + msg);
}

function isEditor() {
  try {
    if (typeof global !== "undefined" && global.deviceInfoSystem && global.deviceInfoSystem.isEditor) return global.deviceInfoSystem.isEditor();
  } catch (e) {}
  return false;
}

function getStoreApi() {
  try { return (typeof global !== "undefined") ? global.flaneurPinApi : null; } catch (e) { return null; }
}

function getStoreAndPrefix() {
  var api = getStoreApi();
  if (!api) return { store: null, prefix: "pin:" };
  var st = null;
  try { st = api.getStore ? api.getStore() : null; } catch (e) {}
  var pref = "pin:";
  try { pref = api.pinPrefix || pref; } catch (e2) {}
  return { store: st, prefix: pref };
}

function safeJsonParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

function notifyPinImageChanged(pinId) {
  var sp = getStoreAndPrefix();
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinStoreKeyUpdated === "function") {
      global.flaneurPinStoreKeyUpdated(sp.prefix + pinId);
    }
  } catch (e2) {}
}

function cacheLocalSnapshotTexture(pinId, tex) {
  if (!pinId || !tex || isNull(tex)) return;
  try {
    if (typeof global !== "undefined") {
      global.flaneurPinLocalSnapshotTextures = global.flaneurPinLocalSnapshotTextures || {};
      global.flaneurPinLocalSnapshotTextures[String(pinId)] = tex;
    }
  } catch (eCache) {}
  notifyPinImageChanged(pinId);
}

function getMaxSnapshotBase64Chars() {
  var maxChars = script.maxSnapshotBase64Chars;
  if (maxChars === undefined || maxChars === null || maxChars <= 0) return 60000;
  return Math.max(12000, Math.floor(maxChars));
}

function writePinImgToStore(pinId, base64) {
  var sp = getStoreAndPrefix();
  var store = sp.store;
  if (!store || isNull(store)) return;
  var maxChars = getMaxSnapshotBase64Chars();
  if (base64 && String(base64).length > maxChars) {
    dbg("Snapshot too large for store (" + String(base64).length + " > " + maxChars + "); skipping img write.");
    return;
  }
  var key = sp.prefix + pinId;
  var json = store.getString(key);
  if (!json) return;
  var data = safeJsonParse(json);
  if (!data) return;
  data.img = base64 || "";
  store.putString(key, JSON.stringify(data));
  dbg("Wrote snapshot img for pin " + pinId + " (" + (base64 ? String(base64).length : 0) + " chars).");
  notifyPinImageChanged(pinId);
}

function getSnapshotImageSmallerDimension() {
  var dim = script.snapshotImageSmallerDimension;
  if (dim === undefined || dim === null || dim <= 0) return 256;
  return Math.max(64, Math.min(512, Math.floor(dim)));
}

function copyTextureFrame(tex) {
  if (!tex || isNull(tex)) return null;
  try {
    if (tex.copyFrame) {
      return tex.copyFrame();
    }
  } catch (eCopy) {
    dbg("copyFrame failed: " + eCopy);
  }
  return tex;
}

function getPreviewSnapshotSourceTexture() {
  if (script.previewSnapshotTexture && !isNull(script.previewSnapshotTexture)) {
    return { tex: script.previewSnapshotTexture, source: "previewSnapshotTexture" };
  }
  if (script.usePreviewSceneTargetFallback === false) {
    return null;
  }
  try {
    if (typeof global !== "undefined" && global.scene) {
      if (global.scene.captureTarget && !isNull(global.scene.captureTarget)) {
        return { tex: global.scene.captureTarget, source: "scene.captureTarget" };
      }
      if (global.scene.liveTarget && !isNull(global.scene.liveTarget)) {
        return { tex: global.scene.liveTarget, source: "scene.liveTarget" };
      }
    }
  } catch (eScene) {
    dbg("Scene target lookup failed: " + eScene);
  }
  return null;
}

function getCameraId(cm) {
  try {
    if (typeof CameraModule !== "undefined" && CameraModule.CameraId && CameraModule.CameraId.Default_Color !== undefined) {
      return CameraModule.CameraId.Default_Color;
    }
  } catch (eGlobal) {}
  try {
    if (cm && cm.CameraId && cm.CameraId.Default_Color !== undefined) {
      return cm.CameraId.Default_Color;
    }
  } catch (eModule) {}
  return null;
}

function getEncodeQuality() {
  try {
    if (typeof CompressionQuality !== "undefined" && CompressionQuality.LowQuality !== undefined) {
      return CompressionQuality.LowQuality;
    }
  } catch (eQ) {}
  return null;
}

function getEncodeType() {
  try {
    if (typeof EncodingType !== "undefined" && EncodingType.Jpg !== undefined) {
      return EncodingType.Jpg;
    }
  } catch (eT) {}
  return null;
}

function encodeTextureAndWrite(pinId, tex, sourceLabel) {
  if (!tex || isNull(tex)) {
    dbg("No texture to encode for source=" + sourceLabel + ".");
    return;
  }
  cacheLocalSnapshotTexture(pinId, tex);
  if (typeof Base64 === "undefined" || !Base64.encodeTextureAsync) {
    if (typeof global !== "undefined" && global.flaneurEncodeTextureBase64Async) {
      global.flaneurEncodeTextureBase64Async(tex, function (b64) {
        if (!b64) return;
        writePinImgToStore(pinId, b64);
      });
      return;
    }
    dbg("No base64 encoder found (Base64.encodeTextureAsync missing).");
    return;
  }

  var onSuccess = function (b64) {
    if (!b64) {
      dbg("Encode returned empty snapshot for source=" + sourceLabel + ".");
      return;
    }
    dbg("Encoded snapshot from " + sourceLabel + ".");
    writePinImgToStore(pinId, b64);
  };
  var onFailure = function (err) {
    dbg("Encode failed for source=" + sourceLabel + ": " + err);
  };

  try {
    var quality = getEncodeQuality();
    var encodingType = getEncodeType();
    if (quality !== null && encodingType !== null) {
      Base64.encodeTextureAsync(tex, onSuccess, onFailure, quality, encodingType);
    } else {
      Base64.encodeTextureAsync(tex, onSuccess, onFailure);
    }
  } catch (eEnc) {
    dbg("Encode threw for source=" + sourceLabel + ": " + eEnc);
  }
}

function captureRenderTargetSnapshot(pinId) {
  var src = getPreviewSnapshotSourceTexture();
  if (!src || !src.tex || isNull(src.tex)) {
    dbg("No snapshot texture/source target available.");
    return;
  }
  var tex = copyTextureFrame(src.tex);
  dbg("Captured snapshot from " + src.source + ".");
  encodeTextureAndWrite(pinId, tex, src.source);
}

function getCameraModule() {
  if (cameraModule) return cameraModule;
  try { cameraModule = require("LensStudio:CameraModule"); } catch (e0) {}
  return cameraModule;
}

function getCameraRequestFactory(cm) {
  try {
    if (typeof CameraModule !== "undefined" && CameraModule.createCameraRequest) {
      return CameraModule.createCameraRequest;
    }
  } catch (eGlobal) {}
  try {
    if (cm && cm.createCameraRequest) {
      return cm.createCameraRequest;
    }
  } catch (eModule) {}
  return null;
}

function startDeviceCameraTexture() {
  if (isEditor()) return false;
  if (script.useCameraModuleOnDevice !== true) return false;
  if (cameraTexture && !isNull(cameraTexture)) return true;
  if (cameraStartAttempted) return false;
  cameraStartAttempted = true;

  var cm = getCameraModule();
  if (!cm || !cm.requestCamera) {
    dbg("CameraModule requestCamera unavailable.");
    return false;
  }
  var createCameraRequest = getCameraRequestFactory(cm);
  if (!createCameraRequest) {
    dbg("CameraModule createCameraRequest unavailable.");
    return false;
  }

  try {
    var req = createCameraRequest();
    var camId = getCameraId(cm);
    if (camId !== null) {
      try { req.cameraId = camId; } catch (eId) {}
    }
    try { req.imageSmallerDimension = getSnapshotImageSmallerDimension(); } catch (eDim) {}
    cameraTexture = cm.requestCamera(req);
    if (!cameraTexture || isNull(cameraTexture)) {
      dbg("CameraModule requestCamera returned no texture.");
      return false;
    }
    try {
      var provider = cameraTexture.control;
      if (provider && provider.onNewFrame && provider.onNewFrame.add) {
        cameraFrameRegistration = provider.onNewFrame.add(function () {});
      }
    } catch (eFrame) {}
    dbg("CameraModule camera texture started for world snapshot.");
    return true;
  } catch (eReq) {
    dbg("CameraModule requestCamera threw: " + eReq);
  }
  return false;
}

function captureDeviceCameraTextureSnapshot(pinId) {
  if (!startDeviceCameraTexture()) {
    dbg("No device camera texture available for world snapshot.");
    return;
  }
  var tex = copyTextureFrame(cameraTexture);
  if (!tex || isNull(tex)) {
    dbg("Device camera copyFrame returned no texture.");
    return;
  }
  encodeTextureAndWrite(pinId, tex, "CameraModule.requestCamera.copyFrame");
}

function capturePinPhotoAsync(pinId) {
  if (!script.capturePinPhotos) return;
  if (!pinId) return;
  var sp = getStoreAndPrefix();
  if (!sp.store || isNull(sp.store)) {
    dbg("No store; skipping photo capture.");
    return;
  }
  if (isEditor()) {
    captureRenderTargetSnapshot(pinId);
    return;
  }
  if (script.useCameraModuleOnDevice === true) {
    captureDeviceCameraTextureSnapshot(pinId);
    return;
  }
  dbg("Device world snapshot skipped: CameraModule disabled and scene target contains UI.");
}

script.createEvent("TurnOnEvent").bind(function () {
  try {
    if (typeof global !== "undefined") global.flaneurCapturePinPhotoAsync = capturePinPhotoAsync;
  } catch (e) {}
  startDeviceCameraTexture();
});

