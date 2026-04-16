// ExampleMultiplayerSession.js
// Version: 0.1.0
// Event: Lens Initialized
// Description: Provides an example of using Connected Lens Module to create a Multiplayer Session

/*-----------------------------------------------------------------------------------
You can modify this file directly, or use API to hook in from another script:

script.multiplayerSession.onStarterConnectedToSolo = function (session) {
    // Request to invite others either via friends list or Snapcode
    script.multiplayerSession.shareSession(); 
}

script.multiplayerSession.onStarterConnectedToMultiplayer = function (_session) {
    session = _session;
}

script.multiplayerSession.onReceiverConnectedToMultiplayer = function (_session) {
    session = _session;
}

script.multiplayerSession.onUserJoinedSession = function (session, userInfo) {
    // Some code that this script will call    
}

script.multiplayerSession.onUserLeftSession = function (session, userInfo) {
    // Some code that this script will call    
}

script.multiplayerSession.onRealtimeStoreCreated = function (session, store, userInfo) {
    // Some code that this script will call
}

script.multiplayerSession.onRealtimeStoreUpdated = function (session, store, userInfo) {
    // Some code that this script will call    
}

script.multiplayerSession.onRealtimeStoreDeleted = function (session, store) {
    // Some code that this script will call    
}

script.multiplayerSession.onRealtimeStoreOwnershipUpdated = function (session, store, ownerInfo) {
    // Some code that this script will call    
}
-----------------------------------------------------------------------------------*/

// @input Asset.ConnectedLensModule connectedLensModule

/*-----------------------------------------------------------------------------------
Create Connected Lenses Option that will allow us to add callbacks to events
-----------------------------------------------------------------------------------*/

// Create the option
const options = ConnectedLensSessionOptions.create();

// Add stubs for functions which will respond to different events
options.onConnected = onConnected;
options.onSessionCreated = onSessionCreated;
options.onUserJoinedSession = onUserJoinedSession;
options.onUserLeftSession = onUserLeftSession;
options.onError = onError;

// Add stubs for functions which will respond to different Realtime Store events
options.onRealtimeStoreCreated = onRealtimeStoreCreated;
options.onRealtimeStoreUpdated = onRealtimeStoreUpdated;
options.onRealtimeStoreDeleted = onRealtimeStoreDeleted;
options.onRealtimeStoreOwnershipUpdated = onRealtimeStoreOwnershipUpdated;

/*-----------------------------------------------------------------------------------
Start Connected Lenses Session
-----------------------------------------------------------------------------------*/

script.createEvent("ConnectedLensEnteredEvent").bind(function () {
   script.connectedLensModule.createSession(options);
})

function shareSession() {
    // Decide whether we want to invite others using Friends list `Invitation`, or via Snapcode `Snapcode`
    const invitationType = ConnectedLensModule.SessionShareType.Invitation;

    function onSessionShared(session, snapcodeTexture) {

        // If we used Snapcode Invitation, then we need to display the Snapcode somewhere
        if (invitationType === ConnectedLensModule.SessionShareType.Snapcode) {
            if(script.snapcodeImage) {
                script.snapcodeImage.mainPass.baseTex = snapcodeTexture;
            } else {
                print("Please provide a Component.Image where Snapcode Texture can be displayed.")
            }
        }
    }

    // Request to Share
    script.connectedLensModule.shareSession(invitationType, onSessionShared);
}

/*-----------------------------------------------------------------------------------
Connected Lenses Callback
-----------------------------------------------------------------------------------*/

function onSessionCreated(session, sessionCreationType) {
    // If I already know how I entered this game, we don't need to set it again
    // Otherwise we will end up in a loop when we connect to the multiplayer session.
    if (script.soloSession !== undefined) return;

    if (sessionCreationType == ConnectedLensSessionOptions.SessionCreationType.MultiplayerReceiver) {
        // If I am a receiver, I start with a Multiplayer session
        script.soloSession = false;

    } else if (sessionCreationType == ConnectedLensSessionOptions.SessionCreationType.New) {
        script.isStarter = true;

        // If I created a new session (fresh Lens open), then by default I'm in a Solo session.
        script.soloSession = true;
    }
}

function onConnected(session) {
    if (script.soloSession) {
        onStarterConnectedToSolo(session);

        // Now that we are sharing session, we will get another
        // onSessionCreated. This time it will be Multiplayer.
        script.soloSession = false;

        return;
    }

    // If we are in a multiplayer session:
    // Create a Realtime Store if I'm the Starter
    // and store the session for later usage.

    if (script.isStarter) {
        onStarterConnectedToMultiplayer(session);
    } else {
        onReceiverConnectedToMultiplayer(session);
    }

    script.session = session;
}

function onUserJoinedSession(session, userInfo) {
    if (script.onUserJoinedSession) script.onUserJoinedSession(session, userInfo);
}

function onUserLeftSession(session, userInfo) {
    if (script.onUserLeftSession) script.onUserJoinedSession(session, userInfo);
}

function onError(session, errorCode, description) {
    print("[Connected Lens Session Error] " + errorCode + ": " + description);
}

/*-----------------------------------------------------------------------------------
On Connected Callbacks
-----------------------------------------------------------------------------------*/

function onStarterConnectedToSolo(session) {
    if (script.onStarterConnectedToSolo) script.onStarterConnectedToSolo(session);
}

function onStarterConnectedToMultiplayer(session) {
    if (script.onStarterConnectedToMultiplayer) script.onStarterConnectedToMultiplayer(session);
}

function onReceiverConnectedToMultiplayer(session) {
    if (script.onReceiverConnectedToMultiplayer) script.onReceiverConnectedToMultiplayer(session);
}

/*-----------------------------------------------------------------------------------
Realtime Store Callbacks
-----------------------------------------------------------------------------------*/

function onRealtimeStoreCreated(session, store, userInfo) {
    if (script.onRealtimeStoreCreated) script.onRealtimeStoreCreated(session, store, userInfo);
}

function onRealtimeStoreUpdated(session, store, userInfo) {
    if (script.onRealtimeStoreUpdated) script.onRealtimeStoreUpdated(session, store, userInfo);
}

function onRealtimeStoreDeleted(session, store) {
    if (script.onRealtimeStoreDeleted) script.onRealtimeStoreDeleted(session, store);
}

function onRealtimeStoreOwnershipUpdated(session, store, ownerInfo) {
    if (script.onRealtimeStoreOwnershipUpdated) script.onRealtimeStoreOwnershipUpdated(session, store, ownerInfo);
}

/*-----------------------------------------------------------------------------------
Additional Exposed APIs
-----------------------------------------------------------------------------------*/
script.shareSession = shareSession;