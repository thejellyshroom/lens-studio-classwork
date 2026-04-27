/**
 * Flâneur — UI SFX router.
 *
 * Attach to the `UISFX` SceneObject (from UI SFX Pack).
 * Assign 3 AudioComponents from its children:
 * - pinDropSfx: played when a pin is committed
 * - buttonPressSfx: played on any UI button press (navigate/reset/sidebar/etc)
 * - remoteNavSfx: played when someone else starts navigating to a pin
 *
 * Exposes globals:
 * - global.flaneurSfxPinDrop()
 * - global.flaneurSfxButton()
 * - global.flaneurSfxRemoteNav()
 */
// @input Component.AudioComponent pinDropSfx {"label":"SFX: Pin Drop"}
// @input Component.AudioComponent buttonPressSfx {"label":"SFX: Button Press"}
// @input Component.AudioComponent remoteNavSfx {"label":"SFX: Remote Nav"}
// @input float minIntervalSeconds = 0.08 {"label":"Min interval (anti-spam)"}
// @input bool logSfxDebug = false

var lastPlayT = {
  pin: -999,
  btn: -999,
  remote: -999,
};

function dbg(msg) {
  if (script.logSfxDebug) print("[Flaneur][sfx] " + msg);
}

function canPlay(kind) {
  var now = getTime();
  var minI = script.minIntervalSeconds;
  if (minI === undefined || minI === null || minI < 0) minI = 0.08;
  if (now - lastPlayT[kind] < minI) return false;
  lastPlayT[kind] = now;
  return true;
}

function playAudio(ac, kind) {
  if (!ac || isNull(ac)) return;
  if (!canPlay(kind)) return;
  try {
    ac.play(1);
  } catch (e1) {
    try { ac.play(); } catch (e2) {}
  }
}

function playPinDrop() { playAudio(script.pinDropSfx, "pin"); }
function playButton() { playAudio(script.buttonPressSfx, "btn"); }
function playRemoteNav() { playAudio(script.remoteNavSfx, "remote"); }

script.createEvent("TurnOnEvent").bind(function () {
  try {
    if (typeof global === "undefined") return;
    global.flaneurSfxPinDrop = playPinDrop;
    global.flaneurSfxButton = playButton;
    global.flaneurSfxRemoteNav = playRemoteNav;
    dbg("globals registered");
  } catch (e) {}
});

