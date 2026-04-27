/**
 * Flâneur — Toast + head-follow UI.
 *
 * Responsibilities:
 * - Move a UI root (or toast anchor) to a camera-local offset with smoothing.
 * - Show a transient toast message via global.flaneurPinShowToast(msg).
 *
 * Pair with: FlaneurSidebarPinListUi.js (pin list + reactions).
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

var toastHoldUntil = -1;
var toastFading = false;
var toastFadeT = 0;

var followPrevCamPos = null;
var followPrevCamFwdH = null;
var followHasPrev = false;

function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
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
    var fwdH = fhLen > 1e-4 ? new vec3(fx / fhLen, 0, fz / fhLen) : new vec3(0, 0, -1);

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
      var dotFH = followPrevCamFwdH.x * fwdH.x + followPrevCamFwdH.y * fwdH.y + followPrevCamFwdH.z * fwdH.z;
      dotFH = Math.max(-1, Math.min(1, dotFH));
      var crossY = followPrevCamFwdH.x * fwdH.z - followPrevCamFwdH.z * fwdH.x;
      var yawRad = Math.atan2(crossY, dotFH);
      yawDegPerSec = (Math.abs(yawRad) / epsDt) * (180 / Math.PI);
    }

    var refLat = script.followLateralSpeedRef > 1e-4 ? script.followLateralSpeedRef : 0.14;
    var refYaw = script.followYawDegPerSecRef > 1e-2 ? script.followYawDegPerSecRef : 38;
    var blendLat = clamp01(lateralSpeed / refLat);
    var blendRot = clamp01(yawDegPerSec / refYaw);

    var tauStraight = script.toastStraightFollowSmoothTime > 1e-4 ? script.toastStraightFollowSmoothTime : 0.035;
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

    tr.setWorldPosition(
      new vec3(curP.x + eFwdX * kFwd + eLatX * kLatBlend, curP.y + eFwdY * kFwd + eLatY * kLatBlend, curP.z + eFwdZ * kFwd + eLatZ * kLatBlend)
    );
    tr.setWorldRotation(quat.slerp(tr.getWorldRotation(), targetR, kRotBlend));

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

script.createEvent("UpdateEvent").bind(function (ev) {
  var dt = 1 / 60;
  try {
    if (ev && ev.getDeltaTime) dt = ev.getDeltaTime();
  } catch (e) {}
  updateToastFollowAndFade(dt);
});

script.createEvent("TurnOnEvent").bind(function () {
  try {
    global.flaneurPinShowToast = showToast;
  } catch (e) {}
  if (script.toastAnchor && !isNull(script.toastAnchor)) {
    script.toastAnchor.enabled = false;
  }
});

