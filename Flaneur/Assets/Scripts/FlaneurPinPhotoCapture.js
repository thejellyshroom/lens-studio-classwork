/**
 * Flâneur — Pin photo capture + store writeback.
 *
 * Owns:
 * - Copying a preview/render-target texture for Editor thumbnails
 * - Copying a CameraModule frame on-device for world-only thumbnails
 * - Base64 encode texture -> RealtimeStore `pinimg:<id>` (raw string) + bump `pin:<id>` metadata
 *   (avoids huge JSON blobs that may not replicate while local UI still shows RAM-cached textures).
 *
 * Exposes:
 * - `global.flaneurCapturePinPhotoAsync(pinId)`
 *
 * Notes:
 * - Spectacles: CameraModule + imageSmallerDimension provides wearable camera frames; we wait for onNewFrame
 *   before copyFrame. If the camera never starts, we fall back to scene capture/live target (may include HUD).
 * - On phone preview, scene targets are used in Editor; on device prefer CameraModule for world-only capture.
 * - Local RAM thumbnail is applied only after Base64 encode succeeds (matches what is written to the store).
 * - After writing store, we call `global.flaneurPinStoreKeyUpdated(key)` if present
 *   so the sidebar can refresh immediately even if store update callbacks don't fire locally.
 */

// @input bool capturePinPhotos = true
// @input Asset.Texture previewSnapshotTexture {"label":"Preview Snapshot Texture (world-only render target preferred)"}
// @input bool usePreviewSceneTargetFallback = true {"label":"Editor fallback: Scene capture/live target"}
// @input bool useCameraModuleOnDevice = true {"label":"Use CameraModule on device for world-only capture"}
// @input int snapshotImageSmallerDimension = 160 {"label":"CameraModule frame smaller dimension"}
// @input int maxSnapshotBase64Chars = 12000 {"label":"Max thumbnail base64 chars for store (keep small for RealtimeStore sync)"}
// @input bool logPinInputDebug = false

var cameraModule = null;
var cameraTexture = null;
var cameraFrameRegistration = null;
var cameraStartAttempted = false;
/** Set true after CameraTextureProvider delivers at least one frame (needed for reliable copyFrame on Spectacles). */
var cameraHasReceivedFrame = false;

function dbg(msg) {
  if (script.logPinInputDebug) print("[Flaneur][pin-photo] " + msg);
}

/** Always printed — use for capture/store failures so devices without logPinInputDebug still diagnose. */
function logPhoto(msg) {
  print("[Flaneur][pin-photo] " + msg);
}

function runAfterFrames(frames, fn) {
  var n = frames;
  if (n <= 0) {
    fn();
    return;
  }
  var ev = script.createEvent("UpdateEvent");
  var c = 0;
  ev.bind(function () {
    c++;
    if (c >= n) {
      try {
        script.removeEvent(ev);
      } catch (eRm) {}
      fn();
    }
  });
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
  var imgPref = "pinimg:";
  if (!api) return { store: null, prefix: "pin:", pinImgPrefix: imgPref };
  var st = null;
  try { st = api.getStore ? api.getStore() : null; } catch (e) {}
  var pref = "pin:";
  try { pref = api.pinPrefix || pref; } catch (e2) {}
  try { imgPref = api.pinImgPrefix || imgPref; } catch (e3) {}
  return { store: st, prefix: pref, pinImgPrefix: imgPref };
}

function safeJsonParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

function notifyPinImageChanged(pinId) {
  var sp = getStoreAndPrefix();
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinStoreKeyUpdated === "function") {
      global.flaneurPinStoreKeyUpdated(sp.prefix + pinId);
      global.flaneurPinStoreKeyUpdated(sp.pinImgPrefix + pinId);
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
  if (maxChars === undefined || maxChars === null || typeof maxChars !== "number" || !isFinite(maxChars)) maxChars = 12000;
  maxChars = Math.floor(maxChars);
  // RealtimeStore payloads need to stay small to reliably sync across peers.
  if (maxChars < 4000) maxChars = 4000;
  if (maxChars > 20000) maxChars = 20000;
  return maxChars;
}

function writePinImgToStore(pinId, base64) {
  var sp = getStoreAndPrefix();
  var store = sp.store;
  if (!store || isNull(store)) return;
  var maxChars = getMaxSnapshotBase64Chars();
  if (base64 && String(base64).length > maxChars) {
    logPhoto("Snapshot too large for store (" + String(base64).length + " > " + maxChars + "); skipping img write.");
    return;
  }
  var key = sp.prefix + pinId;
  var imgKey = sp.pinImgPrefix + pinId;
  var b64 = base64 || "";
  try {
    store.putString(imgKey, b64);
  } catch (eImg) {
    logPhoto("putString(" + imgKey + ") failed: " + eImg);
    return;
  }
  logPhoto("Wrote pinimg " + imgKey + " len=" + b64.length);
  var json = store.getString(key);
  if (!json) {
    dbg("Pin row " + key + " missing after capture; thumbnail is in " + imgKey + " only.");
    notifyPinImageChanged(pinId);
    return;
  }
  var data = safeJsonParse(json);
  if (!data) {
    dbg("Pin JSON parse failed for " + key + "; thumbnail still in " + imgKey + ".");
    notifyPinImageChanged(pinId);
    return;
  }
  data.img = "";
  try {
    data.t = getTime();
  } catch (eT) {}
  try {
    store.putString(key, JSON.stringify(data));
  } catch (ePin) {
    logPhoto("putString(" + key + ") after pinimg failed: " + ePin);
  }
  dbg("Bumped pin metadata for " + pinId + " (inline img cleared; peers use " + sp.pinImgPrefix + ").");
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
    logPhoto("copyFrame failed: " + eCopy);
  }
  return tex;
}

/**
 * Full-resolution capture targets (editor captureTarget / liveTarget) produce huge JPEG base64 that
 * exceeds RealtimeStore limits. Shrink to snapshotImageSmallerDimension (same max edge as CameraModule).
 */
function prepareTextureForPinEncode(srcTex) {
  if (!srcTex || isNull(srcTex)) return srcTex;
  if (typeof ProceduralTextureProvider === "undefined") return srcTex;
  var w = 0;
  var h = 0;
  try {
    w = srcTex.getWidth();
    h = srcTex.getHeight();
  } catch (eSz) {
    return srcTex;
  }
  if (w <= 0 || h <= 0) return srcTex;
  var maxD = getSnapshotImageSmallerDimension();
  var outW = w;
  var outH = h;
  if (w >= h) {
    if (w > maxD) {
      outW = maxD;
      outH = Math.max(1, Math.floor(h * maxD / w));
    }
  } else {
    if (h > maxD) {
      outH = maxD;
      outW = Math.max(1, Math.floor(w * maxD / h));
    }
  }
  if (outW >= w && outH >= h) return srcTex;
  try {
    var procSrc = ProceduralTextureProvider.createFromTexture(srcTex);
    if (!procSrc || isNull(procSrc)) return srcTex;
    var ctrl = procSrc.control;
    if (!ctrl || !ctrl.getPixels) return srcTex;
    var fullData = new Uint8Array(w * h * 4);
    ctrl.getPixels(0, 0, w, h, fullData);
    var outData = new Uint8Array(outW * outH * 4);
    var xRatio = w / outW;
    var yRatio = h / outH;
    for (var oy = 0; oy < outH; oy++) {
      var iy = Math.min(h - 1, Math.floor((oy + 0.5) * yRatio));
      for (var ox = 0; ox < outW; ox++) {
        var ix = Math.min(w - 1, Math.floor((ox + 0.5) * xRatio));
        var si = (iy * w + ix) * 4;
        var di = (oy * outW + ox) * 4;
        outData[di] = fullData[si];
        outData[di + 1] = fullData[si + 1];
        outData[di + 2] = fullData[si + 2];
        outData[di + 3] = fullData[si + 3];
      }
    }
    var outTex = null;
    try {
      if (typeof TextureFormat !== "undefined" && TextureFormat.RGBA8Unorm !== undefined) {
        outTex = ProceduralTextureProvider.createWithFormat(outW, outH, TextureFormat.RGBA8Unorm);
      }
    } catch (eFmt) {}
    if (!outTex || isNull(outTex)) {
      try {
        if (typeof Colorspace !== "undefined" && Colorspace.RGBA !== undefined) {
          outTex = ProceduralTextureProvider.create(outW, outH, Colorspace.RGBA);
        }
      } catch (eCr) {}
    }
    if (!outTex || isNull(outTex) || !outTex.control || !outTex.control.setPixels) return srcTex;
    outTex.control.setPixels(0, 0, outW, outH, outData);
    dbg("Pin snapshot downscaled " + w + "x" + h + " -> " + outW + "x" + outH);
    return outTex;
  } catch (eDs) {
    logPhoto("prepareTextureForPinEncode failed: " + eDs);
    return srcTex;
  }
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
    if (typeof CompressionQuality !== "undefined") {
      if (CompressionQuality.MaximumCompression !== undefined) return CompressionQuality.MaximumCompression;
      if (CompressionQuality.LowQuality !== undefined) return CompressionQuality.LowQuality;
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
    logPhoto("No texture to encode for source=" + sourceLabel + ".");
    return;
  }
  var encTex = prepareTextureForPinEncode(tex);
  if (typeof Base64 === "undefined" || !Base64.encodeTextureAsync) {
    if (typeof global !== "undefined" && global.flaneurEncodeTextureBase64Async) {
      global.flaneurEncodeTextureBase64Async(encTex, function (b64) {
        if (!b64) {
          logPhoto("flaneurEncodeTextureBase64Async returned empty.");
          return;
        }
        cacheLocalSnapshotTexture(pinId, encTex);
        writePinImgToStore(pinId, b64);
      });
      return;
    }
    logPhoto("No base64 encoder (Base64.encodeTextureAsync missing).");
    return;
  }

  var onSuccess = function (b64) {
    if (!b64) {
      logPhoto("Encode returned empty snapshot for source=" + sourceLabel + ".");
      return;
    }
    dbg("Encoded snapshot from " + sourceLabel + ".");
    cacheLocalSnapshotTexture(pinId, encTex);
    writePinImgToStore(pinId, b64);
  };
  var onFailure = function (err) {
    logPhoto("Encode failed (" + sourceLabel + "): " + err + " — retrying without quality/type.");
    try {
      Base64.encodeTextureAsync(
        encTex,
        function (b642) {
          if (!b642) {
            logPhoto("Encode retry returned empty.");
            return;
          }
          cacheLocalSnapshotTexture(pinId, encTex);
          writePinImgToStore(pinId, b642);
        },
        function (err2) {
          logPhoto("Encode retry failed: " + err2);
        }
      );
    } catch (eRetry) {
      logPhoto("Encode retry threw: " + eRetry);
    }
  };

  try {
    var quality = getEncodeQuality();
    var encodingType = getEncodeType();
    if (quality !== null && encodingType !== null) {
      Base64.encodeTextureAsync(encTex, onSuccess, onFailure, quality, encodingType);
    } else {
      Base64.encodeTextureAsync(encTex, onSuccess, onFailure);
    }
  } catch (eEnc) {
    logPhoto("Encode threw for source=" + sourceLabel + ": " + eEnc + " — retrying 2-arg.");
    try {
      Base64.encodeTextureAsync(encTex, onSuccess, function (err3) {
        logPhoto("2-arg encode failed: " + err3);
      });
    } catch (e2) {
      logPhoto("2-arg encode threw: " + e2);
    }
  }
}

function captureRenderTargetSnapshot(pinId) {
  var src = getPreviewSnapshotSourceTexture();
  if (!src || !src.tex || isNull(src.tex)) {
    logPhoto("No snapshot texture/source target available.");
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
    logPhoto("CameraModule requestCamera unavailable.");
    cameraStartAttempted = false;
    return false;
  }
  var createCameraRequest = getCameraRequestFactory(cm);
  if (!createCameraRequest) {
    logPhoto("CameraModule createCameraRequest unavailable.");
    cameraStartAttempted = false;
    return false;
  }

  try {
    var req = createCameraRequest();
    var camId = getCameraId(cm);
    if (camId !== null) {
      try {
        req.cameraId = camId;
      } catch (eId) {}
      try {
        req.id = camId;
      } catch (eId2) {}
    }
    try { req.imageSmallerDimension = getSnapshotImageSmallerDimension(); } catch (eDim) {}
    cameraTexture = cm.requestCamera(req);
    if (!cameraTexture || isNull(cameraTexture)) {
      logPhoto("CameraModule requestCamera returned no texture.");
      cameraStartAttempted = false;
      return false;
    }
    cameraHasReceivedFrame = false;
    try {
      var provider = cameraTexture.control;
      if (provider && provider.onNewFrame && provider.onNewFrame.add) {
        cameraFrameRegistration = provider.onNewFrame.add(function () {
          cameraHasReceivedFrame = true;
        });
      } else {
        cameraHasReceivedFrame = true;
      }
    } catch (eFrame) {
      cameraHasReceivedFrame = true;
    }
    dbg("CameraModule camera texture started for world snapshot.");
    return true;
  } catch (eReq) {
    logPhoto("CameraModule requestCamera threw: " + eReq);
    cameraStartAttempted = false;
  }
  return false;
}

function tryDeviceCaptureFallbackToSceneTarget(pinId) {
  if (script.usePreviewSceneTargetFallback === false) return;
  logPhoto("Falling back to scene capture/live target (Spectacles: use if CameraModule failed; may include HUD).");
  captureRenderTargetSnapshot(pinId);
}

function captureDeviceCameraTextureSnapshot(pinId) {
  if (!startDeviceCameraTexture()) {
    logPhoto("No device camera texture (CameraModule did not start).");
    tryDeviceCaptureFallbackToSceneTarget(pinId);
    return;
  }
  var maxTries = 54;
  function attemptCopy(tryIdx) {
    if (!cameraHasReceivedFrame && tryIdx < 8) {
      runAfterFrames(1, function () {
        attemptCopy(tryIdx + 1);
      });
      return;
    }
    var tex = copyTextureFrame(cameraTexture);
    if (tex && !isNull(tex)) {
      encodeTextureAndWrite(pinId, tex, "CameraModule.requestCamera.copyFrame");
      return;
    }
    if (tryIdx >= maxTries) {
      logPhoto("copyFrame still null after " + maxTries + " tries; trying scene target fallback.");
      tryDeviceCaptureFallbackToSceneTarget(pinId);
      return;
    }
    runAfterFrames(1, function () {
      attemptCopy(tryIdx + 1);
    });
  }
  attemptCopy(0);
}

function capturePinPhotoAsync(pinId) {
  if (!script.capturePinPhotos) return;
  if (!pinId) return;
  var sp = getStoreAndPrefix();
  if (!sp.store || isNull(sp.store)) {
    logPhoto("No store; skipping photo capture for " + pinId + ".");
    return;
  }
  logPhoto("capture begin pinId=" + pinId + " editor=" + isEditor() + " cameraModule=" + (script.useCameraModuleOnDevice === true));
  if (isEditor()) {
    captureRenderTargetSnapshot(pinId);
    return;
  }
  if (script.useCameraModuleOnDevice === true) {
    captureDeviceCameraTextureSnapshot(pinId);
    return;
  }
  logPhoto("Device: CameraModule disabled; using scene capture target if available.");
  if (script.usePreviewSceneTargetFallback !== false) {
    captureRenderTargetSnapshot(pinId);
  }
}

try {
  if (typeof global !== "undefined") global.flaneurCapturePinPhotoAsync = capturePinPhotoAsync;
} catch (eReg0) {}

script.createEvent("TurnOnEvent").bind(function () {
  try {
    if (typeof global !== "undefined") global.flaneurCapturePinPhotoAsync = capturePinPhotoAsync;
  } catch (e) {}
  startDeviceCameraTexture();
});

