export const EDI_tokenColors_dark = Object.freeze([
    '#d4d4d4', // Token 0: standardText
    '#CE9178', // Token 1: string
    '#6A9955', // Token 2: comment
    '#569CD6', // Token 3: keyword
    '#C586C0', // Token 4: keywordControl
    '#9CDCFE', // Token 5: identifier
    '#4EC9B0', // Token 6: type
    '#4FC1FF', // Token 7: member
    '#CECE84', // Token 8: function
    // 9 is hardcoded throughout the app to force write if you add another you need to start using 10 instead of 9 or etc...
]);

// Quick index token to color assignment map
export const EDI_tokenColors_light = Object.freeze([
    'red', // Token 0: standardText
    'red', // Token 1: string
    'red', // Token 2: comment
    'red', // Token 3: keyword
    'red', // Token 4: keywordControl
    'red', // Token 5: identifier
    'red', // Token 6: type
    'red', // Token 7: member
    'red', // Token 8: function
    // 9 is hardcoded throughout the app to force write if you add another you need to start using 10 instead of 9 or etc...
]);

// Quick index token to color assignment map
export let EDI_tokenColors = EDI_tokenColors_dark;

export const APP_colors_dark = {
    standardText: '#d4d4d4',
    cursor_hasFocus_backgroundColor: '#528bff',
};

export const APP_colors_light = Object.freeze({
    standardText: 'red',
    cursor_hasFocus_backgroundColor: 'red',
});

export let APP_colors = APP_colors_dark;

export const BUFFER_SIZE = 32;
export const BUFFER_MASK = 31;

//export const UI_SLOT_SIZE = 32;
/**
 * // TODO: you get `32 - 1` no matter whether you include the parenthesis or not / I don't feel like dealing with this right now.
 * // UI_SLOT_SIZE - 1 // 31 (binary: 00011111)
 */
export const UI_SLOT_MASK = 31; // UI_SLOT_SIZE - 1 // 31 (binary: 00011111)

/**
 * Master allocation (e.g., 64 bytes total for two subsystems)
 * 
 * TODO: If you queue more than 32 renderKinds in a single frame you're gonna lose information. (remedy this?) see 'UI_SLOT_MASK = 31'
 */
export const MASTER_RENDER_BUFFER = new Uint8Array(128 /* export const MASTER_BUFFER_SIZE = 128; */);



// TODO: '..._EDI_indent_ORIGINAL_indentBy()' is no longer in use

// TODO: probably can be made obsolete these various
// ```
// export const fEDI_editret_RemoveSelection_smallPosition = 71;
// export const fEDI_editret_RemoveSelection_largePosition = 72;
// ```
//
// if only one edit can exist at a time you only the count of int32 required for the edit which requires the most of them.
// and then you can share the int32 entries.
//
// tbh the same is kinda true for things like:
// export const fEDI_ret_getLineBoundaryPositions_start = 88;
// export const fEDI_ret_getLineBoundaryPositions_end = 89;
//
// you only need as many int32 as necessary for the largest amount of "return values" from a function.
// this means you'd have to immediately read them though so just think about it.
// maybe functions with low frequency invocations can share the same int32 entries or something.


/**
 * TODO: This comment was attached to the obsolete fDIALOG_width... int32's and may or may not be useful or meaningful I only glanced at it TODO: read the comment and decide.
 * 
 * defaults to viewport size then getBoundingClientRect says the exact pixels upon trying to resize
 * need to track resizes and store the useragent width/height by the onmousedown and then on resize get proportion and update left top width height.
 * 
 * 
 * 
 * 
 * TODO: This comment... determine if is meaningful / move it to the dialogGlobal.js if it is meaningful etc...
 * 
 * // TODO: Are 'fDIALOG_before_X' and 'fDIALOG_before_Y' actually doing anything?...
 * // ...When it comes to their after counterparts 'fDIALOG_after_X' and 'fDIALOG_after_Y'...
 * // ...it is believed that the counterparts are doing nothing, so also check the before.
 * 
 * 
 * 
 * 
 * TODO: This comment... determine if is meaningful / move it to the dialogGlobal.js if it is meaningful etc...
 * 
 * // TODO: What does 'fDIALOG_after_X' and 'fDIALOG_after_Y' even get used for? It seems they always only get set to 0 over and over and do nothing?
 * 
 * 
 */


/**
 * TODO: This comment was on both variables what was it referring to?
 * 
 * // same comment that pertains to EDI_cursor_EDI_paste_clipboardContent_string is somewhat relevant here
 * 
 * export const fEDI_editret_cursor_EDI_duplicate_small = 99;
 * export const fEDI_editret_cursor_EDI_duplicate_length = 100;
 */

