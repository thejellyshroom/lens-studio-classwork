/**
 * @file InputModalValidationProvider.js
 * @version 1.0.0
 * @description A basic validation provider for the InputModal component.
 */

// -----JS CODE-----
script.validation = function(value) {
    return {
        valid: value.length > 5,
        message: "Value must be at least 5 characters long."
    };
};