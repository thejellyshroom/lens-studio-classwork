// ============================================================
//  HIKING DASHBOARD for Snap Spectacles
//  Lens Studio v5.7+
//
//  HOW TO SET THIS UP IN LENS STUDIO:
//  ─────────────────────────────────
//  1. In the Asset Browser, click + → JavaScript and paste this file in
//  2. In the Scene Hierarchy, create 4 Text objects and name them:
//       PaceText, AltText, DistanceText, ElapsedText
//  3. Add a Script Component to any Scene Object
//  4. Drag this script into the Script Component
//  5. In the Inspector, drag each Text object into the matching slot
//  6. In Lens permissions, add "RawLocationModule"
//  7. Hit Preview or push to your Spectacles!
//
//  WHAT EACH TEXT OBJECT WILL SHOW:
//  ─────────────────────────────────
//  PaceText     → your average hiking pace   e.g. "18:30 /mi"
//  DistanceText → total distance walked      e.g. "1.43 mi"
//  ElapsedText  → how long you've been out   e.g. "1:22:05"
// ============================================================


// ── STEP 1: Tell Lens Studio what Text objects this script needs ──
// These lines create slots in the Inspector panel.
// Drag your Text scene objects into these slots.
// (From the Lens Studio Scripting Introduction guide)

//@input Component.Text PaceText
//@input Component.Text DistanceText
//@input Component.Text ElapsedText


// ── STEP 2: Load the location module ─────────────────────────────
// Spectacles need this line to enable GPS features.
// (Required for Spectacles per Snap developer docs)

require("LensStudio:RawLocationModule");


// ── STEP 3: Start the GPS location service ────────────────────────
// GeoLocation.createLocationService() is the Snap API for GPS.
// Setting accuracy to Navigation gives us the best GPS signal.
// (From the Lens Studio LocationService API docs)

var locationService = GeoLocation.createLocationService();
locationService.accuracy = GeoLocationAccuracy.Navigation;


// ── STEP 4: Set up our tracking variables ─────────────────────────
// These are simple variables that we update as the hike goes on.
// "var" creates a variable — a box that stores a value.

var lastPosition        = null;   // stores where we were last second
var lastTimestamp       = null;   // stores the time of the last GPS reading
var totalMetersWalked   = 0;      // keeps adding up as you walk
var hikeStartTime       = Date.now(); // records the moment the lens starts


// ── HELPER FUNCTION 1: Calculate distance between two GPS points ──
// This is called the Haversine formula — it figures out how far apart
// two lat/lon coordinates are, in metres.
// Don't worry about the math — just know it gives us metres back!

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    var earthRadius = 6371000; // Earth's radius in metres

    // Convert degrees to radians (math requirement)
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;

    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    var distanceMeters = earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distanceMeters;
}


// ── HELPER FUNCTION 2: Convert speed into a hiking pace ──────────
// Speed from GPS comes in metres per second.
// Hikers usually think in "minutes per mile" so we convert it.
// e.g. slow walk = "25:00 /mi", brisk hike = "18:00 /mi"

function getPaceString(metersPerSecond) {
    // If we're barely moving, just show a dash
    if (metersPerSecond <= 0.01) {
        return "—";
    }

    // How many seconds does it take to walk one mile?
    var secondsPerMile = 1609.344 / metersPerSecond;

    // Split that into minutes and seconds
    var minutes = Math.floor(secondsPerMile / 60);
    var seconds = Math.round(secondsPerMile % 60);

    // Make sure seconds always shows two digits (e.g. "18:05" not "18:5")
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    return minutes + ":" + seconds + " /mi";
}


// ── HELPER FUNCTION 3: Format elapsed time as H:MM:SS ────────────
// Date.now() gives us milliseconds. We want hours, minutes, seconds.

function getElapsedTimeString(startTimeMs) {
    var totalSeconds = Math.floor((Date.now() - startTimeMs) / 1000);

    var hours   = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    // Pad minutes and seconds with a leading zero if needed
    var mm = (minutes < 10) ? "0" + minutes : "" + minutes;
    var ss = (seconds < 10) ? "0" + seconds : "" + seconds;

    return hours + ":" + mm + ":" + ss;
}


// ── MAIN FUNCTION: This runs every second to update the display ───
// getCurrentPosition() is a Snap API call that asks the device
// "where am I right now?" and then calls our function with the answer.
// (From the Lens Studio LocationService API docs)

function updateDashboard() {

    // Always update the timer — it doesn't need GPS
    script.ElapsedText.text = getElapsedTimeString(hikeStartTime);

    // Ask the device for the current GPS position
    locationService.getCurrentPosition(

        // This function runs when GPS gives us a position (success)
        function (geoPosition) {

            // ── Avoid processing the same GPS reading twice ──────
            // GPS doesn't update every single millisecond.
            // geoPosition.timestamp tells us when this reading was taken.
            // If it's the same as last time, we skip it.
            var thisTimestamp = geoPosition.timestamp.getTime();
            if (lastTimestamp !== null && thisTimestamp === lastTimestamp) {
                return; // "return" exits the function early — nothing to do
            }
            lastTimestamp = thisTimestamp; // save for next comparison

            // ── Add to total distance walked ─────────────────────
            // If we have a previous position, measure how far we moved.
            // We only add to the total if the jump is less than 100m —
            // that filters out GPS glitches that make it look like you teleported!

            if (lastPosition !== null) {
                var distanceMoved = getDistanceInMeters(
                    lastPosition.latitude,
                    lastPosition.longitude,
                    geoPosition.latitude,
                    geoPosition.longitude
                );

                if (distanceMoved < 100) {
                    totalMetersWalked = totalMetersWalked + distanceMoved;
                }
            }

            // Save this position so we can compare next time
            lastPosition = geoPosition;

            // ── Show total distance in miles ─────────────────────
            var totalMiles = totalMetersWalked / 1609.344;
            script.DistanceText.text = totalMiles.toFixed(2) + " mi";

            // ── Show average pace ────────────────────────────────
            // Average pace = total distance ÷ total time elapsed
            // We wait at least 5 seconds and 5 metres before showing it
            // so we don't show a weird number right at the start.

            var elapsedSeconds = (Date.now() - hikeStartTime) / 1000;

            if (elapsedSeconds > 5 && totalMetersWalked > 5) {
                var averageSpeed = totalMetersWalked / elapsedSeconds;
                script.PaceText.text = getPaceString(averageSpeed);
            } else {
                script.PaceText.text = "—";
            }
        },

        // This function runs if GPS fails for any reason (error)
        function (errorMessage) {
            print("GPS error: " + errorMessage);
        }

    ); // end of getCurrentPosition
}


// ── STEP 5: Run updateDashboard every second ──────────────────────
// createEvent("DelayedCallbackEvent") is the Snap way to schedule
// something to run after a delay — like JavaScript's setTimeout.
// We use .reset(1.0) to repeat it every 1 second.
// (From the Lens Studio Scripting Overview guide)

var updateEvent = script.createEvent("DelayedCallbackEvent");

updateEvent.bind(function () {
    updateDashboard();  // run our main function
    updateEvent.reset(1.0); // schedule it again in 1 second
});

updateEvent.reset(0); // start immediately (0 second delay)