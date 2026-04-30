/**
 * @file InputModalHelper.js
 * @version 1.0.0
 * @description a low-code solution that enables the utilization of the input modal while providing drag and drop functionality.
*/

//@ts-check

//@input Component.ScriptComponent inputModal
//@ui  {"widget": "separator"}
//@input bool useValidation = false {"label": "Use Validation", "widget": "checkbox"}
//@ui  {"label": "Validation Function", "widget": "group_start", "showIf": "useValidation"}
//@input Component.ScriptComponent onConfirmValidationScript {"label": "Script"}
//@input string onConfirmValidationFunctionName {"label": "Function Name"}
//@ui  {"widget": "group_end", "showIf": "useValidation"}
//@ui  {"widget": "separator"}
//========================================================================================================================
//@input int onConfirmEventType = 0 {"label": "On Confirm Action", "widget": "combobox", "values": [{"label":"None","value":"0"},{"label":"Call Function","value":"1"},{"label":"Set Text","value":"2"},{"label":"Set Property","value":"3"},{"label":"Print Message","value":"4"}]}

//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label": "Call Function","widget": "group_start", "showIf": "onConfirmEventType", "showIfValue": "1"}
//@input Component.ScriptComponent onConfirmCallAPIScriptComponent {"label": "Script"}
//@input string onConfirmCallAPIFunctionName {"label": "Function Name"}
//@ui  {"widget": "group_end", "showIf": "onConfirmEventType", "showIfValue": "1"}
//@ui  {"label":"Set Text", "widget": "group_start", "showIf": "onConfirmEventType", "showIfValue": "2"}
//@input Component.Text onConfirmSetTextTarget
//@ui  {"widget": "group_end", "showIf": "onConfirmEventType", "showIfValue": "2"}
//@input bool hideModalOnTapConfirmButton = true {"label": "Hide Modal On Tap", "widget": "checkbox"}

//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Property","widget": "group_start", "showIf": "onConfirmEventType", "showIfValue": "3"}
//@input Component.ScriptComponent onConfirmSetAPIPropertyScriptComponent {"label": "Script"}
//@input string onConfirmSetAPIPropertyPropertyName {"label": "Property Name"}
//@ui  {"widget": "group_end", "showIf": "onConfirmEventType", "showIfValue": "3"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Print Message","widget": "group_start", "showIf": "onConfirmEventType", "showIfValue": "4"}
//@input string onConfirmMessagePrefix {"label": "Message Prefix"}
//@ui  {"widget": "group_end", "showIf": "onConfirmEventType", "showIfValue": "4"}
//========================================================================================================================
//@ui  {"widget": "separator"}
//========================================================================================================================
//------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------
//@input int onSecondTapEventType = 0 {"label": "On Secondary Action", "widget": "combobox", "values": [{"label":"None","value":"0"},{"label":"Call Function","value":"1"},{"label":"Set Text","value":"2"},{"label":"Set Property","value":"3"},{"label":"Print Message","value":"4"}]}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label": "Call Function","widget": "group_start", "showIf": "onSecondTapEventType", "showIfValue": "1"}
//@input Component.ScriptComponent onSecondTapCallAPIScriptComponent {"label": "Script"}
//@input string onSecondTapCallAPIFunctionName {"label": "Function Name"}
//@ui  {"widget": "group_end", "showIf": "onSecondTapEventType", "showIfValue": "1"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Text", "widget": "group_start", "showIf": "onSecondTapEventType", "showIfValue": "2"}
//@input Component.Text onSecondTapSetTextTarget
//@ui  {"widget": "group_end", "showIf": "onSecondTapEventType", "showIfValue": "2"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Property","widget": "group_start", "showIf": "onSecondTapEventType", "showIfValue": "3"}
//@input Component.ScriptComponent onSecondTapSetAPIPropertyScriptComponent {"label": "Script"}
//@input string onSecondTapSetAPIPropertyPropertyName {"label": "Property Name"}
//@ui  {"widget": "group_end", "showIf": "onSecondTapEventType", "showIfValue": "3"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Print Message","widget": "group_start", "showIf": "onSecondTapEventType", "showIfValue": "4"}
//@input string onSecondTapMessagePrefix {"label": "Message Prefix"}
//@ui  {"widget": "group_end", "showIf": "onSecondTapEventType", "showIfValue": "4"}

//@input bool hideModalOnTapSecondButton = false {"label": "Hide Modal On Tap", "widget": "checkbox"}

//========================================================================================================================
//@ui {"widget" : "separator"}
//------------------------------------------------------------------------------------------------------------------------
//@input int onShowEventType = 0 {"label": "On Show Action", "widget": "combobox", "values": [{"label":"None","value":"0"},{"label":"Call Function","value":"1"},{"label":"Print Message","value":"4"}]}
//@ui  {"label": "Call Function","widget": "group_start", "showIf": "onShowEventType", "showIfValue": "1"}
//@input Component.ScriptComponent onShowCallAPIFunctionScript {"label": "Script Object"}
//@input string onShowCallAPIFunctionFunctionName {"label": "Function Name"}
//@ui  {"widget": "group_end", "showIf": "onShowEventType", "showIfValue": "1"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Text", "widget": "group_start", "showIf": "onShowEventType", "showIfValue": "2"}
//@input Component.Text onShowSetTextTarget {"showIf": "onShowEventType", "showIfValue": "2"}
//@ui  {"widget": "group_end", "showIf": "onShowEventType", "showIfValue": "2"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Property","widget": "group_start", "showIf": "onShowEventType", "showIfValue": "3"}
//@input Component.ScriptComponent onShowSetAPIPropertyScriptComponent {"label": "Script"}
//@input string onShowSetAPIPropertyPropertyName {"label": "Property Name"}
//@ui  {"widget": "group_end", "showIf": "onShowEventType", "showIfValue": "3"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Print Message","widget": "group_start", "showIf": "onShowEventType", "showIfValue": "4"}
//@input string onShowMessagePrefix {"label": "Message Prefix"}
//@ui  {"widget": "group_end", "showIf": "onShowEventType", "showIfValue": "4"}

//========================================================================================================================
//@ui  {"widget": "separator"}
//@input int onHideEventType = 0 {"label": "On Hide Action", "widget": "combobox", "values": [{"label":"None","value":"0"},{"label":"Call Function","value":"1"},{"label":"Print Message","value":"4"}]}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label": "Call Function","widget": "group_start", "showIf": "onHideEventType", "showIfValue": "1"}
//@input Component.ScriptComponent onHideCallAPIFunctionScript {"label": "Script Object"}
//@input string onHideCallAPIFunctionFunctionName {"label": "Function Name"}
//@ui  {"widget": "group_end", "showIf": "onHideEventType", "showIfValue": "1"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Text", "widget": "group_start", "showIf": "onHideEventType", "showIfValue": "2"}
//@input Component.Text onHideSetTextTarget {"showIf": "onHideEventType", "showIfValue": "2"}
//@ui  {"widget": "group_end", "showIf": "onHideEventType", "showIfValue": "2"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Set Property","widget": "group_start", "showIf": "onHideEventType", "showIfValue": "3"}
//@input Component.ScriptComponent onHideSetAPIPropertyScriptComponent {"label": "Script"}
//@input string onHideSetAPIPropertyPropertyName {"label": "Property Name"}
//@ui  {"widget": "group_end", "showIf": "onHideEventType", "showIfValue": "3"}
//------------------------------------------------------------------------------------------------------------------------
//@ui  {"label":"Print Message","widget": "group_start", "showIf": "onHideEventType", "showIfValue": "4"}
//@input string onHideMessagePrefix {"label": "Message Prefix"}
//@ui  {"widget": "group_end", "showIf": "onHideEventType", "showIfValue": "4"}
//------------------------------------------------------------------------------------------------------------------------

/**
 * The typedefs here are just for intellisense
 * 
A simple implementation of an event class. Add callbacks to be notified when the event is triggered.
@typedef {Object} EventWrapper
@property {function} add - Add a callback function to this event. The callback function will be executed when this event is triggered.
@property {function} remove - Remove a callback function from this event.
@property {function} trigger - Trigger the event so that all callbacks are executed. All arguments given will be passed to the callbacks.
*/

/**
 * Constructor function for ActionConfiguration, which initializes an object that stores the configuration for an action.
 * @param {number} type
 * @param {ScriptComponent} scriptOfCallAPIFunction 
 * @param {string} functionNameOfCallAPIFunction 
 * @param {Text} textComponentOfSetText 
 * @param {ScriptComponent} scriptOfSetAPIProperty 
 * @param {string} propertyNameOfSetAPIProperty 
 * @param {string} messageToPrint
 */
function ActionConfiguration(type,
    scriptOfCallAPIFunction,
    functionNameOfCallAPIFunction,
    textComponentOfSetText,
    scriptOfSetAPIProperty,
    propertyNameOfSetAPIProperty,
    messageToPrint) {
    this.type = type;
    this.setAPIPropConfig = new SetAPIPropConfig(scriptOfSetAPIProperty, propertyNameOfSetAPIProperty);
    this.callAPIFunctionConfig = new CallAPIFunctionConfig(scriptOfCallAPIFunction, functionNameOfCallAPIFunction);
    this.setTextConfig = new SetTextConfig(textComponentOfSetText);
    this.messagePrefix = messageToPrint;

    function SetAPIPropConfig(scriptOfSetAPIProperty, propertyNameOfSetAPIProperty) {
        this.scriptComponent = scriptOfSetAPIProperty;
        this.propertyName = propertyNameOfSetAPIProperty;
    }

    function CallAPIFunctionConfig(scriptOfCallAPIFunction, functionNameOfCallAPIFunction) {
        this.scriptComponent = scriptOfCallAPIFunction;
        this.functionName = functionNameOfCallAPIFunction;
    }

    /**
     * 
     * @param {Text} textComponentOfSetText 
     */
    function SetTextConfig(textComponentOfSetText) {
        /**
         * @type {Text}
         */
        this.textComponent = textComponentOfSetText;
    }
}

const onConfirmActionConfig = new ActionConfiguration(script.onConfirmEventType,
    script.onConfirmCallAPIScriptComponent,
    script.onConfirmCallAPIFunctionName,
    script.onConfirmSetTextTarget,
    script.onConfirmSetAPIPropertyScriptComponent,
    script.onConfirmSetAPIPropertyPropertyName,
    script.onConfirmMessagePrefix);

const onSecondTapActionConfig = new ActionConfiguration(script.onSecondTapEventType,
    script.onSecondTapCallAPIScriptComponent,
    script.onSecondTapCallAPIFunctionName,
    script.onSecondTapSetTextTarget,
    script.onSecondTapSetAPIPropertyScriptComponent,
    script.onSecondTapSetAPIPropertyPropertyName,
    script.onSecondTapMessagePrefix);

const onHideActionConfig = new ActionConfiguration(script.onHideEventType,
    script.onHideCallAPIFunctionScript,
    script.onHideCallAPIFunctionFunctionName,
    script.onHideSetTextTarget,
    script.onHideSetAPIPropertyScriptComponent,
    script.onHideSetAPIPropertyPropertyName,
    script.onHideMessagePrefix);

const onShowActionConfig = new ActionConfiguration(script.onShowEventType,
    script.onShowCallAPIFunctionScript,
    script.onShowCallAPIFunctionFunctionName,
    script.onShowSetTextTarget,
    script.onShowSetAPIPropertyScriptComponent,
    script.onShowSetAPIPropertyPropertyName,
    script.onShowMessagePrefix);

// main thread
let modal = script.inputModal;
checkInput();
function checkInput() {
    if (!script.inputModal) {
        const scList = script.getSceneObject().getComponents("Component.ScriptComponent");
        scList.forEach(function(sc) {
            if (sc.isOfType("InputModal")) {
                modal = sc;
                script.inputModal = sc;
            }
        });
        if (!modal) {
            print("Error, Input Modal is not set!");
            return;
        }
    }
}

script.createEvent("OnStartEvent").bind(start);
function start() {
    setupValidation();
    modal.hideModalOnConfirmPress = script.hideModalOnTapConfirmButton;
    modal.hideModalOnSuppButtonPress = script.hideModalOnTapSecondButton;

    const onConfirmAction = createActionCallback(onConfirmActionConfig, "On Confirm Action");

    //set callback actions for confirm button
    if (onConfirmAction) {
        modal.onConfirmEvent.add(onConfirmAction);
    }

    //set callback actions for second button 
    modal.toggleSuppButton(script.onSecondTapEventType !== 0);
    const onSuppBtnTapAction = createActionCallback(onSecondTapActionConfig, "On Secondary Action");
    if (onSuppBtnTapAction) {
        modal.onSuppButtonPressEvent.add(onSuppBtnTapAction);
    }

    //set callback actions for hide and show
    const onHideAction = createActionCallback(onHideActionConfig, "On Hide Action");
    const onShowAction = createActionCallback(onShowActionConfig, "On Show Action");
    modal.onVisibilityChangeEvent.add(function(/** @type {Boolean}*/ isVisible) {
        if (!isVisible && onHideAction) {
            onHideAction(modal.userInputText.get());
        } else if (isVisible && onShowAction) {
            onShowAction(modal.userInputText.get());
        }
    });
}

/**
 * The setupValidation function checks if validation is enabled and sets up the necessary validation function and parameters.
 * @returns {boolean} Returns true if the validation setup is successful, false otherwise.
 */
function setupValidation() {
    if (script.useValidation) {
        if (!script.onConfirmValidationScript) {
            print("Error, Validation Function, Script is not set!");
            return false;
        }
        if (!script.onConfirmValidationFunctionName) {
            print("Error, Error, Validation Function, Function Name is not set!");
            return false;
        }
        if (!script.onConfirmValidationScript[script.onConfirmValidationFunctionName]) {
            print("Error, Validation Function, function not found");
            return false;
        }
        modal.validation = script.onConfirmValidationScript[script.onConfirmValidationFunctionName];
    } else {
        return true;
    }
}

/**
 * Takes an action configuration object and returns a callback function based on the action type.
 * @param {ActionConfiguration} actionConfig The action configuration object containing the action type and associated properties.
 * @returns {function(string):void} Returns a callback function based on the action type in the actionConfig object.
 */
function createActionCallback(actionConfig, errorPrefix) {
    switch (actionConfig.type) {
        case 0:
            //do nothing!            
            break;
        case 1:
            //call api
            const config1 = actionConfig.callAPIFunctionConfig;
            //check linkage
            if (!config1.scriptComponent) {
                print("Error, " + errorPrefix + ", Script is not set");
                return;
            }
            if (!config1.functionName) {
                print("Error, " + errorPrefix + ", Function Name is not set");
                return;
            }
            return function(/** @type {string} */userInputString) {
                config1.scriptComponent[config1.functionName](userInputString);
            };

        case 2:
            //set text            
            const config2 = actionConfig.setTextConfig;
            if (!config2.textComponent) {
                print("Error, " + errorPrefix + ", Text Component is not set");
                return;
            }
            return function(/** @type {string} */userInputString) {
                if (userInputString === undefined || userInputString === null) {
                    userInputString = "";
                }
                config2.textComponent.text = userInputString;
            };

        case 3:
            //set api property
            const config3 = actionConfig.setAPIPropConfig;
            if (!config3.scriptComponent) {
                print("Error, " + errorPrefix + ", Script is not set");
                return;
            }
            if (!config3.propertyName) {
                print("Error, " + errorPrefix + ", Property Name is not set");
                return;
            }
            return function(/** @type {string} */userInputString) {
                config3.scriptComponent[config3.propertyName] = userInputString;
            };
        case 4:
            //print message only            
            const prefix = actionConfig.messagePrefix || "";
            return function(/** @type {string} */userInputString) {
                print(prefix + " " + userInputString);
            };
        default:
            print("Error, " + errorPrefix + ", no such action");

    }
}