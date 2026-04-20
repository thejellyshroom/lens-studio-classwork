// Spawn Object at World Mesh On Tap.js
// Version: 0.0.1
// Event: On Awake
// Description: Tap to spawn prefab on the world mesh. When Flâneur exposes globals, can commit pins instead of instantiating prefab.
// By default mesh hit + pin logic runs in LateUpdate so SIK / RoundButton receive the same Tap first (same-frame ordering).

// @input Component.DeviceTracking deviceTracking
// @input Asset.ObjectPrefab prefab
// @input SceneObject parent
// @input bool skipInstantiateWhenFlaneurPins = true
// @input bool deferMeshTapToLateUpdate = true

//@input Component.ScriptComponent[] behaviorCallback

if (!script.deviceTracking) {
    print("ERROR: Please set the device tracking to the script.");
    return;
}

var queuedMeshTapScreenPos = null;

function shouldCommitFlaneurPinInstead() {
    try {
        return (
            typeof global !== "undefined" &&
            typeof global.flaneurCommitPinAtWorldPosition === "function" &&
            script.skipInstantiateWhenFlaneurPins !== false
        );
    } catch (e) {
        return false;
    }
}

function onTouch(eventData) {
    var touchPos = eventData.getTapPosition();
    if (script.deferMeshTapToLateUpdate === false) {
        spawnObjectOnWorldMeshAt(touchPos);
        return;
    }
    queuedMeshTapScreenPos = touchPos;
}

function spawnObjectOnWorldMeshAt(screenPos) {
    try {
        if (typeof global.flaneurPinIsScreenOverBlockerUi === "function" && global.flaneurPinIsScreenOverBlockerUi(screenPos)) {
            return;
        }
    } catch (eBlock) {}
    try {
        if (typeof global.flaneurPinIsSidebarOpen === "function" && global.flaneurPinIsSidebarOpen()) {
            return;
        }
    } catch (eSide) {}

    var results = script.deviceTracking.hitTestWorldMesh(screenPos);

    if (results.length > 0) {
        var point = results[0].position;
        var normal = results[0].normal;

        if (shouldCommitFlaneurPinInstead()) {
            try {
                global.flaneurCommitPinAtWorldPosition(point);
            } catch (eCommit) {}
            triggerBehaviors(script.behaviorCallback);
            return;
        }

        if (!script.prefab) {
            print("ERROR: Assign a prefab, or enable Flâneur TurnOn so flaneurCommitPinAtWorldPosition is available.");
            return;
        }

        var newObj = script.prefab.instantiate(null);
        newObj.setParent(script.parent);

        newObj.getTransform().setWorldPosition(point);

        var up = vec3.up();
        var forwardDir = up.projectOnPlane(normal);
        var rot = quat.lookAt(forwardDir, normal);
        newObj.getTransform().setWorldRotation(rot);

        triggerBehaviors(script.behaviorCallback);
    }
}

function triggerBehaviors(behaviors) {
    if (!behaviors) {
        return;
    }
    for (var i = 0; i < behaviors.length; i++) {
        if (behaviors[i] && behaviors[i].trigger) {
            behaviors[i].trigger();
        } else {
            print("WARNING: please assign the Behavior Script Component");
        }
    }
}

script.createEvent("TapEvent").bind(onTouch);

script.createEvent("LateUpdateEvent").bind(function () {
    if (script.deferMeshTapToLateUpdate === false) {
        return;
    }
    if (!queuedMeshTapScreenPos) {
        return;
    }
    var pos = queuedMeshTapScreenPos;
    queuedMeshTapScreenPos = null;
    spawnObjectOnWorldMeshAt(pos);
});
