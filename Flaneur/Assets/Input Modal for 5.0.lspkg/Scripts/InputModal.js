/**
 * @file InputModal.js
 * @version 1.0.4
 * @description A basic InputModal prefab.
 */

// @ts-check

/**
 * @brief
 *
 * An Input Modal sceneObject is created upon installation, with an Orthographic Camera as its parent for visibility.
 * To use the Input Modal asset, create a new script that uses //@ input ScriptComponent to reference the Input Modal script.
 * A InputModalController.js is imported to demostrate who to interface the InputModal.js.
 * 
 * Customizing the Input Modal is essential for adapting it to your application. The only required setting is the callback event
 * for the confirmButton; other settings are optional.
 *
 * @example
 *
 * //@ input Component.ScriptComponent modal;
 * // Place modal setup code in the onStart event to allow the modal to initialize
 * script.createEvent("OnStartEvent").bind(start);
 * function start() {
 *
 *     // Confirm button
 *     modal.confirmButtonText.set("confirm!");
 *     modal.onConfirmEvent.add(function(userInput) {
 *         // Process userInput
 *     });
 *
 *     modal.onVisibilityChangeEvent.add(function(changedTo) {
 *         // Triggered when modal is shown or hidden
 *     });
 *
 *     // Supplementary button
 *     modal.onSuppButtonPressEvent.add(function() {
 *         // Triggered when the supplementary Button is clicked
 *     });
 *     modal.suppButtonText.set("cancel");
 *
 *     // Toggle the supplementary Button on or off
 *     modal.toggleSupButton(true); // or false
 *
 *     modal.show();
 *     modal.hide();
 *
 *     // Get and set text components
 *     var userInput = modal.userInputText.get();
 *     modal.userInputText.set("this is the placeholder input text...");
 *     var instructionText = modal.instructionText.get();
 *     modal.instructionText.set("instructions!");
 *     var hintText = modal.hintText.get();
 *     modal.hintText.set("hint text");
 *
 *     // Set up validation method, executed when the confirm button is clicked
 *     modal.validation = function(str) {
 *         if (validationFailed) {
 *             return {
 *                 valid: false,
 *                 message: "Explain why the input is not valid"
 *             };
 *         } else {
 *             return {
 *                 valid: true,
 *                 message: ""
 *             };
 *         }
 *     };
 * }
 *
 */

// @ts-ignore
const EventModule = require("EventModule");
/**
In the case EventModule can't be found in the root path:

A simple implementation of an event class. Add callbacks to be notified when the event is triggered.
@typedef {Object} EventWrapper
@property {function} add - Add a callback function to this event. The callback function will be executed when this event is triggered.
@property {function} remove - Remove a callback function from this event.
@property {function} trigger - Trigger the event so that all callbacks are executed. All arguments given will be passed to the callbacks.
*/
/**

A simple implementation of a key-based event class.
@typedef {Object} KeyedEventWrapper
@property {function} getWrapper - Return an EventWrapper for the given key. The EventWrapper holds all callbacks added with the same key, and is triggered when trigger is called with the same key.
@property {function} add - Add a callback function tied to the given key. The callback function will be executed when this KeyedEventWrapper is triggered using the same key.
@property {function} remove - Remove a callback function tied to the given key.
@property {function} addAny - Add a callback function that will be executed any time a trigger occurs. The first argument for the callback function is the key, the rest of the arguments are what get passed to the trigger.
@property {function} removeAny - Remove a callback function that was added using addAny().
@property {function} trigger - Trigger all callback functions that were added using the same key. All arguments after key will be passed to the callback functions.
*/

//@input string presetConfirmButtonText
//@input string presetSuppButtonText;
//@input string presetDefaultPlaceholderText;
//@input string presetInstructionText;

//@typename UIButton
//@input UIButton confirmButton
//@input bool hideModalOnConfirmPress = true;
//@input bool hideModalOnSuppButtonPress = false;
//@input UIButton suppButton
//@input UIButton closeButton;
//@input Component.Text userInputTextComponent;
let userInputCache = "";
//@input Component.Text hintTextComponent;
//@input Component.Text instructionTextComponent;
//@input Component.Image backgroundImage
/** @type {Image} */
const backgroundImage = script.backgroundImage;

let originalBackgroundImageOffsetBottom = 0, suppButtonHeight = 0;
/** @type {ScreenTransform} */
let suppButtonScrenTransform = null;
/** @type {ScreenTransform} */
let backgroundImageScreenTransform = null;

function start() {
    script.confirmButton.onPressUp.add(onConfirm);
    script.closeButton.onPressUp.add(onCloseBtnPress);
    script.suppButton.onPressUp.add(onSecBtnPress);
    //reset
    script.hintTextComponent.text = "";
    //set text from interface
    script.confirmButtonText.set(script.presetConfirmButtonText);
    script.suppButtonText.set(script.presetSuppButtonText);
    script.userInputText.set(script.presetDefaultPlaceholderText);
    script.instructionText.set(script.presetInstructionText);

    //save numbers so we can adjust modal's height when the sup button is hidden or shown
    //TODO: use flexbox to make this process more automated
    backgroundImageScreenTransform = backgroundImage.getSceneObject().getComponent("ScreenTransform");
    originalBackgroundImageOffsetBottom = backgroundImageScreenTransform.offsets.bottom;
    /** @type {Rect} */
    suppButtonScrenTransform = script.suppButton.getSceneObject().getComponent("ScreenTransform");
    const suppButtonRect = suppButtonScrenTransform.offsets;
    suppButtonHeight = suppButtonRect.top - suppButtonRect.bottom;

    //set user text as editable to avoid serialization bug, will remove this when bug is fixed
    script.userInputTextComponent.editable = true;

    //listen to update or finish event to update our cache of userInput
    script.userInputTextComponent.onEditingUpdated.add(function(newString) {
        userInputCache = newString;
    });
    script.userInputTextComponent.onEditingFinished.add(function(newString) {
        userInputCache = newString;
    });
}

function onConfirm() {
    /** @type {string} */
    const input = script.userInputText.get();
    if (script.validation) {
        const result = script.validation(input);
        //test if result conforms to the expected format
        if (result.valid === undefined || result.message === undefined) {
            print("ERROR: validation function must return an object with `valid:boolean` and `message:string` properties");
            return;
        }
        if (result.valid === true) {
            script.onConfirmEvent.trigger(input);
            if (script.hideModalOnConfirmPress) {
                script.hide();
            }
        } else {
            script.hintTextComponent.text = result.message;
        }
    } else {
        script.onConfirmEvent.trigger(input);
        if (script.hideModalOnConfirmPress) {
            script.hide();
        }
    }
}

function onCloseBtnPress() {
    script.hide();
}

function onSecBtnPress() {
    script.onSuppButtonPressEvent.trigger(script.userInputText.get());
    if (script.hideModalOnSuppButtonPress) {
        script.hide();
    }
}

function setChildrenVis(state) {
    script.getSceneObject().children.forEach(function(child) {
        child.enabled = state;
    });
}

/* -------------------------------------------------------------------------- */
/*                                 public API                                 */
/* -------------------------------------------------------------------------- */

function show() {
    setChildrenVis(true);
    script.onVisibilityChangeEvent.trigger(true);
}

function hide() {
    setChildrenVis(false);
    script.onVisibilityChangeEvent.trigger(false);
}

function toggleSuppButton(visible) {
    script.suppButton.getSceneObject().enabled = visible;
    if (visible) {
        backgroundImageScreenTransform.offsets.bottom = originalBackgroundImageOffsetBottom;
    } else {
        backgroundImageScreenTransform.offsets.bottom = originalBackgroundImageOffsetBottom + suppButtonHeight;
    }
}

function toggleCloseButton(visible) {
    script.closeButton.getSceneObject().enabled = visible;
}

const userInputText = {
    /** @returns {string} */
    get: function() {
        return userInputCache;
    },
    /** @param {string} value */
    set: function(value) {
        script.userInputTextComponent.text = value;
        userInputCache = value;
    }
};
const instructionText = {
    /** @returns {string} */
    get: function() {
        return script.instructionTextComponent.text;
    },
    /** @param {string} value */
    set: function(value) {
        script.instructionTextComponent.text = value;
    }
};
const confirmButtonText = {
    /** @param {string} value */
    set: function(value) {
        script.confirmButton.setText(value);
    }
};
const suppButtonText = {
    /** @param {string} value */
    set: function(value) {
        script.suppButton.setText(value);
    }
};
const hintText = {
    /** @returns {string} */
    get: function() {
        return script.hintTextComponent.text;
    },
    /** @param {string} value */
    set: function(value) {
        script.hintTextComponent.text = value;
    }
};
/** @type {EventWrapper} */
const onVisibilityChangeEvent = new EventModule.EventWrapper();
script.onVisibilityChangeEvent = onVisibilityChangeEvent;
/** @type {EventWrapper} */
const onConfirmEvent = new EventModule.EventWrapper();
script.onConfirmEvent = onConfirmEvent;
/** @type {EventWrapper} */
const onSuppButtonPressEvent = new EventModule.EventWrapper();
script.onSuppButtonPressEvent = onSuppButtonPressEvent;
/**
 * 
 * @param {string} str 
 */
script.validation = function(str) {
    return {
        valid: true,
        message: ""
    };
};
script.createEvent("OnStartEvent").bind(start);
script.show = show;
script.hide = hide;
script.toggleSuppButton = toggleSuppButton;
script.toggleSupButton = toggleSuppButton;//backward compatibility
script.toggleCloseButton = toggleCloseButton;
script.userInputText = userInputText;
script.instructionText = instructionText;
script.confirmButtonText = confirmButtonText;
script.suppButtonText = suppButtonText;
script.hintText = hintText;
/**
 * 
 * @param {string} name 
 * @returns 
 */
script.isOfType = function(name) {
    return name === "InputModal"
        || name === "ScriptComponent"
        || name === "Component";
};