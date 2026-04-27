/**
 * Flâneur — Pin photo capture + store writeback.
 *
 * Owns:
 * - Requesting a still image on-device
 * - Base64 encode texture -> store `img` field back into `pin:*` JSON
 *
 * Exposes:
 * - `global.flaneurCapturePinPhotoAsync(pinId)`
 *
 * Notes:
 * - In Editor, CameraModule capture typically doesn't work; this becomes a no-op.
 * - After writing store, we call `global.flaneurPinStoreKeyUpdated(key)` if present
 *   so the sidebar can refresh immediately even if store update callbacks don't fire locally.
 */

// @input bool capturePinPhotos = true
// @input bool logPinInputDebug = false

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

function writePinImgToStore(pinId, base64) {
  var sp = getStoreAndPrefix();
  var store = sp.store;
  if (!store || isNull(store)) return;
  var key = sp.prefix + pinId;
  var json = store.getString(key);
  if (!json) return;
  var data = safeJsonParse(json);
  if (!data) return;
  data.img = base64 || "";
  store.putString(key, JSON.stringify(data));
  try {
    if (typeof global !== "undefined" && typeof global.flaneurPinStoreKeyUpdated === "function") {
      global.flaneurPinStoreKeyUpdated(key);
    }
  } catch (e2) {}
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
    dbg("Editor: skipping CameraModule capture.");
    return;
  }
  var cameraModule = null;
  // Lens Studio built-in module name (device-only).
  try { cameraModule = require("LensStudio:CameraModule"); } catch (e0) {}
  if (!cameraModule || !cameraModule.requestImage) {
    dbg("CameraModule unavailable.");
    return;
  }

  var opts = {};
  try {
    // Keep it modest; base64 grows fast.
    opts.width = 256;
    opts.height = 256;
    opts.quality = 0.6;
  } catch (eOpt) {}

  try {
    cameraModule.requestImage(
      opts,
      function (tex) {
        if (!tex || isNull(tex)) return;
        try {
          // Texture -> base64 (helper exists in other parts of project)
          if (typeof Base64 !== "undefined" && Base64.encodeTextureAsync) {
            Base64.encodeTextureAsync(
              tex,
              function (b64) {
                if (!b64) return;
                writePinImgToStore(pinId, b64);
              },
              function () {}
            );
          } else if (typeof global !== "undefined" && global.flaneurEncodeTextureBase64Async) {
            global.flaneurEncodeTextureBase64Async(tex, function (b64) { writePinImgToStore(pinId, b64); });
          } else {
            dbg("No base64 encoder found (Base64.encodeTextureAsync missing).");
          }
        } catch (eEnc) {
          dbg("Encode failed: " + eEnc);
        }
      },
      function (err) {
        dbg("requestImage failed: " + err);
      }
    );
  } catch (eReq) {
    dbg("requestImage threw: " + eReq);
  }
}

script.createEvent("TurnOnEvent").bind(function () {
  try {
    if (typeof global !== "undefined") global.flaneurCapturePinPhotoAsync = capturePinPhotoAsync;
  } catch (e) {}
});

