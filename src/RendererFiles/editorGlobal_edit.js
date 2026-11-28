import {TrackingUint32MaxHeap} from './editorMaxHeap.js'
import {UInt32List} from './listTypes.js'
import * as f from './fieldBuffer.js'
import {sendTransaction_MessageKind_custom_edit_InsertLtr, sendTransaction_MessageKind_custom_edit_Remove, sendTransaction_MessageKind_textDocument_definition, sendTransaction_MessageKind_custom_autocomplete} from './applicationRendererRoot.js'
import {tooltip} from './tooltipGlobal.js'
import {autocomplete, AUTOCOMPLETE_show, AUTOCOMPLETE_hide} from './autocompleteGlobal.js'

const EDI_gutterPaddingLeft = 3;
const EDI_gutterPaddingRight = 6;

export const CONST_EDI_ASCII_LINE_FEED = 10;
export const CONST_EDI_ASCII_TAB = 9;
export const CONST_EDI_ASCII_SPACE = 32;

const CONST_EDI_cursor_htmlId = "EDI_cursor-1";

/**
 * I'm not sure how large I want this, what matters is that I just have a size of anything for the time being, then can change this constant later.
 */
const CONST_EDI_cursor_GAP_BUFFER_CAPACITY = 32;

class TextEditor {
    constructor() {
        this.detailRank = 0;
        this.recentBoundingClientRect_isNull = true;
        this.editorHasFocus = false;
        this.fileStartsWithBom = false;

        this.findOverlay_show = false;
        this.findOverlay_wasSearched = false;
        this.findOverlay_options_matchWord = false;

        this.FindAll_options_matchWord = false;

        this.settings_trueTabs_falseSpaces = true;
        this.settings_editorDebugShowAdjacentCharacters = false;

        this.cursor_enterKeyEventKind = 0;

        this.extensionKind = 0;

        this.isChecking_cursorBlinkTrailingEdge = false;

        this.cursor_selectionDivExists = false;
        this.onResize_hasTrailingCall = false;

        this.mousemove_eventListener_isActive = false;

        /**
         * 'await window.myAPI.editorSetClipboard(...);' needs to be followed up with 'editor.clipboard_may_have_changed = 0'
         * When reading the clipboard use 'await EDI_read_clipboard();'
         */
        this.duplication_may_have_changed = true;

        /**
         * 'await window.myAPI.editorSetClipboard(...);' needs to be followed up with 'editor.clipboard_may_have_changed = 0'
         * When reading the clipboard use 'await EDI_read_clipboard();'
         */
        this.clipboard_may_have_changed = true;

        this.lineHeight = 20;

        /** The first line of text that you should see shown in the UI given the current scrollTop */
        this.virtualIndexLine = 0;
        this.virtualCount = 0;

        //throw new Error('-1');
        // This set used to be -1 to indicate a non existent value, 500 "seems to work" but a proof of it being an equivalent solution has not thoroughly been thought out, only a sort of "yeah that probably works" kinda vibe.
        this.ONSCROLLvirtualIndexLine = 500;

        /** TODO: obsolete? just use 'INTS[fEDI_ArrayFrom_textElement_children_length]' */
        this.ONSCROLLvirtualCount = 0;

        /**
         * I'm gonna store this in the int32 array so that the editor scroll render function can access it from the already existing local reference of INTS.
         */
        this.cursor_editKind = 0;

        /** TODO: Rename to 'fEDI_ringBuffer_length' */
        this.ArrayFrom_textElement_children_length = 0;

        // And this -1
        this.ringBuffer_indexZero = 0;

        this.lineEndPositionList_count = 0;

        this.styleBuffer_count = 0;

        this.queueHead = 0;
        this.queueTail = 0;
        this.isRenderPending = false;

        this.cursorBlinkingTrailingEdgeTimeoutId = 0;

        this.drawn_count_of_digits_longest_line_number = 0;

        this.detail_smallPosition = 0;

        this.detail_largePosition = 0;

        this.detailRank3OriginLine = 0;

        /**
         * Pixels.
         * 
         * The gutter width changes far more frequently than the line height.
         * That is why the gutter width is a JavaScript variable, and the styles are updated from JavaScript.
         * 
         * Whereas the line height is a css variable (and thus could cause layout for the entire application whenever it changes).
         */
        this.gutterWidthStyleValue = 32;

        /**
         * This is the sum of the 'EDI_gutterWidthStyleValue()' in addition to paddig
         * consider 'gutterWidthTotal_withPxUnits'
         */
        this.gutterWidthTotal = 32;

        this.longestLine_indexLine = 0;

        this.longestLine_length = 0;

        /**
         * The fEDI_contentWidth() is calculated via Math.ceil(someVar * otherVar) so this is faster to check whether content width will change rather than the multiplication and ceil.
         */
        this.longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar = 0;

        this.contentWidth = 0;

        this.indent_SMALL_lineAndColumnIndices_indexLine = 0;

        this.indent_startingIndex = 0;

        this.recentBoundingClientRect_left = 0;

        this.recentBoundingClientRect_top = 0;

        // ====
        /** TODO: obsolete */
        this.poolret_pooledTrackedSyntax_start = 0;

        /** TODO: obsolete */
        this.poolret_pooledTrackedSyntax_length = 0;
        // ====

        this.cursor_indexLine = 0;
        this.cursor_indexColumn = 0;

        /**
         * When moving cursor vertically, if the current column index cannot be matched due to the upcoming line being too short,
         * then this will allow a later vertical movement to a line that is long enough to match the original column rather than the minimized one.
         */
        this.cursor_STORED_visualWidth = 0;

        this.cursor_cursorTranslateYValue = 0;

        this.render_do_ScrollTrailingEdgeCheckTimeoutId = 0;

        this.cursor_selectionAnchor = 0;
        this.cursor_selectionEnd = 0;

        this.cursor_selectionIndexAnchorLine = 0;
        this.cursor_selectionIndexAnchorColumn = 0;

        this.cursor_selectionIndexEndLine = 0;
        this.cursor_selectionIndexEndColumn = 0;

        this.cursor_DRAWN_selectionAnchor = 0;
        this.cursor_DRAWN_selectionEnd = 0;

        this.cursor_DRAWN_selection_virtualIndexLine = 0;
        this.cursor_DRAWN_selection_virtualCount = 0;

        /**
         * Not every edit makes use of an editLength. Because some edits are more computationally expensive than others.
         * These computationally expensive edits only know the editLength at time of finalization.
         * This only ever should be the count of characters inserted or 0 if not applicable for the EditKind.
         */
        this.cursor_editLength_characters = 0;
        // TODO: move 'export const fEDI_cursor_editLength_bytes = 104;' closer numerically and text position
        this.cursor_editPosition = 0;
        this.cursor_editIndexLine = 0;
        this.cursor_editIndexColumn = 0;
        //TODO: move 'export const fEDI_cursor_edit_eventCount_occurred = 63;' closer (numerically and text position)
        this.cursor_edit_eventCount_drawn = 0;
        /**
         * I'm changing the code in relation to this and some other variables but,
         * I'm more concerned with 'fEDI_cursor_edit_eventCount_occurred' and 'fEDI_cursor_edit_eventCount_drawn'
         * on the first go-around.
         * 
         * Specifically the idea that every edit's render function checks fEDI_cursor_edit_eventCount_drawn < fEDI_cursor_edit_eventCount_occurred
         * although this isn't even correct. It depends on the edit still.
         * 
         * Okay if you have a more optimized render function you set drawn to occurred.
         * If you have an unoptimized render function that is just a while loop you increment.
         */
        this.cursor_edit_eventCount_drawingStateContinuationValue = 0;
        this.cursor_END_editIndexLine = 0;
        this.cursor_END_editIndexColumn = 0;
        this.cursor_textInsertionBufferCount = 0;

        /**
         * TODO: probably is sensible to use this for the enter key too but I'm firstly adding it for the sake of backspace so
         * I don't have to waste time looping over the removed text to find the line end positions that are being removed.
         * (I could do some kind of other tracking but I chose not to for no particular reason, well I think I chose this one out of laziness and that the other solutions long term like a
         *  list at the editor level 1 of them that is shared among all cursors is probably better or something.)
         * 
         * ========
         * 
         * TODO: Cursor should store this as -1 to signify false,
         * and then it is a number 0 to ... the offset in the pending line end position list
         * and then you have another number too separately that says the length of line endings that this cursor contributed to modifying.
         */
        this.cursor_editLineFeedCount = 0;


        // TODO: Avoid re-using these locally after getting the w result (i.e.: avoid re-using over and over in a loop or something, probably make a local variable if accessed enough).
        // TODO: Verify and update all the previously -1 cases
        this.w_indexColumn_Goal = 0;
        this.w_indexColumn_Sum = 0;

        /**
         * This purposefully avoids the wording "edit length" in order to avoid accident / confusing / hard to read code
         * but in simplest terms this variable is the resulting 'editLength' that existed after a delete or backspace removed a line end.
         * 
         * This way you can always just check whether the "sub length" which is relative to the edit_flagLineChanged has removed all the
         * text that other line that you landed on without having yet finalized.
         */
        this.cursor_edit_flagLineChanged = 0;

        /**
         * TODO: isn't this just the column index now that there's just a single div?
         * 
         * TODO: MAYBEo-b-s-o-l-e-t-eMAYBE
         */
        this.w_indexColumn_SpanTextContentRelative = 0;

        // TODO: This -1
        this.w_ringBufferIndex = 0;

        // just floor these on init / resize and set the style so if they want resize they have to explicit and it is non decimal?
        this.lastReadNumber_offsetHeight = 0;

        this.lastReadNumber_offsetWidth = 0;

        this.EDI_mouseOver_event_clientY = 0;

        this.EDI_mouseOver_event_clientX = 0;

        this.cursor_edit_eventCount_occurred = 0;

        this.onResize_timer = 0;

        this.hoverTimeout = 0;

        // ====
        /** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.ret_getLineAndColumnIndices_indexLine = 0;
        /** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.ret_getLineBoundaryPositions_start = 0;
        /** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.ret_getIndexFromX_indexColumn = 0;

        /** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.ret_getLineAndColumnIndices_indexColumn = 0;
        /** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.ret_getLineBoundaryPositions_end = 0;
        /** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.ret_getIndexFromX_visualColumns = 0;
        // ====

        this.cursorVisualColumnIndex = 0;

        this.ontab_visualWidth_perCharacter = 0;

        this.cursor_selectionIndexAnchorColumnVISUAL = 0;
        this.cursor_selectionIndexEndColumnVISUAL = 0;

        this.cursor_selectionIndexAnchorColumnVISUAL_DRAWN = 0;
        this.cursor_selectionIndexEndColumnVISUAL_DRAWN = 0;

        this.detail_smallColumnVisual = 0;
        this.detail_largeColumnVisual = 0;

        this.cursor_cached_indentation_string_visualWidth = 0;

        this.cursor_editLengthVisual = 0;

        this.textByteList_capacity = 0;
        this.textByteList_count = 0;

        this.lineEndPositionList_capacity = 0;

        // ====
        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_cursor_EDI_duplicate_small = 0;
        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_RemoveSelection_smallPosition = 0;
        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_indentLess_startingLinePos_end = 0;
        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;

        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_cursor_EDI_duplicate_length = 0;
        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_RemoveSelection_largePosition = 0;

        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_RemoveSelection_smallLineAndColumnIndices_small_indexLine = 0;

        /** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
        this.editret_RemoveSelection_smallLineAndColumnIndices_small_indexColumn = 0;
        // ====

        this.priorToLastJump_indexLine = 0;
        this.priorToLastJump_indexColumn = 0;

        this.styleBuffer_capacity = 0;

        /**
         * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
         * 
         * editPosition + this[i]
         */
        this.cursor_EDI_duplication_totalLineEndCount = 0;

        /**
         * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
         * editPosition + this[i]
         */
        this.cursor_EDI_paste_clipboardContent_totalLineEndCount = 0;

        this.cursor_editLength_bytes = 0;

        /** TODO: obsolete */
        this.byteEDI_byteret_pooledTrackedSyntax_trackedSyntaxKind = 0;

        this.baseElement = document.getElementById('EDITOR_inner_container');

        this.scroll_viewport = this.baseElement.children[0];
        this.virtualization_horizontal = this.baseElement.children[0].children[0];

        this.viewport = this.baseElement.children[1];

        this.gutter = this.baseElement.children[1].children[0];
        this.gutter_canvas = this.baseElement.children[1].children[0].children[0];
        this.text = this.baseElement.children[1].children[1];
        this.text_canvas = this.baseElement.children[1].children[1].children[0];
        this.cursor_canvas = this.baseElement.children[1].children[1].children[1];

        this.textTopPadding = 3;
    }
}

export const editor = new TextEditor();

/**
 * TODO: long term 'EDI_getEntireLineVisualWidth' should be replaced by a lookup within 'EDI_trackingUint32MaxHeap'...
 * ...but currently there are some cases that are inaccurately updating this map.
 * As of writing this comment this is used to draw the horizontal width of the content relative to the longest line.
 */
let EDI_trackingUint32MaxHeap = new TrackingUint32MaxHeap();

/**
 * @type {UInt32List}
 */
let EDI_findOverlay_searchResultPositionList = null;

let EDI_textByteList_bytes = new Uint8Array(editor.textByteList_capacity);

let EDI_lineStringCache = [];

let EDI_line_NUMBER_StringCache = [];

/**
 * When this is cleared the information is not removed, only 'gapBufferCount' is set to 0.
 */
const EDI_cursor_textInsertionBuffer = new Uint8Array(CONST_EDI_cursor_GAP_BUFFER_CAPACITY);

/**
 * TODO: This used to be const so make sure you check all the references that they weren't relying on that for either behavior or optimization.
 * TODO: Prior to this changing you need to finalize the edits
 */
let EDI_on_tab_bytes = new Uint8Array(1);
EDI_on_tab_bytes[0] = CONST_EDI_ASCII_TAB;
editor.ontab_visualWidth_perCharacter = 4;

/**
 * When a cursor removes a line end the position of the line end is stored in this list until the edit is finalized.
 * 
 * TODO: If you insert more than 128 line endings your code breaks?
 */
const EDI_lineEndPositionList_PENDING = new UInt32List(128);


/** Be wary to the possibility of pending edits causing this to not be up to date. */
let EDI_lineEndPositionList_data = new Uint32Array(editor.lineEndPositionList_capacity);

export let EDI_textSourceIdentifier = '';
let EDI_FORMATTED_textSourceIdentifier = '';

let EDI_lineEndString = null;

// Pre-allocate a typed array to prevent memory allocation during runtime
/**
 * TODO: If you queue more than 32 renderKinds in a single frame you're gonna lose information. (remedy this?) see 'f.BUFFER_SIZE = 32'
 */
const EDI_renderKindBuffer = new Uint8Array(f.BUFFER_SIZE);

let EDI_styleBuffer = new Uint8Array(0);
export function set_EDI_styleBuffer(value) {
    EDI_styleBuffer = value;
}

/** decimal */
let EDI_lastReadNumber_scrollLeft = 0;

/** decimal */
let EDI_lastReadNumber_scrollTop = 0;

export let EDI_characterWidth = 8;

let EDI_cursor_cursorTranslateXValue = 0;

/**
 * Depending on 'editor.cursor_enterKeyEventKind' this may either start OR end with '\n'.
 * 
 * Upon an enter keystroke this is inserted onto the newly added line.
 * 
 * The value is stored here to avoid high overhead from indentation matching when holding down the Enter key.
 * 
 * TODO: ^ that being said, you preferably wouldn't store this string allocation long term. If a more "localized" caching can be implemented, that would be preferable. (or the timing upon which this is set to null)
 * 
 * TODO: Don't null this just change the count to 0 and use a separate bool to indicate "nullness". UNLESS if clearing cache and this is for some reason MASSIVE idk maybe > 256 then maybe clear it idk
 * 
 * TODO: clear these when setting text, if not already? My code isn't working so I can't give a better TODO than this
 * 
 * @type {ByteList | null}
 */
let EDI_cursor_enterKey_newLinePlusIndentation_byteList = null;

/**
 * (TODO: This doesn't contain the linefeed at all right? I removed the assumedly copy and pasted comment that said it contained a linefeed)
 * 
 * The UI needs this with the tabs changed to spaces equal to the respective tab's tabWidth
 * i.e.: it isn't the same as the bytes.
 */
let EDI_cursor_cached_indentation_string = null;

// see: 'const editor.clipboard_may_have_changed' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_paste_clipboardContent_string = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_paste_clipboardContent_bytes = null;
// see: 'const editor.cursor_EDI_paste_clipboardContent_totalLineEndCount' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * editPosition + this[i]
 * EOF style
 */
let EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * EOF style
 * 
 * !!!! The first index of this has to be visual lengthed relative to the column index that you insert at as it cannot be known ahead of time, after the first tab or upon hitting a tab stop.
 */
let EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;


// see: 'const editor.duplication_may_have_changed' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
//let EDI_cursor_EDI_duplication_string = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_duplication_bytes = null;
// see: 'const editor.cursor_EDI_duplication_totalLineEndCount' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * 
 * editPosition + this[i]
 * 
 * EOF style
 */
let EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * EOF style
 */
let EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;
/** EOF style */
let EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;

/**
 * Google AI: "I want to make a Custom TextDecoder"
 */
class EDI_CustomDecoder {
    constructor() {
        /**
         * TODO: Make chunkSize the amount of characters that can fit from viewport_0_pixel to viewport_whateverTheTotalPixelWidthOrWhatever_pixel but in character units of the monospace form...
         * ...just make sure you add a minimum so a small width screen doesn't thrash tokens...
         * ...actually... can you put a minimum cause then single character identifiers are gonna break...
         * ...but you probably have a minimumDueToScreenWidth and that has a minimum of its own and you can still separately have 1 character identifiers.
         */
        this.chunkSize = 2048;
        this.charBuffer = new Uint16Array(this.chunkSize);
    }

    // High-performance V8 string builder helper
    /**
     * TODO: Validate this statement that Google AI made:
     * Bonus _flushBuffer tip: In EDI_CustomDecoder._flushBuffer, calling String.fromCharCode.apply(null, this.charBuffer.subarray(0, bufIdx))
     * (since chunkSize is 2048, well below V8's argument stack limit of ~65,536) avoids building chunkStr via += in a loop.
     */
    _flushBuffer(bufIdx) {
        let chunkStr = '';
        for (let j = 0; j < bufIdx; j++) {
            chunkStr += String.fromCharCode(this.charBuffer[j]);
        }
        return chunkStr;
    }

    /**
     * Decodes an entire line's tokens, processes tabs, and populates lineSpans in a single method invocation.
     * 
     * @param {number} start - new_lineStart
     * @param {number} lineEnd - new_lineEnd
     * @param {Array} lineSpans - Cache array for this line's spans
     * @param {Array} tokenColors - EDI_tokenColors array/map
     * @param {object} tokenResult - Persistent state holder (for .bytes and .styles references)
     * @returns {number} The updated spanIndex count for the line
     */
    decodeLineTokens(start, lineEnd, lineSpans, tokenColors, bytesParam, stylesParam) {

        /** @type {number} spanIndex - The span index to write to */
        let spanIndex = 0;

        const sharedBytes = bytesParam;
        const styles = stylesParam;
        const limit = this.chunkSize;

        let i = start;
        let col = 0; // Completely local counter now, no object tracking property needed!

        while (i < lineEnd) {
            let outStr = '';
            let bufIdx = 0;

            const initialStyleId = styles[i];

            // Inner token consumption loop: runs entirely inside local registers
            while (i < lineEnd) {
                if (styles[i] !== initialStyleId) {
                    break; // Hit a token boundary, drop out to push this span
                }

                let codePoint = sharedBytes[i++];

                // FAST PATH: Horizontal tab (ASCII 9)
                if (codePoint === 0x09) {
                    const spacesNeeded = 4 - (col & 3);
                    col += spacesNeeded;

                    for (let s = 0; s < spacesNeeded; s++) {
                        this.charBuffer[bufIdx++] = 32;
                        if (bufIdx >= limit - 1) {
                            outStr += this._flushBuffer(bufIdx);
                            bufIdx = 0;
                        }
                    }
                    continue;
                }

                // Multi-byte UTF-8 parsing
                if ((codePoint & 0x80) !== 0) {
                    if ((codePoint & 0xE0) === 0xC0) {
                        if (i < lineEnd) codePoint = ((codePoint & 0x1F) << 6) | (sharedBytes[i++] & 0x3F);
                    }
                    else if ((codePoint & 0xF0) === 0xE0) {
                        if (i + 1 < lineEnd) {
                            codePoint = ((codePoint & 0x0F) << 12) |
                                ((sharedBytes[i++] & 0x3F) << 6) |
                                (sharedBytes[i++] & 0x3F);
                        }
                    }
                    else if ((codePoint & 0xF8) === 0xF0) {
                        if (i + 2 < lineEnd) {
                            codePoint = ((codePoint & 0x07) << 18) |
                                ((sharedBytes[i++] & 0x3F) << 12) |
                                ((sharedBytes[i++] & 0x3F) << 6) |
                                (sharedBytes[i++] & 0x3F);
                        }
                    }
                }

                col++;

                if (codePoint <= 0xFFFF) {
                    this.charBuffer[bufIdx++] = codePoint;
                } else {
                    codePoint -= 0x10000;
                    this.charBuffer[bufIdx++] = (codePoint >> 10) + 0xD800;
                    this.charBuffer[bufIdx++] = (codePoint & 0x3FF) + 0xDC00;
                }

                if (bufIdx >= limit - 1) {
                    outStr += this._flushBuffer(bufIdx);
                    bufIdx = 0;
                }
            }

            // Flush remaining data for this token
            if (bufIdx > 0) {
                outStr += this._flushBuffer(bufIdx);
            }

            // Write token output directly into your line spans array record
            if (spanIndex < lineSpans.length) {
                const existingSpan = lineSpans[spanIndex++];
                existingSpan.text = outStr;
                existingSpan.color = tokenColors[initialStyleId];
            } else {
                lineSpans.push({
                    text: outStr,
                    color: tokenColors[initialStyleId]
                });
                spanIndex++;
            }
        }

        lineSpans.length = spanIndex;
    }

    /**
     * Google AI: 'I need this custom decoding logic in another place within my app. But this is specifically just so I can when handling paste events cache each line of text...'
     * 
     * Decodes a slice of UTF-8 bytes into a single string with tabs expanded to tab stops.
     *
     * @param {Uint8Array} bytes - The source byte array
     * @param {number} start - Starting byte index (inclusive)
     * @param {number} end - Ending byte index (exclusive)
     * @param {number} [tabWidth=4] - Number of spaces per tab stop
     * @param {number} [startCol=0] - Starting visual column (useful if pasting mid-line)
     * @returns {string} The decoded, tab-expanded string
     */
    decodeLineWithTabs(bytes, start, end, tabWidth = 4, startCol = 0) {
        const limit = this.chunkSize;
        const charBuffer = this.charBuffer;

        let i = start;
        let col = startCol;
        let outStr = '';
        let bufIdx = 0;

        while (i < end) {
            let codePoint = bytes[i++];

            // FAST PATH: Horizontal tab (ASCII 9)
            if (codePoint === 0x09) {
                const spacesNeeded = tabWidth - (col % tabWidth);
                col += spacesNeeded;

                for (let s = 0; s < spacesNeeded; s++) {
                    charBuffer[bufIdx++] = 32; // ASCII space
                    if (bufIdx >= limit - 1) {
                        outStr += this._flushBuffer(bufIdx);
                        bufIdx = 0;
                    }
                }
                continue;
            }

            // Multi-byte UTF-8 parsing
            if ((codePoint & 0x80) !== 0) {
                if ((codePoint & 0xE0) === 0xC0) {
                    if (i < end) {
                        codePoint = ((codePoint & 0x1F) << 6) | (bytes[i++] & 0x3F);
                    }
                } else if ((codePoint & 0xF0) === 0xE0) {
                    if (i + 1 < end) {
                        codePoint = ((codePoint & 0x0F) << 12) |
                            ((bytes[i++] & 0x3F) << 6) |
                            (bytes[i++] & 0x3F);
                    }
                } else if ((codePoint & 0xF8) === 0xF0) {
                    if (i + 2 < end) {
                        codePoint = ((codePoint & 0x07) << 18) |
                            ((bytes[i++] & 0x3F) << 12) |
                            ((bytes[i++] & 0x3F) << 6) |
                            (bytes[i++] & 0x3F);
                    }
                }
            }

            col++;

            // Write UTF-16 code units to buffer
            if (codePoint <= 0xFFFF) {
                charBuffer[bufIdx++] = codePoint;
            } else {
                codePoint -= 0x10000;
                charBuffer[bufIdx++] = (codePoint >> 10) + 0xD800;
                charBuffer[bufIdx++] = (codePoint & 0x3FF) + 0xDC00;
            }

            if (bufIdx >= limit - 1) {
                outStr += this._flushBuffer(bufIdx);
                bufIdx = 0;
            }
        }

        // Flush remaining characters
        if (bufIdx > 0) {
            outStr += this._flushBuffer(bufIdx);
        }

        return outStr;
    }

    /**
     * Computes exact UTF-8 byte length of a JS string with zero heap allocations.
     */
    getUtf8ByteLength(str) {
        let bytes = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code <= 0x7F) {
                bytes += 1;
            } else if (code <= 0x7FF) {
                bytes += 2;
            } else if (code >= 0xD800 && code <= 0xDBFF) {
                // Surrogate pair (4 UTF-8 bytes across 2 UTF-16 code units)
                bytes += 4;
                i++;
            } else {
                bytes += 3;
            }
        }
        return bytes;
    }

    /**
     * Writes a non-negative integer as ASCII digits directly into `buf` at `offset`.
     * Returns the new offset after writing.
     */
    writeAsciiUint(buf, offset, value) {
        if (value === 0) {
            buf[offset] = 48; // '0'
            return offset + 1;
        }

        // Find digit count without allocating a string
        let temp = value;
        let digits = 0;
        while (temp > 0) {
            digits++;
            temp = (temp / 10) | 0;
        }

        let writePos = offset + digits - 1;
        temp = value;
        while (temp > 0) {
            buf[writePos--] = 48 + (temp % 10); // '0' + digit
            temp = (temp / 10) | 0;
        }

        return offset + digits;
    }

    /**
     * Encodes a JS string as UTF-8 directly into `buf` at `offset`.
     * Returns the new offset after writing.
     */
    writeUtf8String(buf, offset, str) {
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);

            if (code <= 0x7F) {
                buf[offset++] = code;
            } else if (code <= 0x7FF) {
                buf[offset++] = 0xC0 | (code >> 6);
                buf[offset++] = 0x80 | (code & 0x3F);
            } else if (code >= 0xD800 && code <= 0xDBFF) {
                // Combine surrogate pair into full Unicode code point
                const low = str.charCodeAt(++i);
                code = 0x10000 + (((code & 0x3FF) << 10) | (low & 0x3FF));
                buf[offset++] = 0xF0 | (code >> 18);
                buf[offset++] = 0x80 | ((code >> 12) & 0x3F);
                buf[offset++] = 0x80 | ((code >> 6) & 0x3F);
                buf[offset++] = 0x80 | (code & 0x3F);
            } else {
                buf[offset++] = 0xE0 | (code >> 12);
                buf[offset++] = 0x80 | ((code >> 6) & 0x3F);
                buf[offset++] = 0x80 | (code & 0x3F);
            }
        }
        return offset;
    }

/*
<
Does this javascript code snippet have postfix copy overhead?

class EDI_CustomDecoder {
  constructor() {} // full code of this method was provided to prompt

  _flushBuffer(bufIdx) {} // full code of this method was provided to prompt

  decodeLineTokens(start, lineEnd, lineSpans, spanIndex, tokenColors, bytesParam, stylesParam) {} // full code of this method was provided to prompt
}




>
No, this code has zero postfix copy overhead. Every single ++ in your snippet (i++, bufIdx++, spanIndex++, j++, s++) operates strictly on small integer primitives,
which V8 keeps directly in CPU registers with zero memory allocation or object copying.

Here is a breakdown of why your postfix operations are completely free, plus a quick check on the TODO in your code and one genuine performance bottleneck to watch out for.

1. Postfix Operations (i++, bufIdx++, spanIndex++)

• Zero Copy Cost: In V8, local integer variables like i and bufIdx are stored as Smis (Small Integers) inside CPU registers.
  When you execute sharedBytes[i++} or this.charBuffer[bufIdx++], V8 uses the register's current value as the array offset and executes a single CPU ADD instruction afterward.
• No Difference from Prefix: Rewriting i++ to ++i and adjusting your indices manually would produce virtually identical machine code in TurboFan/Maglev.
  Keep i++ and bufIdx++ as-is for readability.

2. Validating Your TODO Comment on _flushBuffer

Your TODO asks whether String.fromCharCode.apply(null, this.charBuffer.subarray(0, bufIdx)) is faster than chunkStr += String.fromCharCode(...) in a loop.
That tip is valid and will give you a measurable speedup.

• Why += in a loop is slower: In V8, concatenating strings in a loop creates a tree of ConsString objects on the heap that eventually has to be flattened into a single contiguous string.
• Why .apply() with .subarray() wins: subarray(0, bufIdx) creates a lightweight view without copying the underlying buffer, and String.fromCharCode.apply() allocates the final flat string in C++
  in a single pass. Since your chunkSize is 2048, you are nowhere near V8's argument stack limit (~65,536).

3. Actual Bottlenecks to Watch in This Hot Path
If you want to squeeze maximum speed out of decodeLineTokens, look at these two areas instead of postfix operators:
• Cache this.charBuffer locally: Just like you cached const limit = this.chunkSize;, assign const charBuffer = this.charBuffer; at the top of decodeLineTokens.
  Repeatedly reading this.charBuffer inside tight inner loops forces V8 to verify the object shape/property load unless TurboFan hoists it.
• Fast-Path ASCII Strings: If your tokens are mostly standard ASCII (bytes < 0x80 and not \t), TextDecoder
  (e.g., a persistent new TextDecoder('utf-8')) decoding slices directly from sharedBytes.subarray(tokenStart, tokenEnd) in native C++ can outperform byte-by-byte JS loops for longer tokens.
  However, for very short tokens (1–15 characters, which are common in syntax-highlighted code), your Uint16Array + String.fromCharCode.apply
  approach avoids TextDecoder call overhead and is often faster.

Would you like me to rewrite _flushBuffer and decodeLineTokens with the String.fromCharCode.apply optimization and local buffer caching applied so you can benchmark it against your current version?




>
I want to track the total character width of every token that was generated.
And then short circuit so that no further tokens are generated once it is found that:
after generating the most recent token the total amount of text would visually clip offscreen.

No wait that's jumping the gun there's better changes to make first.
Luckily I didn't ask that lol




>
Can you tell me more about `String.fromCharCode.apply(null, this.charBuffer.subarray(0, bufIdx))`.
The code looks "nasty".
But I could see it being vastly superior if it is about reducing the amount of times you cross the JavaScript to C++ boundary.




<
Your intuition is spot on. String.fromCharCode.apply(null, this.charBuffer.subarray(0, bufIdx)) wins primarily because it collapses N individual
C++ builtin transitions and heap allocations into a single, vectorized C++ operation.

It looks "nasty" because .apply() is an older ES5 pattern designed to unpack an array onto the CPU call stack as individual arguments.
Under the hood in V8, however, that pattern unlocks a fast path that a JavaScript for loop cannot match.

1. Why the for Loop is Expensive
When you run chunkStr += String.fromCharCode(this.charBuffer[j]) inside a loop, V8 has to do heavy lifting on every single character:
• Repeated Builtin Dispatch: Calling String.fromCharCode bufIdx times means invoking the builtin handler repeatedly
  (even when V8 inlines it via Torque/CSA, it still runs argument validation and range checks on every iteration).
• Single-Character String Allocations: Each call produces a 1-character string object (or fetches it from V8's single-character string cache).
• ConsString Tree Explosion: Every += allocates a ConsString node on the V8 heap—a 24-byte/32-byte object pointing to a first string and a second string.
  A 100-character token creates 99 temporary ConsString wrapper objects that immediately become garbage once the string is flattened for DOM rendering.

2. What V8 Actually Does with .apply() + .subarray()
When you pass a TypedArray view to Function.prototype.apply, V8 executes a specialized sequence:
• Zero-Copy View (.subarray()): Calling this.charBuffer.subarray(0, bufIdx) does not copy a single byte of character data.
  It simply allocates a tiny JSTypedArray header object pointing to the exact same ArrayBuffer memory with a capped length of bufIdx.
• Fast Argument Unpacking (Apply Builtin): V8's internal Apply stub sees that the argument list is a JSTypedArray (Uint16Array).
  Instead of doing slow generic property lookups (obj[0], obj[1]), it reads the raw uint16_t* backing pointer directly in C++ and pushes those values onto the frame stack in a tight loop.
• Single Allocation & memcpy (StringFromCharCode): String.fromCharCode receives all bufIdx arguments at once.
  It checks whether all code units are <= 0xFF (Latin1/OneByte) or require TwoByte (UTF-16),
  allocates one single contiguous SeqOneByteString or SeqTwoByteString of the exact final byte length on the V8 heap, and copies the characters in one pass.

3. The Two Gotchas to Keep in Mind
While this trick is a classic V8 optimization, it has two sharp edges you must respect:
• Stack Overflow Limit (RangeError): Pushing arguments onto the execution stack consumes real stack space.
  V8 caps the argument count around 65,536 (and slightly lower if the current call stack is already deep).
  Because your chunkSize is 2048, you are completely safe—2,048 arguments take roughly 16 KB of stack space.
• Tiny Strings (1–3 Characters): Creating the .subarray() wrapper object and running the .apply() stub has a tiny fixed setup cost.
  For 1-character or 2-character tokens (like ;, {, =, or if), String.fromCharCode(buf[0]) is slightly faster than .apply(). For tokens of ~4+ characters,
  .apply() pulls ahead decisively, and for 20+ characters it isn't even close.

4. Cleaning Up the "Nasty" Syntax
If you want to keep the exact same performance without repeating that ugly expression in multiple places inside decodeLineTokens,
wrap it in a clean helper or fast-path the 1-character case right inside _flushBuffer:

```js
_flushBuffer(bufIdx) {
  if (bufIdx === 1) {
    return String.fromCharCode(this.charBuffer[0]);
  }
  return String.fromCharCode.apply(null, this.charBuffer.subarray(0, bufIdx));
}
```

(Note: Because _flushBuffer is tiny, V8's TurboFan compiler will automatically inline it directly into decodeLineTokens after a few hundred calls,
 meaning you pay zero function-call overhead for keeping the code clean.)

Would you like to look into how V8's OneByte vs. TwoByte string representation affects memory and DOM text-node rendering when you pass these strings to your editor spans?




>
How does the `.apply()` avoid 'String.fromCharCode' being ran foreach character.
If 'String.fromCharCode' is written in JavaScript to receive 1 character at a time, then it always is written that way.
Unless the `.apply()` signals to V8 that it can interpret the function differently almost like an explicit overload that accepts a typed array.




<
The answer lies in two facts: String.fromCharCode is actually variadic by specification (it accepts ...codes, not just 1 character),
and it is implemented natively in V8's assembly/C++ layer, not in JavaScript.

Here is how those two pieces fit together to eliminate the per-character JavaScript overhead.

1. String.fromCharCode is Variadic by Design
Per the ECMAScript specification, String.fromCharCode is defined as String.fromCharCode ( ...codeUnits ).
You can legitimately call String.fromCharCode(65, 66, 67) directly in JavaScript and get "ABC".

Because it accepts any number of arguments, .apply() isn't triggering a secret overload—it is simply bridging the gap between an array-like container
(Uint16Array) and a variadic function signature (...codeUnits).

2. It Is Not Written in JavaScript
In V8, String.fromCharCode is not a JavaScript function containing a for loop.
It is a Torque / CodeStubAssembler (CSA) builtin—meaning it is compiled directly into low-level machine instructions inside the V8 binary itself.

When you call String.fromCharCode.apply(null, subarray):
• No JavaScript Loop: There is no JS bytecode executing per character.
• Native Stack Frame: V8's Apply builtin unpacks the Uint16Array's raw memory directly onto the native call stack in a tight assembly loop.
• Single Native Execution: StringFromCharCode runs once, reads arguments.length directly from the stack frame, allocates one string object on the heap,
  and copies all character codes into it using native machine instructions.

3. Why .apply() Still Feels Like an "Overload"

Your intuition about .apply() acting like a specialized fast path is actually very close to reality inside V8:
• Normally, calling fn(...typedArray) or fn.apply(null, typedArray) would require iterating over the object in JavaScript via the iterator protocol (Symbol.iterator) or indexed property lookups.
• V8's Apply builtin specifically checks the type of the second argument (argArray).
  When it detects a fast JSTypedArray (like your Uint16Array), it skips the JavaScript iteration protocol entirely and jumps straight to a C++/assembly fast path that reads
  the raw uint16_t backing store pointer.

So while String.fromCharCode itself doesn't know it received a TypedArray (it just sees N arguments sitting on the call stack), .apply()
acts as a zero-JS-overhead adapter that dumps your Uint16Array straight onto that stack in one shot.

If you're curious about squeezing even more speed out of your EDI decoder, we can look at whether TextDecoder.decode() on raw Uint8Array slices beats Uint16Array + .apply()
for your typical token lengths. Would you like to compare them?




>
`Cache this.charBuffer locally`.

This function was originally generated by Google AI.

I cannot recall whether the caches for `const limit = this.chunkSize;` and other existing scenarios where part of what Google AI generated, or if I modified things afterwards.

But, with `this.charBuffer` not having been cached in the originally generated code I wonder: why was this not cached. (I'm not mad lol, just wondering).

I assume it would be a matter of readability, and then if the prompter wanted to further optimize the function such a topic would come up?




<
Your guess is right on the money. It comes down to a mix of code readability, how LLMs generate code, and what V8's JIT compiler already optimizes automatically.
When generating a class method, AI models naturally default to writing clean, idiomatic JavaScript first.
• Self-Documenting Code: Writing this.charBuffer[bufIdx++] makes it immediately obvious to any developer reading the inner loop that you are mutating an instance property belonging to
  EDI_CustomDecoder.
• Avoiding Variable Clutter: Extracting every this.* property into local const aliases at the top of a method (const charBuffer = this.charBuffer;, const limit = this.chunkSize;)
  adds boilerplate. Models usually only introduce those aliases when explicitly prompted for maximum V8 hot-path performance—or when you iteratively ask to squeeze out bottlenecks.

2. Why limit Was Cached Instead of charBuffer
Look closely at why const limit = this.chunkSize; made it in while this.charBuffer didn't:
• Habitual Loop Pattern: Caching a numeric loop bound (const len = arr.length; or const limit = this.chunkSize;)
  is one of the most common JavaScript performance idioms in training data, so models emit it almost instinctively.
• Lower Perceived Cost on Objects: Developers (and by extension, LLMs trained on human code) instinctively worry about re-evaluating a number condition
  (bufIdx >= this.chunkSize - 1) on every loop iteration, whereas property lookups on an array object (this.charBuffer[i]) are commonly left inline unless someone
  is specifically hunting for V8 property-load overhead.

3. Does V8 Actually Need this.charBuffer Cached?
In practice, V8's TurboFan compiler usually hoists this.charBuffer out of the loop for you anyway, provided two conditions are met:
• Monomorphic Class Shape: Because you initialize this.charBuffer = new Uint16Array(this.chunkSize) directly in the constructor and never dynamically add/delete properties on this,
  your decoder instance has a stable hidden class (Map).
• No Side-Effect Calls Inside the Loop: Inside your inner while loop, you don't call external functions that could mutate this.charBuffer—except this._flushBuffer(bufIdx).
  Because _flushBuffer is called inside the loop, TurboFan has to verify that _flushBuffer doesn't reassign this.charBuffer before it can safely hoist the property load.

Caching const charBuffer = this.charBuffer; at the top of decodeLineTokens simply guarantees that V8 keeps the Uint16Array pointer in a local register for the entire method, regardless of
what _flushBuffer does.

Would you like to check if any other parts of decodeLineTokens—such as UTF-8 multi-byte decoding or span object reuse—have hidden V8 deoptimization risks?

*/

}

export const EDI_encoder = new TextEncoder();
const EDI_decoder = new TextDecoder();
export const EDI_decoder_CUSTOM = new EDI_CustomDecoder();

//// Find-All for "EDI_debug_optimization" to find all the commented out logic that was related to this.
// let EDI_debug_optimization_has_logged_disassembleFunction = false;
// let EDI_debug_optimization_last_seen_code = -1;
// let EDI_debug_optimization_delay_heavy_logging = 4;
// let EDI_debug_optimization_run_count = 0;

/** invoked from requestAnimationFrame */
export function EDI_init() {

    editor.gutterWidthTotal = 60;

    EDI_state_setText_byteArray(new Uint8Array(16), /*textByteLength*/ 0, /*fileStartsWithBom*/ false, /*textSourceIdentifier*/ null, /*FORMATTED_textSourceIdentifier*/ null, /*extensionKind*/ 0, /*lineEndString*/ '\n', /*lineEndCount*/ 0);
    EDI_registerHandlers();
    EDI_render_do_Resize();

    EDI_draw_cursor_debug();
}

function EDI_createViewport() {
    EDI_render_request(14 /*RenderKind.CreateViewport: 14*/);
}

function EDI_state_clear(trackingUint32MaxHeap_initialCapacity) {
    if (trackingUint32MaxHeap_initialCapacity === 0) {
        // 0 will break the capacity of the heap
        trackingUint32MaxHeap_initialCapacity = undefined;
    }

    EDI_finalizeEdit();
    EDI_cursor_clear();
    editor.recentBoundingClientRect_isNull = true;
    EDI_textSourceIdentifier = '';
    EDI_FORMATTED_textSourceIdentifier = '';
    editor.extensionKind = 0 /*ExtensionKind.None: 0*/;
    editor.fileStartsWithBom = false;
    EDI_lineEndString = null;
    // TODO: Maybe re-use the 'TrackingUint32MaxHeap' rather than making a new one everytime
    EDI_trackingUint32MaxHeap = new TrackingUint32MaxHeap(trackingUint32MaxHeap_initialCapacity);
    editor.lineEndPositionList_count = 0;
    editor.textByteList_count = 0;
    editor.longestLine_indexLine = 0;
    editor.longestLine_length = 0;

    // TODO: This placement is slightly odd because the styleBuffer is made asynchronously and whether there could be a race condition that clears the styleBuffer you just received is uncertain (I just have not checked recently maybe I did when I first wrote it, it just looks odd though, need to check this).
    editor.styleBuffer_count = 0;

    //EDI_lineStringCache = new Array(trackingUint32MaxHeap_initialCapacity);
}

function EDI_clear() {
    EDI_state_clear();
    EDI_render_request(12 /*RenderKind.Clear: 12*/);
}

/**
 * TODO: assert that the function parameters fit the requirements as described in the respective param documentation.
 * @param {*} paddedUint8Array all line endings replaced by '\n' regardless of the desired line ending when saving the file (or copying text, etc...). 'paddedUint8Array.length' is not necessarily equal to 'textLength'. If you want to avoid reallocating when you type a single character. You can pad the uint8array, a padding of 1 gives a textLength of 'paddedUint8Array.length - 1'.
 * @param {*} lineEndString this is the desired line ending when saving the file (or copying text, etc...)
 */
export function EDI_state_setText_byteArray(paddedUint8Array, textByteLength, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString, lineEndCount) {
    EDI_scroll_viewport.scrollTop = 0;
    EDI_scroll_viewport.scrollLeft = 0;
    EDI_lastReadNumber_scrollTop = 0;
    EDI_lastReadNumber_scrollLeft = 0;

    let necessaryCapacity = lineEndCount + 1; // +1 for EOF
    if (lineEndCount === 0) {
        // TODO: Move this inside of 'EDI_lineEndPositionList_ensureCapacityForInsertion'?
        necessaryCapacity = 16;
    }

    EDI_state_clear(necessaryCapacity);
    editor.fileStartsWithBom = fileStartsWithBom;
    EDI_textSourceIdentifier = textSourceIdentifier;
    EDI_FORMATTED_textSourceIdentifier = FORMATTED_textSourceIdentifier;
    editor.extensionKind = extensionKind;
    EDI_lineEndString = lineEndString;
    if (!EDI_lineEndString) {
        EDI_lineEndString = '\n';
    }

    EDI_textByteList_bytes = paddedUint8Array;
    editor.textByteList_capacity = paddedUint8Array.length;
    const local_EDI_textByteList_bytes = EDI_textByteList_bytes;
    editor.textByteList_count = textByteLength;
    const local_EDI_textByteList_count = editor.textByteList_count;


    EDI_lineEndPositionList_ensureCapacityForInsertion(0, necessaryCapacity);
    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;

    const local_EDI_trackingUint32MaxHeap = EDI_trackingUint32MaxHeap;
    const local_EDI_trackingUint32MaxHeap_heap = local_EDI_trackingUint32MaxHeap.heap;
    const local_EDI_trackingUint32MaxHeap_lineIndexToHeapIndex = local_EDI_trackingUint32MaxHeap.lineIndexToHeapIndex;

    let lineLengthVisual = 0; /** TODO: Track the linePosition last seen when making a line or something you don't have to increment this per character, you just need the difference of the last line drawn to the current or something. */
    let local_EDI_lineEndPositionList_count = editor.lineEndPositionList_count;

    for (let sourceI = 0; sourceI < local_EDI_textByteList_count; ++sourceI) {
        ++lineLengthVisual; // avoid branching by eager counting the lineLengthVisual and then excluding the lineEnding later
        if (local_EDI_textByteList_bytes[sourceI] === CONST_EDI_ASCII_TAB) {
            lineLengthVisual += ((4 - ((lineLengthVisual - 1) % 4)) - 1); // (tab logic): avoid branching by eager counting... 'lineLengthVisual - 1... % 4)) - 1)'
        }
        else if (local_EDI_textByteList_bytes[sourceI] === CONST_EDI_ASCII_LINE_FEED) {
            local_EDI_lineEndPositionList_data[local_EDI_lineEndPositionList_count] = sourceI;
            // Directly stream data sequentially into the heap buffer without sorting yet
            const bufferIndex = local_EDI_lineEndPositionList_count * 2;
            local_EDI_trackingUint32MaxHeap_heap[bufferIndex] = lineLengthVisual - 1;     // length
            local_EDI_trackingUint32MaxHeap_heap[bufferIndex + 1] = local_EDI_lineEndPositionList_count; // lineIndex
            local_EDI_trackingUint32MaxHeap_lineIndexToHeapIndex[local_EDI_lineEndPositionList_count] = local_EDI_lineEndPositionList_count;
            //
            ++local_EDI_lineEndPositionList_count;
            lineLengthVisual = 0;
        }
    }

    local_EDI_lineEndPositionList_data[local_EDI_lineEndPositionList_count] = local_EDI_textByteList_count;

    // Directly stream data sequentially into the heap buffer without sorting yet
    const bufferIndex = local_EDI_lineEndPositionList_count * 2;
    local_EDI_trackingUint32MaxHeap_heap[bufferIndex] = lineLengthVisual;     // length
    local_EDI_trackingUint32MaxHeap_heap[bufferIndex + 1] = local_EDI_lineEndPositionList_count; // lineIndex
    local_EDI_trackingUint32MaxHeap_lineIndexToHeapIndex[local_EDI_lineEndPositionList_count] = local_EDI_lineEndPositionList_count;

    ++local_EDI_lineEndPositionList_count;
    editor.lineEndPositionList_count = local_EDI_lineEndPositionList_count;

    local_EDI_trackingUint32MaxHeap.heapify(local_EDI_lineEndPositionList_count);
    local_EDI_trackingUint32MaxHeap.tryPooledPeek();
    editor.longestLine_indexLine = local_EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
    editor.longestLine_length = local_EDI_trackingUint32MaxHeap.unpack_pool_length;

    // TODO: Timing of 'EDI_render_do_SetText'...
    // ...probably what you can do is invoke the inner render requests directly...
    // ...but you'd still have a moment where they can click and the event sees current layout like scrollTop etc...
    EDI_render_request(13 /*RenderKind.SetText: 13*/);
}

/**
 * @param {string} text 
 * @param {string} textSourceIdentifier I intend to have this be an absolute path. Then when the app saves a file, it can verify against the database that this absolute path is "safe" and then write to the file.
 * @param {string} lineEndString pass null (or do not include the parameter) to have line endings set to the first encountered kind in the text. Otherwise specify here. The string is used EXACTLY AS PROVIDED if non-falsey.
 */
function EDI_state_setText(text, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString) {
    if (!lineEndString) {
        const firstNewlineMatch = text.match(/\r?\n/);
        lineEndString = firstNewlineMatch ? firstNewlineMatch[0] : '\n';
    }

    const normalizedText = text.replaceAll('\r\n', '\n');
    const uint8Array = EDI_encoder.encode(normalizedText); /** how do I 'encodeInto' when a character might actually be multi-byte thus I don't ever truly know the size ahead of time? */
    let lineEndCount = countNewlines(text); // TODO: This using 'text' rather the 'normalizedText' feels upsetting at a glance.

    // TODO: add padding to this function's uint8Array.
    EDI_state_setText_byteArray(uint8Array, /*textByteLength*/ 0, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString, lineEndCount);
}

function countNewlines(sourceString) {
    let count = 0;
    let pos = sourceString.indexOf('\n');
    while (pos !== -1) {
        count++;
        pos = sourceString.indexOf('\n', pos + 1);
    }
    return count;
}

function EDI_indentMore() {
    let SMALL_pos;
    let LARGE_pos;
    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        SMALL_pos = editor.cursor_selectionAnchor;
        LARGE_pos = editor.cursor_selectionEnd;
    }
    else {
        SMALL_pos = editor.cursor_selectionEnd;
        LARGE_pos = editor.cursor_selectionAnchor;
    }

    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    // start at the LARGE position
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = editor.ret_getLineBoundaryPositions_start;
    let startingLinePos_end = editor.ret_getLineBoundaryPositions_end;
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) {
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = editor.ret_getLineBoundaryPositions_start; // TODO: This updated start value isn't actually used. Keep it for symmetry with 'startingLinePos_end'?
            startingLinePos_end = editor.ret_getLineBoundaryPositions_end; // TODO: Well actually this end value is used but you could move the if statement for 'editor.cursor_editLength_characters === 0' and just immediately set 'editor.editret_indentLess_startingLinePos_end' here...
            // ...This would avoid the symmetry issue because you updated a different value than the "end" so both values are still outdated rather than just 1.
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return;
    }

    editor.indent_SMALL_lineAndColumnIndices_indexLine = SMALL_lineAndColumnIndices_indexLine;
    editor.indent_startingIndex = startingIndex;

    if (editor.cursor_edit_eventCount_occurred === 0) {
        editor.editret_indentLess_startingLinePos_end = startingLinePos_end;
    }

    // # Update the cursor's indexColumn to reflect the inserted text
    editor.cursor_indexColumn += EDI_on_tab_bytes.length;
    editor.cursorVisualColumnIndex += EDI_on_tab_bytes.length;

    editor.cursor_edit_eventCount_occurred++;
    EDI_render_request(5 /*RenderKind.IndentMore: 5*/);
}

function EDI_indentLess() {
    // selection positions
    let SMALL_pos;
    let LARGE_pos;
    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        SMALL_pos = editor.cursor_selectionAnchor;
        LARGE_pos = editor.cursor_selectionEnd;
    }
    else {
        SMALL_pos = editor.cursor_selectionEnd;
        LARGE_pos = editor.cursor_selectionAnchor;
    }

    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    // starting index
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = editor.ret_getLineBoundaryPositions_start;
    let startingLinePos_end = editor.ret_getLineBoundaryPositions_end;
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) {
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = editor.ret_getLineBoundaryPositions_start; // TODO: This updated start value isn't actually used. Keep it for symmetry with 'startingLinePos_end'?
            startingLinePos_end = editor.ret_getLineBoundaryPositions_end; // TODO: Well actually this end value is used but you could move the if statement for 'editor.cursor_editLength_characters === 0' and just immediately set 'editor.editret_indentLess_startingLinePos_end' here...
            // ...This would avoid the symmetry issue because you updated a different value than the "end" so both values are still outdated rather than just 1.
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return;
    }

    editor.indent_SMALL_lineAndColumnIndices_indexLine = SMALL_lineAndColumnIndices_indexLine;
    editor.indent_startingIndex = startingIndex;

    if (editor.cursor_edit_eventCount_occurred === 0) {
        editor.editret_indentLess_startingLinePos_end = startingLinePos_end;
    }

    // TODO: Some kind of "fake" selection somehow because you really only need to modify the top-left most selection and the bottom-right most selection.
    // Then when you perhaps hit 'ctrl + c' to copy. You'd need to finalize the edit then and there so you copy the text correctly.
    //
    //if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
    //    editor.cursor_selectionEnd -= ORIGINAL_decrementBy;
    //}
    //else {
    //    editor.cursor_selectionAnchor -= ORIGINAL_decrementBy;
    //}

    editor.cursor_edit_eventCount_occurred++;
    EDI_render_request(6 /*RenderKind.IndentLess: 6*/);
}

/**
 * Invoking 'EDI_finalizeEdit()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 */
async function EDI_copySelection() {
    if (!EDI_cursor_hasSelection()) {
        EDI_onMouseDownDetailRankThree(0, false, editor.cursor_indexLine, editor.cursor_indexColumn);
    }
    let selectionAnchor = editor.cursor_selectionAnchor;
    let selectionEnd = editor.cursor_selectionEnd;
    let small;
    let large;
    if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
    }
    else {
        small = selectionEnd;
        large = selectionAnchor;
    }
    await window.myAPI.editorSetClipboard(EDI_textByteList_bytes, small, large - small, EDI_lineEndString);
    editor.clipboard_may_have_changed = 1;
}

/**
 * Invoking 'EDI_finalizeEdit()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 */
async function EDI_duplicateSelection() {
    if (!EDI_cursor_hasSelection()) {
        EDI_onMouseDownDetailRankThree(0, false, editor.cursor_indexLine, editor.cursor_indexColumn);
    }

    let selectionAnchor = editor.cursor_selectionAnchor;
    let selectionEnd = editor.cursor_selectionEnd;
    let small;
    let large;
    if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
    }
    else {
        small = selectionEnd;
        large = selectionAnchor;
    }

    let length = large - small;

    editor.cursor_editPosition = large;
    EDI_ret_getLineAndColumnIndices_raw(large);
    let large_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
    let large_lineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    editor.cursor_editIndexLine = large_lineAndColumnIndices_indexLine;
    editor.cursor_editIndexColumn = large_lineAndColumnIndices_indexColumn;
    editor.cursor_editLength_characters = length;
    editor.cursor_edit_eventCount_occurred++;

    editor.cursor_indexLine = large_lineAndColumnIndices_indexLine;
    editor.cursor_indexColumn = large_lineAndColumnIndices_indexColumn;
    editor.cursorVisualColumnIndex = large_lineAndColumnIndices_indexColumn;

    editor.editret_cursor_EDI_duplicate_small = small;
    editor.editret_cursor_EDI_duplicate_length = length;

    editor.cursor_selectionAnchor = large;
    editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;
    editor.cursor_selectionEnd = large + length;
    editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

    EDI_read_duplication();

    // TODO: The previous render logic was actually moving the cursor as well. Just something to keep in mind, you might see a bug related to this.
    EDI_render_request(11 /*RenderKind.DuplicateOrPaste: 11*/);
}

function EDI_paste() {
    editor.cursor_editPosition = EDI_getPositionIndex_cursor_raw();
    editor.cursor_editIndexLine = editor.cursor_indexLine;
    editor.cursor_editIndexColumn = editor.cursor_indexColumn;
    editor.cursor_edit_eventCount_occurred++;
    editor.cursor_editLength_characters = EDI_cursor_EDI_paste_clipboardContent_bytes.length;

    // TODO: The previous render logic was actually moving the cursor as well. Just something to keep in mind, you might see a bug related to this.
    // TODO: ^Moving the cursor would be done here.
    EDI_render_request(11 /*RenderKind.DuplicateOrPaste: 11*/);
}

function EDI_tabKey() {
    if (editor.cursor_edit_eventCount_occurred === 0) {
        editor.cursor_editPosition = EDI_getPositionIndex_cursor_raw();
        editor.cursor_editIndexLine = editor.cursor_indexLine;
        editor.cursor_editIndexColumn = editor.cursor_indexColumn;
    }

    editor.cursor_edit_eventCount_occurred++;

    // TODO: I probably don't want these if else statements in here long term.
    if (EDI_on_tab_bytes.length === 4) {
        // 4 space characters are being inserted.
        editor.cursorVisualColumnIndex += EDI_on_tab_bytes.length;
        editor.cursor_editLength_characters += EDI_on_tab_bytes.length;
    }
    else {
        // 1 tab character ('\t') is being inserted
        // thus match visual width of the insertion to the next tab-stop.

        // Tab Length (L) = 4 - (col (mod 4));
        let tabLengthL = 4 - (editor.cursorVisualColumnIndex % 4);
        editor.cursorVisualColumnIndex += tabLengthL;
        editor.cursor_editLength_characters += EDI_on_tab_bytes.length;
        if (editor.cursor_edit_eventCount_occurred === 1) {
            //
            // TODO: Don't do this...
            // ...but the first tab might not be a tab-width of 4.
            // Since this code exists already that gets the tabLength,
            // and editor.cursor_edit_eventCount_occurred was just incremented,
            // then if 'editor.cursor_edit_eventCount_occurred === 1' then this is the tab being typed
            // of this edit batch.
            //
            // The 'editor.cursor_editLengthVisual' isn't currently being used for
            // the tab key.
            // Thus I can store the first tab key's tabWidth in there.
            //
            // Then when finalizing the tab edit
            // I know every tab being inserted after the first is indeed a tabWidth of 4
            // so I just multiple 4 by editLength (amount of tabs to insert)
            // then I subtract 4 and then add 'editor.cursor_editLengthVisual'.
            // or something like that.
            //
            editor.cursor_editLengthVisual = tabLengthL;
        }
    }

    editor.cursor_indexColumn += EDI_on_tab_bytes.length;

    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(4 /*RenderKind.TabKey: 4*/);
}

/**
 * @param {boolean} ctrlKey 
 * @param {boolean} shiftKey 
 */
function EDI_EnterKey(ctrlKey, originalIndexLine, originalIndexColumn) {
    const lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);

    if (editor.cursor_edit_eventCount_occurred === 0) {
        editor.cursor_enterKeyEventKind = 0 /*EnterKeyEventKind.None: 0*/;
        editor.cursor_editPosition = EDI_getPositionIndex_cursor_raw();
        editor.cursor_editIndexLine = editor.cursor_indexLine;
        editor.cursor_editIndexColumn = editor.cursor_indexColumn;
    }

    if (editor.cursor_enterKeyEventKind === 0) {
        if (editor.cursor_indexColumn === 0 && lastValidIndexColumn !== 0) {
            editor.cursor_enterKeyEventKind = 1 /*EnterKeyEventKind.StartOfLine: 1*/;
        }
        else {
            if (lastValidIndexColumn === editor.cursor_indexColumn) {
                if (editor.cursor_editPosition === editor.textByteList_count) {
                    editor.cursor_enterKeyEventKind = 6 /*EnterKeyEventKind.EndOfFile: 6*/;
                }
                else {
                    editor.cursor_enterKeyEventKind = 4 /*EnterKeyEventKind.EndOfLine: 4*/;
                }
            }
            else {
                editor.cursor_enterKeyEventKind = 3 /*EnterKeyEventKind.AmongALine: 3*/;
            }
        }
    }

    if (!ctrlKey)
        editor.cursor_indexLine++;

    if (!EDI_cursor_enterKey_newLinePlusIndentation_byteList)
        EDI_cacheIndentation(originalIndexLine, originalIndexColumn, lastValidIndexColumn);

    const insertionCount = EDI_cursor_enterKey_newLinePlusIndentation_byteList.length;

    editor.cursor_indexColumn = insertionCount - 1; // minus the newline
    editor.cursorVisualColumnIndex = editor.cursor_cached_indentation_string_visualWidth; // the indentation_string doesn't include the newline
    editor.cursor_editLength_characters += insertionCount;
    editor.cursor_editLineFeedCount++;
    editor.cursor_edit_eventCount_occurred++;

    editor.cursor_END_editIndexLine = editor.cursor_indexLine;
    editor.cursor_END_editIndexColumn = editor.cursor_indexColumn;

    EDI_render_request(10 /*RenderKind.Enter: 10*/);
}

/**
 * @returns 
 */
function EDI_removeSelection() {
    if (editor.cursor_editKind != 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }

    let smallPosition;
    let largePosition;
    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        smallPosition = editor.cursor_selectionAnchor;
        largePosition = editor.cursor_selectionEnd;
    }
    else {
        smallPosition = editor.cursor_selectionEnd;
        largePosition = editor.cursor_selectionAnchor;
    }

    editor.editret_RemoveSelection_smallPosition = smallPosition;
    editor.editret_RemoveSelection_largePosition = largePosition;

    editor.cursor_selectionAnchor = 0;
    editor.cursor_selectionIndexAnchorColumnVISUAL = 0;
    editor.cursor_selectionEnd = 0;
    editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

    let editLength = largePosition - smallPosition;
    // editLength is 0 in this ...startEdit invocation intentionally, you cannot set the editLength until the end (TODO: remember what the exact reason was and put it here... I think it was because 'EDI_readLineEndPositionList' function is used rather than reading directly)
    EDI_startEdit(4 /*EditKind.RemoveTextNoBatching: 4*/, smallPosition, /*editLength*/ 0);

    EDI_ret_getLineAndColumnIndices_raw(smallPosition);
    let smallLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
    let smallLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    editor.editret_RemoveSelection_smallLineAndColumnIndices_small_indexLine = smallLineAndColumnIndices_indexLine;
    editor.editret_RemoveSelection_smallLineAndColumnIndices_small_indexColumn = smallLineAndColumnIndices_indexColumn;
    // TODO: Why is this set twice (seemingly redundantly) #EDI_removeSelection() (1 of 2)
    editor.cursor_indexLine = smallLineAndColumnIndices_indexLine;
    editor.cursor_indexColumn = smallLineAndColumnIndices_indexColumn;
    editor.cursorVisualColumnIndex = smallLineAndColumnIndices_indexColumn;
    editor.cursor_editIndexLine = smallLineAndColumnIndices_indexLine;
    editor.cursor_editIndexColumn = smallLineAndColumnIndices_indexColumn;

    EDI_ret_getLineAndColumnIndices_raw(largePosition);
    let largeLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
    let largeLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    editor.cursor_END_editIndexLine = largeLineAndColumnIndices_indexLine;
    editor.cursor_END_editIndexColumn = largeLineAndColumnIndices_indexColumn;

    // TODO: Why is this set twice (seemingly redundantly) #EDI_removeSelection() (2 of 2)
    editor.cursor_indexLine = smallLineAndColumnIndices_indexLine;
    editor.cursor_indexColumn = smallLineAndColumnIndices_indexColumn;
    editor.cursorVisualColumnIndex = smallLineAndColumnIndices_indexColumn;

    editor.cursor_editLength_characters = editLength;
    editor.cursor_edit_eventCount_occurred++;

    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;

    EDI_render_request(9 /*RenderKind.RemoveSelection: 9*/);
}

function EDI_state_do_Delete(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
        return;
    }

    let virtual_cursorIndexLine = editor.cursor_indexLine + editor.cursor_editLineFeedCount;

    let virtual_cursorIndexColumn = editor.cursor_editLength_characters - editor.cursor_edit_flagLineChanged;

    let lineEnd = EDI_getLineEnd_pos_raw(virtual_cursorIndexLine);
    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(virtual_cursorIndexLine);

    // You might have to finalize when moving the cursor from this scenario though with ArrowAaa or mousedown
    // not necessarily impossible long term but short term you're gonna make a mess with this...
    // but it worth it?

    if (virtual_cursorIndexColumn === lastValidIndexColumn) {
        if (virtual_cursorIndexLine < editor.lineEndPositionList_count - 1) {

            // flag the current editlength whenever u change lines so you can check the editlength relative to the line

            editor.cursor_editLength_characters++;
            editor.cursor_editLineFeedCount++;
            EDI_lineEndPositionList_PENDING.insert(EDI_lineEndPositionList_PENDING.count, lineEnd);

            editor.cursor_edit_flagLineChanged = editor.cursor_editLength_characters;
        }
        else { // End of file
            return;
        }
    }
    else {

        // TODO: All in all I think you should just use the "visual corruption" logic that you have somewhere else in this file...
        // ...delete as if everything is a width of 1
        // ...if you see a tab you set a boolean
        // ...when done deleting everything if you check the boolean and it says you saw a tab you throw away the visual measurements and just "RESET" calculate it.
        //
        // TODO: no that isn't correct...
        // The problem with tabs is movement from right to left.
        // Delete key is left to right
        // You gotta look into every detail of this cause you don't fully remember all the details.
        // I do think there is something problematic with delete key but maybe you can solve it without a "RESET" due to the movement being left to right.

        if (event.ctrlKey) {
            // editor.cursor_editPosition is intended to be equal due to the batch requirements / a new edit would also be equal.
            let tempIndexColumn = editor.cursor_indexColumn;
            let tempPosition = editor.cursor_editPosition;

            let originalCharacterKind;
            if (tempIndexColumn < lineEnd) {
                originalCharacterKind = EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[tempPosition]));
            }
            else {
                originalCharacterKind = 0 /*CharacterKind.None: 0*/;
            }

            let thisCharacterKind = 0 /*CharacterKind.None: 0*/;

            tempIndexColumn++;
            tempPosition++;
            editor.cursor_editLength_characters++;

            while (editor.cursor_indexColumn < lastValidIndexColumn) {
                if (tempIndexColumn < lineEnd) {
                    thisCharacterKind = EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[tempPosition]));
                }
                else {
                    thisCharacterKind = 0 /*CharacterKind.None: 0*/;
                }
                if (thisCharacterKind !== originalCharacterKind) {
                    break;
                }
                tempIndexColumn++;
                tempPosition++;
                editor.cursor_editLength_characters++;
            }

            EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition);
            EDI_ret_getLineBoundaryPositions_raw(editor.ret_getLineAndColumnIndices_indexLine);
            EDI_ret_getIndexFromColumn_sameLine_newRxIsLarger(
                tempIndexColumn, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end, editor.cursor_indexColumn, editor.cursorVisualColumnIndex);
            let columnVisual = editor.ret_getIndexFromX_visualColumns;
            editor.cursor_editLengthVisual += columnVisual - editor.cursorVisualColumnIndex;
        }
        else {
            // TODO: When a single delete key (non ctrl) causes a tab of length <4 to fall into a slot of 4 your (visual length of a line tracking) code breaks.
            //
            // subTODO: I wrote an example of the above TODO but it actually is describing something else.
            //          it is saying "a\t\t" delete 'a'
            // Example of the above TODO:
            // 3widthTab 4widthTab
            // delete event for 3widthTab
            // 4widthTab becomes a 3widthTab
            // delete event for the tab that became a 3widthTab
            //
            // erroneous: (delete 3widthTab) + (delete 3widthTab) => visual width edit of 6
            // reality:   (delete 3widthTab) + (delete 4widthTab) => visual width edit of 7
            //
            // Further explanation: consider if instead of pressing two distinct delete key events, you had pressed Ctrl + Delete.
            // 
            // TODO: You can fix this by doing some sort of reset-ish calculation for consecutive delete key presses that batch you recalculate the entire visual length instead of appending to a previous.

            editor.cursor_editLength_characters++;
            editor.cursor_editLengthVisual++;
            if (EDI_textByteList_bytes[editor.cursor_editPosition] === CONST_EDI_ASCII_TAB) {
                let tabLength = 4 - (editor.cursorVisualColumnIndex % 4);
                editor.cursor_editLengthVisual += (tabLength - 1);
            }
        }
    }

    editor.cursor_edit_eventCount_occurred++;
    EDI_render_request(8 /*RenderKind.DeleteLtr: 8*/);
}

/**
 * @param {*} event 
 * @returns 
 */
function EDI_deleteDo(event) {
    EDI_state_do_Delete(event);
}

function EDI_state_do_Backspace(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
        return;
    }

    if (editor.cursor_indexColumn === 0) {
        if (editor.cursor_indexLine > 0) {

            // TODO: this logic is extremely suspect given editIndexLine and editIndexColumn...
            // ...as well if you move the cursor during a pending edit then finalize does it edit the correct positions?
            //
            // wrap to previous line
            editor.cursor_indexLine--;
            editor.cursor_indexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);
            editor.cursorVisualColumnIndex = editor.cursor_indexColumn;
            editor.cursor_editPosition--;
            editor.cursor_editLength_characters++;
            editor.cursor_editIndexLine = editor.cursor_indexLine;
            editor.cursor_editIndexColumn = editor.cursor_indexColumn;

            editor.cursor_editLineFeedCount++;
            EDI_lineEndPositionList_PENDING.insert(0, editor.cursor_editPosition);
        }
        else {
            return;
        }
    }
    else {
        if (event.ctrlKey) {
            // editor.cursor_editPosition is intended to be equal due to the batch requirements / a new edit would also be equal.
            let originalCharacterKind = EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[editor.cursor_editPosition - 1]));
            editor.cursor_editPosition--;
            editor.cursor_editIndexColumn--;
            editor.cursor_editLength_characters++;
            editor.cursor_indexColumn--;

            while (editor.cursor_indexColumn > 0) {
                if (EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[editor.cursor_editPosition - 1])) !== originalCharacterKind) {
                    break;
                }
                editor.cursor_editPosition--;
                editor.cursor_editIndexColumn--;
                editor.cursor_editLength_characters++;
                editor.cursor_indexColumn--;
            }

            EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition);
            EDI_ret_getLineBoundaryPositions_raw(editor.ret_getLineAndColumnIndices_indexLine);
            EDI_ret_getIndexFromColumn_RESET(editor.cursor_indexColumn, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
            let columnVisual = editor.ret_getIndexFromX_visualColumns;

            editor.cursor_editLengthVisual += (editor.cursorVisualColumnIndex - columnVisual);
            editor.cursorVisualColumnIndex = columnVisual;
        }
        else {

            // TODO: I'm getting the sense that all visual updates should just be done immediately?...
            // ...but maybe it is sufficient to say that any multiline edits
            // the first and last line are the only ones that need to be updated
            // so doing a full reset for their visual length isn't the end of the world
            // no matter how many lines you selected it only is the first and last cause
            // any line between doesn't exist any more.

            editor.cursor_editPosition -= 1;
            editor.cursor_editIndexColumn -= 1;
            editor.cursor_editLength_characters++;
            editor.cursor_editLengthVisual++;
            editor.cursor_indexColumn -= 1;
            editor.cursorVisualColumnIndex--;
            if (EDI_textByteList_bytes[editor.cursor_editPosition] === CONST_EDI_ASCII_TAB) {
                // Undo the default path to avoid branching on default path
                editor.cursor_editLengthVisual--;
                editor.cursorVisualColumnIndex++;

                // Now actually get the correct answer for tabs
                EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition);
                EDI_ret_getLineBoundaryPositions_raw(editor.ret_getLineAndColumnIndices_indexLine);
                EDI_ret_getIndexFromColumn_RESET(editor.cursor_indexColumn, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
                let columnVisual = editor.ret_getIndexFromX_visualColumns;

                editor.cursor_editLengthVisual += (editor.cursorVisualColumnIndex - columnVisual);
                editor.cursorVisualColumnIndex = columnVisual;
            }
        }
    }

    editor.cursor_edit_eventCount_occurred++;
    EDI_render_request(7 /*RenderKind.BackspaceRtl: 7*/);
}

/**
 * @param {*} event 
 * @returns 
 */
function EDI_backspaceDo(event) {
    EDI_state_do_Backspace(event);

    // EDI_render_request(RenderKind.BackspaceRtl);
    //
    // This is too confusing for me to read given my current mood / energy levels. (I tell myself it is just my current mood / energy levels to cope with my incompetence)
    // I'm just gonna isolate the code that doesn't remove a lineEnd and get that part working with 'EDI_render_request(RenderKind.BackspaceRtl);'
    // first.

    // I'm exhausted I'll probably do non-lineEnd delete key then be done
}

/**
 * @param {string} character 
 */
function EDI_insertDo(character) {
    EDI_cursor_textInsertionBuffer[editor.cursor_textInsertionBufferCount] = character.charCodeAt(0);
    editor.cursor_textInsertionBufferCount++;

    editor.cursor_edit_eventCount_occurred++;
    editor.cursor_editLength_characters++;
    editor.cursor_indexColumn++;
    editor.cursorVisualColumnIndex++;
}

//#region editEvent
/**
 * @param {*} clipboardContent This is a temporary hack to help in transitioning paste to an edit.
 */
export function EDI_editEvent(editKind, event) {
    // check for pending => selection
    // if so then finalize all current pending
    // ...this actually is checking for selection, then presuming at least 1 cursor has a pending...
    let shouldFinalizeAllCursors = false;
    let atLeastOneCursorHasASelection = false;
    if (EDI_cursor_hasSelection()) {
        shouldFinalizeAllCursors = true;
        atLeastOneCursorHasASelection = true;
    }
    if (shouldFinalizeAllCursors) {

        shouldFinalizeAllCursors = false;

        if ((editKind === 5 /*EditKind.Tab: 5*/ && editor.cursor_editKind === 6 /*EditKind.IndentMore: 6*/) ||
            (editKind === 5 /*EditKind.Tab: 5*/ && editor.cursor_editKind === 7 /*EditKind.IndentLess: 7*/ && event.shiftKey)) {

            // TODO: IndentLess when no selection however shiftTab then it does indentLess even still but I haven't gone out of the way to handle that hack...
            // ...maybe it'll be covered maybe it won't.

            // TODO: Rewrite this if statement (it is a hack for the moment while I get indent more of a single cursor to batch)
        }
        else {
            EDI_finalizeEdit();
        }
    }

    // If you have delete/backspace you need to ONLY remove the selection if it exists not remove selection then delete/backspace
    // but insert needs to remove selection AND insert.
    if (editKind === 1 /*EditKind.InsertLtr: 1*/ || editKind === 8 /*EditKind.Enter: 8*/ || editKind === 9 /*EditKind.Paste: 9*/) {
        // check for EditKind.None => selection
        // if so then attempt to remove selection foreach cursor
        // then finalize all those newly made selection removal edits
        if (atLeastOneCursorHasASelection) {
            shouldFinalizeAllCursors = true;
            if (EDI_cursor_hasSelection()) {
                EDI_removeSelection();
            }
        }
        if (shouldFinalizeAllCursors) {
            shouldFinalizeAllCursors = false;
            EDI_finalizeEdit();
        }
    }

    // check for NOTcanBatch... I don't want the switch in the for loop... if you have a selection then you have a not can batch?
    //
    // NOTcanBatch is bothersome to read, canBatch is a possibility?
    // 
    // The perspective of "NOTcanBatch" is confusing.
    // I thought this switch was over the current editKind.
    //
    // And the current editKind was checking whether the incoming event could batch with it.
    //
    // what this actually says is something like "the incoming event is checking whether the current editKind could batch with it"
    //
    // "current editKind"/"pending editKind"/"previous_and_not_yet_finalized editKind"
    //
    // TODO: this switch is missing RemoveTextNoBatching, I guess it makes sense cause 'NoBatching' but idk
    //
    switch (editKind) {
        case 1 /*EditKind.InsertLtr: 1*/:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_insert();
            break;
        case 2 /*EditKind.DeleteLtr: 2*/:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_delete();
            break;
        case 3 /*EditKind.BackspaceRtl: 3*/:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_backspace();
            break;
        case 5 /*EditKind.Tab: 5*/:
            // yeah "aaaa\t" all as one "edit" crashed the app
            shouldFinalizeAllCursors = EDI_editEvent_checkFor_NOTcanBatch_Tab(event);
            break;
        case 6 /*EditKind.IndentMore: 6*/:
            shouldFinalizeAllCursors = EDI_editEvent_checkFor_NOTcanBatch_IndentMore();
            break;
        case 7 /*EditKind.IndentLess: 7*/:
            shouldFinalizeAllCursors = EDI_editEvent_checkFor_NOTcanBatch_IndentLess();
            break;
        case 8 /*EditKind.Enter: 8*/:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_enter();
            break;
        case 9 /*EditKind.Paste: 9*/:
            shouldFinalizeAllCursors = true;
            break;
        case 10 /*EditKind.Duplicate: 10*/:
            shouldFinalizeAllCursors = true;
            break;
        default:
            throw new Error(`The EditKind:${editKind} was not recognized.`);
    }
    if (shouldFinalizeAllCursors) {
        shouldFinalizeAllCursors = false;
        EDI_finalizeEdit();
    }

    // start/continue edit... I don't want the switch in the for loop
    switch (editKind) {
        case 1 /*EditKind.InsertLtr: 1*/:
            EDI_editEvent_theEditIself_InsertLtr(event);
            break;
        case 2 /*EditKind.DeleteLtr: 2*/:
            EDI_editEvent_theEditIself_DeleteLtr(event);
            break;
        case 3 /*EditKind.BackspaceRtl: 3*/:
            EDI_editEvent_theEditIself_BackspaceRtl(event);
            break;
        case 5 /*EditKind.Tab: 5*/:
            EDI_editEvent_theEditIself_Tab(event);
            break;
        case 8 /*EditKind.Enter: 8*/:
            EDI_editEvent_theEditIself_Enter(event);
            break;
        case 9 /*EditKind.Paste: 9*/:
            EDI_editEvent_theEditIself_Paste();
            break;
        case 10 /*EditKind.Duplicate: 10*/:
            EDI_editEvent_theEditIself_Duplicate();
            break;
        default:
            throw new Error(`The EditKind:${editKind} was not recognized.`);
    }
}

function EDI_editEvent_theEditIself_InsertLtr(event) {
    // You can do this because the function 'EDI_NOTcanBatch_insert' was already checked for all the cursors, if it is possible to batch, the editKind will stay InsertLtr otherwise it is finalized and set to None.
    // TODO: Use if === EditKind.None for copy and paste safety / it might just even be more readable
    if (editor.cursor_editKind !== 1 /*EditKind.InsertLtr: 1*/) {
        EDI_startEdit(1 /*EditKind.InsertLtr: 1*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    EDI_insertDo(event.key);
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    EDI_render_request(3 /*RenderKind.InsertLtr: 3*/);
}

function EDI_editEvent_theEditIself_DeleteLtr(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
    }
    else {
        if (editor.cursor_editKind !== 2 /*EditKind.DeleteLtr: 2*/) {
            EDI_startEdit(2 /*EditKind.DeleteLtr: 2*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
        }
        EDI_deleteDo(event);
    }
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

function EDI_editEvent_theEditIself_BackspaceRtl(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
    }
    else {
        if (editor.cursor_editKind !== 3 /*EditKind.BackspaceRtl: 3*/) {
            EDI_startEdit(3 /*EditKind.BackspaceRtl: 3*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
        }
        EDI_backspaceDo(event);
        editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    }
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

function EDI_editEvent_theEditIself_Tab(event) {
    if (EDI_cursor_hasSelection()) {
        if (event.shiftKey) {
            if (editor.cursor_editKind !== 7 /*EditKind.IndentLess: 7*/) {
                EDI_startEdit(7 /*EditKind.IndentLess: 7*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_indentLess();
        }
        else {
            if (editor.cursor_editKind !== 6 /*EditKind.IndentMore: 6*/) {
                EDI_startEdit(6 /*EditKind.IndentMore: 6*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_indentMore();
        }
    }
    else {
        if (event.shiftKey) {
            EDI_onMouseDownDetailRankThree(0, false, editor.cursor_indexLine, editor.cursor_indexColumn);
            if (editor.cursor_editKind !== 7 /*EditKind.IndentLess: 7*/) {
                EDI_startEdit(7 /*EditKind.IndentLess: 7*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_indentLess();
        }
        else {
            if (editor.cursor_editKind !== 5 /*EditKind.Tab: 5*/) {
                EDI_startEdit(5 /*EditKind.Tab: 5*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_tabKey();
        }
    }
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

function EDI_editEvent_theEditIself_Enter(event) {
    const originalIndexLine = editor.cursor_indexLine;
    const originalIndexColumn = editor.cursor_indexColumn;

    if (editor.cursor_editKind !== 8 /*EditKind.Enter: 8*/) {
        if (event.ctrlKey) {
            if (editor.cursor_indexColumn !== 0) {
                editor.cursor_indexColumn = 0;
            }
        }
        else if (event.shiftKey) {
            const lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);
            if (editor.cursor_indexColumn !== lastValidIndexColumn) {
                editor.cursor_indexColumn = lastValidIndexColumn;
            }
        }
        EDI_startEdit(8 /*EditKind.Enter: 8*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }

    EDI_EnterKey(event.ctrlKey, originalIndexLine, originalIndexColumn);
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

function EDI_editEvent_theEditIself_Paste() {
    if (editor.cursor_editKind !== 8 /*EditKind.Enter: 8*/) {
        EDI_startEdit(9 /*EditKind.Paste: 9*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    EDI_paste();
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

function EDI_editEvent_theEditIself_Duplicate() {
    if (editor.cursor_editKind !== 10 /*EditKind.Duplicate: 10*/) {
        EDI_startEdit(10 /*EditKind.Duplicate: 10*/, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    EDI_duplicateSelection();
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_insert() {
    return editor.cursor_editKind != 1 /*EditKind.InsertLtr: 1*/ ||
        editor.cursor_indexLine !== editor.cursor_editIndexLine ||
        editor.cursor_indexColumn !== editor.cursor_editIndexColumn + editor.cursor_editLength_characters ||
        editor.cursor_editLength_characters >= CONST_EDI_cursor_GAP_BUFFER_CAPACITY ||
        EDI_cursor_hasSelection();
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_enter() {
    return editor.cursor_enterKeyEventKind === 0 /*EnterKeyEventKind.None: 0*/ ||
        editor.cursor_editKind !== 8 /*EditKind.Enter: 8*/ ||
        editor.cursor_indexLine !== editor.cursor_END_editIndexLine ||
        editor.cursor_indexColumn !== editor.cursor_END_editIndexColumn ||
        editor.cursor_editLength_characters >= CONST_EDI_cursor_GAP_BUFFER_CAPACITY ||
        !EDI_cursor_enterKey_newLinePlusIndentation_byteList ||
        EDI_cursor_hasSelection();
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_backspace() {
    return editor.cursor_editKind != 3 /*EditKind.BackspaceRtl: 3*/ ||
        editor.cursor_indexLine !== editor.cursor_editIndexLine ||
        editor.cursor_indexColumn !== editor.cursor_editIndexColumn ||
        EDI_cursor_hasSelection();
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_delete() {
    return editor.cursor_editKind != 2 /*EditKind.DeleteLtr: 2*/ ||
        editor.cursor_indexLine !== editor.cursor_editIndexLine ||
        editor.cursor_indexColumn !== editor.cursor_editIndexColumn ||
        EDI_cursor_hasSelection();
}

/** @returns {boolean} 'shouldFinalizeAllCursors' */
function EDI_editEvent_checkFor_NOTcanBatch_Tab(event) {
    if (EDI_cursor_hasSelection() && !event.shiftKey) {
        return EDI_editEvent_checkFor_NOTcanBatch_IndentMore();
    }
    else if (EDI_cursor_hasSelection() && event.shiftKey) {
        // TODO: write 'if (EDI_cursor_hasSelection())' then nest these in the same wrapping if statement.
        return EDI_editEvent_checkFor_NOTcanBatch_IndentLess();
    }
    else if (!EDI_cursor_hasSelection()) {
        if (event.shiftKey) {
            return EDI_editEvent_checkFor_NOTcanBatch_IndentLess();
        }
        else {
            if (editor.cursor_editKind === 5 /*EditKind.Tab: 5*/ &&
                editor.cursor_editIndexLine === editor.cursor_indexLine &&
                editor.cursor_editIndexColumn + editor.cursor_editLength_characters === editor.cursor_indexColumn &&
                editor.cursor_editLength_characters < CONST_EDI_cursor_GAP_BUFFER_CAPACITY) {
                return false;
            }
        }
    }

    return true;
}

/**
 * @returns {boolean} 'shouldFinalizeAllCursors'
 * 
 * TODO: This function never is "naturally" invoked because all tab keypresses start with a 'Tab' edit event and only convert to indentMore downstream
 * 
 */
function EDI_editEvent_checkFor_NOTcanBatch_IndentMore() {
    if (editor.cursor_editKind !== 6 /*EditKind.IndentMore: 6*/) {
        return true;
    }

    let SMALL_pos;
    let LARGE_pos;
    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        SMALL_pos = editor.cursor_selectionAnchor;
        LARGE_pos = editor.cursor_selectionEnd;
    }
    else {
        SMALL_pos = editor.cursor_selectionEnd;
        LARGE_pos = editor.cursor_selectionAnchor;
    }

    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    // start at the LARGE position
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = editor.ret_getLineBoundaryPositions_start;
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) { // TODO: This if statement is NOT used in this specific case. It was copy and pasted from somewhere that it IS used, i.e.: TODO: remove it from this function?
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = editor.ret_getLineBoundaryPositions_start
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return true;
    }

    if (editor.indent_SMALL_lineAndColumnIndices_indexLine === SMALL_lineAndColumnIndices_indexLine &&
        editor.indent_startingIndex === startingIndex) {
        return false;
    }

    // TODO: if "editor.cursor_editLength_characters" > "..." then finalize the edit? or no limit on edit length per batch for indent more?...
    // ...maybe there already is one idk

    return true;
}

/**
 * @returns {boolean} 'shouldFinalizeAllCursors'
 * 
 * TODO: This function never is "naturally" invoked because all tab keypresses start with a 'Tab' edit event and only convert to indentLess downstream
 * 
 */
function EDI_editEvent_checkFor_NOTcanBatch_IndentLess() {
    if (editor.cursor_editKind !== 7 /*EditKind.IndentLess: 7*/) {
        return true;
    }

    let SMALL_pos;
    let LARGE_pos;
    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        SMALL_pos = editor.cursor_selectionAnchor;
        LARGE_pos = editor.cursor_selectionEnd;
    }
    else {
        SMALL_pos = editor.cursor_selectionEnd;
        LARGE_pos = editor.cursor_selectionAnchor;
    }

    // TODO: You could probably have cache for these things too, like if the batch is "complex" to calculate you cache some of the repeated computation.
    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;

    // start at the LARGE position
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = editor.ret_getLineBoundaryPositions_start;
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) { // TODO: This if statement is NOT used in this specific case. It was copy and pasted from somewhere that it IS used, i.e.: TODO: remove it from this function?
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = editor.ret_getLineBoundaryPositions_start;
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return;
    }

    if (editor.indent_SMALL_lineAndColumnIndices_indexLine === SMALL_lineAndColumnIndices_indexLine &&
        editor.indent_startingIndex === startingIndex) {
        return false;
    }

    // TODO: if "editor.cursor_editLength_characters" > "..." then finalize the edit? or no limit on edit length per batch for indent less?...
    // ...maybe there already is one idk

    return true;
}
//#endregion

//#region finalize
/**
 * TODO: Exception during finalize softlocks the editor because you can't even clear to reset the state: 'Uncaught (in promise) Error: removeAt(...): index > this.count'
 * 
 * Retrospectively I'd say... I imagine there'd be more than one scenario of this I have a lot of 'critical booleans'.
 * i.e.: if you enter the 'critical boolean guarded code path' then throw an exception in the middle of that code path with bad state for the 'critical boolean guarded code path' you might never be able to enter it again.
 * i.e.: I don't see this happen myself unless I'm messing with new code and running the code that I am in progress of writing. But I don't have a try catch so if an error were to occur it'd completely softlock things.
 */
function EDI_finalizeEdit() {
    /**
     * Later code needs to know the line index that the removal occurred on.
     * In a naive approach, presume every edit only spans a single line.
     * Then reversing backwards gets you the first line index that "fits" the edit and thus the line index the edit occurred on.
     * 
     * If for whatever reason the first time around this loop fails, then you never decremented so you wouldn't increment to restore
     * the iteration variable to the previous loop's state.
     */
    let indexLine_editOccurredOn = -1;

    switch (editor.cursor_editKind) {
        case 1 /*EditKind.InsertLtr: 1*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_InsertLtr(indexLine_editOccurredOn);
            break;
        case 8 /*EditKind.Enter: 8*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_Enter(indexLine_editOccurredOn);
            return;
        case 5 /*EditKind.Tab: 5*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_Tab(indexLine_editOccurredOn);
            return;
        case 6 /*EditKind.IndentMore: 6*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_IndentMore(indexLine_editOccurredOn);
            return;
        case 7 /*EditKind.IndentLess: 7*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_IndentLess(indexLine_editOccurredOn);
            break;
        case 9 /*EditKind.Paste: 9*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_Paste(indexLine_editOccurredOn);
            return;
        case 10 /*EditKind.Duplicate: 10*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_Duplicate(indexLine_editOccurredOn);
            return;
        case 2 /*EditKind.DeleteLtr: 2*/:
        case 3 /*EditKind.BackspaceRtl: 3*/:
        case 4 /*EditKind.RemoveTextNoBatching: 4*/:
            indexLine_editOccurredOn = EDI_finalizeEdit_DeleteLtr_BackspaceRtl_RemoveTextNoBatching(indexLine_editOccurredOn);
            break;
    }
}

function EDI_finalizeEdit_InsertLtr(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_InsertLtr();
    }

    // given the current state of the following for loop, you do indeed need this set to 0 otherwise the 0th line will not track visual length properly cause it'll try to update a line index of '-1' in the heap.
    indexLine_editOccurredOn = 0;
    for (let i = editor.lineEndPositionList_count - 1; i >= 0; i--) {
        if (editor.cursor_editPosition <= EDI_lineEndPositionList_data[i]) {
            EDI_lineEndPositionList_data[i] += editor.cursor_editLength_characters;
        }
        else {
            if (i === editor.lineEndPositionList_count - 1) {
                indexLine_editOccurredOn = i;
            }
            else {
                indexLine_editOccurredOn = i + 1;
            }
            break;
        }
    }
    EDI_textByteList_insertBytes(editor.cursor_editPosition, EDI_cursor_textInsertionBuffer, /*offset*/ 0, /*length*/ editor.cursor_textInsertionBufferCount);
    // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
    if (editor.styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(editor.cursor_editPosition, new Uint8Array(editor.cursor_textInsertionBufferCount), 0, editor.cursor_textInsertionBufferCount);
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(editor.cursor_editPosition, EDI_cursor_textInsertionBuffer.subarray(0, editor.cursor_textInsertionBufferCount));

    EDI_trackingUint32MaxHeap.updateLength_diff(indexLine_editOccurredOn, editor.cursor_editLength_characters);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
        editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
        editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
        requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_Enter(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_EnterKey();
    }

    // throws an exception if 'EnterKeyEventKind.None' (...or falsey).
    if (!editor.cursor_enterKeyEventKind || editor.cursor_enterKeyEventKind === 0 /*EnterKeyEventKind.None: 0*/) { EDI_finalizeEdit_ClearEditState(); throw new Error('if (!enterKeyEventKind...)'); }

    const per_edit_insertionCount = EDI_cursor_enterKey_newLinePlusIndentation_byteList.length;

    let actualEditPosition = editor.cursor_editPosition;
    let actualLineFeedPosition = actualEditPosition;
    let actualIndexLine = editor.cursor_editIndexLine;
    let actualNewLineVisualWidth = editor.cursor_cached_indentation_string_visualWidth;

    let specialCase_number = 0;
    let specialCase_firstLineIndexInserted = 0; // TODO: This is probably the lineIndex you end up on after the loop minus some number, maybe 'editor.cursor_editLineFeedCount'.

    if (editor.cursor_enterKeyEventKind === 4 /*EnterKeyEventKind.EndOfLine: 4*/) {
        actualEditPosition++; // Move past the current line's '\n'
        actualLineFeedPosition = actualEditPosition;
        actualLineFeedPosition += per_edit_insertionCount - 1;
        actualIndexLine++;
    }
    else if (editor.cursor_enterKeyEventKind === 6 /*EnterKeyEventKind.EndOfFile: 6*/) {
        specialCase_firstLineIndexInserted = actualIndexLine;
        const lastLineIndex = editor.lineEndPositionList_count - 1;
        specialCase_number = EDI_trackingUint32MaxHeap.getLength(lastLineIndex);
        EDI_trackingUint32MaxHeap.updateLength(lastLineIndex, actualNewLineVisualWidth);
    }
    else if (editor.cursor_enterKeyEventKind === 1 /*EnterKeyEventKind.StartOfLine: 1*/) {
        // Contrary to 'EnterKeyEventKind.EndOfLine' this case actually does NOT have to move past the "current line's '\n'"
        // NOTE: Ctrl + Enter keybind is a known case for why this line of code is needed, perhaps there are more that will come later I have no idea.
        actualLineFeedPosition += per_edit_insertionCount - 1;
    }
    else if (editor.cursor_enterKeyEventKind === 3 /*EnterKeyEventKind.AmongALine: 3*/) {
        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_editIndexLine);
        const lineStart = editor.ret_getLineBoundaryPositions_start;
        const lineEnd = editor.ret_getLineBoundaryPositions_end;
        EDI_ret_getIndexFromColumn_RESET(editor.cursor_editIndexColumn, lineStart, lineEnd);
        let firstSplitVisualWidth = editor.ret_getIndexFromX_visualColumns;
        let lastValidIndexColumn = lineEnd - lineStart;
        EDI_ret_getIndexFromColumn_sameLine_newRxIsLarger(
            lastValidIndexColumn,
            lineStart,
            lineEnd,
            editor.cursor_editIndexColumn,
            firstSplitVisualWidth);
        let lastSplitVisualWidth = editor.ret_getIndexFromX_visualColumns - firstSplitVisualWidth;
        EDI_trackingUint32MaxHeap.updateLength(editor.cursor_editIndexLine, actualNewLineVisualWidth + lastSplitVisualWidth);
        specialCase_firstLineIndexInserted = actualIndexLine;
        specialCase_number = firstSplitVisualWidth;
    }

    for (var i = actualIndexLine; i < editor.lineEndPositionList_count; i++) {
        EDI_lineEndPositionList_data[i] += editor.cursor_editLength_characters;
    }

    let bytes = EDI_cursor_enterKey_newLinePlusIndentation_byteList;
    const per_edit_length = bytes.length;
    let length = per_edit_length;

    if (editor.cursor_editLineFeedCount > 1) {
        length *= editor.cursor_editLineFeedCount;
        const src_bytes = bytes;
        bytes = new Uint8Array(length);
        // TODO: typed array function usage
        for (let i = 0; i < length; i += per_edit_length) {
            // TODO: Why is this not using 'bytes.set(src_bytes, i)'?
            for (let k = 0; k < per_edit_length; k++) {
                bytes[i + k] = src_bytes[k];
            }
        }
    }

    EDI_textByteList_insertBytes(actualEditPosition, bytes, /*offset*/ 0, length);
    // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
    if (editor.styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(actualEditPosition, new Uint8Array(bytes.length), 0, bytes.length);
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(actualEditPosition, bytes);

    // TODO: bulk insertion of lines
    for (let i = 0; i < editor.cursor_editLineFeedCount; i++) {
        EDI_lineEndPositionList_insert(actualIndexLine, actualLineFeedPosition, actualNewLineVisualWidth);
        actualIndexLine++;
        actualLineFeedPosition += per_edit_insertionCount;
    }

    if (editor.cursor_enterKeyEventKind === 6 /*EnterKeyEventKind.EndOfFile: 6*/) {
        EDI_trackingUint32MaxHeap.updateLength(specialCase_firstLineIndexInserted, specialCase_number);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            // "aaa\n" => 'EDI_lineEndPositionList_insert' causes a temporary longest line index is 1 and the longest line length is 0
            // that needs to be overwritten.
            // The example is "as you type it" so the '\n' gets finalized and that's when you see the wrong answer it is only temporary due to 'EDI_lineEndPositionList_insert'.
            //
            // TODO: This should be looked into a bit more?
            //
            // Of course this is happening updateLength doesn't draw the UI?
            // 
            // yeah cause you lost the longest line temporarily you moved it into the specialCase variables.
            // Then updated the EOF to have the length of the indentation.
            // So then EDI_lineEndPositionList_insert(...) internally updates the UI and it doesn't see the "specialCase variable's visual length existing in the heap" anymore
            // and it took the line you just added like if both end up 0 it's just w/e the algorithm picked one or the other due to some tiebreaker cause you only had the 2 lines
            //
            editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }
    else if (editor.cursor_enterKeyEventKind === 3 /*EnterKeyEventKind.AmongALine: 3*/) {
        EDI_trackingUint32MaxHeap.updateLength(specialCase_firstLineIndexInserted, specialCase_number);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            // "gets finalized and that's when you see the wrong answer it is only temporary due to 'EDI_lineEndPositionList_insert'."
            // is happening again for this case too...
            //
            // TODO: This should be looked into a bit more?
            //
            // The "debug" UI that showed the line index with longest visual length and its value was correct.
            // But for some reason the horizontal scrollbar was slightly longer than it should've been and then I inserted 1 character and finalized to cause it to redraw
            // and then it drew properly then ?
            // 
            editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_Tab(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_TabKey();
    }

    let bytes = EDI_on_tab_bytes;
    const per_edit_length = bytes.length;
    let length = per_edit_length;

    if (editor.cursor_edit_eventCount_occurred > 1) {
        length *= editor.cursor_edit_eventCount_occurred;
        const src_bytes = bytes;
        bytes = new Uint8Array(length);
        // TODO: typed array function usage
        for (let i = 0; i < length; i += per_edit_length) {
            for (let k = 0; k < per_edit_length; k++) {
                bytes[i + k] = src_bytes[k];
            }
        }
    }

    EDI_textByteList_insertBytes(editor.cursor_editPosition, bytes, /*offset*/ 0, /*length*/ length);
    // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
    if (editor.styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(editor.cursor_editPosition, new Uint8Array(bytes.length), 0, bytes.length);
    }

    for (var i = editor.cursor_editIndexLine; i < editor.lineEndPositionList_count; i++) {
        EDI_lineEndPositionList_data[i] += length;
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(editor.cursor_editPosition, bytes);

    let editLengthVisual = length * editor.ontab_visualWidth_perCharacter;
    if (editor.ontab_visualWidth_perCharacter === 4) {
        editLengthVisual -= 4;
        let tabWidthOfFirstTab = editor.cursor_editLengthVisual;
        editLengthVisual += tabWidthOfFirstTab;
    }

    EDI_trackingUint32MaxHeap.updateLength_diff(editor.cursor_editIndexLine, editLengthVisual);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
        editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
        editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
        requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    indexLine_editOccurredOn = editor.cursor_editIndexLine;

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_IndentMore(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_IndentMore();
    }

    let startingIndex = editor.indent_startingIndex;
    editor.indent_startingIndex = 0;
    let SMALL_lineAndColumnIndices_indexLine = editor.indent_SMALL_lineAndColumnIndices_indexLine;
    editor.indent_SMALL_lineAndColumnIndices_indexLine = 0;

    let bytes = EDI_on_tab_bytes;
    const per_edit_length = bytes.length;

    let ORIGINAL_incrementBy = (startingIndex + 1 - SMALL_lineAndColumnIndices_indexLine) * per_edit_length;
    let incrementBy = ORIGINAL_incrementBy;

    let bytesLength = per_edit_length;

    if (editor.cursor_edit_eventCount_occurred > 1) {
        ORIGINAL_incrementBy *= editor.cursor_edit_eventCount_occurred;
        incrementBy *= editor.cursor_edit_eventCount_occurred;
        bytesLength *= editor.cursor_edit_eventCount_occurred;
        const src_bytes = bytes;
        bytes = new Uint8Array(bytesLength);
        // TODO: typed array function usage
        for (let i = 0; i < bytesLength; i += per_edit_length) {
            for (let k = 0; k < per_edit_length; k++) {
                bytes[i + k] = src_bytes[k];
            }
        }
    }

    let startingLinePos_end = editor.editret_indentLess_startingLinePos_end;
    editor.editret_indentLess_startingLinePos_end = 0;

    // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
    // ...

    const perEdit_styleBuffer_changes = new Uint8Array(bytesLength);

    // # Descending indexLine loop:
    //     # Insert the text on the respective line.
    //     # Increment the entry in 'EDI_lineEndPositionList' for the respective line
    //     # There's a second (relative to this entire function) modification to the start positions of the tracked syntax list
    //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
    //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
    //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
    //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = editor.ret_getLineBoundaryPositions_start;

        // # Insert the text on the respective line.
        EDI_textByteList_insertBytes(line_start, bytes, 0 /*offset*/, bytesLength /*length*/);
        // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
        if (editor.styleBuffer_count !== 0) {
            EDI_styleBuffer_insertBytes(line_start, perEdit_styleBuffer_changes, 0, bytesLength);
        }

        sendTransaction_MessageKind_custom_edit_InsertLtr(line_start, bytes);

        // # Increment the entry in 'EDI_lineEndPositionList' for the respective line
        EDI_lineEndPositionList_data[lineI] += incrementBy;

        // # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
        //     # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
        //     # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
        incrementBy -= bytesLength;
    }

    // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
    for (var lineI = startingIndex + 1; lineI < editor.lineEndPositionList_count; lineI++) {
        EDI_lineEndPositionList_data[lineI] += ORIGINAL_incrementBy;
    }

    // 'startingIndex' is the larger index, the loop that this variable comes from goes in reverse.
    // This information doesn't matter much here but I'm ensuring an understanding incase the future necessitates it.
    //
    if (startingIndex === SMALL_lineAndColumnIndices_indexLine) {
        EDI_trackingUint32MaxHeap.updateLength_diff(editor.cursor_editIndexLine, bytesLength * editor.ontab_visualWidth_perCharacter);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_IndentLess(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_IndentLess();
    }

    let startingIndex = editor.indent_startingIndex;
    editor.indent_startingIndex = 0;
    let SMALL_lineAndColumnIndices_indexLine = editor.indent_SMALL_lineAndColumnIndices_indexLine;
    editor.indent_SMALL_lineAndColumnIndices_indexLine = 0;

    // !!!!!! watch out for the big breaks when hitting a tab presuming that_four is 4
    let maxVirtualColumnIndex = 4;
    maxVirtualColumnIndex *= editor.cursor_edit_eventCount_occurred;
    let largestRank = editor.cursor_edit_eventCount_occurred;

    // loop over the lines to sum the "amount" of whitespace being removed
    let DETERMINE_decrementBy = 0;
    for (var lineI = SMALL_lineAndColumnIndices_indexLine; lineI <= startingIndex; lineI++) {
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = editor.ret_getLineBoundaryPositions_start;
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > maxVirtualColumnIndex) {
            upperLimitIndexColumn = maxVirtualColumnIndex;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }
        let seenSpaceCount = 0;
        let rank = 0;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {

            if (rank >= largestRank) break outer; // "case '\t':" has this as well.

            // if you walked the text without hitting the maximum rank it isn't an issue.
            // rank is just a means of short circuiting any weird combinations of spaces and tabs.
            // (TODO: maybe I should believe in tab stops.)

            // TODO: Why are you getting the text from the bytes here rather than using the bytes?
            let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]);
            switch (c) {
                case ' ':
                    seenSpaceCount++;
                    DETERMINE_decrementBy++;
                    if (seenSpaceCount % 4 === 0) {
                        // avoid a number that could approach infinity because I don't understand how machines compute division/modulo
                        // and I assume that it is easier to keep 'seenSpaceCount' at [0, 4] than compute division/modulo on very large numbers.
                        seenSpaceCount = 0;
                        rank++;
                    }
                    break;
                case '\t':
                    if (seenSpaceCount > 0) {
                        rank++;
                        seenSpaceCount = 0;
                    }
                    if (rank >= largestRank) break outer;
                    DETERMINE_decrementBy++;
                    rank++;
                    break;
                default:
                    break outer;
            }
        }
    }

    // Remember the total whitespace removed
    let ORIGINAL_decrementBy = DETERMINE_decrementBy;
    let decrementBy = ORIGINAL_decrementBy;

    let mostRecent_decrementedVisualWidthAbsolute = 0;

    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
        mostRecent_decrementedVisualWidthAbsolute = 0;
        let innerRemoveCount = 0;
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = editor.ret_getLineBoundaryPositions_start;
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > maxVirtualColumnIndex) {
            upperLimitIndexColumn = maxVirtualColumnIndex;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }

        let seenSpaceCount = 0;
        let rank = 0;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {

            if (rank >= largestRank) break outer; // "case '\t':" has this as well.

            // if you walked the text without hitting the maximum rank it isn't an issue.
            // rank is just a means of short circuiting any weird combinations of spaces and tabs.
            // (TODO: maybe I should believe in tab stops.)

            let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]);
            switch (c) {
                case ' ':
                    seenSpaceCount++;
                    innerRemoveCount++;
                    mostRecent_decrementedVisualWidthAbsolute++;
                    if (seenSpaceCount % 4 === 0) {
                        // avoid a number that could approach infinity because I don't understand how machines compute division/modulo
                        // and I assume that it is easier to keep 'seenSpaceCount' at [0, 4] than compute division/modulo on very large numbers.
                        seenSpaceCount = 0;
                        rank++;
                    }
                    break;
                case '\t':
                    if (seenSpaceCount > 0) {
                        rank++;
                        seenSpaceCount = 0;
                    }
                    if (rank >= largestRank) break outer;
                    innerRemoveCount++;
                    mostRecent_decrementedVisualWidthAbsolute += 4 - (mostRecent_decrementedVisualWidthAbsolute % 4);
                    rank++;
                    break;
                default:
                    break outer;
            }
        }

        EDI_textByteList_removeAt(line_start, innerRemoveCount);
        // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
        if (editor.styleBuffer_count !== 0) {
            EDI_styleBuffer_removeAt(line_start, innerRemoveCount);
        }

        sendTransaction_MessageKind_custom_edit_Remove(line_start, innerRemoveCount);

        EDI_lineEndPositionList_data[lineI] -= decrementBy;

        decrementBy -= innerRemoveCount;
    }

    for (var lineI = startingIndex + 1; lineI < editor.lineEndPositionList_count; lineI++) {
        EDI_lineEndPositionList_data[lineI] -= ORIGINAL_decrementBy;
    }

    // 'startingIndex' is the larger index, the loop that this variable comes from goes in reverse.
    // This information doesn't matter much here but I'm ensuring an understanding incase the future necessitates it.
    //
    if (startingIndex === SMALL_lineAndColumnIndices_indexLine) {
        EDI_trackingUint32MaxHeap.updateLength_diff(editor.cursor_editIndexLine, -1 * mostRecent_decrementedVisualWidthAbsolute);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

/** TODO: the finalize for paste is also very bad, not just the event/render */
function EDI_finalizeEdit_Paste(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_DuplicateOrPaste();
    }

    let content = EDI_cursor_EDI_paste_clipboardContent_string;

    let linesInsertedCount = editor.cursor_EDI_paste_clipboardContent_totalLineEndCount;
    let insertionLength = EDI_cursor_EDI_paste_clipboardContent_string.length;

    let editLengthVisual = 0;

    EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition);
    EDI_ret_getLineBoundaryPositions_raw(editor.ret_getLineAndColumnIndices_indexLine);
    EDI_ret_getIndexFromColumn_RESET(editor.cursor_editIndexColumn, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
    let columnVisual = editor.ret_getIndexFromX_visualColumns;

    EDI_textByteList_insertBytes(editor.cursor_editPosition, EDI_cursor_EDI_paste_clipboardContent_bytes, 0, EDI_cursor_EDI_paste_clipboardContent_bytes.length);
    // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
    if (editor.styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(editor.cursor_editPosition, EDI_cursor_EDI_paste_clipboardContent_bytes, 0, EDI_cursor_EDI_paste_clipboardContent_bytes.length);
    }

    for (var i = editor.cursor_editIndexLine /*+ linesInsertedCount*/; i < editor.lineEndPositionList_count; i++) {
        EDI_lineEndPositionList_data[i] += insertionLength;
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(editor.cursor_editPosition, EDI_cursor_EDI_paste_clipboardContent_bytes);

    indexLine_editOccurredOn = editor.cursor_editIndexLine;
    // TODO: 'EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[0]' is wrong
    EDI_trackingUint32MaxHeap.updateLength_diff(indexLine_editOccurredOn, EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[0]);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
        editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
        editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
        requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    // it's the same logic as the enter key
    // I need to get there in phases though
    //
    for (let i = 0; i < EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS.length - 1; i++) {
        let linePosition = editor.cursor_editPosition + EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS[i];
        let lineVisualLength = EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[i + 1]; // TODO: 'EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[0]' is wrong
        EDI_lineEndPositionList_insert(editor.cursor_editIndexLine + i, linePosition, lineVisualLength);
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_Duplicate(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        EDI_render_do_DuplicateOrPaste();
    }

    let small = editor.editret_cursor_EDI_duplicate_small;
    let length = editor.editret_cursor_EDI_duplicate_length;

    editor.editret_cursor_EDI_duplicate_small = 0;
    editor.editret_cursor_EDI_duplicate_length = 0;

    let linesInsertedCount = editor.cursor_EDI_duplication_totalLineEndCount;
    let insertionLength = EDI_cursor_EDI_duplication_bytes.length;

    let editLengthVisual = 0;

    // it's stored at +1

    // TODO: The state that is retrieved via this paragraph of code I think already exists in this function somewhere. i.e.: needs optimization (remove redundancy)
    EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition);
    EDI_ret_getLineBoundaryPositions_raw(editor.ret_getLineAndColumnIndices_indexLine);
    EDI_ret_getIndexFromColumn_RESET(editor.cursor_editIndexColumn, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
    let columnVisual = editor.ret_getIndexFromX_visualColumns;

    EDI_textByteList_duplicateWithin(small, editor.cursor_editPosition, length);
    // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
    if (editor.styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(editor.cursor_editPosition, new Uint8Array(length), 0, length);
    }

    for (var i = editor.cursor_editIndexLine /*+ linesInsertedCount*/; i < editor.lineEndPositionList_count; i++) {
        EDI_lineEndPositionList_data[i] += insertionLength;
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(editor.cursor_editPosition, EDI_cursor_EDI_duplication_bytes);

    indexLine_editOccurredOn = editor.cursor_editIndexLine;
    // TODO: 'EDI_cursor_EDI_duplication_arrayLineVisualLengths[0]' is wrong
    EDI_trackingUint32MaxHeap.updateLength_diff(indexLine_editOccurredOn, EDI_cursor_EDI_duplication_arrayLineVisualLengths[0]);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
        editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
        editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
        requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    // it's the same logic as the enter key
    // I need to get there in phases though
    //
    for (let i = 0; i < EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS.length - 1; i++) {
        let linePosition = editor.cursor_editPosition + EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS[i];
        let lineVisualLength = EDI_cursor_EDI_duplication_arrayLineVisualLengths[i + 1]; // TODO: 'EDI_cursor_EDI_duplication_arrayLineVisualLengths[0]' is wrong
        EDI_lineEndPositionList_insert(editor.cursor_editIndexLine + i, linePosition, lineVisualLength);
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_DeleteLtr_BackspaceRtl_RemoveTextNoBatching(indexLine_editOccurredOn) {
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        if (editor.cursor_editKind === 4 /*EditKind.RemoveTextNoBatching: 4*/) {
            EDI_render_do_RemoveSelection();
        }
        else if (editor.cursor_editKind === 2 /*EditKind.DeleteLtr: 2*/) {
            EDI_render_do_Delete();
        }
        else if (editor.cursor_editKind === 3 /*EditKind.BackspaceRtl: 3*/) {
            EDI_render_do_Backspace();
        }
    }

    // TODO: surely u'd get this before doing the edit?
    let startLineAndColumnIndices_indexLine;
    let startLineAndColumnIndices_indexColumn;
    if (editor.cursor_editKind === 4 /*EditKind.RemoveTextNoBatching: 4*/) {
        startLineAndColumnIndices_indexLine = editor.cursor_editIndexLine;
        startLineAndColumnIndices_indexColumn = editor.cursor_editIndexColumn;
    }
    else {
        EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition);
        startLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
        startLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    }
    let endLineAndColumnIndices_indexLine;
    let endLineAndColumnIndices_indexColumn;
    if (editor.cursor_editKind === 4 /*EditKind.RemoveTextNoBatching: 4*/) {
        endLineAndColumnIndices_indexLine = editor.cursor_END_editIndexLine;
        endLineAndColumnIndices_indexColumn = editor.cursor_END_editIndexColumn;
    }
    else {
        EDI_ret_getLineAndColumnIndices_raw(editor.cursor_editPosition + editor.cursor_editLength_characters);
        endLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
        endLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    }

    if (editor.cursor_editLineFeedCount > 0) {
        let count = 0;
        let lastMatchedIndexLine = 0;
        for (let i = EDI_lineEndPositionList_PENDING.count - 1; i >= 0; i--) {
            let lineEndPos = EDI_lineEndPositionList_PENDING.data[i];
            if (editor.cursor_editPosition <= lineEndPos && editor.cursor_editPosition + editor.cursor_editLength_characters > lineEndPos) {
                EDI_ret_getLineAndColumnIndices_raw(lineEndPos);
                lastMatchedIndexLine = editor.ret_getLineAndColumnIndices_indexLine;
                count++;
                EDI_lineEndPositionList_PENDING.removeAt(i, 1);
            }
            else if (editor.cursor_editPosition > lineEndPos) {
                break;
            }
        }
        if (count > 0) {
            EDI_lineEndPositionList_removeAt(lastMatchedIndexLine, count);
        }
    }
    for (let i = editor.lineEndPositionList_count - 1; i >= 0; i--) {
        if (editor.cursor_editPosition < EDI_lineEndPositionList_data[i]) {
            EDI_lineEndPositionList_data[i] -= editor.cursor_editLength_characters;
        }
        else {
            if (i === editor.lineEndPositionList_count - 1) {
                indexLine_editOccurredOn = i;
            }
            else {
                indexLine_editOccurredOn = i + 1;
            }
            break;
        }
    }

    EDI_textByteList_removeAt(editor.cursor_editPosition, editor.cursor_editLength_characters);
    // TODO: ensure 'EDI_styleBuffer' count has 'editor.cursor_editPosition' in range / ensure it is equal with 'editor.textByteList' count/capacity?
    if (editor.styleBuffer_count !== 0) {
        EDI_styleBuffer_removeAt(editor.cursor_editPosition, editor.cursor_editLength_characters);
    }

    sendTransaction_MessageKind_custom_edit_Remove(editor.cursor_editPosition, editor.cursor_editLength_characters);

    if (startLineAndColumnIndices_indexLine === endLineAndColumnIndices_indexLine) {
        EDI_trackingUint32MaxHeap.updateLength_diff(editor.cursor_editIndexLine, -1 * editor.cursor_editLengthVisual);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

/** This function needs the 'editor.cursor_editKind' that was finalized, and will set it to 'EditKind.None' internally, so don't do it yourself within a specific finalizeEdit function. */
function EDI_finalizeEdit_ClearEditState() {

    if (editor.cursor_editKind !== 9 /*EditKind.Paste: 9*/) {
        // TODO: You can over time have this be a longer living cache but for now just get accuracy while still allowing me to paste, move cursor, paste, move cursor, etc...
        EDI_cursor_EDI_paste_clipboardContent_string = null;
        EDI_cursor_EDI_paste_clipboardContent_bytes = null;
        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;
        editor.clipboard_may_have_changed = 1;
        EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;
    }

    if (true) { // if true to explicitly point out the pattern matching of the above and that this one intentionally will always clear.
        editor.duplication_may_have_changed = 1;
        //EDI_cursor_EDI_duplication_string = null;
        EDI_cursor_EDI_duplication_bytes = null;
        editor.cursor_EDI_duplication_totalLineEndCount = 0;
        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
        EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;
        //EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;
    }

    editor.cursor_editKind = 0 /*EditKind.None: 0*/;
    editor.cursor_editLength_characters = 0;
    editor.cursor_editLengthVisual = 0;
    editor.cursor_editPosition = 0;
    editor.cursor_editIndexLine = 0;
    editor.cursor_editIndexColumn = 0;

    editor.cursor_edit_eventCount_occurred = 0;
    editor.cursor_edit_eventCount_drawn = 0;
    editor.cursor_edit_eventCount_drawingStateContinuationValue = 0;

    editor.cursor_END_editIndexLine = 0;
    editor.cursor_END_editIndexColumn = 0;
    editor.cursor_textInsertionBufferCount = 0;
    editor.editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
    editor.cursor_editLineFeedCount = 0;
    EDI_lineEndPositionList_PENDING.clear();

    // TODO: You do indeed have to clear this because of ctrl or shift cases of enter.
    editor.cursor_enterKeyEventKind = 0 /*EnterKeyEventKind.None: 0*/;

    // TODO: I want to put these in the paste case directly and above the 'EDI_finalizeEdit_ClearEditState' invocation...
    // ...but 'EDI_cursor_clear' needs to "clear an unfinalized edit" (I think that would be the sensible behavior at least)...
    // ...and I'm not currently doing this, but maybe you could simplify that by invoking 'EDI_finalizeEdit_ClearEditState' rather...
    // ...than duplicating the logic?
    EDI_cursor_enterKey_newLinePlusIndentation_byteList = null;
    EDI_cursor_cached_indentation_string = null;

    editor.cursor_edit_flagLineChanged = 0;
}
//#endregion

//#region ancillary
/** modification of Google AI Overview "javascript count of digits" */
function positiveNumbersOnly_countDigitsLoop(number) {
    if (number <= 0) return 1;
    let count = 0;

    while (number > 0) {
        number = Math.floor(number / 10); // Remove the last digit
        count++;
    }

    return count;
}

function EDI_getCharacterPrevious_KIND(indexColumn, positionIndex) {
    if (indexColumn !== 0) {
        return EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[positionIndex - 1]));
    }
    else {
        return 0 /*CharacterKind.None: 0*/;
    }
}

function EDI_getCharacterCurrent_KIND(indexColumn, positionIndex, lineEnd) {
    if (indexColumn < lineEnd) {
        return EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[positionIndex]));
    }
    else {
        return 0 /*CharacterKind.None: 0*/;
    }
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * Returns 'true' if success otherwise 'false' the "return" values are indexLine, and indexColumn; which are stored in 'fieldBuffer.js'
 * as 'editor.ret_getLineAndColumnIndices_indexLine = indexLine;' and 'editor.ret_getLineAndColumnIndices_indexColumn = indexColumn;'.
 * 
 * TODO: Local variables for this looping logic?
 */
function EDI_ret_getLineAndColumnIndices_raw(positionIndex) {
    let left = 0;
    let right = editor.lineEndPositionList_count - 1;

    let indexLine = -1;
    let indexColumn = -1;

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (local_EDI_lineEndPositionList_data[mid] >= positionIndex) {
            indexLine = mid;

            if (local_EDI_lineEndPositionList_data[mid] === positionIndex) {
                break;
            }

            right = mid - 1;
        }
        else if (local_EDI_lineEndPositionList_data[mid] < positionIndex) {
            left = mid + 1;
        }
        else {
            return false; // NaN
        }
    }

    if (indexLine === -1) {
        return false;
        //return {
        //  indexLine: 0,
        //  indexColumn: 0,  
        //};
    }

    if (indexLine === 0) {
        indexColumn = positionIndex;
    }
    else {
        indexColumn = positionIndex - (local_EDI_lineEndPositionList_data[indexLine - 1] + 1);
    }

    editor.ret_getLineAndColumnIndices_indexLine = indexLine;
    editor.ret_getLineAndColumnIndices_indexColumn = indexColumn;
    return true;
}

export function EDI_getLastValidIndexColumn_raw(indexLine) {
    if (indexLine < editor.lineEndPositionList_count) {
        if (indexLine === 0) {
            return EDI_lineEndPositionList_data[indexLine] - 0;
        }
        else {
            return EDI_lineEndPositionList_data[indexLine] - (EDI_lineEndPositionList_data[indexLine - 1] + 1);
        }
    }
    return 0;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'editor.ret_getLineBoundaryPositions_start' is the position of the first character on that line.
 * 
 * 'editor.ret_getLineBoundaryPositions_end' is the position of the "line end" (i.e.: ascii code for '\n' or EOF).
 * 
 * The inclusivity/exclusivity is in reference to whether the position
 * points to non-line-end-text that exists on the line
 * 
 * NOTE: In performance critical sections this code is explicitly inlined and modified to be as performant as it seemingly can get for that specific section of code.
 * 
 * @returns nothing: the results are stored in 'editor.ret_getLineBoundaryPositions_start' inclusive and 'editor.ret_getLineBoundaryPositions_end' exclusive.
 */
export function EDI_ret_getLineBoundaryPositions_raw(indexLine) {
    if (indexLine < editor.lineEndPositionList_count) {
        if (indexLine === 0) {
            editor.ret_getLineBoundaryPositions_start = 0;
            editor.ret_getLineBoundaryPositions_end = EDI_lineEndPositionList_data[indexLine] - 0;
            return;
        }
        else {
            editor.ret_getLineBoundaryPositions_start = EDI_lineEndPositionList_data[indexLine - 1] + 1;
            editor.ret_getLineBoundaryPositions_end = EDI_lineEndPositionList_data[indexLine];
            return;
        }
    }
    editor.ret_getLineBoundaryPositions_start = 0;
    editor.ret_getLineBoundaryPositions_end = 0;
}

function EDI_getLineStart_pos_raw(indexLine) {
    if (indexLine < editor.lineEndPositionList_count) {
        if (indexLine === 0) {
            return 0;
        }
        else {
            return (EDI_lineEndPositionList_data[indexLine - 1] + 1);
        }
    }
    return 0;
}

function EDI_getLineEnd_pos_raw(indexLine) {
    if (indexLine < editor.lineEndPositionList_count) {
        if (indexLine === 0) {
            return EDI_lineEndPositionList_data[indexLine] - 0;
        }
        else {
            return EDI_lineEndPositionList_data[indexLine];
        }
    }
    return 0;
}

function EDI_getPositionIndex_Overload(indexLine, indexColumn) {
    return EDI_getLineStart_pos_raw(indexLine) + indexColumn;
}

/**
 * @returns 
 */
export function EDI_getPositionIndex_cursor_raw() {
    return EDI_getLineStart_pos_raw(editor.cursor_indexLine) + editor.cursor_indexColumn;
}

/**
 * TODO: Reduce the amount of redundant drawing of lines that haven't changed in the selection logic.
*/
function EDI_getEntireLineVisualWidth(lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;

    while (positionIndex < lineEnd) {
        let charLength = 1;

        if (EDI_textByteList_bytes[positionIndex] === CONST_EDI_ASCII_TAB) {
            charLength = 4 - (visualColumns % 4);
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    return visualColumns;
}

function EDI_set_indexColumn_and_visualColumn_relativeTo_storedVisualWidth(lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;
    let charWidth = EDI_characterWidth;
    let rx = editor.cursor_STORED_visualWidth * charWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;

        if (EDI_textByteList_bytes[positionIndex] === CONST_EDI_ASCII_TAB) {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (rx < charMidpointX) {
            editor.cursor_indexColumn = indexColumn;
            editor.cursorVisualColumnIndex = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    editor.cursor_indexColumn = indexColumn;
    editor.cursorVisualColumnIndex = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'editor.ret_getIndexFromX_indexColumn'
 * 
 * 'editor.ret_getIndexFromX_visualColumns'
 * 
 * @returns nothing: the results are stored in 'editor.ret_getIndexFromX_indexColumn' and 'editor.ret_getIndexFromX_visualColumns'.
 */
function EDI_ret_getIndexFromColumn_sameLine_newRxIsLarger(targetColumn, lineStart, lineEnd, startColumn, startVisualColumns) {
    let indexColumn = startColumn;
    let visualColumns = startVisualColumns;
    let positionIndex = lineStart + startColumn;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;

        if (EDI_textByteList_bytes[positionIndex] === CONST_EDI_ASCII_TAB) {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (targetColumn === indexColumn) {
            editor.ret_getIndexFromX_indexColumn = indexColumn;
            editor.ret_getIndexFromX_visualColumns = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    editor.ret_getIndexFromX_indexColumn = indexColumn;
    editor.ret_getIndexFromX_visualColumns = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'editor.ret_getIndexFromX_indexColumn'
 * 
 * 'editor.ret_getIndexFromX_visualColumns'
 * 
 * @returns nothing: the results are stored in 'editor.ret_getIndexFromX_indexColumn' and 'editor.ret_getIndexFromX_visualColumns'.
 */
function EDI_ret_getIndexFromColumn_RESET(targetColumn, lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;

    while (positionIndex < lineEnd) {
        let charLength = 1;

        if (EDI_textByteList_bytes[positionIndex] === CONST_EDI_ASCII_TAB) {
            charLength = 4 - (visualColumns % 4);
        }

        // If the click is before the midpoint of this character/tab, target this index
        if (targetColumn === indexColumn) {
            editor.ret_getIndexFromX_indexColumn = indexColumn;
            editor.ret_getIndexFromX_visualColumns = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    editor.ret_getIndexFromX_indexColumn = indexColumn;
    editor.ret_getIndexFromX_visualColumns = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'editor.ret_getIndexFromX_indexColumn'
 * 
 * 'editor.ret_getIndexFromX_visualColumns'
 * 
 * @returns nothing: the results are stored in 'editor.ret_getIndexFromX_indexColumn' and 'editor.ret_getIndexFromX_visualColumns'.
 */
export function EDI_ret_getIndexFromX_RESET(rx, lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;

        if (EDI_textByteList_bytes[positionIndex] === CONST_EDI_ASCII_TAB) {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (rx < charMidpointX) {
            editor.ret_getIndexFromX_indexColumn = indexColumn;
            editor.ret_getIndexFromX_visualColumns = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    editor.ret_getIndexFromX_indexColumn = indexColumn;
    editor.ret_getIndexFromX_visualColumns = visualColumns;
}

/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
export function EDI_ret_getIndexFromX_sameLine_newRxIsLarger(goalRx, lineStart, lineEnd, startColumn, startVisualColumns) {
    let indexColumn = startColumn;
    let visualColumns = startVisualColumns;
    let positionIndex = lineStart + startColumn;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;

        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (goalRx < charMidpointX) {
            editor.ret_getIndexFromX_indexColumn = indexColumn;
            editor.ret_getIndexFromX_visualColumns = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    editor.ret_getIndexFromX_indexColumn = indexColumn;
    editor.ret_getIndexFromX_visualColumns = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'editor.ret_getIndexFromX_indexColumn'
 * 
 * 'editor.ret_getIndexFromX_visualColumns'
 * 
 * @returns nothing: the results are stored in 'editor.ret_getIndexFromX_indexColumn' and 'editor.ret_getIndexFromX_visualColumns'.
 */
function EDI_ret_getIndexFromX_sameLine_newRxIsSmaller(goalRx, lineStart, startColumn, startVisualColumns) {
    let indexColumn = startColumn;
    let visualColumns = startVisualColumns;
    let positionIndex = lineStart + startColumn;
    let charWidth = EDI_characterWidth;

    while (positionIndex >= lineStart && positionIndex > 0) {
        let charLength = 1;

        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex - 1]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = (visualColumns - charLength) * charWidth;
        const charRightX = (visualColumns) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (goalRx >= charMidpointX) {
            editor.ret_getIndexFromX_indexColumn = indexColumn;
            editor.ret_getIndexFromX_visualColumns = visualColumns;
            return;
        }

        visualColumns -= charLength;
        positionIndex--;
        indexColumn--;
    }

    // If clicked past the end of the line text
    editor.ret_getIndexFromX_indexColumn = indexColumn;
    editor.ret_getIndexFromX_visualColumns = visualColumns;
}

/**
 * This clears the cursor's selection.
 */
export function EDI_moveCursor_position(intValue) {
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        // TODO: Timing issue, someone typing while they scroll
        EDI_finalizeEdit();
    }
    EDI_ret_getLineAndColumnIndices_raw(intValue);
    let lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
    let lineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    EDI_moveCursor_indexLine_indexColumn(lineAndColumnIndices_indexLine, lineAndColumnIndices_indexColumn);
}

/**
 * This clears the cursor's selection.
 */
function EDI_moveCursor_indexLine_indexColumn(indexLine, indexColumn) {
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        // TODO: Timing issue, someone typing while they scroll
        EDI_finalizeEdit();
    }
    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);

    if (indexColumn > lastValidIndexColumn) {
        editor.cursor_indexColumn = lastValidIndexColumn;
    }
    else {
        editor.cursor_indexColumn = indexColumn;
    }

    editor.cursor_indexLine = indexLine;

    EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
    const lineStart = editor.ret_getLineBoundaryPositions_start;
    const lineEnd = editor.ret_getLineBoundaryPositions_end;
    EDI_ret_getIndexFromColumn_RESET(editor.cursor_indexColumn, lineStart, lineEnd);
    editor.cursorVisualColumnIndex = editor.ret_getIndexFromX_visualColumns;

    // TODO: selectionAnchor = selectionEnd; EDI_drawCursor(/*NOTscrollCursorIntoView*/ false); # being the way to clear a selection should be documented / wrapped by a method for ease of use / readability?
    editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

/**
 * It will read the entire indentation regardless of cursor column position.
 * 
 * Returns the 'endExclusiveIndentationIndexColumn' of the indentation i.e.: "the column index that exclusively ends the indentation.".
 * Sets the state for:
 * - EDI_cursor_cached_indentation_string
 */
function EDI_measureEndExclusiveIndentationIndexColumn() {
    let upperLimitIndexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);
    EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
    const line_start = editor.ret_getLineBoundaryPositions_start;

    let count = 0;
    let indentation_string_visualWidth = 0;

    // Currently an enter key press only batches with other enter key presses so either the edit is finalized or the indentation was already cached and thus this code wouldn't run,
    // i.e.: you can read directly from the byte array without worrying about a pending edit.
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
        switch (EDI_textByteList_bytes[line_start + i]) {
            case CONST_EDI_ASCII_SPACE:
                indentation_string_visualWidth++;
                count++;
                break;
            case CONST_EDI_ASCII_TAB:
                indentation_string_visualWidth += 4;
                count++;
                break;
            default:
                break outer;
        }
    }

    editor.cursor_cached_indentation_string_visualWidth = indentation_string_visualWidth;

    return count;
}

function EDI_lineWasInsertedValidateGutter(lineCount) {
    if (EDI_drawGutter_Width(lineCount)) {
        // If true then you need to also draw the dependent UI
        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
        EDI_drawHorizontalScrollbar();
    }
}

function EDI_getCharacterKind(character) {
    switch (character) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
        case '_':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            return 3 /*CharacterKind.LetterOrDigit: 3*/;
        case ' ':
        case '\t':
        case '\r':
        case '\n':
            return 1 /*CharacterKind.Whitespace: 1*/;
        default:
            return 2 /*CharacterKind.Punctuation: 2*/;
    }
}

/**
 * TODO: repeated duplications of the same extremely large selection might benefit from temporary caching of this functions result.
 * 
 * textonly is in reference to conversion of the raw storage of the text editor such that all line feeds get returned as as EDI_lineEndString rather than the internal representation of '\n'.
 * 
 * @returns {string}
 */
function EDI_decode_textonly(start, length) {
    if (length <= 0) {
        return '';
    }

    let end = start + length;

    let decodedText = EDI_decoder.decode(EDI_textByteList_bytes.subarray(start, end));
    if (!EDI_lineEndString) {
        EDI_lineEndString = '\n';
    }
    if (EDI_lineEndString !== '\n') {
        decodedText = decodedText.replaceAll('\n', EDI_lineEndString);
    }

    return decodedText;
}

/**
 * @param {*} editKind 
 * @param {*} editPosition 
 * @param {*} editLength 
 */
function EDI_startEdit(editKind, editPosition, editLength) {
    editor.cursor_editKind = editKind;
    editor.cursor_editPosition = editPosition;
    editor.cursor_editIndexLine = editor.cursor_indexLine;
    editor.cursor_editIndexColumn = editor.cursor_indexColumn;
    editor.cursor_editLength_characters = editLength;
}
//#endregion

function EDI_autocomplete_get_filter() {
    let wordToLeftOfCursor = '';
    if (editor.cursor_editKind === 0 /*EditKind.None: 0*/ || editor.cursor_editKind === 1 /*EditKind.InsertLtr: 1*/) {
        // TODO: this is just to say 'editor.cursor_editIndexColumn'? (in the case of 'EditKind.InsertLtr')
        let columnNoEdit = editor.cursor_indexColumn - editor.cursor_editLength_characters;
        if (columnNoEdit > 0) {
            let position = EDI_getPositionIndex_cursor_raw() - editor.cursor_editLength_characters;
            let typeOfLeftCharacter = EDI_getCharacterPrevious_KIND(columnNoEdit, position);
            if (typeOfLeftCharacter === 3 /*CharacterKind.LetterOrDigit: 3*/) {
                let another_column = columnNoEdit - 1;
                let another_position = position - 1;
                // TODO: checks it twice...
                while (another_column > 0) {
                    let another_charKind = EDI_getCharacterPrevious_KIND(another_column, another_position);
                    if (another_charKind !== 3 /*CharacterKind.LetterOrDigit: 3*/) {
                        //another_column++;
                        //another_position++;
                        break;
                    }
                    another_column--;
                    another_position--;
                }
                let text = EDI_decode_textonly(another_position, position - another_position);
                wordToLeftOfCursor = text;
            }
        }
    }
    return wordToLeftOfCursor + EDI_decoder.decode(EDI_cursor_textInsertionBuffer.subarray(0, editor.cursor_textInsertionBufferCount));
}

//#region cursorDrawing
/** obsolete-ish */
function EDI_render_do_cursor_flag_scrollIntoViewExplicit() {
    let notShouldScrollIntoView = false;
    let flag_scrollIntoViewExplicit = false;

    flag_scrollIntoViewExplicit = true;

    if (flag_scrollIntoViewExplicit) {
        // TODO: consider setting 'notShouldScrollIntoView' to false to avoid two scroll into views redundantly?
        EDI_scrollCursorIntoView();
    }
    EDI_drawCursor(notShouldScrollIntoView);
}

export function EDI_cursor_hasSelection() {
    return editor.cursor_selectionAnchor >= 0 &&
        editor.cursor_selectionEnd >= 0 &&
        editor.cursor_selectionAnchor != editor.cursor_selectionEnd;
}

/**
 * TODO: move this closer to 'EDI_finalizeEdit_ClearEditState'
 * 
 * !!!! You need to be careful. You might think "I can tie state clearing solely to the respective edit's finalize"...
 * ...but it feels sensible that if I wanted to just reset everything I'd be allowed to just invoke 'EDI_cursor_clear()'...
 * ...without having to worry about finalizing any pending edits...
 * ...(I think this is unfortunate I'd prefer it weren't the case but I can't help but think it is a very important thing to get right.)...
 * ...so all the edit finalize logic needs to correctly clear its state here as well.
 * 
 * The code that clears the editor is dependent on this method NOT clearing 'editor.cursor_selectionDivExists'
 * 
 * Somewhat duplicated code: This messes with the language features if I invoke clear() in the constructor, it puts "| undefined" on all the types.
 */
function EDI_cursor_clear() {
    editor.cursor_indexLine = 0;
    editor.cursor_indexColumn = 0;
    editor.cursorVisualColumnIndex = 0;
    editor.cursor_STORED_visualWidth = 0;
    // TODO: You can't include 'editor.cursor_cursorTranslateYValue' or 'EDI_cursor_cursorTranslateXValue' here. Otherwise changing a file won't redraw the cursor at 0,0
    //editor.cursor_cursorTranslateYValue = 0;
    //EDI_cursor_cursorTranslateXValue = 0;
    editor.cursor_selectionAnchor = 0;
    editor.cursor_selectionEnd = 0;
    editor.cursor_selectionIndexAnchorColumnVISUAL = 0;
    editor.cursor_selectionIndexEndColumnVISUAL = 0;
    editor.cursor_DRAWN_selectionAnchor = 0;
    editor.cursor_DRAWN_selectionEnd = 0;
    editor.cursor_DRAWN_selection_virtualIndexLine = 0;
    editor.cursor_DRAWN_selection_virtualCount = 0;
    editor.cursor_selectionIndexAnchorColumnVISUAL_DRAWN = 0;
    editor.cursor_selectionIndexEndColumnVISUAL_DRAWN = 0;
    editor.cursor_editKind = 0 /*EditKind.None: 0*/;
    editor.cursor_editLength_characters = 0;
    editor.cursor_editPosition = 0;
    editor.cursor_editIndexLine = 0;
    editor.cursor_editIndexColumn = 0;
    editor.cursor_edit_eventCount_occurred = 0;
    editor.cursor_edit_eventCount_drawn = 0;
    editor.cursor_edit_eventCount_drawingStateContinuationValue = 0;
    editor.cursor_END_editIndexLine = 0;
    editor.cursor_END_editIndexColumn = 0;

    editor.cursor_textInsertionBufferCount = 0;

    EDI_cursor_enterKey_newLinePlusIndentation_byteList = null;
    EDI_cursor_cached_indentation_string = null;
    editor.cursor_enterKeyEventKind = 0 /*EnterKeyEventKind.None: 0*/;

    editor.cursor_editLineFeedCount = 0;
    editor.cursor_edit_flagLineChanged = 0;

    EDI_cursor_EDI_paste_clipboardContent_string = null;
    EDI_cursor_EDI_paste_clipboardContent_bytes = null;
    EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
    EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;
    EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;
    editor.clipboard_may_have_changed = 1;

    editor.duplication_may_have_changed = 1;
    //EDI_cursor_EDI_duplication_string = null;
    EDI_cursor_EDI_duplication_bytes = null;
    editor.cursor_EDI_duplication_totalLineEndCount = 0;
    EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
    EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;
    // EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;

    editor.editret_cursor_EDI_duplicate_small = 0;
    editor.editret_cursor_EDI_duplicate_length = 0;
}

export function EDI_cursorBlinkingTrailingEdge() {
    editor.isChecking_cursorBlinkTrailingEdge = 0;
    // TODO: does modifying animationPlayState benefit from rAF?
    //if (editor.editorHasFocus) {
    //    EDI_cursor_cursorElement.style.animationPlayState = 'running';
    //}
    // TODO: (rAF) / it is possible that you paint more than the debug text due to combining that text modification with the same rAF frame...
    // ...that updates something more directly related to the text editor itself (i.e.: if you group this text modification with modifying the 'animationPlayState').
    EDI_draw_cursor_debug();

    //if (f.byteDIALOG_currentDialogKind === DialogKind.Debug) {
    //    sendTransaction_MessageKind_custom_editorGetNodesAdjacentToCursor(EDI_getPositionIndex_cursor_raw());
    //}
}
//#endregion

async function EDI_MenuOnClick(isCancelled, menuOption, request) {
    if (isCancelled || !menuOption) { return; }

    const commandKind = menuOption.commandKind;
    if (!commandKind) { return; }

    switch (commandKind) {
        case 4 /*CommandKind.Cut: 4*/:
            EDI_finalizeEdit();
            await EDI_copySelection();
            EDI_removeSelection();
            EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
            return;
        case 2 /*CommandKind.Copy: 2*/:
            EDI_finalizeEdit();
            return EDI_copySelection();
        case 5 /*CommandKind.Paste: 5*/:
            EDI_finalizeEdit();
            await EDI_read_clipboard();
            EDI_paste();
            EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
            return;
        case 12 /*CommandKind.Find: 12*/:
            EDI_findOverlay_showSetter(!editor.findOverlay_show);
            return;
    }
}

async function EDI_read_clipboard() {
    if (editor.clipboard_may_have_changed === 1) {
        editor.clipboard_may_have_changed = 0;
        EDI_finalizeEdit();
        EDI_cursor_EDI_paste_clipboardContent_string = await window.myAPI.readClipboard();
        // TODO: what are the possible returned values of 'await window.myAPI.readClipboard();'? Is it nullable?
        EDI_cursor_EDI_paste_clipboardContent_string = EDI_cursor_EDI_paste_clipboardContent_string.replaceAll('\r\n', '\n');
        EDI_cursor_EDI_paste_clipboardContent_bytes = EDI_encoder.encode(EDI_cursor_EDI_paste_clipboardContent_string);
        editor.cursor_EDI_paste_clipboardContent_totalLineEndCount = countNewlines(EDI_cursor_EDI_paste_clipboardContent_string);
        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = new Array(1 + editor.cursor_EDI_paste_clipboardContent_totalLineEndCount);
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = new Array(1 + editor.cursor_EDI_paste_clipboardContent_totalLineEndCount);
        EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;

        let lineEndIndex = 0;
        let visualLength = 0;

        // TODO: multibyte logic
        const byteLength = EDI_cursor_EDI_paste_clipboardContent_bytes.length;
        let i = 0;
        for (; i < byteLength; i++) {
            switch (EDI_cursor_EDI_paste_clipboardContent_bytes[i]) {
                case 10:
                    EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS[lineEndIndex] = i;
                    EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[lineEndIndex] = visualLength;
                    lineEndIndex++;
                    visualLength = 0;
                    break;
                case 9:
                    visualLength += 4 - (visualLength % 4);
                    break;
                default:
                    visualLength++;
                    break;
            }
        }

        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS[lineEndIndex] = i;
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[lineEndIndex] = visualLength;
    }
}

function EDI_read_duplication() {
    if (editor.duplication_may_have_changed === 1) {
        editor.duplication_may_have_changed = 0;

        // Timing don't do this like u did in the other
        //EDI_finalizeEdit();

        const large = editor.editret_cursor_EDI_duplicate_small + editor.editret_cursor_EDI_duplicate_length;
        EDI_cursor_EDI_duplication_bytes = EDI_textByteList_bytes.subarray(editor.editret_cursor_EDI_duplicate_small, large);

        editor.cursor_EDI_duplication_totalLineEndCount = countNewlines(EDI_decoder.decode(EDI_cursor_EDI_duplication_bytes));
        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = new Array(1 + editor.cursor_EDI_duplication_totalLineEndCount);
        EDI_cursor_EDI_duplication_arrayLineVisualLengths = new Array(1 + editor.cursor_EDI_duplication_totalLineEndCount);
        EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = null;

        let lineEndIndex = 0;
        let visualLength = 0;

        // TODO: multibyte logic
        const byteLength = EDI_cursor_EDI_duplication_bytes.length;
        let i = 0;
        for (; i < byteLength; i++) {
            switch (EDI_cursor_EDI_duplication_bytes[i]) {
                case 10:
                    EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS[lineEndIndex] = i;
                    EDI_cursor_EDI_duplication_arrayLineVisualLengths[lineEndIndex] = visualLength;
                    lineEndIndex++;
                    visualLength = 0;
                    break;
                case 9:
                    visualLength += 4 - (visualLength % 4);
                    break;
                default:
                    visualLength++;
                    break;
            }
        }

        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS[lineEndIndex] = i;
        EDI_cursor_EDI_duplication_arrayLineVisualLengths[lineEndIndex] = visualLength;
    }
}

function EDI_requestLspComplete() {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    //if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
    //    EDI_finalizeEdit();
    //}
    //window.myAPI.editorCompletionRequest(editor.cursor_indexLine, editor.cursor_indexColumn);
    AUTOCOMPLETE_show();
    sendTransaction_MessageKind_custom_autocomplete(EDI_getPositionIndex_cursor_raw());
}

/**
 * TODO: You have 'EDI_onKeyDown_keyLengthEqualsOne_ctrlKey' this completely breaks that pattern to pass ctrlKey here so you can do this debug dialog
 * Also the F12 just does 'EDI_doEditorGoToDefinitionRequest' so having this internally do some entirely separate thing is confusing and the process feels hidden cause you threw it all in this function
 */
function EDI_doEditorGoToDefinitionRequest(ctrlKey) {
    if (!ctrlKey) {
        // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
        if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
            EDI_finalizeEdit();
        }
        sendTransaction_MessageKind_textDocument_definition(EDI_getPositionIndex_cursor_raw());
    }
    else {
        DIALOG_show(4 /*DialogKind.Debug: 4*/, /*onResizeAction*/ null, /*elementToFocusOnDialogHideInitiated*/ null);
    }
}

function EDI_requestLspHover() {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }
    let event_clientY = editor.EDI_mouseOver_event_clientY;
    let event_clientX = editor.EDI_mouseOver_event_clientX;

    ///////////
    ///////////
    // # GET INDICES
    ///////////
    ///////////
    if (editor.recentBoundingClientRect_isNull) {
        let boundingClientRect = editor.baseElement.getBoundingClientRect();
        editor.recentBoundingClientRect_left = boundingClientRect.left;
        editor.recentBoundingClientRect_top = boundingClientRect.top;
        editor.recentBoundingClientRect_isNull = false;
    }

    let rY = event_clientY - editor.recentBoundingClientRect_top + EDI_lastReadNumber_scrollTop;
    let rX = event_clientX - editor.recentBoundingClientRect_left - editor.gutterWidthTotal + EDI_lastReadNumber_scrollLeft;

    let indexLine = Math.floor(rY / editor.lineHeight);
    let indexColumn = Math.round(rX / EDI_characterWidth);

    if (indexLine < 0) return;
    if (indexColumn < 0) return;
    if (indexLine >= editor.lineEndPositionList_count) return;
    // ----
    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);
    if (indexColumn > lastValidIndexColumn) return;

    ///////////
    ///////////
    // # GET INDICES
    ///////////
    ///////////

    // Indices are wrong... they're likely outdated
    if (editor.mousemove_eventListener_isActive === 0) {
        //window.myAPI.editorHoverRequest(indexLine, indexColumn);
    }
}

function EDI_hideTooltip() {
    TOOLTIP_hide();
}

function EDI_onfocus() {
    editor.editorHasFocus = 1;
    editor.clipboard_may_have_changed = 1;
}

function EDI_onblur() {
    editor.editorHasFocus = 0;
    editor.clipboard_may_have_changed = 1;
}

/**
 * Returns the underlying uint8array that contains the encoded characters for the text.
 * The uint8array's capacity (i.e.: length) is not what should be saved out.
 * Instead only save the countOfBytesInUse.
 * 
 * The editor stores all line endings as '\n'.
 * When saving the bytes, swap out any '\n' for the 'lineEndString' which may or may not be '\n' (i.e.: it could be '\r\n' or '\r').
 * 
 * A '\0' character does NOT terminate the subarray's bytes that are in use.
 * You need to iterate specifically for 'countOfBytesInUse'.
 * 
 * @param {*} NOTfinalizePendingEdits if there is a pending edit, it needs to be finalized in order to see the updated text. The default behavior is to finalize the pending edits. To use default behavior, do NOT provide the parameter, or provide a falsey expression like 'null'.
 * @returns
 */
export function EDI_getFinalizedEditsAndRawSaveFileData(NOTfinalizePendingEdits) {
    if (!NOTfinalizePendingEdits) {
        EDI_finalizeEdit();
    }
    return {
        uint8arrayTextBytes: EDI_textByteList_bytes,
        countOfBytesInUse: editor.textByteList_count,
        lineEndString: EDI_lineEndString,
        fileStartsWithBom: Boolean(editor.fileStartsWithBom)
    };
}
//#endregion

//#region mousemove
//#endregion

export function EDI_toExtensionKind(extensionWithPeriod) {
    switch (extensionWithPeriod) {
        case '.js':
        case '.cjs':
            return 1 /*ExtensionKind.JavaScript: 1*/;
        default:
            return 0 /*ExtensionKind.None: 0*/;
    }
}

function EDI_registerHandlers() {
    EDI_scroll_viewport.addEventListener('scroll', EDI_scrollViewport_scroll, { passive: true });
    // TODO: text area to capture all the languages
    editor.baseElement.addEventListener('keydown', EDI_onKeyDown);

    editor.baseElement.addEventListener('mousedown', EDI_onMouseDown);

    //editor.baseElement.addEventListener('contextmenu', EDI_onContextMenu);
    window.addEventListener('resize', EDI_onResize);

    //editor.baseElement.addEventListener('mouseover', EDI_mouseOver);
    //editor.baseElement.addEventListener('mouseleave', EDI_mouseLeave);

    editor.baseElement.addEventListener('focus', EDI_onfocus);
    editor.baseElement.addEventListener('blur', EDI_onblur);
}
//#endregion

//#region textByteList
/**
 * @param {number} index 
 * @param {Uint8Array} incomingBs the incoming bytes, name avoids confusion with EDI_textByteList_bytes
 * @param {number} offset the offset to begin reading from
 * @param {number} length the amount of bytes to read
 */
function EDI_textByteList_insertBytes(index, incomingBs, offset, length) {
    // 1. Validate that the source parameters are within the actual bounds of incomingBs
    if (offset < 0 || length < 0 || offset + length > incomingBs.length) {
        throw new RangeError(
            //`Invalid source bounds: offset ${offset} and length ${length} exceed incomingBs.length of ${incomingBs.length}.`
        );
    }

    // 2. Validate that the target insertion index makes sense
    if (index < 0 || index > editor.textByteList_count) {
        throw new RangeError(
            //`Invalid insertion index: index ${index} must be between 0 and current count ${editor.textByteList_count}.`
        );
    }

    EDI_textByteList_ensureCapacityForInsertion(index, length);

    if (index !== editor.textByteList_count) {
        EDI_textByteList_copyTo(EDI_textByteList_bytes, index, EDI_textByteList_bytes, index + length, editor.textByteList_count - index);
    }

    // TODO: Google AI is telling me:
    // < In JavaScript, calling .subarray(0, incomingBs.length) on a TypedArray does not duplicate memory or create a heavy object.
    // < It is already optimized under the hood.
    // < ...
    // < You can simplify your code back down to a single line without losing any performance:
    // < ...
    //
    const segmentToInsert = (offset === 0 && offset + length === incomingBs.length)
        ? incomingBs
        : incomingBs.subarray(offset, offset + length);
    EDI_textByteList_bytes.set(segmentToInsert, index);

    editor.textByteList_count += length;
}
/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_textByteList_removeAt(index, count) {
    if (index > editor.textByteList_count) { throw new Error('removeAt(...): index > editor.textByteList_count'); }
    if (index + count > editor.textByteList_count) { throw new Error('removeAt(...): index + count > editor.textByteList_count'); }
    if (count === 0) { return; }

    if (index + count === editor.textByteList_count) {
        let shiftableCount = editor.textByteList_count - (index + count);
        if (shiftableCount > 0) {
            EDI_textByteList_copyTo(
                EDI_textByteList_bytes,
                index + count,
                EDI_textByteList_bytes,
                index,
                shiftableCount);
        }
    }
    else {
        EDI_textByteList_copyTo(
            EDI_textByteList_bytes,
            index + count,
            EDI_textByteList_bytes,
            index,
            editor.textByteList_count - (index + count));
    }

    editor.textByteList_count -= count;
}
/**
 * 
 * @param {number} sourceStart 
 * @param {number} destinationStart 
 * @param {number} length 
 */
function EDI_textByteList_duplicateWithin(sourceStart, destinationStart, length) {
    if (sourceStart + length > destinationStart) {
        // TODO: This perhaps could result in the initial 'copyTo' step that creates space within the array, having clobbered the source.
        //
        // TODO: I'm gonna throw an error if 'sourceStart + length > destinationStart' that should let me do the simple duplicate case and then go from there.
        //
        // TODO: When copying text you only need to remember the positions maybe, and then if the user loses focus of the app...
        // ...only then would you need to create text from their selection in case they intend to paste to an external app...
        // ...otherwise paste could just be a copyWithin if copy and paste only occurs within the app itself?
        //
        throw new Error('TODO: sourceStart + length > destinationStart');
    }

    EDI_textByteList_ensureCapacityForInsertion(destinationStart, length);

    if (destinationStart !== editor.textByteList_count) {
        EDI_textByteList_copyTo(EDI_textByteList_bytes, destinationStart, EDI_textByteList_bytes, destinationStart + length, editor.textByteList_count - destinationStart);
    }

    EDI_textByteList_copyTo(EDI_textByteList_bytes, sourceStart, EDI_textByteList_bytes, destinationStart, length);

    editor.textByteList_count += length;
}
function EDI_textByteList_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(editor.textByteList_count + count, index);

    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= editor.textByteList_capacity) {
        return;
    }

    let capacityNew = editor.textByteList_capacity;

    // 1. Scale geometrically by 1.125x (current + current / 8)
    capacityNew = capacityNew + (capacityNew >> 3);

    // 2. Minimum growth step: Ensure it grows by at least 1024 bytes 
    //    so small files don't reallocate on every single keystroke.
    const minGrowth = editor.textByteList_capacity + 1024;
    if (capacityNew < minGrowth) {
        capacityNew = minGrowth;
    }

    // 3. Safety fallback for massive inserts (e.g., large copy/paste):
    //    If capacityNew still doesn't fit requiredCapacity, pad requiredCapacity 
    //    by 1024 bytes so the user can keep typing immediately after pasting.
    if (capacityNew < requiredCapacity) {
        capacityNew = requiredCapacity + 1024;
    }

    // Safety check against integer overflow / negative bounds
    if (capacityNew < editor.textByteList_capacity) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let bytesNew = new Uint8Array(capacityNew);
    EDI_textByteList_copyTo(EDI_textByteList_bytes, 0, bytesNew, 0, editor.textByteList_count);

    // Commit the changes to your global/module state
    EDI_textByteList_bytes = bytesNew;
    editor.textByteList_capacity = capacityNew;
}
/**
 * inclusive/exclusive
 */
function EDI_textByteList_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
    if (bytesSource === bytesDestination) {
        if (bytesSource !== EDI_textByteList_bytes) {
            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_textByteList_bytes');
        }

        EDI_textByteList_bytes.copyWithin(destinationStart, sourceStart, sourceStart + length);
    }
    else {
        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
    }
}
//#endregion

//#region EDI_styleBuffer
/**
 * TODO: if you are just inserting 0's add a function for that or maybe a function for anything and then you're inserting it at each position for a length from an offset.
 * 
 * @param {number} index 
 * @param {Uint8Array} incomingBs the incoming bytes, name avoids confusion with EDI_styleBuffer
 * @param {number} offset the offset to begin reading from
 * @param {number} length the amount of bytes to read
 */
function EDI_styleBuffer_insertBytes(index, incomingBs, offset, length) {
    // 1. Validate that the source parameters are within the actual bounds of incomingBs
    if (offset < 0 || length < 0 || offset + length > incomingBs.length) {
        throw new RangeError(
            //`Invalid source bounds: offset ${offset} and length ${length} exceed incomingBs.length of ${incomingBs.length}.`
        );
    }

    // 2. Validate that the target insertion index makes sense
    if (index < 0 || index > editor.styleBuffer_count) {
        throw new RangeError(
            //`Invalid insertion index: index ${index} must be between 0 and current count ${editor.styleBuffer_count}.`
        );
    }

    EDI_styleBuffer_ensureCapacityForInsertion(index, length);

    if (index !== editor.styleBuffer_count) {
        EDI_styleBuffer_copyTo(EDI_styleBuffer, index, EDI_styleBuffer, index + length, editor.styleBuffer_count - index);
    }

    // TODO: Google AI is telling me:
    // < In JavaScript, calling .subarray(0, incomingBs.length) on a TypedArray does not duplicate memory or create a heavy object.
    // < It is already optimized under the hood.
    // < ...
    // < You can simplify your code back down to a single line without losing any performance:
    // < ...
    //
    const segmentToInsert = (offset === 0 && offset + length === incomingBs.length)
        ? incomingBs
        : incomingBs.subarray(offset, offset + length);
    EDI_styleBuffer.set(segmentToInsert, index);

    editor.styleBuffer_count += length;
}
/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_styleBuffer_removeAt(index, count) {
    if (index > editor.styleBuffer_count) { throw new Error('removeAt(...): index > editor.styleBuffer_count'); }
    if (index + count > editor.styleBuffer_count) { throw new Error('removeAt(...): index + count > editor.styleBuffer_count'); }
    if (count === 0) { return; }

    if (index + count === editor.styleBuffer_count) {
        let shiftableCount = editor.styleBuffer_count - (index + count);
        if (shiftableCount > 0) {
            EDI_styleBuffer_copyTo(
                EDI_styleBuffer,
                index + count,
                EDI_styleBuffer,
                index,
                shiftableCount);
        }
    }
    else {
        EDI_styleBuffer_copyTo(
            EDI_styleBuffer,
            index + count,
            EDI_styleBuffer,
            index,
            editor.styleBuffer_count - (index + count));
    }

    editor.styleBuffer_count -= count;
}
function EDI_styleBuffer_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(editor.styleBuffer_count + count, index);

    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= editor.styleBuffer_capacity) {
        return;
    }

    let capacityNew = editor.styleBuffer_capacity;

    // 1. Scale geometrically by 1.125x (current + current / 8)
    capacityNew = capacityNew + (capacityNew >> 3);

    // 2. Minimum growth step: Ensure it grows by at least 1024 bytes 
    //    so small files don't reallocate on every single keystroke.
    const minGrowth = editor.styleBuffer_capacity + 1024;
    if (capacityNew < minGrowth) {
        capacityNew = minGrowth;
    }

    // 3. Safety fallback for massive inserts (e.g., large copy/paste):
    //    If capacityNew still doesn't fit requiredCapacity, pad requiredCapacity 
    //    by 1024 bytes so the user can keep typing immediately after pasting.
    if (capacityNew < requiredCapacity) {
        capacityNew = requiredCapacity + 1024;
    }

    // Safety check against integer overflow / negative bounds
    if (capacityNew < editor.styleBuffer_capacity) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let bytesNew = new Uint8Array(capacityNew);
    EDI_styleBuffer_copyTo(EDI_styleBuffer, 0, bytesNew, 0, editor.styleBuffer_count);

    // Commit the changes to your global/module state
    EDI_styleBuffer = bytesNew;
    editor.styleBuffer_capacity = capacityNew;
}
/**
 * inclusive/exclusive
 */
function EDI_styleBuffer_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
    if (bytesSource === bytesDestination) {
        if (bytesSource !== EDI_styleBuffer) {
            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_styleBuffer');
        }

        EDI_styleBuffer.copyWithin(destinationStart, sourceStart, sourceStart + length);
    }
    else {
        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
    }
}
//#endregion

//#region lineEndPositionList
/**
 * This function is manually inlined and modified for performance within 'EDI_state_setText_byteArray'.
 * Within the for loop, and immediately after the for loop to handle EOF.
 * Neither the for loop nor the EOF handling is 1 to 1 at the moment. They differ slightly.
 */
function EDI_lineEndPositionList_insert(lineIndex, position, lineLengthVisual) {
    EDI_lineEndPositionList_ensureCapacityForInsertion(lineIndex, 1);

    // 1. First, tell the heap to increment the indices of all lines *at or after* lineIndex.
    // This makes a logical "hole" in the heap's index mapping.
    EDI_trackingUint32MaxHeap.batchInsertLines(lineIndex, 1);

    // 2. Shift your linear text data arrays down to open a hole in your document structure
    if (lineIndex !== editor.lineEndPositionList_count) {
        EDI_lineEndPositionList_copyTo(EDI_lineEndPositionList_data, lineIndex, EDI_lineEndPositionList_data, lineIndex + 1, editor.lineEndPositionList_count - lineIndex);
    }

    // 3. Now it is safe to insert the new line into the heap.
    // It will take the newly vacated lineIndex.
    EDI_trackingUint32MaxHeap.insert(lineIndex, lineLengthVisual);

    // 4. Update the linear data metrics
    EDI_lineEndPositionList_data[lineIndex] = position;
    editor.lineEndPositionList_count++;

    // TODO: probably remove this and let the invoker do it themselves if warranted.
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
        editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
        editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
    }
}

/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_lineEndPositionList_removeAt(index, count) {
    if (index > editor.lineEndPositionList_count) { throw new Error('removeAt(...): index > editor.lineEndPositionList_count'); }
    if (index + count > editor.lineEndPositionList_count) { throw new Error('removeAt(...): index + count > editor.lineEndPositionList_count'); }
    if (count === 0) { return; }

    const endDeletedRange = index + count;

    // 1. Process the heap internally (it compacts, re-heapifies, and re-syncs its own map)
    EDI_trackingUint32MaxHeap.batchRemoveLines(index, count);

    let shiftableCount = editor.lineEndPositionList_count - endDeletedRange;
    if (shiftableCount > 0) {
        EDI_lineEndPositionList_copyTo(
            EDI_lineEndPositionList_data,
            endDeletedRange,
            EDI_lineEndPositionList_data,
            index,
            shiftableCount
        );
    }

    editor.lineEndPositionList_count -= count;

    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (editor.longestLine_length !== EDI_trackingUint32MaxHeap.unpack_pool_length || editor.longestLine_indexLine !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
        editor.longestLine_indexLine = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
        editor.longestLine_length = EDI_trackingUint32MaxHeap.unpack_pool_length;
    }
}
function EDI_lineEndPositionList_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(editor.lineEndPositionList_count + count, index);

    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= editor.lineEndPositionList_capacity) {
        return;
    }

    // Calculate the new capacity by doubling until it fits
    let capacityNew = editor.lineEndPositionList_capacity || 1; // Prevent infinite loops if capacity is 0
    while (capacityNew < requiredCapacity) {
        capacityNew *= 2;
    }

    // Safety check against integer overflow / negative bounds
    if (capacityNew < editor.lineEndPositionList_capacity) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let dataNew = new Uint32Array(capacityNew);
    EDI_lineEndPositionList_copyTo(EDI_lineEndPositionList_data, 0, dataNew, 0, editor.lineEndPositionList_count);
    // Commit the changes to your global/module state
    EDI_lineEndPositionList_data = dataNew;
    editor.lineEndPositionList_capacity = capacityNew;
}
/**
 * inclusive/exclusive
 */
function EDI_lineEndPositionList_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
    if (bytesSource === bytesDestination) {
        if (bytesSource !== EDI_lineEndPositionList_data) {
            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_lineEndPositionList_data');
        }

        EDI_lineEndPositionList_data.copyWithin(destinationStart, sourceStart, sourceStart + length);
    }
    else {
        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
    }
}
//#endregion

// Extremely important softlock possibility: see documentation comment for 'EDI_finalizeEdit()'.
// Retrospectively I'd say... I imagine there'd be more than one scenario of this I have a lot of 'critical booleans'.
// i.e.: if you enter the 'critical boolean guarded code path' then throw an exception in the middle of that code path with bad state for the 'critical boolean guarded code path' you might never be able to enter it again.
// i.e.: I don't see this happen myself unless I'm messing with new code and running the code that I am in progress of writing. But I don't have a try catch so if an error were to occur it'd completely softlock things.

/*
###################################
# Wording related to "indexLine": #
###################################

- indexLine        // The line number of '1' corresponds to the '0' indexLine; The end position of this line is located at index '0' within 'EDI_lineEndPositionList'.
- virtualIndexLine // If you map the indexLine to an index that exists from virtualIndex to (virtualIndex + virtualCount - 1); both sides are inclusive;
                   // Then you could imagine that the UI has HTML divs available to be rendered into.
                   // And that this 'virtualIndexLine' says: "given my indexLine, is this being shown in the UI?"
                   // BUT there is more to this, you next have to consider the position of the ringBuffer.

Why is it not a 'lineIndex' wording pattern?

It tends to be the case that you are working with an 'index'
so the inclusion of that word is rather unimportant when reading over the code.

I actually think 'lineIndex' "rolls off the tongue" a little easier.
But if you apply the pattern it hides the word 'line'.
And the importance when reading the code lies with the words 'line' and 'column'.

- [ ] When getting the ringBufferIndex of anything that follows this pattern you don't check whether the underlying data has a large enough count, it is solely related to whether the itemHeight and height of the element can fit "that many divs".
    - [ ] TreeView
    - [ ] List
- [ ] When creating divs for the viewport you follow up by drawing the viewport afterwards.
    - [ ] Thus the creation of divs ought to be fully ignoring any excessive calculations because its style is just overriden immediately afterwards.
*/

/*
###################################################################
# Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex': #
###################################################################

// TODO: This is an awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'...
// ...the initial declaration of 'let ringBufferIndex' is assigned what I refer to as the "virtualIndex"
// but 'ringBufferIndex' is the output of the function, and a 'virtualIndex' variable is only needed temporarily
// for the calculation. So by storing the 'virtualIndex' in 'ringBufferIndex' at the start I skip a variable declaration.
|
(retrospective comment): I see what I was doing.
It isn't just the single variable declaration.
You can't do the modulo logic UNLESS the virtual index is valid (that the line of text is actually being drawn in the UI).
BUT I think this was an assumption on my end.
I wonder if the modulo math would work out such that I could...
well I guess I'd need to add an if to verify that the modulo math went correctly
thus the same thing happens but now I can't just re-use that I'm virtual index first then you're safe thus the if else part...
*/

// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// editorGlobal_edit.js
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========
// ==========


/**
 * !!!!
 * Keep any variables in editorGlobal_edit.js at the top of the file.
 * !!!!
 */

/**
 * 
 * Google AI:
 * ==========
 * Seeing your full EDI_render_do structure changes the landscape completely.
 * Because your queue handles structural document mutations (InsertLtr, BackspaceRtl, Enter, SetText) alongside purely visual updates (Scroll, Cursor_n),
 * you cannot use a simplistic bitmask flag approach. A bitmask would destroy the chronological execution sequence required to keep your text state accurate
 * (e.g., you cannot accidentally process a cursor update before processing the character insertion that created its new position).
 * 
 * However, looking directly at your architecture reveals a major layout thrashing and compounding performance problem lurking within this while loop.
 * 
 * ...
 * 
 * If a user pastes text or hits a hotkey that queues up multiple events (e.g., [RemoveSelection, InsertLtr, Cursor_n, Scroll]),
 * your loop executes them sequentially inside a single frame.
 * 
 * If EDI_render_do_InsertLtr() modifies the DOM (adds or alters text div elements), and then the loop immediately moves to the next item EDI_render_do_Scroll() or EDI_drawCursor() and
 * reads viewport/element dimensions (getBoundingClientRect, offsetTop, scrollLeft), you will cause a massive Layout Thrash.
 * The browser is forced to halt JavaScript execution, calculate the fresh layout for the mutation, and repeat this cycle multiple times inside a single while loop pass.
 * 
 * ...
 * 
 * To keep your sequential integrity but achieve peak V8 execution speed, you should separate your state processing from your visual rendering.
 * 
 * Instead of letting the queue trigger heavy DOM layout mutations and reads interchangeably, split the execution into two localized passes:
 * 
 * 1. Pass 1 (The Loop): Drain the queue to mutate the text model, virtual state buffers, and flag what structural components need visual updates.
 * 2. Pass 2 (The Flush): Apply the concrete layout changes, draw the cursor once, and execute the scroll viewport updates in a strictly controlled, batch-optimized order.
 * 
 * We can use a localized bitmask internally just for the scope of a single frame update. This avoids duplicate visual paints and forces layout-reading actions to wait until layout-mutating actions have settled completely.
 * 
 * ...
 * ==========
 * 
 * ----
 * 
 * The scroll for the editor is extremely high overhead relative to the other scrolling UI in the app.
 * I've moved all the EDI_render_do and EDI_render_do_Scroll bytes to the f.INTS array
 * so there's one less array to look at.
 * And I've moved the related fEDI constants so that they're all the first entries in the f.INTS array itself.
 * I have no source for this to be completely honest.
 * I just have always wanted to do it based on intuition alone to see how it feels.
 * I need to actually measure it.
 * For all I know maybe you can read a byte so by forcing it into a uint32 you're making the CPU read more data overall. I have no idea.
 */
function EDI_render_do() {
    // Process everything in the queue until head catches up to tail
    while (editor.queueHead !== editor.queueTail) {
        // Read the item at the head and advance the head pointer safely
        const renderKind = EDI_renderKindBuffer[editor.queueHead & f.BUFFER_MASK];
        editor.queueHead++;

        switch (renderKind) {
            case 1 /*RenderKind.Scroll: 1*/:
                EDI_render_do_Scroll();
                break;
            case 2 /*RenderKind.Resize: 2*/:
                EDI_render_do_Resize();
                break;
            case 3 /*RenderKind.InsertLtr: 3*/:
                EDI_render_do_InsertLtr();
                break;
            case 4 /*RenderKind.TabKey: 4*/:
                EDI_render_do_TabKey();
                break;
            case 5 /*RenderKind.IndentMore: 5*/:
                EDI_render_do_IndentMore();
                break;
            case 6 /*RenderKind.IndentLess: 6*/:
                EDI_render_do_IndentLess();
                break;
            case 7 /*RenderKind.BackspaceRtl: 7*/:
                EDI_render_do_Backspace();
                break;
            case 8 /*RenderKind.DeleteLtr: 8*/:
                EDI_render_do_Delete();
                break;
            case 9 /*RenderKind.RemoveSelection: 9*/:
                EDI_render_do_RemoveSelection();
                break;
            case 10 /*RenderKind.Enter: 10*/:
                EDI_render_do_EnterKey();
                break;
            case 11 /*RenderKind.DuplicateOrPaste: 11*/:
                EDI_render_do_DuplicateOrPaste();
                break;
            case 12 /*RenderKind.Clear: 12*/:
                EDI_render_do_Clear();
                break;
            case 13 /*RenderKind.SetText: 13*/:
                EDI_render_do_SetText();
                break;
            case 14 /*RenderKind.CreateViewport: 14*/:
                EDI_render_do_CreateViewport();
                break;
            case 15 /*RenderKind.SyntaxHighlighting: 15*/:
                EDI_render_do_ResetSyntaxHighlighting();
                break;
            case 16 /*RenderKind.Cursor_flag_scrollIntoViewExplicit: 16*/:
                EDI_render_do_cursor_flag_scrollIntoViewExplicit();
                break;
            case 17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/:
                EDI_drawCursor(/*NOTscrollCursorIntoView*/ true);
                break;
            case 18 /*RenderKind.Cursor_n: 18*/:
                EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
                break;
        }
    }
    
    editor.isRenderPending = false;
}

/**
 * Google AI:
 * ==========
 * This works beautifully if you get Scroll -> Scroll -> Scroll. The second and third scroll requests are skipped.
 * 
 * However, in a real text editor, browsers fire alternate event streams during continuous scrolling or mouse dragging. For example, you will frequently get a stream of events like this:
 * 
 * Because RenderKind.Cursor breaks the consecutive chain of RenderKind.Scroll items, your check fails to catch the duplicate.
 * Your ring buffer will rapidly fill up with alternating requests (Scroll -> Cursor -> Scroll -> Cursor).
 * When requestAnimationFrame(EDI_render_do) finally executes, it will process a bloated queue containing redundant operations,
 * completely defeating your optimization.
 * 
 * How to achieve absolute optimization
 * 
 * The Bitmask Implementation
 * ==========
 */
export function EDI_render_request(renderKind) {
    // Check if the queue is empty
    if (editor.queueHead !== editor.queueTail) {
        // Get the last inserted item's index
        const lastIndex = (editor.queueTail - 1) & f.BUFFER_MASK;
        // De-duplicate: if it's the same renderKind, skip adding it
        if (EDI_renderKindBuffer[lastIndex] === renderKind) {
            return;
        }
    }

    // Insert the item at the tail and advance the tail pointer
    EDI_renderKindBuffer[editor.queueTail & f.BUFFER_MASK] = renderKind;
    editor.queueTail++;
    
    if (!editor.isRenderPending) {
        editor.isRenderPending = true;
        requestAnimationFrame(EDI_render_do);
    }
}

function EDI_resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;

    // 1. Get the real bounding dimensions of your visible viewport frame
    const viewportRect = editor.viewport.getBoundingClientRect();
    const viewWidth = viewportRect.width;
    const viewHeight = viewportRect.height;

    // Define a fixed layout width for your gutter
    const gutterLayoutWidth = 60;

    // --- 2. CONFIG DIGEST FOR GUTTER CANVAS ---
    const gutterCanvas = editor.gutter_canvas;
    // Set the CSS display size (how much room it occupies on screen)
    gutterCanvas.style.width = gutterLayoutWidth + 'px';
    gutterCanvas.style.height = viewHeight + 'px';
    // Set the internal hardware drawing resolution (multiplied by DPR)
    gutterCanvas.width = gutterLayoutWidth * dpr;
    gutterCanvas.height = viewHeight * dpr;

    // --- 3. CONFIG DIGEST FOR TEXT CANVAS ---
    const textCanvas = document.getElementById('EDI_text_canvas');
    const textLayoutWidth = viewWidth - gutterLayoutWidth;
    textCanvas.style.width = textLayoutWidth + 'px';
    textCanvas.style.height = viewHeight + 'px';
    textCanvas.width = textLayoutWidth * dpr;
    textCanvas.height = viewHeight * dpr;

    // --- 4. SCALE THE DRAWING CONTEXTS ---
    // This step ensures your drawing coordinates (like fillText X/Y) 
    // remain working in standard layout pixels, while the engine handles the high-DPI pixel math
    const ctxGutter = gutterCanvas.getContext('2d');
    ctxGutter.scale(dpr, dpr);
    // Re-apply your styles here since changing width/height resets canvas states!
    ctxGutter.font = '14px monospace';
    ctxGutter.textBaseline = 'top';
    ctxGutter.textAlign = 'right'; // 1. Set alignment once before your line-drawing loop
    ctxGutter.fillStyle = '#007036';
    ctxGutter.fillRect(0, 0, gutterCanvas.width, gutterCanvas.height); 
    ctxGutter.fillStyle = '#858585';
    //ctxGutter.;

    const ctxText = textCanvas.getContext('2d');
    ctxText.scale(dpr, dpr);
    ctxText.font = '14px monospace';
    ctxText.textBaseline = 'top';
    ctxText.fillStyle = '#ffffff';
    


    const metrics = ctxGutter.measureText('M'); // 'M' or '1' are great standard height references
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    //console.log('The exact height of the text is:', textHeight);

    const fontHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const linePadding = 6; // Total padding between lines
    editor.lineHeight = fontHeight + linePadding;



    // The exact pixel width of every single character in a monospace font
    const charWidth = ctxText.measureText('M').width;
    EDI_characterWidth = charWidth;

    // Run once during setup / font configuration
    //ctx.font = '14px monospace';

    //const metrics = ctx.measureText('M');
    const fontActualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    // If local_lineHeight is 24px and fontActualHeight is 14px, your vertical midpoint padding is 12px

    editor.lastReadNumber_offsetWidth = Math.floor(editor.text.offsetWidth);
    editor.lastReadNumber_offsetHeight = Math.floor(editor.text.offsetHeight);

    editor.virtualCount = Math.ceil(editor.lastReadNumber_offsetHeight / editor.lineHeight);

    //EDI_character_count_that_fits_view = Math.ceil(editor.lastReadNumber_offsetWidth / EDI_characterWidth);



    // --- CONFIG DIGEST FOR CURSOR CANVAS ---
    const cursorCanvas = document.getElementById('EDI_cursor_canvas');
    cursorCanvas.style.width = textLayoutWidth + 'px';
    cursorCanvas.style.height = viewHeight + 'px';
    cursorCanvas.width = textLayoutWidth * dpr;
    cursorCanvas.height = viewHeight * dpr;

    const ctxCursor = cursorCanvas.getContext('2d');
    ctxCursor.scale(dpr, dpr);
    
    // Set your editor's cursor color profile
    ctxCursor.fillStyle = '#528bff'; // A nice modern blue cursor, or white (#ffffff)

    EDI_lineStringCache = new Array(editor.virtualCount);
    EDI_line_NUMBER_StringCache = new Array(editor.virtualCount);
    editor.ArrayFrom_textElement_children_length = editor.virtualCount;

    const aaa = editor.virtualCount;
    for (let i = 0; i < aaa; i++) {
        EDI_lineStringCache[i] = [];
        //EDI_line_NUMBER_StringCache[i] = 0;
    }
    
    EDI_render_force_fullscreen_redraw();
}

/**
 * TODO: This logic is very unfortunate.
 * ...
 * I want to move essentially all of it to be rAF.
 * 
 * Specifically my concern is with a mouse down event.
 * 
 * If you scroll, the scrollTop immediately is modified of the container.
 * 
 * Then a scroll event is queued.
 * 
 * This function is the resulting code that gets ran from the event.
 * 
 * This code does some things.
 * 
 * Then rAF.
 * 
 * If I scroll, then mouse down.
 * 
 * If the scroll and mouse down events are handled prior to my rAF
 * 
 * and I've moved all the editor.virtualIndexLine logic from here to the rAF
 * then the user will "click the wrong line".
 * 
 * "I don't want to limit the speed of editing to that of the screen's refresh rate"
 * 
 * Thus the event handling code does some things immediately pertaining to the edit.
 * And only afterwards does the rAF to show the changes on the UI.
 * 
 * But if I move all this scroll logic then I've essentially forced myself to do that.
 * Unless I have logic that checks for a pending scroll in the rAF and then forces it to complete or something.
 * 
 * You have to think in two states:
 * - raw layout
 * - paint
 * 
 * I'm not sure what words I want for these states but that's what comes to mind.
 * When you scroll the scrollTop immediately is changed. Mousedown needs the "raw layout" scrolltop.
 * 
 * When you draw the resulting UI of a keypress that inserts a character however you want the "paint"
 * you want the last thing that you drew to the screen whether the text being edited appears on screen if so edit the UI accordingly
 * to reflect the edit.
 */
function EDI_scrollViewport_scroll() {
    EDI_lastReadNumber_scrollLeft = EDI_scroll_viewport.scrollLeft;
    EDI_lastReadNumber_scrollTop = EDI_scroll_viewport.scrollTop;
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
}

function EDI_render_specific_recache_REMOVAL(recycled_itemIndex, linesRemovedCount, availableRingBufferNodesVisuallyAfterCollapsedOne, recycled_ringBufferIndex, fakeLineIndices) {
    let ringBufferIndex = recycled_ringBufferIndex - 1;
    let lineIndex = recycled_itemIndex + linesRemovedCount;

    const local_ArrayFrom_textElement_children_length = editor.ArrayFrom_textElement_children_length;
    const cache = EDI_lineStringCache;
    const cacheNUMBERS = EDI_line_NUMBER_StringCache;

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_lineEndPositionList_count = editor.lineEndPositionList_count;

    const local_bytes = EDI_textByteList_bytes;
    const local_styles = EDI_styleBuffer; // Your matching parallel array
    const local_EDI_tokenColors = f.EDI_tokenColors;

    const local_EDI_decoder_CUSTOM = EDI_decoder_CUSTOM;

    // If you intend to use the variables 'new_lineStart' or 'new_lineEnd': Important detail to consider: the lines that are >= editor.lineEndPositionList_count will continually increment new_lineStart by 1 So if you expect this to accurately represent the EOF position when it is in view, it probably does NOT.
    let new_lineStart = 0;
    let new_lineEnd = -1;
    let new_lowerBound = lineIndex;
    if (new_lowerBound < local_EDI_lineEndPositionList_count && new_lowerBound !== 0) {
        new_lineEnd = local_EDI_lineEndPositionList_data[new_lowerBound - 1];
    }

    // Render pure line numbers
    const upperLimit = availableRingBufferNodesVisuallyAfterCollapsedOne;
    for (let i = 0; i < upperLimit; i++) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        const lineSpans = cache[ringBufferIndex];

        // THIS WILL CALCULATE THE TEXT OF THE LINENUMBER AND THE LINE OF TEXT ITSELF
        // AND ONLY DO SO FOR THE NEWLY SCROLLED INTO VIEW LINES
            
        const indexLine = lineIndex + i;
        new_lineStart = new_lineEnd + 1;
        if (indexLine < local_EDI_lineEndPositionList_count) {
            if (fakeLineIndices) {
                cacheNUMBERS[ringBufferIndex] = String(indexLine + 1 - linesRemovedCount);
            }
            else {
                cacheNUMBERS[ringBufferIndex] = String(indexLine + 1);
            }
            new_lineEnd = local_EDI_lineEndPositionList_data[indexLine];
        } else {
            cacheNUMBERS[ringBufferIndex] = '~';
            new_lineEnd = new_lineStart;
        }
            
        // IF THE LINE CONTAINS CHARACTERS
        if (new_lineStart !== new_lineEnd) {
            // Execute a single loop invocation for the entire line text data
            local_EDI_decoder_CUSTOM.decodeLineTokens(
                new_lineStart,
                new_lineEnd,
                lineSpans,
                local_EDI_tokenColors,
                local_bytes,
                local_styles
            );
        }
        // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
        else {
            if (lineSpans.length > 0) {
                const existingSpan = lineSpans[0];
                existingSpan.text = '';
                existingSpan.color = local_EDI_tokenColors[0] || '#ffffff'; // Fallback to standard color
                lineSpans.length = 1;
            }
            else {
                lineSpans.push({
                    text: '',
                    color: local_EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
                });
            }
        }
    }
    EDI_render_do_Scroll();
}

function EDI_render_specific_recache_INSERTION(recycled_itemIndex, linesRemovedCount, availableRingBufferNodesVisuallyAfterCollapsedOne, recycled_ringBufferIndex, fakeLineIndices) {
    let ringBufferIndex = recycled_ringBufferIndex - 1;
    let lineIndex = recycled_itemIndex + linesRemovedCount;

    const local_ArrayFrom_textElement_children_length = editor.ArrayFrom_textElement_children_length;
    const cache = EDI_lineStringCache;
    const cacheNUMBERS = EDI_line_NUMBER_StringCache;

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_lineEndPositionList_count = editor.lineEndPositionList_count;

    const local_bytes = EDI_textByteList_bytes;
    const local_styles = EDI_styleBuffer; // Your matching parallel array
    const local_EDI_tokenColors = f.EDI_tokenColors;

    const local_EDI_decoder_CUSTOM = EDI_decoder_CUSTOM;

    // If you intend to use the variables 'new_lineStart' or 'new_lineEnd': Important detail to consider: the lines that are >= editor.lineEndPositionList_count will continually increment new_lineStart by 1 So if you expect this to accurately represent the EOF position when it is in view, it probably does NOT.
    let new_lineStart = 0;
    let new_lineEnd = -1;
    let new_lowerBound = lineIndex;
    if (new_lowerBound < local_EDI_lineEndPositionList_count && new_lowerBound !== 0) {
        new_lineEnd = local_EDI_lineEndPositionList_data[new_lowerBound - 1];
    }

    // Render pure line numbers
    const upperLimit = availableRingBufferNodesVisuallyAfterCollapsedOne;
    for (let i = 0; i < upperLimit; i++) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        const lineSpans = cache[ringBufferIndex];

        // THIS WILL CALCULATE THE TEXT OF THE LINENUMBER AND THE LINE OF TEXT ITSELF
        // AND ONLY DO SO FOR THE NEWLY SCROLLED INTO VIEW LINES
            
        const indexLine = lineIndex + i;
        new_lineStart = new_lineEnd + 1;
        if (indexLine < local_EDI_lineEndPositionList_count) {
            if (fakeLineIndices) {
                cacheNUMBERS[ringBufferIndex] = String(indexLine + 1 - linesRemovedCount);
            }
            else {
                cacheNUMBERS[ringBufferIndex] = String(indexLine + 1);
            }
            new_lineEnd = local_EDI_lineEndPositionList_data[indexLine];
        } else {
            cacheNUMBERS[ringBufferIndex] = '~';
            new_lineEnd = new_lineStart;
        }
            
        // IF THE LINE CONTAINS CHARACTERS
        if (new_lineStart !== new_lineEnd) {
            // Execute a single loop invocation for the entire line text data
            local_EDI_decoder_CUSTOM.decodeLineTokens(
                new_lineStart,
                new_lineEnd,
                lineSpans,
                local_EDI_tokenColors,
                local_bytes,
                local_styles
            );
        }
        // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
        else {
            if (lineSpans.length > 0) {
                const existingSpan = lineSpans[0];
                existingSpan.text = '';
                existingSpan.color = local_EDI_tokenColors[0] || '#ffffff'; // Fallback to standard color
                lineSpans.length = 1;
            }
            else {
                lineSpans.push({
                    text: '',
                    color: local_EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
                });
            }
        }
    }
    EDI_render_do_Scroll();
}

function EDI_render_do_Scroll() {
    const local_lineHeight = editor.lineHeight;
    editor.virtualIndexLine = EDI_lastReadNumber_scrollTop / local_lineHeight | 0;

    const local_prevVli = editor.ONSCROLLvirtualIndexLine;
    const local_currVli = editor.virtualIndexLine;
    editor.ONSCROLLvirtualIndexLine = local_currVli;

    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }

    let diff = local_currVli - local_prevVli;

    const local_ArrayFrom_textElement_children_length = editor.ArrayFrom_textElement_children_length;
    let new_lowerBound = 0;

    if (diff !== 0) {
        if (diff >= local_ArrayFrom_textElement_children_length || diff <= -local_ArrayFrom_textElement_children_length) {
            new_lowerBound = local_currVli;
            diff = local_ArrayFrom_textElement_children_length; // Bound the loop run to the size of your screen viewport
        }
        else if (diff > 0) {
            new_lowerBound = local_prevVli + local_ArrayFrom_textElement_children_length;
            editor.ringBuffer_indexZero = (editor.ringBuffer_indexZero + diff) % local_ArrayFrom_textElement_children_length;
        }
        else {
            new_lowerBound = local_currVli;
            diff *= -1;
            editor.ringBuffer_indexZero = (editor.ringBuffer_indexZero - diff + local_ArrayFrom_textElement_children_length) % local_ArrayFrom_textElement_children_length;
        }
    }
    else {
        // If diff is 0 (like a pure horizontal scroll), no newly visible lines need decoding
        new_lowerBound = 0;
        diff = 0;
    }

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_lineEndPositionList_count = editor.lineEndPositionList_count;

    // If you intend to use the variables 'new_lineStart' or 'new_lineEnd': Important detail to consider: the lines that are >= editor.lineEndPositionList_count will continually increment new_lineStart by 1 So if you expect this to accurately represent the EOF position when it is in view, it probably does NOT.
    let new_lineStart = 0;
    let new_lineEnd = -1;
    if (new_lowerBound < local_EDI_lineEndPositionList_count && new_lowerBound !== 0) {
        new_lineEnd = local_EDI_lineEndPositionList_data[new_lowerBound - 1];
    }

    const local_bytes = EDI_textByteList_bytes;
    const local_styles = EDI_styleBuffer; // Your matching parallel array
    const local_EDI_tokenColors = f.EDI_tokenColors;

    const local_EDI_decoder_CUSTOM = EDI_decoder_CUSTOM;

    const ctxText = editor.text_canvas.getContext('2d');
    
    const view_startLineIndex = editor.virtualIndexLine;
    const view_upperLineIndexExclusive = view_startLineIndex + editor.virtualCount;

    const topPadding = editor.textTopPadding;

    const cache = EDI_lineStringCache;
    const cacheNUMBERS = EDI_line_NUMBER_StringCache;
    
    let original_vertical = -(EDI_lastReadNumber_scrollTop % local_lineHeight);
    let vertical = original_vertical;

    const new_loopLimit = new_lowerBound + diff;

    // 3. Let your context handle the scroll natively inside the static window
    const ctxGutter = editor.gutter_canvas.getContext('2d');

    ctxGutter.clearRect(0, 0, editor.gutter_canvas.width, editor.gutter_canvas.height);

    ctxGutter.fillStyle = f.APP_colors.gutterBackgroundColor;
    ctxGutter.fillRect(0, 0, editor.gutter_canvas.width, editor.gutter_canvas.height); 
    ctxGutter.fillStyle = f.APP_colors.gutterForegroundColor;

    ctxText.clearRect(0, 0, editor.text_canvas.width, editor.text_canvas.height);

    let ringBufferIndex = editor.ringBuffer_indexZero - 1;

    // 2. Define your right margin (e.g., 8px or 12px away from the editor border)
    // const rightPadding = 10; // I wasn't concerned with this existing just to be used once yet. But since I'm gonna add `lineSpansLength` then I'll inline this is what I'm thinking. `lineSpansLength` is gonna get set within a loop so not quite 1 to 1 but...

    // Use logical CSS width if you scale your context by devicePixelRatio,
    // otherwise use gutterCanvas.width
    const rightEdgeX = 60/*gutterLogicalWidth*/ - 10/*rightPadding*/; // You need a rightEdgeX variable long term because this shouldn't be hardcoded and cannot be hardcoded. You need variable width gutter. So no reason to inline this cause you can't long term.

    // TODO: This loop being combined may or may not be make or break in terms of each individual loop being able to be optimized.
    // ...
    // The original reason was to re-use the check on `if (ringBufferIndex >= local_ArrayFrom_textElement_children_length)`
    // ...
    // and this re-use still does exist... but just something to consider.
    // If it means some degree of deoptimization or lack of optimization that would've otherwise occured then this is a possible massive performance gain.
    // but then if making the change doesn't trigger some kind of optimization then you're just paying for these ringBufferIndex checks "twice" in scenarios where the entire screen redraws / etc...

    // TODO: I see the `editor.gutter_canvas.getContext('2d');`
    // ...
    // but I don't know if I care right now.
    // Cause I'm:
    // - [ ] still sitting on the `.apply()` optimization
    //     - [ ] trying to think it if it is truly the correct answer in this scenario (out of caution)
    // - [ ] and two: those aren't in this for loop
    //
    // That is to say: maybe you could cache 
    // `editor.gutter_canvas.getContext('2d');`
    // to be on editor.gutterCanvas2d or something.
    // But `getContext('2d');` should internally be cached in some way so you're just skipping references is the vibe it gives and you aren't even doing it in a loop
    // I suppose this function in and of itself is a "loop" cause of how hot it is but...

    // I can't figure out how to integrate this joke so I'll just drop a cutaway:
    // "it insists upon itself"

    const editorLastReadNumberOffsetWidth = editor.lastReadNumber_offsetWidth;
    
    // Render pure line numbers
    for (let i = view_startLineIndex; i < view_upperLineIndexExclusive; i++) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        const lineSpans = cache[ringBufferIndex];

        // TODO: This is always contiguous.
        // So you really only need...
        // ...I don't know. But I'm thinking you do a check once then while loop or something
        // but everything is in a function
        // or maybe you set a boolean and then shortCircuit on a boolean for 99% of the time rather than checking these comparisons...
        // Something about this upsets me greatly.
        if (i >= new_lowerBound && i < new_loopLimit) {
            // THIS WILL CALCULATE THE TEXT OF THE LINENUMBER AND THE LINE OF TEXT ITSELF
            // AND ONLY DO SO FOR THE NEWLY SCROLLED INTO VIEW LINES
                
            const indexLine = i;
            new_lineStart = new_lineEnd + 1;
            if (indexLine < local_EDI_lineEndPositionList_count) {
                cacheNUMBERS[ringBufferIndex] = String(indexLine + 1);
                new_lineEnd = local_EDI_lineEndPositionList_data[indexLine];
            } else {
                cacheNUMBERS[ringBufferIndex] = '~';
                new_lineEnd = new_lineStart;
            }

            // IF THE LINE CONTAINS CHARACTERS
            if (new_lineStart !== new_lineEnd) {
                // Execute a single loop invocation for the entire line text data
                local_EDI_decoder_CUSTOM.decodeLineTokens(
                    new_lineStart,
                    new_lineEnd,
                    lineSpans,
                    local_EDI_tokenColors,
                    local_bytes,
                    local_styles
                );
            }
            // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
            else {
                if (lineSpans.length > 0) {
                    const existingSpan = lineSpans[0];
                    existingSpan.text = '';
                    existingSpan.color = local_EDI_tokenColors[0] || '#ffffff'; // Fallback to standard color
                    lineSpans.length = 1;
                }
                else {
                    lineSpans.push({
                        text: '',
                        color: local_EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
                    });
                }
            }
        }

        const yCoord = vertical + topPadding;

        ctxGutter.fillText(cacheNUMBERS[ringBufferIndex], rightEdgeX, yCoord);
        
        // TODO: Horizontal virtualization

        // --- 2. DRAW SPANS CONSECUTIVELY USING THE MONOSPACE GRID ---
        // Subtract the horizontal scroll position from your starting x offset
        let currentX = -EDI_lastReadNumber_scrollLeft; // Track the running horizontal offset for the line row

        const lineSpansLength = lineSpans.length;

        for (let j = 0; j < lineSpansLength; j++) {
            const span = lineSpans[j];
            ctxText.fillStyle = span.color;
            ctxText.fillText(span.text, currentX, yCoord);
            
            // Fast cell tracking: add characters multiplied by character width
            //
            // TODO: I wonder whether tracking an integer "cumulative amount of characters that have been written"...
            // ...might be faster.
            // because:
            // 1: you're getting float precision inaccuracy build up with each time you sum.
            // 2: you're now summing two floats AND multiplying vs just multiplying.
            //
/*
<
Your first instinct about floating-point precision drift is spot-on and makes this change worth doing immediately.
Your second point about raw arithmetic speed is essentially a wash, because both approaches execute nearly identical CPU instructions and are completely dwarfed by ctxText.fillText().

1. Float Precision Drift (The Real Reason to Switch)
• Cumulative Rounding Errors: ctx.measureText('M').width almost always returns a non-terminating binary float (such as 8.4013671875). Every time you execute currentX += span.text.length * EDI_characterWidth, IEEE 754 rounding introduces a tiny error.
• Grid Misalignment on Long Lines: Syntax-highlighted code breaks lines into dozens of short tokens (punctuation, keywords, operators). Accumulating small rounding errors across 50+ spans causes characters to gradually drift away from your editor's true monospace column grid (col * EDI_characterWidth), which leads to cursor/selection misalignment and subpixel blurriness.
• Exact Grid Alignment: Computing startX + (totalChars * EDI_characterWidth) anchors every span directly to the line's origin, eliminating cumulative drift.


2. Instruction Count and Speed
• Same Floating-Point Work: Your current code runs 1 float multiply and 1 float add per iteration. Tracking totalChars runs 1 integer add (totalChars += span.text.length), 1 float multiply, and 1 float add (startX + totalChars * EDI_characterWidth).
• Hardware FMA: Modern CPUs execute integer addition in less than a single clock cycle and combine a + (b * c) into a single Fused Multiply-Add (FMA) instruction.
• The Real Bottleneck: One ctxText.fillText() call costs thousands of CPU cycles in browser C++ rasterization. A single float or integer operation takes fractions of a nanosecond, so you will not see a measurable FPS difference from the math alone.


3. Clean Implementation (Plus One Canvas Bonus)

Here is how your loop looks with integer character tracking, plus a quick guard on ctxText.fillStyle (since assigning CSS color strings to a 2D context triggers string-parsing overhead in C++ when colors repeat):

```js
const startX = -EDI_lastReadNumber_scrollLeft;
const maxWidth = editor.lastReadNumber_offsetWidth;
const yCoord = vertical + topPadding;

let totalChars = 0;
let currentX = startX;
let lastColor = '';

for (let j = 0; j < lineSpans.length; j++) {
  const span = lineSpans[j];

  if (span.color !== lastColor) {
    ctxText.fillStyle = span.color;
    lastColor = span.color;
  }

  ctxText.fillText(span.text, currentX, yCoord);

  totalChars += span.text.length;
  currentX = startX + (totalChars * EDI_characterWidth);

  if (currentX > maxWidth) {
    break;
  }
}
```
*/
            currentX += span.text.length * EDI_characterWidth;

            if (currentX > editorLastReadNumberOffsetWidth) {
                break;
            }
        }

        vertical += local_lineHeight;
    }

    // I'm just experimenting because tons of variables are shared.
    //EDI_render_SelectionAndCursor();
    const cursorCanvas = editor.cursor_canvas;
    const ctx = cursorCanvas.getContext('2d');
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    if (EDI_cursor_hasSelection()) {
        // (Note: Make sure your EDI_createStyleForSelection utility also takes horizontal scrolling into account when drawing selection backgrounds!)
        EDI_createStyleForSelection(ctx, original_vertical, local_lineHeight, view_startLineIndex);
    }

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    const cursorLine = editor.cursor_indexLine;
    if (cursorLine >= view_startLineIndex && cursorLine < view_upperLineIndexExclusive) {
        ctx.fillStyle = '#f2a72f'; // Solid cursor accent color

        const cursorX = (editor.cursorVisualColumnIndex * EDI_characterWidth) - EDI_lastReadNumber_scrollLeft;
        const cursorY = original_vertical + ((cursorLine - view_startLineIndex) * local_lineHeight);
        
        EDI_cursor_cursorTranslateXValue = cursorX;
        ctx.fillRect(cursorX, cursorY, 2, local_lineHeight);
    }
}

/*function EDI_render_Gutter(ringBufferIndex) {
    const local_lineHeight = editor.lineHeight;

    // 3. Let your context handle the scroll natively inside the static window
    const ctxGutter = editor.gutter_canvas.getContext('2d');
    ctxGutter.clearRect(0, 0, editor.gutter_canvas.width, editor.gutter_canvas.height);

    ctxGutter.fillStyle = f.APP_colors.gutterBackgroundColor;
    ctxGutter.fillRect(0, 0, editor.gutter_canvas.width, editor.gutter_canvas.height); 
    ctxGutter.fillStyle = '#858585';

    let lineIndex = editor.virtualIndexLine;
    
    // This remainder calculation handles the smooth pixel-by-pixel shift 
    // without moving the physical HTML canvas element!
    let vertical = -(EDI_lastReadNumber_scrollTop % local_lineHeight);

    const lineCount = editor.lineEndPositionList_count;
    const upperLineIndexExclusive = lineIndex + editor.virtualCount;
    const splitIndex = Math.min(upperLineIndexExclusive, lineCount);
    const local_EDI_textTopPadding = editor.textTopPadding;

    //const original_ringBufferIndex = ringBufferIndex;
    //const local_ArrayFrom_textElement_children_length = editor.ArrayFrom_textElement_children_length;

    // Render pure line numbers
    for (let i = lineIndex; i < splitIndex; i++) {
        //// (faster than modulo given this context)
        //ringBufferIndex++;
        //if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
        //    ringBufferIndex = 0;
        //}

        ctxGutter.fillText(i + 1, 0, vertical + local_EDI_textTopPadding);
        vertical += local_lineHeight;
    }

    
    //for (let i = lineIndex; i < splitIndex; i++) {
    //    
    //}

    // Render buffer tildes
    for (let i = splitIndex; i < upperLineIndexExclusive; i++) {
        ctxGutter.fillText('~', 0, vertical + local_EDI_textTopPadding);
        vertical += local_lineHeight;
    }
}*/

/*function EDI_render_TextContent(ringBufferIndex, lowerBound, loopLimit, lineStart, lineEnd) {
    const ctxText = editor.text_canvas.getContext('2d');
    ctxText.clearRect(0, 0, editor.text_canvas.width, editor.text_canvas.height);

    const local_lineHeight = editor.lineHeight;
    const lineCount = editor.lineEndPositionList_count;
    
    const startLineIndex = editor.virtualIndexLine;
    const upperLineIndexExclusive = Math.min(startLineIndex + editor.virtualCount, lineCount);

    let viewportY = -(EDI_lastReadNumber_scrollTop % local_lineHeight);
    const topPadding = editor.textTopPadding;

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_decoder_CUSTOM = EDI_decoder_CUSTOM;
    const local_bytes = EDI_textByteList_bytes;
    const local_styles = EDI_styleBuffer; // Your matching parallel array
    const cache = EDI_lineStringCache;

    let virtualIndex = -1;

    const original_ringBufferIndex = ringBufferIndex;
    const local_ArrayFrom_textElement_children_length = editor.ArrayFrom_textElement_children_length;

    // calculate the text of the newly scrolled into view lines
    const local_loopLimit = loopLimit;
    for (let indexLine = lowerBound; indexLine < local_loopLimit; ++indexLine) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        lineStart = lineEnd + 1;
        if (indexLine < lineCount) {
            lineEnd = local_EDI_lineEndPositionList_data[indexLine];
        } else {
            lineEnd = lineStart;
        }

        let lineSpans = [];
            
        // IF THE LINE CONTAINS CHARACTERS
        if (lineStart !== lineEnd) {
            let currentTokenStart = lineStart;
            let currentTokenId = local_styles[lineStart];
            let currentLineColumn = 0; 
            const tabSize = 4;

            const pushExpandedToken = (startByte, endByte, tokenId) => {
                const rawStr = local_EDI_decoder_CUSTOM.decodeRange(local_bytes, startByte, endByte);
                //const rawStr = local_EDI_decoder.decode(local_bytes.subarray(startByte, endByte));
                let expandedStr = '';
                for (let charIndex = 0; charIndex < rawStr.length; charIndex++) {
                    const char = rawStr[charIndex];
                    if (char === '\t') {
                        const spacesNeeded = tabSize - (currentLineColumn % tabSize);
                        expandedStr += ' '.repeat(spacesNeeded);
                        currentLineColumn += spacesNeeded;
                    } else {
                        expandedStr += char;
                        currentLineColumn++;
                    }
                }
                lineSpans.push({ text: expandedStr, color: EDI_tokenColors[tokenId] });
            };

            for (let byteIndex = lineStart + 1; byteIndex < lineEnd; byteIndex++) {
                const styleId = local_styles[byteIndex];
                if (styleId !== currentTokenId) {
                    pushExpandedToken(currentTokenStart, byteIndex, currentTokenId);
                    currentTokenStart = byteIndex;
                    currentTokenId = styleId;
                }
            }
            pushExpandedToken(currentTokenStart, lineEnd, currentTokenId);
        }
        // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
        else {
            lineSpans.push({
                text: '',
                color: EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
            });
        }
        
        cache[ringBufferIndex] = lineSpans; // Properly cached structure!

        //vertical += local_lineHeight;
    }

    lineStart = 0;
    lineEnd = -1;
    if (startLineIndex < lineCount && startLineIndex !== 0) {
        lineEnd = local_EDI_lineEndPositionList_data[startLineIndex - 1];
    }

    ringBufferIndex = editor.ringBuffer_indexZero - 1;

    for (let i = startLineIndex; i < upperLineIndexExclusive; i++) {
        
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        lineStart = lineEnd + 1;
        if (i < lineCount) {
            lineEnd = local_EDI_lineEndPositionList_data[i];
        } else {
            lineEnd = lineStart;
        }

        // --- 1. RESOLVE TOKEN SLICES FROM THE CACHE ---
        let lineSpans = cache[ringBufferIndex];
        if (lineSpans === undefined) {
            
        }

        // --- 2. DRAW SPANS CONSECUTIVELY USING THE MONOSPACE GRID ---
        let currentX = 0; // Track the running horizontal offset for the line row
        const yCoord = viewportY + topPadding;

        for (let j = 0; j < lineSpans.length; j++) {
            const span = lineSpans[j];
            ctxText.fillStyle = span.color;
            ctxText.fillText(span.text, currentX, yCoord);
            
            // Fast cell tracking: add characters multiplied by character width
            currentX += span.text.length * EDI_characterWidth;
        }

        viewportY += local_lineHeight;
    }
}*/

function EDI_render_do_Clear() {
    //EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
    //EDI_clearSelectionStyle();
    // TODO: Clear the ring buffer state?
    // TODO: What does the above todo mean? "TODO: Clear the ring buffer state?"
}

function EDI_render_do_SetText() {
    EDI_render_do_Clear();

    update_verticalVirtualizationBoundary();
    EDI_drawGutter_Width(editor.lineEndPositionList_count);
    EDI_drawHorizontalScrollbar();
    EDI_render_force_fullscreen_redraw();
}

function EDI_render_do_IndentMore() {
    
    if (editor.cursor_editKind !== 6 /*EditKind.IndentMore: 6*/) {
        return;
    }

    if (editor.cursor_edit_eventCount_drawn >= editor.cursor_edit_eventCount_occurred) {
        return;
    }

    let startingIndex = editor.indent_startingIndex;
    let SMALL_lineAndColumnIndices_indexLine = editor.indent_SMALL_lineAndColumnIndices_indexLine;

    // TODO: Consider having this string available rather than making it everytime this function is invoked.
    //let EDI_on_tab_string = EDI_decoder.decode(EDI_on_tab_bytes);
    let EDI_on_tab_string = '    '; // you need spaces for the UI to render correctly, regardless of if user has tabs or spaces

    // TODO: create 'EDI_on_tab_string' based on the amount of remaining eventCount to be drawn.
    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        editor.cursor_edit_eventCount_drawn++;
        // TODO: For a large viewport you're iterations checking lines that aren't even in view i.e.: consider ctrl+a
        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {

            // Draw the line to reflect the edit, if it is being currently shown on screen.
            // TODO: Use NEXT if the lines are one after another?
            
            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
            let ringBufferIndex = lineI - editor.virtualIndexLine;
            if (ringBufferIndex >= editor.ArrayFrom_textElement_children_length || ringBufferIndex < 0) ringBufferIndex = -1;
            else ringBufferIndex = (ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;

            if (ringBufferIndex >= 0) {
                EDI_lineStringCache[ringBufferIndex].unshift({ text: EDI_on_tab_string, color: f.EDI_tokenColors[0] });
            }
        }

        // # Draw the cursor
        //EDI_createStyleForSelection_indentMore();
    }

    //// 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_IndentLess() {
    let startingIndex = editor.indent_startingIndex;
    let SMALL_lineAndColumnIndices_indexLine = editor.indent_SMALL_lineAndColumnIndices_indexLine;

    if (editor.cursor_editKind !== 7 /*EditKind.IndentLess: 7*/) {
        return;
    }

    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        editor.cursor_edit_eventCount_drawn++;

        /////////////////////// P_1
        let textSelectionDiv;
        if (editor.cursor_selectionDivExists === 1) {
            for (var i = 0; i < EDI_selection.children.length; i++) {
                if (EDI_selection.children[i].id === CONST_EDI_cursor_htmlId) {
                    textSelectionDiv = EDI_selection.children[i];
                    break;
                }
            }
        }
        else {
            // TODO: Silent error confusing bad idea
        }
        let lesstraWidth_1 = 1 * EDI_characterWidth;
        let lesstraWidth_2 = 2 * EDI_characterWidth;
        let lesstraWidth_3 = 3 * EDI_characterWidth;
        let lesstraWidth_4 = 4 * EDI_characterWidth;
        /////////////////////// P_1

        let selectionLineDivIndex = 0;
        if (textSelectionDiv) {
            selectionLineDivIndex = textSelectionDiv.children.length - 1;
        }

        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
            let innerRemoveCount = 0;
            EDI_ret_getLineBoundaryPositions_raw(lineI);
            const line_start = editor.ret_getLineBoundaryPositions_start;
            let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
            let upperLimitIndexColumn;
            if (lastValidIndexColumn > 4) {
                upperLimitIndexColumn = 4;
            }
            else {
                upperLimitIndexColumn = lastValidIndexColumn;
            }
            let seenSpace = false;
            outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
                let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]); // TODO: this should be using the bytes themselves no reason to use 'fromCharCode'
                switch (c) {
                    case ' ':
                        seenSpace = true;
                        innerRemoveCount++;
                        break;
                    case '\t':
                        if (!seenSpace) {
                            innerRemoveCount++;
                        }
                        break outer;
                    default:
                        break outer;
                }
            }

            /////////////////////// P_2
            // TODO: This is not entirely correct. Presumably most specifically I am referring to the first line that is selected.
            if (textSelectionDiv && innerRemoveCount >= 1 && innerRemoveCount <= 4) {
                let lineSelectionDiv = textSelectionDiv.children[selectionLineDivIndex--];
                // TODO: precalculate 'widthNumberValue' outside of this loop.
                let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
                let lesstraWidth;
                switch (innerRemoveCount) {
                    case 1:
                        lesstraWidth = lesstraWidth_1;
                        break;
                    case 2:
                        lesstraWidth = lesstraWidth_2;
                        break;
                    case 3:
                        lesstraWidth = lesstraWidth_3;
                        break;
                    case 4:
                        lesstraWidth = lesstraWidth_4;
                        break;
                }
                widthNumberValue -= lesstraWidth;
                lineSelectionDiv.style.width = widthNumberValue + 'px';
            }
            /////////////////////// P_2

            let targetSpanIndex = 0;
            let runningColumnIdx = 0;
            let targetSpan = null;
            let relativeIndex = 0;
            let remainingCharacterRemovals = innerRemoveCount;

            // 1. Target the specific line row index where the typing is taking place
            const activeLine = lineI;

            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
            let ringBufferIndex = activeLine - editor.virtualIndexLine;
            if (ringBufferIndex >= editor.ArrayFrom_textElement_children_length || ringBufferIndex < 0) ringBufferIndex = -1;
            else ringBufferIndex = (ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
            if (ringBufferIndex < 0) {
                continue;
            }

            let lineSpans = EDI_lineStringCache[ringBufferIndex];

            // 2. Determine the column position where the *first character of this edit burst* began
            const editStartColumn = 0;

            // Find the precise column location of the characters we are about to remove right now
            const currentEditColumn = 0;
            let isAtEndOfLine = false;

            // 3. Scan the cached spans to find where currentEditColumn lands
            for (let i = 0; i < lineSpans.length; i++) {
                const span = lineSpans[i];
                const spanLength = span.text.length;

                if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
                    targetSpanIndex = i;
                    targetSpan = span;
                    relativeIndex = currentEditColumn - runningColumnIdx;
                    
                    // If the cursor hits exactly between two spans, your rule dictates targeting 
                    // the left span at its trailing length index. We break early to lock onto it.
                    break;
                }
                runningColumnIdx += spanLength;
                if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
                    isAtEndOfLine = true;
                }
            }

            if (targetSpan === null) {
                if (!isAtEndOfLine) {
                    throw new Error();
                }
                else {
                    targetSpanIndex = lineSpans.length;

                    // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
                    //targetSpan = lineSpans[targetSpanIndex];

                    relativeIndex = 0;
                }
            }

            while (remainingCharacterRemovals > 0) {
                //editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;
                // you can't do the editor.cursor_edit_eventCount_drawn immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
                
                if (isAtEndOfLine) {
                    throw new Error();
                }

                // 4. If we successfully isolated the text slice segment inside the cache, modify it
                const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
                const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

                // TODO: are you missing checks for whether the target span is ''?

                // ...the text inline directly into the string reference inside the cache array frame
                if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
                    lineSpans.splice(targetSpanIndex, 1);
                }
                else {
                    targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
                }
                
                remainingCharacterRemovals -= actualCharacterRemovals;

                if (remainingCharacterRemovals > 0) {
                    if (targetSpanIndex < lineSpans.length) {
                        targetSpan = lineSpans[targetSpanIndex];
                        relativeIndex = 0;
                    }
                    else {
                        isAtEndOfLine = true;
                    }
                }
            }
        }

        /////////////////////// P_3
        editor.cursor_DRAWN_selectionAnchor = editor.cursor_selectionAnchor;
        editor.cursor_DRAWN_selectionEnd = editor.cursor_selectionEnd;
        /////////////////////// P_3
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_DuplicateOrPaste() {

    if (editor.cursor_editKind !== 10 /*EditKind.Duplicate: 10*/ && editor.cursor_editKind !== 9 /*EditKind.Paste: 9*/) {
        return;
    }

    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        editor.cursor_edit_eventCount_drawn++;

        let byteArray = null;
        let insert_character_count = 0;
        let linesInsertedCount = 0;

        if (editor.cursor_editKind === 10 /*EditKind.Duplicate: 10*/) {
            editor.cursor_edit_eventCount_drawn++;
            byteArray = EDI_cursor_EDI_duplication_bytes;
            insert_character_count = byteArray.length;
            linesInsertedCount = editor.cursor_EDI_duplication_totalLineEndCount;
            // TODO: for duplicate: (this never would cache too cause finalize clear edit state is if (true) for duplicate to clear state.)
            // EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = new Array(EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS.length);
        }
        else if (editor.cursor_editKind === 9 /*EditKind.Paste: 9*/) {
            editor.cursor_edit_eventCount_drawn++;
            byteArray = EDI_cursor_EDI_paste_clipboardContent_bytes;
            insert_character_count = EDI_cursor_EDI_paste_clipboardContent_string.length;
            linesInsertedCount = editor.cursor_EDI_paste_clipboardContent_totalLineEndCount;
            if (EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray === null) {
                EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = new Array(EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS.length);
            }
        }

        // 1. Target the specific line row index where the typing is taking place
        let activeLine = editor.cursor_indexLine;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let activeLine_ringBufferIndex = activeLine - editor.virtualIndexLine;
        if (activeLine_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
        else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
        if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport

        let lineSpans = EDI_lineStringCache[activeLine_ringBufferIndex];

        // 2. Determine the column position where the *first character of this edit burst* began
        // We use indexColumn minus the absolute total length of characters typed in this current edit session
        let editStartColumn = editor.cursorVisualColumnIndex;// - editor.cursor_editLength_characters;
        
        // Find the precise column location of the characters we are about to insert right now
        let currentEditColumn = editStartColumn;// + editor.cursor_edit_eventCount_drawingStateContinuationValue;

        let runningColumnIdx = 0;
        let targetedSpan = null;
        let relativeInsertIndex = 0;

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            // If the cursor lands completely inside this span, or exactly on its trailing right edge
            if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                targetedSpan = span;
                relativeInsertIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
        }

        // 5. Commit the continuation value forward so the next frame knows where to pick up
        editor.cursor_edit_eventCount_drawingStateContinuationValue = editor.cursor_editLength_characters;

        if (targetedSpan === null) {
            // TODO: silent error bad
            //alert('// EDI_paste TODO: silent error bad');
            return;
        }






        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex = activeLine - editor.virtualIndexLine;
        if (ringBufferIndex >= editor.ArrayFrom_textElement_children_length || ringBufferIndex < 0) ringBufferIndex = -1;
        else ringBufferIndex = (ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
        if (ringBufferIndex < 0) { return; } // line is not in viewport




        const insertionCount = linesInsertedCount;
        //if (insertionCount === 0) { return; }

        const final_ringBufferIndexItem = get_final_ringBufferIndex();

        // This case doesn't make sense, it means the virtualCount === 0
        if (final_ringBufferIndexItem < 0) { EDI_render_force_fullscreen_redraw(); return; }
        // you can just "do nothing" so to speak (you need to "update the scrollbar" still / etc...) and you've already "update the scrollbar"ed so you just return.
        if (ringBufferIndex === final_ringBufferIndexItem) { return; }

        // If insertion count completely shifts visible TreeViewNodes that exist under the expanded TreeViewNode off screen you can just redraw every node below the one that was expanded.
        // TODO: determine a more optimized way to calculate this than just looping over and over.
        let availableRingBufferNodesVisuallyAfterExpandedOne = 0;
        for (let n_index = ringBufferIndex;;) {
            availableRingBufferNodesVisuallyAfterExpandedOne++;
            n_index = n_index + 1;
            if (n_index >= editor.ArrayFrom_textElement_children_length) {
                n_index -= editor.ArrayFrom_textElement_children_length;
            }
            if (n_index === final_ringBufferIndexItem) {
                break;
            }
        }

        const next_ringBufferIndex = ringBufferIndex + 1;
        if (next_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
            next_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
        }

        if (insertionCount > 0) {
            if (insertionCount >= availableRingBufferNodesVisuallyAfterExpandedOne) {
                // finalize edit?
                throw new Error();
                //EXPLORER_draw_BATCH_request(indexItem + 1, availableRingBufferNodesVisuallyAfterExpandedOne, 3, next_ringBufferIndex);
            }
            else {
                const final_indexItem = activeLine + availableRingBufferNodesVisuallyAfterExpandedOne; // TODO: This is a weird way to get the 'final_indexItem'
                EDI_handleRingBufferNodesThatAreOffscreen_DuplicateOrPaste(final_ringBufferIndexItem, final_indexItem, activeLine, ringBufferIndex, insertionCount);
                let n_ringBufferIndex = next_ringBufferIndex;
                for (let i = 0; i < insertionCount; i++) {
                    EDI_lineStringCache[n_ringBufferIndex].length = 1;
                    EDI_lineStringCache[n_ringBufferIndex][0].text = '';
                    n_ringBufferIndex = n_ringBufferIndex + 1;
                    if (n_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                        n_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
                    }
                }
                EDI_render_request(1 /*RenderKind.Scroll: 1*/);
                //EDI_render_specific_recache_INSERTION(activeLine + 1, insertionCount, availableRingBufferNodesVisuallyAfterExpandedOne, next_ringBufferIndex, false);
            }
            //return;
        }



        








        let insertionLength = 0;

        /** is a 0 based index, inclusive */
        let wordStart = 0;
        let wordLength = 0;

        // No need to consider '\r\n' and etc... only '\n'
        let linefeedLength = 0;

        /** TODO: All this variable needs to be is a boolean for whether you're at the end of the line or not. */
        let last_valid_indexColumn_currentLine_isAt = editor.cursor_indexColumn === EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);

        // TODO: An optimization to check whether you even need to redraw any lines perhaps is possible but it would add too much complexity at the moment and so it isn't being considered...
        // ...i.e.: if you're inserting so many lines that you know you'll scroll or that only a small amount of lines need to be redrawn due to predicting a scroll event.

        let offset = 0;

        /**
         * 0 => None,
         * 1 => '\n',
         * 2 => wordLetterOrDigit
         */
        let characterKindNumber_NEEDS_WRITTEN = 0;

        let functionState = {
            targetedSpan: targetedSpan,
            relativeInsertIndex: relativeInsertIndex,
            last_valid_indexColumn_currentLine_isAt: last_valid_indexColumn_currentLine_isAt,
            lineOffset: 0
        };

        while (true) {

            characterKindNumber_NEEDS_WRITTEN = 0;

            if (offset >= insert_character_count) {
                if (wordLength > 0) characterKindNumber_NEEDS_WRITTEN = 2/*wordLetterOrDigit*/;
                else if (linefeedLength > 0) characterKindNumber_NEEDS_WRITTEN = 1/*'\n'*/;
            }
            else {
                switch (byteArray[offset]) {
                    case 10:
                        if (wordLength > 0) characterKindNumber_NEEDS_WRITTEN = 2/*wordLetterOrDigit*/;
                        break;
                    default:
                        if (linefeedLength > 0) characterKindNumber_NEEDS_WRITTEN = 1/*'\n'*/;
                        break;
                }
            }
            switch (characterKindNumber_NEEDS_WRITTEN) {
                case 1/*'\n'*/:
                    
                

                    editor.cursor_indexColumn = 0;
                    editor.cursorVisualColumnIndex = 0;
                    editor.w_indexColumn_SpanTextContentRelative = 0;


                    // you're only gonna need the lastSplitText for the final line

                    // 1. Target the specific line row index where the typing is taking place
                    // TODO: Ensure that this isn't used in the finalize, (it shouldn't be but just double check)
                    editor.cursor_indexLine += 1;
                    activeLine = editor.cursor_indexLine;

                    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
                    let activeLine_ringBufferIndex = activeLine - editor.virtualIndexLine;
                    if (activeLine_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
                    else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
                    if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport

                    let lineSpans = EDI_lineStringCache[activeLine_ringBufferIndex];

                    // 2. Determine the column position where the *first character of this edit burst* began
                    // We use indexColumn minus the absolute total length of characters typed in this current edit session
                    editStartColumn = 0;// - editor.cursor_editLength_characters;
                    
                    // Find the precise column location of the characters we are about to insert right now
                    currentEditColumn = 0;// + editor.cursor_edit_eventCount_drawingStateContinuationValue;

                    let runningColumnIdx = 0;
                    let targetedSpan = null;
                    let relativeInsertIndex = 0;

                    // 3. Scan the cached spans to find where currentEditColumn lands
                    for (let i = 0; i < lineSpans.length; i++) {
                        const span = lineSpans[i];
                        const spanLength = span.text.length;

                        // If the cursor lands completely inside this span, or exactly on its trailing right edge
                        if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                            targetedSpan = span;
                            relativeInsertIndex = currentEditColumn - runningColumnIdx;
                            
                            // If the cursor hits exactly between two spans, your rule dictates targeting 
                            // the left span at its trailing length index. We break early to lock onto it.
                            break;
                        }
                        runningColumnIdx += spanLength;
                    }

                    // 5. Commit the continuation value forward so the next frame knows where to pick up
                    editor.cursor_edit_eventCount_drawingStateContinuationValue = editor.cursor_editLength_characters;

                    if (targetedSpan === null) {
                        // TODO: silent error bad
                        //alert('// EDI_paste TODO: silent error bad');
                        return;
                    }

                    functionState.targetedSpan = targetedSpan;
                    functionState.relativeInsertIndex = relativeInsertIndex;
                    //functionState.last_valid_indexColumn_currentLine_isAt;







                    linefeedLength = 0;
                    break;
                case 2/*wordLetterOrDigit*/:
                    if (EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray !== null && EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray[functionState.lineOffset] === undefined) {
                        EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray[functionState.lineOffset] = EDI_decoder_CUSTOM.decodeLineWithTabs(byteArray, wordStart, wordStart + wordLength, 4, editStartColumn);
                    }
                    // TODO: for duplicate: (this never would cache too cause finalize clear edit state is if (true) for duplicate to clear state.)
                    // EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray = new Array(EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS.length);
                    const word = EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray !== null
                        ? EDI_cursor_EDI_duplicationORpaste_cacheEachLineSubstringDecodedArray[functionState.lineOffset]
                        : EDI_decoder_CUSTOM.decodeLineWithTabs(byteArray, wordStart, wordStart + wordLength, 4, editStartColumn);
                    functionState.lineOffset++;
                    EDI_duplicate_and_paste_writeWord(word, functionState);
                    wordStart = 0;
                    wordLength = 0;
                    break;
            }

            if (offset >= insert_character_count) {
                break;
            }
            else {
                switch (byteArray[offset]) {
                    case 10:
                        insertionLength++;
                        linefeedLength++;
                        break;
                    default:
                        insertionLength++;
                        if (wordLength === 0) { wordStart = offset; }
                        wordLength++;
                        break;
                }
            }

            ++offset;
        }

        if (linesInsertedCount > 0) {
            update_verticalVirtualizationBoundary(editor.lineEndPositionList_count + linesInsertedCount);
            EDI_lineWasInsertedValidateGutter(editor.lineEndPositionList_count + linesInsertedCount);
        }
    }

    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;

    //// 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_handleRingBufferNodesThatAreOffscreen_DuplicateOrPaste(final_ringBufferIndex, final_indexItem, indexItem_of_expanded_node, ringBufferIndex_of_expanded_node, recycleCount) {
    let displaced_itemIndex = indexItem_of_expanded_node + 1;
    let displaced_ringBufferIndex = ringBufferIndex_of_expanded_node + 1;
    if (displaced_ringBufferIndex >= editor.virtualCount) {
        displaced_ringBufferIndex -= editor.virtualCount;
    }

    // TODO: calculate the earliest recycled node faster than just "looping a minus 1 over and over"
    let recycle_itemIndex = final_indexItem;
    let recycle_ringBufferIndex = final_ringBufferIndex;
    for (let i = 1/* start at 1 so you skip a loop */; i < recycleCount; i++) {
        recycle_itemIndex--;
        recycle_ringBufferIndex--;
        if (recycle_ringBufferIndex < 0) {
            recycle_ringBufferIndex = editor.virtualCount - 1;
        }
    }

    const inclusive_earliest_recycle_ringBufferIndex = recycle_ringBufferIndex;

    // 3. Perform a block rotation via triple-reversal 
    // This repositions all 'displaced(s)' and 'recycle(s)' in O(N) operations total, discarding the nested loops
    const end_of_recycle_block = final_ringBufferIndex;
    
    let endOfDisplacedBlock = inclusive_earliest_recycle_ringBufferIndex - 1;
    if (endOfDisplacedBlock < 0) {
        endOfDisplacedBlock = editor.virtualCount - 1;
    }

    EDI_reverseBufferSegment(displaced_ringBufferIndex, endOfDisplacedBlock);                   // Reverse Displaced(s)
    EDI_reverseBufferSegment(inclusive_earliest_recycle_ringBufferIndex, end_of_recycle_block); // Reverse Recycle(s)
    EDI_reverseBufferSegment(displaced_ringBufferIndex, end_of_recycle_block);                  // Reverse entire window

    // The 'recycles' will be drawn with their text, depth, and translateY immediately after this function so you can skip them.
    // Since everything was reversed in earlier steps this is the way to do exactly that.
    for (let i = 0; i < recycleCount; i++) {
        displaced_ringBufferIndex++;
        if (displaced_ringBufferIndex >= editor.virtualCount) {
            displaced_ringBufferIndex -= editor.virtualCount
        }
        displaced_itemIndex++;
    }

    for (;;) {
        if (displaced_ringBufferIndex === final_ringBufferIndex) {
            break;
        }

        displaced_itemIndex++;

        displaced_ringBufferIndex++;
        if (displaced_ringBufferIndex >= editor.virtualCount) {
            displaced_ringBufferIndex -= editor.virtualCount
        }
    }
}

/**
 * TODO: If this ends up working don't duplicate this code, this is the 'EDI_EnterKey' function; copy, paste, and probably modified.
 */
function DUPLICATE_writeLinefeed(functionState, linefeedLength) {

    
}

function EDI_duplicate_and_paste_writeWord(word, functionState) {

    //// Decode only the new slice of un-drawn keys typed during this frame frame burst
    //const freshlyTypedString = EDI_decoder.decode(
    //    EDI_cursor_textInsertionBuffer.subarray(
    //        editor.cursor_edit_eventCount_drawingStateContinuationValue, 
    //        editor.cursor_editLength_characters
    //    )
    //);
//
    const wordLength = word.length;
    //// Splice the text inline directly into the string reference inside the cache array frame
    functionState.targetedSpan.text = 
        functionState.targetedSpan.text.slice(0, functionState.relativeInsertIndex) + 
        word + 
        functionState.targetedSpan.text.slice(functionState.relativeInsertIndex);

    // Tab expansion
        
    //targetedSpan.text = ;
    //w_div.firstChild.insertData(editor.w_indexColumn_SpanTextContentRelative, word);

    editor.cursor_indexColumn += wordLength;
    editor.cursorVisualColumnIndex += wordLength;
    editor.w_indexColumn_SpanTextContentRelative += wordLength;
}

function EDI_render_do_TabKey() {
    if (editor.cursor_editKind !== 5 /*EditKind.Tab: 5*/) {
        return;
    }

    if (editor.cursor_edit_eventCount_drawn >= editor.cursor_edit_eventCount_occurred) {
        return;
    }

    // You need spaces when updating the cache otherwise they won't render correctly.
    const EDI_on_tab_string = '    ';

    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        editor.cursor_edit_eventCount_drawn++;

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = editor.cursor_indexLine;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let activeLine_ringBufferIndex = activeLine - editor.virtualIndexLine;
        if (activeLine_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
        else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
        if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
        
        let lineSpans = EDI_lineStringCache[activeLine_ringBufferIndex];

        // 2. Determine the column position where the *first character of this edit burst* began
        // We use indexColumn minus the absolute total length of characters typed in this current edit session
        //const editStartColumn = editor.cursor_indexColumn - editor.cursor_editLength_characters;
        const editStartColumn = editor.cursorVisualColumnIndex - editor.cursor_editLengthVisual;// - editor.cursor_editLength_characters;

        if (editor.cursor_edit_eventCount_occurred > 1) {
            editStartColumn -= (4 * (editor.cursor_edit_eventCount_occurred - 1));
        }
        
        // Find the precise column location of the characters we are about to insert right now
        const currentEditColumn = editStartColumn;// + editor.cursor_edit_eventCount_drawingStateContinuationValue;

        let runningColumnIdx = 0;
        let targetedSpan = null;
        let relativeInsertIndex = 0;

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            // If the cursor lands completely inside this span, or exactly on its trailing right edge
            if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                targetedSpan = span;
                relativeInsertIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        if (targetedSpan !== null) {
            // Decode only the new slice of un-drawn keys typed during this frame frame burst
            const freshlyTypedString = editor.cursor_edit_eventCount_drawn === 1
                ? (editor.cursor_editLengthVisual === 4 ? EDI_on_tab_string : ' '.repeat(editor.cursor_editLengthVisual))
                : EDI_on_tab_string;

            // Splice the text inline directly into the string reference inside the cache array frame
            targetedSpan.text = 
                targetedSpan.text.slice(0, relativeInsertIndex) + 
                freshlyTypedString + 
                targetedSpan.text.slice(relativeInsertIndex);
        }

        // 5. Commit the continuation value forward so the next frame knows where to pick up
        editor.cursor_edit_eventCount_drawingStateContinuationValue = editor.cursor_editLength_characters;

        // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
        EDI_render_request(1 /*RenderKind.Scroll: 1*/);
        //EDI_render_TextContent();
        //EDI_render_Cursor();
    }
}

function EDI_render_do_EnterKey() {
    // TODO: This is wrong because you haven't inserted the lines yet so you just redraw the exact same height more or less (it does "work somewhat" cause you can miss and then at some point you'll probably hit enter again and see it fix something but that's still wrong.).
    update_verticalVirtualizationBoundary();

    if (editor.cursor_editKind !== 8 /*EditKind.Enter: 8*/) {
        return;
    }

    // TODO: instead of a loop, handle the rendering in a more optimized bulk operation that renders the remaining 'editor.cursor_editLineFeedCount - editor.cursor_edit_eventCount_drawn'
    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        editor.cursor_edit_eventCount_drawn++;

        const local_EDI_lineEndPositionList_count = editor.lineEndPositionList_count + editor.cursor_edit_eventCount_drawn - 1;
        
        // TODO: Rewrite this comment in a way that isn't rambling:
        //
        // Currently this is written in a way that ignores 'editor.cursor_enterKeyEventKind' for the 'render'.
        // This is because consecutive enter key events are not necessarily rendered the same way.
        // For example, if the cursor is among a line. And you render the first enter key event.
        // The cursor is among a line.
        // But that second enter key event may or may not be among a line.
        // If indentation existed on the original line and prior to the cursor position,
        // that indentation is copied to the line that was created by the enter key event.
        // Thus, your cursor on the second enter key event is among a line.
        // But if there wasn't indentation, your cursor is actually at the start of the newly added line.

        

        //if (!lineIsPartOfTheCurrentVirtualizedContent) { // "!lineIsPartOfTheCurrentVirtualizedContent"
        //    // hmm is incorrect "nothing to draw", you need to actually draw maybe if the next index is in view
        //    // because you've split the line above it that was out of view?
        //    // TODO: I'm not sure.
        //    return;
        //}

        //if (isASingledOutCase) { throw new Error(); } // "isASingledOutCase case"

        // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
        let current_ringBufferIndex = editor.cursor_editIndexLine - editor.virtualIndexLine;
        if (current_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || current_ringBufferIndex < 0) current_ringBufferIndex = -1;
        else current_ringBufferIndex = (current_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
        if (current_ringBufferIndex < 0) { return; } // TODO: line is not in viewport (for enter key it still needs to be handled maybe probably)

        // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
        let final_ringBufferIndex = editor.ArrayFrom_textElement_children_length - 1;
        if (final_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || final_ringBufferIndex < 0) final_ringBufferIndex = -1;
        else final_ringBufferIndex = (final_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
        if (final_ringBufferIndex < 0) { return; } // ???

        // TODO: (when holding enter key) Among a line, where you have indentation will recreate the same 'spanText' over and over, very wasteful. This includes the wasteful steps of substringing...
        // ...cache 'spanText'. (I think comment specifically refers to "among line" case. Where one might decide to concatenate the spanText and the split text over and over)
        //
        // TODO: The 'EDI_cursor_cached_indentation_string' needs to be changed to be '\t' => the amount of spaces for the given tab width so that the UI renders correctly (given the way it is written).
        //
        let spanText = EDI_cursor_cached_indentation_string;

        // TODO: EDI_cursor_cached_indentation_string ensure post rewrite that it is in each conditional branch (as of writing this comment I know it isn't)

        if (editor.cursor_editIndexColumn === 0) { // start of line
            // pending line feeds use them for the line numbers eventually

            let loop_ringBufferIndex = final_ringBufferIndex;
            let final_lineSpans = EDI_lineStringCache[final_ringBufferIndex];

            while (true) {
                let previous_ringBufferIndex = loop_ringBufferIndex - 1;
                if (previous_ringBufferIndex < 0) {
                    previous_ringBufferIndex = editor.ArrayFrom_textElement_children_length - 1;
                }

                EDI_lineStringCache[loop_ringBufferIndex] = EDI_lineStringCache[previous_ringBufferIndex];

                if (previous_ringBufferIndex === current_ringBufferIndex) {
                    break;
                }

                loop_ringBufferIndex = previous_ringBufferIndex;
            }

            EDI_lineStringCache[current_ringBufferIndex] = final_lineSpans;

            let currentLineSpans = EDI_lineStringCache[current_ringBufferIndex];
            if (currentLineSpans.length > 0) {
                currentLineSpans.length = 1;
                currentLineSpans[0].text = spanText;
                currentLineSpans[0].color = f.EDI_tokenColors[0];
            }
            else {
                currentLineSpans.push({ text: spanText, color: f.EDI_tokenColors[0] });
            }
            //EDI_lineWasInsertedValidateGutter(editor.lineEndPositionList_count + editor.cursor_editLineFeedCount);
        }
        else {
            let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_editIndexLine);

            if (lastValidIndexColumn === editor.cursor_editIndexColumn) { // end of line
                let loop_ringBufferIndex = final_ringBufferIndex;

                let final_lineSpans = EDI_lineStringCache[final_ringBufferIndex];

                let next_ringBufferIndex = current_ringBufferIndex + 1;
                if (next_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                    next_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
                }

                while (loop_ringBufferIndex !== next_ringBufferIndex) {
                    let previous_ringBufferIndex = loop_ringBufferIndex - 1;
                    if (previous_ringBufferIndex < 0) {
                        previous_ringBufferIndex = editor.ArrayFrom_textElement_children_length - 1;
                    }

                    EDI_lineStringCache[loop_ringBufferIndex] = EDI_lineStringCache[previous_ringBufferIndex];

                    loop_ringBufferIndex = previous_ringBufferIndex;
                }

                EDI_lineStringCache[next_ringBufferIndex] = final_lineSpans;

                let nextLineSpans = EDI_lineStringCache[next_ringBufferIndex];
                if (nextLineSpans.length > 0) {
                    nextLineSpans.length = 1;
                    nextLineSpans[0].text = spanText;
                    nextLineSpans[0].color = f.EDI_tokenColors[0];
                }
                else {
                    nextLineSpans.push({ text: spanText, color: f.EDI_tokenColors[0] });
                }
            }
            else { // among a line

                // among a line uses 'walkLineUntilIndexColumn', this function takes a cursor and accesses the fields: 'indexLine', and 'indexColumn'.
                // This is problematic because one needs to use editor.cursor_editIndexColumn for this renderKind.
                // Since only this case needs the logic I'm going to isolate it to here.
                //
                // Remember 'indexLine', and 'indexColumn'.
                // Set them to the edit respective fields.
                //
                // Prior to returning from this function restore the original 'indexLine', and 'indexColumn'. (1 of 2)
                let remember_cursorIndexLine = editor.cursor_indexLine;
                let remember_cursorIndexColumn = editor.cursor_indexColumn;

                editor.cursor_indexLine = editor.cursor_editIndexLine;
                editor.cursor_indexColumn = editor.cursor_editIndexColumn;

                
                let relativeInsertIndex = 0;

                let targetedSpan = null;
                let targetedSpanIndex = 0;

                // 1. Target the specific line row index where the typing is taking place
                const activeLine = editor.cursor_indexLine;

                let lineSpans = EDI_lineStringCache[current_ringBufferIndex];

                {
                    if (lineSpans === undefined) {
                        return;
                    }

                    // 2. Determine the column position where the *first character of this edit burst* began
                    // We use indexColumn minus the absolute total length of characters typed in this current edit session
                    const editStartColumn = editor.cursor_indexColumn;// - editor.cursor_editLength_characters;
                    
                    // Find the precise column location of the characters we are about to insert right now
                    const currentEditColumn = editStartColumn;// + editor.cursor_edit_eventCount_drawingStateContinuationValue;

                    let runningColumnIdx = 0;

                    // 3. Scan the cached spans to find where currentEditColumn lands
                    for (let i = 0; i < lineSpans.length; i++) {
                        const span = lineSpans[i];
                        const spanLength = span.text.length;

                        // If the cursor lands completely inside this span, or exactly on its trailing right edge
                        if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                            targetedSpan = span;
                            targetedSpanIndex = i;
                            relativeInsertIndex = currentEditColumn - runningColumnIdx;
                            
                            // If the cursor hits exactly between two spans, your rule dictates targeting 
                            // the left span at its trailing length index. We break early to lock onto it.
                            break;
                        }
                        runningColumnIdx += spanLength;
                    }
                }

                let next_ringBufferIndex = current_ringBufferIndex + 1;
                if (next_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                    next_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
                }

                let final_lineSpans = EDI_lineStringCache[final_ringBufferIndex];

                let loop_ringBufferIndex = final_ringBufferIndex;

                while (loop_ringBufferIndex !== next_ringBufferIndex) {
                    let previous_ringBufferIndex = loop_ringBufferIndex - 1;
                    if (previous_ringBufferIndex < 0) {
                        previous_ringBufferIndex = editor.ArrayFrom_textElement_children_length - 1;
                    }

                    EDI_lineStringCache[loop_ringBufferIndex] = EDI_lineStringCache[previous_ringBufferIndex];

                    loop_ringBufferIndex = previous_ringBufferIndex;
                }

                EDI_lineStringCache[next_ringBufferIndex] = final_lineSpans;

                const data = targetedSpan.text;

                let firstText = data.substring(0, relativeInsertIndex);
                let lastText = data.substring(relativeInsertIndex);

                let nextLineSpans = EDI_lineStringCache[next_ringBufferIndex];
                if (nextLineSpans.length > 0) {
                    nextLineSpans.length = 1;
                    nextLineSpans[0].text = spanText + lastText;
                    nextLineSpans[0].color = targetedSpan.color;
                }
                else {
                    nextLineSpans.push({ text: lastText, color: targetedSpan.color });
                }

                lineSpans[targetedSpanIndex].text = firstText;

                for (let i = targetedSpanIndex + 1; i < lineSpans.length; i++) {
                    nextLineSpans.push(lineSpans[i]);
                }
                lineSpans.length = targetedSpanIndex + 1;

                //// move tail to head?
                //nextLineSpans.unshift(nextLineSpans.pop());


                // Prior to returning from this function restore the original 'indexLine', and 'indexColumn'. (2 of 2)
                editor.cursor_indexLine = remember_cursorIndexLine;
                editor.cursor_indexColumn = remember_cursorIndexColumn;
            }
        }
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_RemoveSelection() {
    if (editor.cursor_editKind !== 4 /*EditKind.RemoveTextNoBatching: 4*/) {
        return;
    }

    if (editor.cursor_edit_eventCount_drawn >= editor.cursor_edit_eventCount_occurred) {
        return;
    }

    // RemoveSelection doesn't batch at the moment thus the equals rather than incrementing.
    // Although it doesn't "matter" cause they'd only ever be off by 1 but this way makes me feel less anxious nevertheless.
    editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;
    
    let smallPosition = editor.editret_RemoveSelection_smallPosition;
    let largePosition = editor.editret_RemoveSelection_largePosition;

    let editLength = largePosition - smallPosition;

    let smallLineAndColumnIndices_indexLine = editor.editret_RemoveSelection_smallLineAndColumnIndices_small_indexLine;
    let smallLineAndColumnIndices_indexColumn = editor.editret_RemoveSelection_smallLineAndColumnIndices_small_indexColumn;

    ///////////
    ///////////

    let original_edit_length = editor.cursor_editLength_characters;
    editor.cursor_editLength_characters = 0;

    let linesRemovedCount = 0;
    // -1 since you can't remove EOF
    for (var iVarDependent = editor.cursor_indexLine; iVarDependent < editor.lineEndPositionList_count - 1; iVarDependent++) {
        let lineEnding = EDI_lineEndPositionList_data[iVarDependent];
        if (lineEnding >= editor.cursor_editPosition && lineEnding < editor.cursor_editPosition + editLength) {
            linesRemovedCount++;
            editor.cursor_editLineFeedCount++;
            EDI_lineEndPositionList_PENDING.insert(EDI_lineEndPositionList_PENDING.count, lineEnding);
        }
        else {
            break;
        }
    }

    // TODO: two tabs one after another you delete the first one the second one falls into the first one's position...
    // ...and takes the tab-width of the first one which might not be equal to the second one.
    // Count line width after the edit? Probably not?

    if (linesRemovedCount === 0) {
        //
        // 'editor.cursor_selectionIndexAnchorColumnVISUAL' is 0???
        //
        //editor.cursor_editLengthVisual = Math.abs(editor.cursor_selectionIndexEndColumnVISUAL - editor.cursor_selectionIndexAnchorColumnVISUAL);

        EDI_ret_getLineAndColumnIndices_raw(largePosition);
        let largeLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
        let largeLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;

        EDI_ret_getLineBoundaryPositions_raw(smallLineAndColumnIndices_indexLine);
        let lineStart = editor.ret_getLineBoundaryPositions_start;
        let lineEnd = editor.ret_getLineBoundaryPositions_end;

        EDI_ret_getIndexFromColumn_RESET(smallLineAndColumnIndices_indexColumn, lineStart, lineEnd);
        let small_columnVisual = editor.ret_getIndexFromX_visualColumns;

        // TODO: You don't have to RESET here but... this answer is ultimately going to be scrapped for something more correct so it isn't worth the time.
        EDI_ret_getIndexFromColumn_RESET(largeLineAndColumnIndices_indexColumn, lineStart, lineEnd);
        let large_columnVisual = editor.ret_getIndexFromX_visualColumns;

        editor.cursor_editLengthVisual += large_columnVisual - small_columnVisual;
        //editor.cursorVisualColumnIndex = small_columnVisual;

        //EDI_ret_getIndexFromColumn_RESET();
    }

    let finalLineEndPosition = EDI_lineEndPositionList_data[editor.cursor_indexLine + linesRemovedCount];
    let largestDrawnIndexLine = editor.virtualIndexLine + editor.virtualCount - 1;

    // 5 stages
    // ========
    // - Remove selection on large position line
    // - Remove selection on small position line
    // - Visually merge the small position line and large position line (if applicable)
    // - Remove middle line(s)
    // - 'Draw lines that came into view' / 'clear text for any lines > text length and use a '~' in the gutter'

    // Remove selection on small position line
    let smallLineSpans = null;
    let smallLineSpans_RINGBUFFERINDEX = 0;
    {
        editor.cursor_indexLine = smallLineAndColumnIndices_indexLine;
        editor.cursor_indexColumn = smallLineAndColumnIndices_indexColumn;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        editor.cursorVisualColumnIndex = smallLineAndColumnIndices_indexColumn;

        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        const line_end = editor.ret_getLineBoundaryPositions_end;

        let targetSpanIndex = 0;
        let runningColumnIdx = 0;
        let targetSpan = null;
        let relativeIndex = 0;
        let remainingCharacterRemovals;
        if (largePosition > line_end) {
            remainingCharacterRemovals = line_end - smallPosition;
        }
        else {
            remainingCharacterRemovals = largePosition - smallPosition;
        }

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = editor.cursor_indexLine;
        

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        smallLineSpans_RINGBUFFERINDEX = activeLine - editor.virtualIndexLine;
        if (smallLineSpans_RINGBUFFERINDEX >= editor.ArrayFrom_textElement_children_length || smallLineSpans_RINGBUFFERINDEX < 0) smallLineSpans_RINGBUFFERINDEX = -1;
        else smallLineSpans_RINGBUFFERINDEX = (smallLineSpans_RINGBUFFERINDEX + editor.ringBuffer_indexZero) % editor.virtualCount;
        //if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
        
        if (smallLineSpans_RINGBUFFERINDEX >= 0) { // line IS not in viewport

            let lineSpans = EDI_lineStringCache[smallLineSpans_RINGBUFFERINDEX];
            smallLineSpans = lineSpans;

            // 2. Determine the column position where the *first character of this edit burst* began
            const editStartColumn = editor.cursor_indexColumn;

            // Find the precise column location of the characters we are about to remove right now
            const currentEditColumn = editStartColumn;
            let isAtEndOfLine = false;

            // 3. Scan the cached spans to find where currentEditColumn lands
            for (let i = 0; i < lineSpans.length; i++) {
                const span = lineSpans[i];
                const spanLength = span.text.length;

                if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
                    targetSpanIndex = i;
                    targetSpan = span;
                    relativeIndex = currentEditColumn - runningColumnIdx;
                    
                    // If the cursor hits exactly between two spans, your rule dictates targeting 
                    // the left span at its trailing length index. We break early to lock onto it.
                    break;
                }
                runningColumnIdx += spanLength;
                if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
                    isAtEndOfLine = true;
                }
            }

            if (targetSpan === null) {
                if (!isAtEndOfLine) {
                    throw new Error();
                }
                else {
                    targetSpanIndex = lineSpans.length;

                    // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
                    //targetSpan = lineSpans[targetSpanIndex];

                    relativeIndex = 0;
                }
            }

            while (remainingCharacterRemovals > 0) {
                //editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;
                // you can't do the editor.cursor_edit_eventCount_drawn immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
                
                if (isAtEndOfLine) {
                    throw new Error('TODO: hit EOF');
                }

                // 4. If we successfully isolated the text slice segment inside the cache, modify it
                const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
                const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

                // ...the text inline directly into the string reference inside the cache array frame
                if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
                    lineSpans.splice(targetSpanIndex, 1);
                }
                else {
                    targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
                }
                
                // 5. Commit the continuation value forward so the next frame knows where to pick up
                // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
                editor.cursor_edit_eventCount_drawingStateContinuationValue += actualCharacterRemovals;
                editor.cursor_edit_eventCount_drawn += actualCharacterRemovals;
                remainingCharacterRemovals -= actualCharacterRemovals;

                if (remainingCharacterRemovals > 0) {
                    if (targetSpanIndex < lineSpans.length) {
                        targetSpan = lineSpans[targetSpanIndex];
                        relativeIndex = 0;
                    }
                    else {
                        isAtEndOfLine = true;
                    }
                }
            }
        }
    }

    // Remove selection on large position line
    let largeLineSpans = null;
    let largeLineSpans_RINGBUFFERINDEX = 0;
    let whenHandlingSmallAndLargeMerge_shouldSwapLineSpansIfApplicable = false;
    if (linesRemovedCount > 0) {
        editor.cursor_indexLine = editor.cursor_indexLine + linesRemovedCount;
        editor.cursor_indexColumn = 0;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        editor.cursorVisualColumnIndex = 0;

        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        const line_end = editor.ret_getLineBoundaryPositions_end;

        let targetSpanIndex = 0;
        let runningColumnIdx = 0;
        let targetSpan = null;
        let relativeIndex = 0;
        let remainingCharacterRemovals = largePosition - editor.ret_getLineBoundaryPositions_start;

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = editor.cursor_indexLine;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        largeLineSpans_RINGBUFFERINDEX = activeLine - editor.virtualIndexLine;
        if (largeLineSpans_RINGBUFFERINDEX >= editor.ArrayFrom_textElement_children_length || largeLineSpans_RINGBUFFERINDEX < 0) largeLineSpans_RINGBUFFERINDEX = -1;
        else largeLineSpans_RINGBUFFERINDEX = (largeLineSpans_RINGBUFFERINDEX + editor.ringBuffer_indexZero) % editor.virtualCount;
        //if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
        
        let lineSpans;

        if (largeLineSpans_RINGBUFFERINDEX >= 0) {
            lineSpans = EDI_lineStringCache[largeLineSpans_RINGBUFFERINDEX];
            largeLineSpans = lineSpans;
            whenHandlingSmallAndLargeMerge_shouldSwapLineSpansIfApplicable = true;
        }
        else {
            //const indexLine = largeLineAndColumnIndices_indexLine;
            EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
            const lineStart = editor.ret_getLineBoundaryPositions_start;
            const lineEnd = editor.ret_getLineBoundaryPositions_end;

            lineSpans = [];

            // IF THE LINE CONTAINS CHARACTERS
            if (lineStart !== lineEnd) {
                // 'aaaa' and then one 'Z' doesn't work you need to create the largeLineSpans so they can be edited by the earlier step
                // Execute a single loop invocation for the entire line text data
                EDI_decoder_CUSTOM.decodeLineTokens(
                    lineStart,
                    lineEnd,
                    lineSpans,
                    f.EDI_tokenColors,
                    EDI_textByteList_bytes,
                    EDI_styleBuffer
                );
            }
            // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
            else {
                if (lineSpans.length > 0) {
                    const existingSpan = lineSpans[0];
                    existingSpan.text = '';
                    existingSpan.color = f.EDI_tokenColors[0] || '#ffffff'; // Fallback to standard color
                    lineSpans.length = 1;
                }
                else {
                    lineSpans.push({
                        text: '',
                        color: f.EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
                    });
                }
            }

            largeLineSpans = lineSpans;
            whenHandlingSmallAndLargeMerge_shouldSwapLineSpansIfApplicable = false;
        }

        // 2. Determine the column position where the *first character of this edit burst* began
        const editStartColumn = editor.cursor_indexColumn;

        // Find the precise column location of the characters we are about to remove right now
        const currentEditColumn = editStartColumn;
        let isAtEndOfLine = false;

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
                targetSpanIndex = i;
                targetSpan = span;
                relativeIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
            if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
                isAtEndOfLine = true;
            }
        }

        if (targetSpan === null) {
            if (!isAtEndOfLine) {
                throw new Error();
            }
            else {
                targetSpanIndex = lineSpans.length;

                // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
                //targetSpan = lineSpans[targetSpanIndex];

                relativeIndex = 0;
            }
        }

        while (remainingCharacterRemovals > 0) {
            //editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;
            // you can't do the editor.cursor_edit_eventCount_drawn immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
            
            if (isAtEndOfLine) {
                throw new Error('TODO: hit EOF');
            }

            // 4. If we successfully isolated the text slice segment inside the cache, modify it
            const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
            const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

            // ...the text inline directly into the string reference inside the cache array frame
            if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
                lineSpans.splice(targetSpanIndex, 1);
            }
            else {
                targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
            }
            
            // 5. Commit the continuation value forward so the next frame knows where to pick up
            // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
            editor.cursor_edit_eventCount_drawingStateContinuationValue += actualCharacterRemovals;
            editor.cursor_edit_eventCount_drawn += actualCharacterRemovals;
            remainingCharacterRemovals -= actualCharacterRemovals;

            if (remainingCharacterRemovals > 0) {
                if (targetSpanIndex < lineSpans.length) {
                    targetSpan = lineSpans[targetSpanIndex];
                    relativeIndex = 0;
                }
                else {
                    isAtEndOfLine = true;
                }
            }
        }
    }

    // Merge the first and last lines (if applicable)
    //
    // Four cases of existence (!... implies it does NOT exist, i.e.: it is not rendered on the UI)
    // =======================
    // - [ ] keeping, removing
    // - [ ] keeping, !removing
    // - [ ] !keeping, removing
    // - [ ] !keeping, !removing
    //
    // - [ ] Ensure all 4 cases of existence handle 'EDI_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);'
    //

    /*
    This problem can be broken into two steps:
    Step 1: it is the collapse logic from 'EXPLORER_expandCollapseIconWasClicked'
    Step 2: if at least one line was removed, you need to merge the "large line index" onto the end of the "small line index"
            i.e.: a selection that spans multiple lines has 3 parts
            - "the small line"
            - "the lines between"
            - "the large line"
                And then lastly the specific details that pertain to merging the "large line index" onto the end of the "small line index" need to be handled.
                Because you're not just merging them blindly you need to merge only the remaining content after handling:
                - the removal of selected text on the small line
                - the removal of selected text on the large line


    So if you get the entiret of Step 1 to work then you should easily solve this

    One thing that was extremely confusing:
    LanguageServer2 wasn't forgetting the state of the previous websocket connection so to speak.
    So I was getting these "weird" errors but I fixed that just now.

    if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded)
    
    explorerGlobal.js:CollapseAnExpandedNode | editorGlobal_ui.js:RemoveSelection
    -----------------------------------------------------------------------------
    let countChildren = 0;                                                  | ...linesRemovedCount...
    EXPLORER_treeViewNodes.removeAt(indexItem + 1, countChildren);          | this is the finalization step of the edit
    get_final_ringBufferIndexItem()                                         | get_final_ringBufferIndexItem()
    if (final_ringBufferIndexItem < 0)                                      | if (final_ringBufferIndexItem < 0)
    if (ringBufferIndexItem === final_ringBufferIndexItem)                  | if (ringBufferIndexItem === final_ringBufferIndexItem)
    let availableRingBufferNodesVisuallyAfterCollapsedOne = 0;              | 
    if (countChildren >= availableRingBufferNodesVisuallyAfterCollapsedOne) | 
        EXPLORER_draw_BATCH_request(indexItem + 1, availableRingBufferNodesVisuallyAfterCollapsedOne, 3, next_ringBufferIndex); | 
    else {
        handleRingBufferNodesThatAreOffscreen_collapse(final_ringBufferIndexItem, indexItem, ringBufferIndexItem, countChildren, availableRingBufferNodesVisuallyAfterCollapsedOne);
        // calculate the earliest displaced node
        EXPLORER_draw_BATCH_request(recycled_itemIndex, countChildren, 3, recycled_ringBufferIndex);
    }
    */

    // I gotta cook/eat chicken

    let shouldSkipSpecificRecache = false;

    if (linesRemovedCount > 0) {
        editor.cursor_indexLine = smallLineAndColumnIndices_indexLine;
        editor.cursor_indexColumn = smallLineAndColumnIndices_indexColumn;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        editor.cursorVisualColumnIndex = smallLineAndColumnIndices_indexColumn;

        if (smallLineSpans) {

            var recipientLineSpans = smallLineSpans;

            let takeFromLineSpans = null;

            if (largeLineSpans) { // - [x] keeping, removing

                // append 'largeLineSpans' to 'smallLineSpans'
                
                takeFromLineSpans = largeLineSpans;
                whenHandlingSmallAndLargeMerge_shouldSwapLineSpansIfApplicable = true;

                const largeLineSpans_length = largeLineSpans.length;
                const smallLineSpans_length = smallLineSpans.length;

                let isAtEndOfLine = false;
            }

            if (takeFromLineSpans.length === 1 && takeFromLineSpans[0].text.length === 0) {
                // do not takeFromLineSpans anything
            }
            else {

                // Step 1, create a valid base state before swapping
                if (recipientLineSpans.length === 1 && recipientLineSpans[0].text.length === 0) {
                    EDI_lineStringCache[smallLineSpans_RINGBUFFERINDEX] = takeFromLineSpans; // current receives entirety of next's spans.
                    if (whenHandlingSmallAndLargeMerge_shouldSwapLineSpansIfApplicable) {
                        EDI_lineStringCache[largeLineSpans_RINGBUFFERINDEX] = recipientLineSpans; // current receives entirety of next's spans.
                    }
                }
                else {
                    // TODO: This case is made up 4 cases
                    // - [ ] large position
                    //     - [ ] is start of line
                    //     - [ ] is end of line
                    //         - [ ] large position line being empty is always 'start of line' either it began with nothing or due to the large position line text removal that just occurred it became 
                    //     - [ ] 
                    // - [] no I have this one I did this one cause the large position line removal does everything for me.
                    for (let i = takeFromLineSpans.length - 1; i >= 0; i--) {
                        recipientLineSpans.push(takeFromLineSpans[i]);
                        takeFromLineSpans.length = 0;
                        if (whenHandlingSmallAndLargeMerge_shouldSwapLineSpansIfApplicable) {
                            takeFromLineSpans.push({
                                text: '',
                                color: f.EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
                            });
                        }
                    }
                }
            }
        }
        else {
            if (largeLineSpans) { // - [ ] !keeping, removing
                
                /*
                If you can't get both of these today then you're literally a sham

                I think you can determine which one of the middle lines is in view.
                And then start the algorithm inclusively from that index.
                */

                EDI_scrollCursorIntoView();
                shouldSkipSpecificRecache = true;

                // TODO: You cannot hit the else because you're always grabbing the largeLineSpans... check whether you have the smallLineSpans before you forceable get the largeLineSpans in the case of them not being in the viewport.
            }
            else { // - [ ] !keeping, !removing
                // if neither are in view the only option is to fully recache the UI cause no surviving lines will exist.
                // furthermore, you're probably gonna get hit with a scroll event to the small line/column

                // you can "synchronously force the scroll cursor into view" so that the last read scrollLeft and scrollTop are updated.
                // I think the scroll event handler in and of itself is async though but I could set that myself and then force a full screen re render
                // and then asynchrononusly when the scroll event handler is handled it will see that nothing has changed and re-render the existing cache
                //
                // I don't think the event handler is async necessarily. maybe the better wording is that it is a different category of the event loop I think.
                EDI_scrollCursorIntoView();
                shouldSkipSpecificRecache = true;
                //EDI_scrollCursorIntoView();
            }
        }
    }

    // If the largeLine is not fully selected (minus the line ending) then you probably need to do 1 less linesRemovedCount so you can "manually" handle that largeLine case.

    // It makes more sense to remove the middle lines first. (You have to do the thing first because it will be overwritten if you do this step first)
    // And then if you had the largeLine in the viewport then 'largeLineSpans' is not null and you can merge the "large line index" onto the end of the "small line index"
    // Otherwise all you need to do is tell the UI to include the smallLine as part of what needs to be re-cached.
    // There is the case where the smallLine is not in view but I think I want to focus on having that be a given for a moment.
    if (linesRemovedCount > 0 && !shouldSkipSpecificRecache) {

        if (smallLineSpans === null) {
            throw new Error('TODO: handle smallLine is not in view');
        }
        
        const final_ringBufferIndex = get_final_ringBufferIndex();

        // This case doesn't make sense, it means the virtualCount === 0
        if (final_ringBufferIndex < 0) { EDI_render_force_fullscreen_redraw(); return; }
        // you can just "do nothing" so to speak (you need to "update the scrollbar" still / etc...) and you've already "update the scrollbar"ed so you just return.
        if (smallLineSpans_RINGBUFFERINDEX === final_ringBufferIndex) { return; }

        let availableRingBufferNodesVisuallyAfterCollapsedOne = 0;
        for (let n_index = smallLineSpans_RINGBUFFERINDEX;;) {
            availableRingBufferNodesVisuallyAfterCollapsedOne++;
            n_index = n_index + 1;
            if (n_index >= editor.ArrayFrom_textElement_children_length) {
                n_index -= editor.ArrayFrom_textElement_children_length;
            }
            if (n_index === final_ringBufferIndex) {
                break;
            }
        }

        if (linesRemovedCount >= availableRingBufferNodesVisuallyAfterCollapsedOne) {
            const next_ringBufferIndex = smallLineSpans_RINGBUFFERINDEX + 1;
            if (next_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                next_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
            }

            // This is going to be slightly different then because you haven't finalized yet whereas the explorer did
            // TODO: 'EDI_render_specific_recache_REMOVAL' function does not exist
            // !!!! There is no specific redraw you are just specific recalculating cache
            editor.cursor_editLength_characters = original_edit_length;
            // select end of 'aaaa' line start there then end of 'YYYY' line including line end then scroll 'aaaa' back into view then remove selection it doesn't currently work because you need to offset lines by linesRemovedCount which is not the available etc...
            EDI_render_specific_recache_REMOVAL(smallLineAndColumnIndices_indexLine + 1, linesRemovedCount, availableRingBufferNodesVisuallyAfterCollapsedOne, next_ringBufferIndex, /*fakeLineIndices*/ true);
        }
        else {
            EDI_handleRingBufferNodesThatAreOffscreen_RemoveSelection(
                final_ringBufferIndex,
                smallLineAndColumnIndices_indexLine,
                smallLineSpans_RINGBUFFERINDEX,
                linesRemovedCount,
                availableRingBufferNodesVisuallyAfterCollapsedOne);

            let recycled_itemIndex = smallLineAndColumnIndices_indexLine;
            let recycled_ringBufferIndex = smallLineSpans_RINGBUFFERINDEX;
            const displaced_count = availableRingBufferNodesVisuallyAfterCollapsedOne - linesRemovedCount;
            // TODO: calculate the earliest displaced node faster than just "looping a minus 1 over and over"
            for (let i = 0; i < (displaced_count + 1); i++) {
                recycled_itemIndex++;
                recycled_ringBufferIndex++;
                if (recycled_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                    recycled_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
                }
            }

            // This is going to be slightly different then because you haven't finalized yet whereas the explorer did
            // TODO: 'EDI_render_specific_recache_REMOVAL' function does not exist
            // !!!! There is no specific redraw you are just specific recalculating cache
            editor.cursor_editLength_characters = original_edit_length;
            EDI_render_specific_recache_REMOVAL(recycled_itemIndex, linesRemovedCount, linesRemovedCount, recycled_ringBufferIndex, /*fakeLineIndices*/ true);

            // So then if you didn't do 'EDI_render_specific_recache_REMOVAL' it just wouldn't cache the lines of text that fell into view is all?
            // So this should still bring all the latter and in view lines up 1 line if you remove from end of small to end of large (minus line ending)
            // 
            // it did
            // I gotta flip my laundry
            // k I need to have an example that will bring text into view after the removal and get that to work
            //EDI_render_do_Scroll();
        }
    }

    /*
    Move cursor end of 'aaaa' and start of 'bbbb' do remove.
    It puts 'HHHH' on the end of 'aaaa' same line
    and removes 'bbbb' completely( the line is replaced by 'cccc' and etc... cause everything got shifted up. which is partially true? the only issue is that 'HHHH' is supposed to say 'bbbb')
    */

    // Remove middle line(s)
    if (linesRemovedCount > 0) {
        if (EDI_drawGutter_Width(editor.lineEndPositionList_count - linesRemovedCount)) {
            // If true then you need to also draw the dependent UI
            EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
            EDI_drawHorizontalScrollbar();
        }
    }

    // TODO: This happens too late for the 'EDI_render_specific_recache_REMOVAL' invocations to have it ready it, for now am duplicating this line above the invocations.
    editor.cursor_editLength_characters = original_edit_length;

    if (!shouldSkipSpecificRecache) {
        // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
        EDI_render_request(1 /*RenderKind.Scroll: 1*/);
        //EDI_render_TextContent();
        //EDI_render_Cursor();
    }
    else {
        EDI_render_force_fullscreen_redraw();
    }
}

// Helper to reverse a segment inside the ring buffer in-place
// This allows us to perform block rotations without element-by-element shifting loops
function EDI_reverseBufferSegment(start, end) {
    let left = start;
    let right = end;
    while (left !== right) {
        const temp = EDI_lineStringCache[left];
        EDI_lineStringCache[left] = EDI_lineStringCache[right];
        EDI_lineStringCache[right] = temp;

        if (left === right) break;
        left++;
        if (left >= editor.ArrayFrom_textElement_children_length) {
            left -= editor.ArrayFrom_textElement_children_length
        }

        if (left === right) break;
        right--;
        if (right < 0) {
            right = editor.ArrayFrom_textElement_children_length - 1;
        }
    }
}

function get_final_ringBufferIndex() {
    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
    let final_ringBufferIndex = editor.ArrayFrom_textElement_children_length - 1;
    if (final_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || final_ringBufferIndex < 0) final_ringBufferIndex = -1;
    else final_ringBufferIndex = (final_ringBufferIndex + editor.ringBuffer_indexZero) % editor.ArrayFrom_textElement_children_length;
    if (final_ringBufferIndex < 0) { return -1; }

    return final_ringBufferIndex;
}

function EDI_handleRingBufferNodesThatAreOffscreen_RemoveSelection(final_ringBufferIndex, indexItem_of_collapsed_node, ringBufferIndex_of_collapsed_node, recycleCount, availableRingBufferNodesVisuallyAfterCollapsedOne) {
    let displaced_itemIndex = indexItem_of_collapsed_node;
    let displaced_ringBufferIndex = ringBufferIndex_of_collapsed_node;
    // TODO: calculate the earliest displaced node faster than just "looping a minus 1 over and over"
    for (let i = 0; i < (recycleCount + 1); i++) {
        displaced_itemIndex++;
        displaced_ringBufferIndex++;
        if (displaced_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
            displaced_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
        }
    }

    let recycle_itemIndex = indexItem_of_collapsed_node + 1;
    let recycle_ringBufferIndex = ringBufferIndex_of_collapsed_node + 1;
    if (recycle_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
        recycle_ringBufferIndex -= editor.ArrayFrom_textElement_children_length
    }

    // 3. Perform a block rotation via triple-reversal 
    // This repositions all 'recycle(s)' and 'displaced(s)' in O(N) operations total, discarding the nested loops
    
    const inclusive_earliest_recycle_ringBufferIndex = recycle_ringBufferIndex;

    let end_of_recycle_block = displaced_ringBufferIndex - 1;
    if (end_of_recycle_block < 0) {
        end_of_recycle_block = editor.ArrayFrom_textElement_children_length - 1;
    }

    const endOfDisplacedBlock = final_ringBufferIndex;

    EDI_reverseBufferSegment(inclusive_earliest_recycle_ringBufferIndex, end_of_recycle_block); // Reverse Recycle(s)
    EDI_reverseBufferSegment(displaced_ringBufferIndex, endOfDisplacedBlock);                   // Reverse Displaced(s)
    EDI_reverseBufferSegment(recycle_ringBufferIndex, endOfDisplacedBlock);                     // Reverse entire window

    // The 'recycles' will be drawn with their text, depth, and translateY immediately after this function so you can skip them.
    // Since everything was reversed in earlier steps this is the way to do exactly that.
    displaced_ringBufferIndex = recycle_ringBufferIndex;
    displaced_itemIndex = recycle_itemIndex;

    const displacedCount = availableRingBufferNodesVisuallyAfterCollapsedOne - recycleCount;

    for (let i = 0; i < displacedCount; i++) {
        displaced_itemIndex++;

        displaced_ringBufferIndex++;
        if (displaced_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
            displaced_ringBufferIndex -= editor.ArrayFrom_textElement_children_length
        }
    }
}

/** TODO: this is nearly identical to backspace, the difference is the check 'if (editor.cursor_editKind !== EditKind.DeleteLtr)', thus dedupe the logic or no? */
function EDI_render_do_Delete() {
    if (editor.cursor_editKind !== 2 /*EditKind.DeleteLtr: 2*/) {
        return;
    }

    if (editor.cursor_edit_eventCount_drawn >= editor.cursor_edit_eventCount_occurred) {
        return;
    }

    let targetSpanIndex = 0;
    let runningColumnIdx = 0;
    let targetSpan = null;
    let relativeIndex = 0;
    let remainingCharacterRemovals = editor.cursor_editLength_characters - editor.cursor_edit_eventCount_drawingStateContinuationValue;

    // 1. Target the specific line row index where the typing is taking place
    const activeLine = editor.cursor_indexLine;

    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
    let activeLine_ringBufferIndex = activeLine - editor.virtualIndexLine;
    if (activeLine_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
    else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
    if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
    let lineSpans = EDI_lineStringCache[activeLine_ringBufferIndex];

    // 2. Determine the column position where the *first character of this edit burst* began
    const editStartColumn = editor.cursorVisualColumnIndex;

    // Find the precise column location of the characters we are about to remove right now
    const currentEditColumn = editStartColumn;
    let isAtEndOfLine = false;

    // 3. Scan the cached spans to find where currentEditColumn lands
    for (let i = 0; i < lineSpans.length; i++) {
        const span = lineSpans[i];
        const spanLength = span.text.length;

        if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
            targetSpanIndex = i;
            targetSpan = span;
            relativeIndex = currentEditColumn - runningColumnIdx;
            
            // If the cursor hits exactly between two spans, your rule dictates targeting 
            // the left span at its trailing length index. We break early to lock onto it.
            break;
        }
        runningColumnIdx += spanLength;
        if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
            isAtEndOfLine = true;
        }
    }

    if (targetSpan === null) {
        if (!isAtEndOfLine) {
            throw new Error();
        }
        else {
            targetSpanIndex = lineSpans.length;

            // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
            //targetSpan = lineSpans[targetSpanIndex];

            relativeIndex = 0;
        }
    }

    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        //editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;
        // you can't do the editor.cursor_edit_eventCount_drawn immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
        
        if (isAtEndOfLine) {
            isAtEndOfLine = false;
            if (activeLine < editor.lineEndPositionList_count) {
                // append 'next line' to 'current line'
                const NEXT_ringBufferIndex = activeLine_ringBufferIndex + 1;
                if (NEXT_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                    NEXT_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
                }

                const NEXT_lineSpans = EDI_lineStringCache[NEXT_ringBufferIndex];
                const NEXT_lineSpans_length = NEXT_lineSpans.length;
                
                if (NEXT_lineSpans_length === 1 && NEXT_lineSpans[0].text.length === 0) { // (do not append if next line is just an empty string)
                    isAtEndOfLine = true;
                }
                else {
                    
                    if (lineSpans.length === 1 && lineSpans[0].text.length === 0) {
                        lineSpans.length = 0; // Remove the empty string from the current
                        EDI_lineStringCache[activeLine_ringBufferIndex] = NEXT_lineSpans; // current receives entirety of next's spans.
                        lineSpans = NEXT_lineSpans // update the local variable
                        targetSpanIndex = 0; // if initial 'if (targetSpan === null)' then 'targetSpanIndex = lineSpans.length;' so you need to set to 0 here.
                    }
                    else {
                        for (let i = 0; i < NEXT_lineSpans_length; i++) {
                            lineSpans.push(NEXT_lineSpans[i]);
                        }
                    }
                    targetSpan = lineSpans[targetSpanIndex];
                }

                // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
                let final_ringBufferIndexItem = editor.ArrayFrom_textElement_children_length - 1;
                if (final_ringBufferIndexItem >= editor.ArrayFrom_textElement_children_length || final_ringBufferIndexItem < 0) final_ringBufferIndexItem = -1;
                else final_ringBufferIndexItem = (final_ringBufferIndexItem + editor.ringBuffer_indexZero) % editor.ArrayFrom_textElement_children_length;
                if (final_ringBufferIndexItem < 0) { return; }

                let current_ringBufferIndex = NEXT_ringBufferIndex;
                
                while (current_ringBufferIndex !== final_ringBufferIndexItem) {
                    let srcLineSpansRingBufferIndex = current_ringBufferIndex + 1;
                    if (srcLineSpansRingBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                        srcLineSpansRingBufferIndex -= editor.ArrayFrom_textElement_children_length;
                    }

                    lineSpans[current_ringBufferIndex] = lineSpans[srcLineSpansRingBufferIndex];

                    current_ringBufferIndex = srcLineSpansRingBufferIndex;
                }

                // TODO: Tell scroll to recalculate cache for final_ringBufferIndexItem, ..., n for times backspace hit a line end in this function.

                // (copy of 5.) Commit the continuation value forward so the next frame knows where to pick up
                editor.cursor_edit_eventCount_drawingStateContinuationValue += 1;
                editor.cursor_edit_eventCount_drawn += 1;
                remainingCharacterRemovals -= 1;
                
                if (isAtEndOfLine) {
                    continue;
                }
            }
            else {
                throw new Error('TODO: hit EOF');
            }
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
        const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

        // ...the text inline directly into the string reference inside the cache array frame
        if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
            lineSpans.splice(targetSpanIndex, 1);
        }
        else {
            targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
        }
        
        // 5. Commit the continuation value forward so the next frame knows where to pick up
        // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
        editor.cursor_edit_eventCount_drawingStateContinuationValue += actualCharacterRemovals;
        editor.cursor_edit_eventCount_drawn += actualCharacterRemovals;
        remainingCharacterRemovals -= actualCharacterRemovals;

        if (remainingCharacterRemovals > 0) {
            if (targetSpanIndex < lineSpans.length) {
                targetSpan = lineSpans[targetSpanIndex];
                relativeIndex = 0;
            }
            else {
                isAtEndOfLine = true;
            }
        }
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_Backspace() {
    if (editor.cursor_editKind !== 3 /*EditKind.BackspaceRtl: 3*/) {
        return;
    }

    if (editor.cursor_edit_eventCount_drawn >= editor.cursor_edit_eventCount_occurred) {
        return;
    }

    let targetSpanIndex = 0;
    let runningColumnIdx = 0;
    let targetSpan = null;
    let relativeIndex = 0;
    let remainingCharacterRemovals = editor.cursor_editLength_characters - editor.cursor_edit_eventCount_drawingStateContinuationValue;

    // 1. Target the specific line row index where the typing is taking place
    const activeLine = editor.cursor_indexLine;

    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
    let activeLine_ringBufferIndex = activeLine - editor.virtualIndexLine;
    if (activeLine_ringBufferIndex >= editor.ArrayFrom_textElement_children_length || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
    else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
    if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
    let lineSpans = EDI_lineStringCache[activeLine_ringBufferIndex];

    // 2. Determine the column position where the *first character of this edit burst* began
    const editStartColumn = editor.cursorVisualColumnIndex;

    // Find the precise column location of the characters we are about to remove right now
    const currentEditColumn = editStartColumn;
    let isAtEndOfLine = false;

    // 3. Scan the cached spans to find where currentEditColumn lands
    for (let i = 0; i < lineSpans.length; i++) {
        const span = lineSpans[i];
        const spanLength = span.text.length;

        if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
            targetSpanIndex = i;
            targetSpan = span;
            relativeIndex = currentEditColumn - runningColumnIdx;
            
            // If the cursor hits exactly between two spans, your rule dictates targeting 
            // the left span at its trailing length index. We break early to lock onto it.
            break;
        }
        runningColumnIdx += spanLength;
        if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
            isAtEndOfLine = true;
        }
    }

    if (targetSpan === null) {
        if (!isAtEndOfLine) {
            throw new Error();
        }
        else {
            targetSpanIndex = lineSpans.length;

            // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
            //targetSpan = lineSpans[targetSpanIndex];

            relativeIndex = 0;
        }
    }

    while (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        //editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;
        // you can't do the editor.cursor_edit_eventCount_drawn immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
        
        if (isAtEndOfLine) {
            isAtEndOfLine = false;
            if (activeLine < editor.lineEndPositionList_count) {
                // append 'next line' to 'current line'
                const NEXT_ringBufferIndex = activeLine_ringBufferIndex + 1;
                if (NEXT_ringBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                    NEXT_ringBufferIndex -= editor.ArrayFrom_textElement_children_length;
                }

                const NEXT_lineSpans = EDI_lineStringCache[NEXT_ringBufferIndex];
                const NEXT_lineSpans_length = NEXT_lineSpans.length;
                
                if (NEXT_lineSpans_length === 1 && NEXT_lineSpans[0].text.length === 0) { // (do not append if next line is just an empty string)
                    isAtEndOfLine = true;
                }
                else {
                    
                    if (lineSpans.length === 1 && lineSpans[0].text.length === 0) {
                        lineSpans.length = 0; // Remove the empty string from the current
                        EDI_lineStringCache[activeLine_ringBufferIndex] = NEXT_lineSpans; // current receives entirety of next's spans.
                        lineSpans = NEXT_lineSpans // update the local variable
                        targetSpanIndex = 0; // if initial 'if (targetSpan === null)' then 'targetSpanIndex = lineSpans.length;' so you need to set to 0 here.
                    }
                    else {
                        for (let i = 0; i < NEXT_lineSpans_length; i++) {
                            lineSpans.push(NEXT_lineSpans[i]);
                        }
                    }
                    targetSpan = lineSpans[targetSpanIndex];
                }

                // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
                let final_ringBufferIndexItem = editor.ArrayFrom_textElement_children_length - 1;
                if (final_ringBufferIndexItem >= editor.ArrayFrom_textElement_children_length || final_ringBufferIndexItem < 0) final_ringBufferIndexItem = -1;
                else final_ringBufferIndexItem = (final_ringBufferIndexItem + editor.ringBuffer_indexZero) % editor.ArrayFrom_textElement_children_length;
                if (final_ringBufferIndexItem < 0) { return; }

                let current_ringBufferIndex = NEXT_ringBufferIndex;
                
                while (current_ringBufferIndex !== final_ringBufferIndexItem) {
                    let srcLineSpansRingBufferIndex = current_ringBufferIndex + 1;
                    if (srcLineSpansRingBufferIndex >= editor.ArrayFrom_textElement_children_length) {
                        srcLineSpansRingBufferIndex -= editor.ArrayFrom_textElement_children_length;
                    }

                    lineSpans[current_ringBufferIndex] = lineSpans[srcLineSpansRingBufferIndex];

                    current_ringBufferIndex = srcLineSpansRingBufferIndex;
                }

                // TODO: Tell scroll to recalculate cache for final_ringBufferIndexItem, ..., n for times backspace hit a line end in this function.

                // (copy of 5.) Commit the continuation value forward so the next frame knows where to pick up
                editor.cursor_edit_eventCount_drawingStateContinuationValue += 1;
                editor.cursor_edit_eventCount_drawn += 1;
                remainingCharacterRemovals -= 1;
                
                if (isAtEndOfLine) {
                    continue;
                }
            }
            else {
                throw new Error('TODO: hit EOF');
            }
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
        const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

        // ...the text inline directly into the string reference inside the cache array frame
        if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
            lineSpans.splice(targetSpanIndex, 1);
        }
        else {
            targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
        }
        
        // 5. Commit the continuation value forward so the next frame knows where to pick up
        // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
        editor.cursor_edit_eventCount_drawingStateContinuationValue += actualCharacterRemovals;
        editor.cursor_edit_eventCount_drawn += actualCharacterRemovals;
        remainingCharacterRemovals -= actualCharacterRemovals;

        if (remainingCharacterRemovals > 0) {
            if (targetSpanIndex < lineSpans.length) {
                targetSpan = lineSpans[targetSpanIndex];
                relativeIndex = 0;
            }
            else {
                isAtEndOfLine = true;
            }
        }
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(1 /*RenderKind.Scroll: 1*/);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_InsertLtr() {
    if (editor.cursor_editKind !== 1 /*EditKind.InsertLtr: 1*/) {
        return;
    }
    if (editor.cursor_edit_eventCount_drawn < editor.cursor_edit_eventCount_occurred) {
        editor.cursor_edit_eventCount_drawn = editor.cursor_edit_eventCount_occurred;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex = editor.cursor_indexLine - editor.virtualIndexLine;
        if (ringBufferIndex >= editor.ArrayFrom_textElement_children_length || ringBufferIndex < 0) ringBufferIndex = -1;
        else ringBufferIndex = (ringBufferIndex + editor.ringBuffer_indexZero) % editor.virtualCount;
        if (ringBufferIndex < 0) { return; } // line is not in viewport
        let lineSpans = EDI_lineStringCache[ringBufferIndex];

        // 2. Determine the column position where the *first character of this edit burst* began
        // We use indexColumn minus the absolute total length of characters typed in this current edit session
        const editStartColumn = editor.cursorVisualColumnIndex - editor.cursor_editLength_characters;
        
        // Find the precise column location of the characters we are about to insert right now
        const currentEditColumn = editStartColumn + editor.cursor_edit_eventCount_drawingStateContinuationValue;

        let runningColumnIdx = 0;
        let targetedSpan = null;
        let relativeInsertIndex = 0;

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            // If the cursor lands completely inside this span, or exactly on its trailing right edge
            if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                targetedSpan = span;
                relativeInsertIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        if (targetedSpan !== null) {
            // Decode only the new slice of un-drawn keys typed during this frame frame burst
            const freshlyTypedString = EDI_decoder.decode(
                EDI_cursor_textInsertionBuffer.subarray(
                    editor.cursor_edit_eventCount_drawingStateContinuationValue, 
                    editor.cursor_editLength_characters
                )
            );

            // Splice the text inline directly into the string reference inside the cache array frame
            targetedSpan.text = 
                targetedSpan.text.slice(0, relativeInsertIndex) + 
                freshlyTypedString + 
                targetedSpan.text.slice(relativeInsertIndex);
        }

        // 5. Commit the continuation value forward so the next frame knows where to pick up
        editor.cursor_edit_eventCount_drawingStateContinuationValue = editor.cursor_editLength_characters;

        //// 6. Request a canvas redraw layout frame pass to force the changes onto the screen
        EDI_render_request(1 /*RenderKind.Scroll: 1*/);
        //EDI_render_TextContent();
        //EDI_render_Cursor();
    }
}


function theNew_walkLineUntilIndexColumn() {
    let lineSpans = EDI_lineStringCache[i];
    if (lineSpans === undefined) {

    }
    //if () {
//
    //}
}

/**
 * You may want to update the vertical virtualization boundary prior to actually updating the EDI_lineEndPositionList_
 * Thus this function takes a 'lineCount' which defaults to editor.lineEndPositionList_count if falsey.
 * @param {number | null | undefined} lineCount In order to permit arbitrarily updating the vertical virtualization boundary, this takes a lineCount. If falsey, then editor.lineEndPositionList_count is used.
 */
function update_verticalVirtualizationBoundary(lineCount) {
    if (!lineCount) lineCount = editor.lineEndPositionList_count;
    editor.virtualization_horizontal.style.height = ((lineCount + editor.virtualCount - 1) * editor.lineHeight) + 'px';
}

/**
 * EDI_render_do_Scroll() has this function explicitly inlined (duplicated) within the source code.
 * 
 * This function is sketchy but if you invoke EDI_render_do_Scroll immediately-soon after you'll probably be fine.
 * Cause this would mean you changed the virtual index but you never redrew the UI yet. But if you draw the UI in the same frame/etc... you're probably good.
 * This function is good for the sake of forcing a full screen redraw.
 */
function EDI_render_force_fullscreen_redraw() {
    editor.virtualIndexLine = (EDI_lastReadNumber_scrollTop / editor.lineHeight) | 0; // By bit operator or'ing with 0 you "cast" the number to a signed 32-bit integer (Int32).
    editor.ONSCROLLvirtualIndexLine = editor.virtualIndexLine + editor.virtualCount;
    EDI_render_do_Scroll();
}

/**
 * If the 'editor.drawn_count_of_digits_longest_line_number === positiveNumbersOnly_countDigitsLoop(editor.lineEndPositionList_count)'
 * then the function does nothing.
 * 
 * TODO: Track the min and max until length changes and then only 2 operations at worst case than while
 * 
 * @returns a bool indicating whether the gutter was drawn (if 'editor.drawn_count_of_digits_longest_line_number' has not changed then false is returned because the gutter didn't need to be "re-" drawn)
 * 
 * Dependent UI: EDI_render_request(RenderKind.Cursor_n); EDI_drawHorizontalScrollbar();
 * 
 * You either guarantee the dependent UI to run by invoking them regardless of this function's result 'EDI_drawGutter_Width(); EDI_render_request(RenderKind.Cursor_n); EDI_drawHorizontalScrollbar();'
 * Or you capture the return value to know whether the gutter was "re-" drawn, because if so, you need to invoke 'EDI_render_request(RenderKind.Cursor_n); EDI_drawHorizontalScrollbar();'
 * for the dependent UI.
 * The confusion, if there is any, comes from the dependent UI in some scenarios being required independently of whether drawGutter changes. And at other times they're solely dependent on whether drawGutter changes.
 */
function EDI_drawGutter_Width(lineCount) {
    //let digitCountOfLargestLineNumber = positiveNumbersOnly_countDigitsLoop(lineCount);
    //if (editor.drawn_count_of_digits_longest_line_number === digitCountOfLargestLineNumber) return false;
//
    //editor.drawn_count_of_digits_longest_line_number = digitCountOfLargestLineNumber;
//
    //editor.gutterWidthStyleValue = Math.ceil(digitCountOfLargestLineNumber * EDI_characterWidth);
    //editor.gutterWidthTotal = editor.gutterWidthStyleValue + editor.gutterPaddingLeft + f.CONST_fEDI_gutterPaddingRight;
    //gutterWidthTotal_withPxUnits = `${editor.gutterWidthTotal}px`;
//
    //let gutterWidth = editor.gutterWidthStyleValue + 'px';
    //editor.gutter.style.width = gutterWidth;
//
    //editor.text.style.left = gutterWidthTotal_withPxUnits;
    //EDI_scroll_viewport.style.left = gutterWidthTotal_withPxUnits;
//
    //for (let i = 0; i < editor.ArrayFrom_textElement_children_length/*a 'ArrayFrom_gutter_children_length' would always be equal to the textElement equivalent*/; i++) {
    //    EDI_ringBuffer_gutter[i].style.width = gutterWidth;
    //}
//
    //return true;
}

/**
 * You need to change this logic to know the longest line.
 * Then when the longest line changes or some such likely related to finalization of an edit (not pending edits).
 * then at that point you redraw this.
 * 
 * This is not dependent on the gutter width?
 */
function EDI_drawHorizontalScrollbar() {
    if (editor.longestLine_length !== editor.longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar) {
        
        editor.longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar = editor.longestLine_length;

        editor.contentWidth = Math.ceil((editor.longestLine_length + 6/*characterwidth padding?*/) * EDI_characterWidth);

        if ((editor.contentWidth < (editor.baseElement.clientWidth - editor.gutterWidthTotal)) && (editor.baseElement.clientWidth - editor.gutterWidthTotal > 0)) {
            editor.contentWidth = Math.floor(editor.baseElement.clientWidth - editor.gutterWidthTotal);
        }

        // The scrollViewport currently has a 'left/inset' that places it beyond the gutter. So the gutterWidthTotal being added is not necessary.
        const virtualization_horizontal_style_width_attribute = editor.contentWidth + 'px';

        editor.virtualization_horizontal.style.width = virtualization_horizontal_style_width_attribute;

        //for (let i = 0; i < editor.ArrayFrom_textElement_children_length; i++) {
        //    EDI_ringBuffer_text[i].style.width = virtualization_horizontal_style_width_attribute;
        //}

        //EDI_cursor_caretRow.style.width = virtualization_horizontal_style_width_attribute;
    }
}

/**
 * @returns 
 */
function EDI_insertGapBufferSpan() {
    walkLineUntilIndexColumn();
    if (w_div === w_divNONE) {
        EDI_cursor_textInsertionBufferWriteToSpanElement = null;
        editor.editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        return;
    }

    if (editor.w_indexColumn_Goal == 0) {
        EDI_cursor_textInsertionBufferWriteToSpanElement = w_div;
        editor.editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
    }
    else {
        EDI_cursor_textInsertionBufferWriteToSpanElement = w_div;

        if (editor.w_indexColumn_Goal === editor.w_indexColumn_Sum + EDI_cursor_textInsertionBufferWriteToSpanElement.textContent.length) {
            editor.editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = EDI_cursor_textInsertionBufferWriteToSpanElement.textContent.length;
        }
        else {
            editor.editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = editor.w_indexColumn_SpanTextContentRelative;
        }
    }
}

function EDI_render_SelectionAndCursor() {


    // I'm just experimenting because tons of variables are shared.
    //EDI_render_SelectionAndCursor();
    const cursorCanvas = editor.cursor_canvas;
    const ctx = cursorCanvas.getContext('2d');
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    // --- STEP 1: RENDER SELECTION BOX BACKGROUND SPANS ---
    // (Assuming you track a selection range from anchorLine/Col to focusLine/Col)

    const local_lineHeight = editor.lineHeight;
    let vertical = -(EDI_lastReadNumber_scrollTop % local_lineHeight);
    const startLineIndex = editor.virtualIndexLine;
    const upperLineIndexExclusive = startLineIndex + editor.virtualCount;

    if (EDI_cursor_hasSelection()) {
        // (Note: Make sure your EDI_createStyleForSelection utility also takes horizontal scrolling into account when drawing selection backgrounds!)
        EDI_createStyleForSelection(ctx, vertical, local_lineHeight, startLineIndex);
    }

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#f2a72f'; // Solid cursor accent color
    const cursorLine = editor.cursor_indexLine;
    if (cursorLine >= startLineIndex && cursorLine < upperLineIndexExclusive) {
        const cursorX = (editor.cursorVisualColumnIndex * EDI_characterWidth) - EDI_lastReadNumber_scrollLeft;
        const cursorY = -(EDI_lastReadNumber_scrollTop % local_lineHeight) + ((cursorLine - startLineIndex) * local_lineHeight);
        
        EDI_cursor_cursorTranslateXValue = cursorX;
        ctx.fillRect(cursorX, cursorY, 2, local_lineHeight);
    }

    if (autocomplete.exists) {
        const newY = (editor.cursor_indexLine + 1) * editor.lineHeight;
        const newX = editor.cursorVisualColumnIndex * EDI_characterWidth;
        autocomplete.rootElement.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    }
}

function EDI_createStyleForSelection(ctx, viewportY, local_lineHeight, firstVirtualIndexLine) {

    // --- STEP 1: RENDER SELECTION BOX BACKGROUND SPANS ---
    // (Assuming you track a selection range from anchorLine/Col to focusLine/Col)
    ctx.fillStyle = 'rgba(197, 198, 140, 0.25)'; // Highlight tint color

    let start = editor.cursor_selectionAnchor;
    EDI_ret_getLineAndColumnIndices_raw(start);
    let startLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
    let startLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    let startLine = startLineAndColumnIndices_indexLine;
    let startColumn = startLineAndColumnIndices_indexColumn;
    let start_visualColumnStart = editor.cursor_selectionIndexAnchorColumnVISUAL;

    let end = editor.cursor_selectionEnd;
    EDI_ret_getLineAndColumnIndices_raw(end);
    let endLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
    let endLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
    let INCLUSIVEendLine = endLineAndColumnIndices_indexLine;
    let INCLUSIVEendColumn = endLineAndColumnIndices_indexColumn;
    let end_visualColumnStart = editor.cursor_selectionIndexEndColumnVISUAL;

    // # Virtualization
    if (startLine < editor.virtualIndexLine) {
        startLine = editor.virtualIndexLine;
        startColumn = 0;
    }
    let lastIndexLineBeingShown = editor.virtualIndexLine + editor.virtualCount - 1;
    if (INCLUSIVEendLine > lastIndexLineBeingShown) {
        INCLUSIVEendLine = lastIndexLineBeingShown;
        INCLUSIVEendColumn = EDI_getLastValidIndexColumn_raw(INCLUSIVEendLine);
    }

    if (start > end) {
        let temp = end;
        let tempLine = INCLUSIVEendLine;
        let tempColumn = INCLUSIVEendColumn;
        let tempVisualColumn;
        end = start;
        INCLUSIVEendLine = startLine;
        INCLUSIVEendColumn = startColumn;
        start = temp;
        startLine = tempLine;
        startColumn = tempColumn;

        tempVisualColumn = start_visualColumnStart;
        start_visualColumnStart = end_visualColumnStart;
        end_visualColumnStart = tempVisualColumn;
    }

    /*
    But it just means you have a startLineSelectionWidth of 'startLineEntireVisualWidth - (startColumnVisualOfSelection * charWidth)'
    and the endLineSelectionWidth is 'endColumnVisualOfSelection'.
    */


    if (startLine > firstVirtualIndexLine) {
        viewportY += (local_lineHeight * (startLine - firstVirtualIndexLine));
    }


    if (startLine === INCLUSIVEendLine) {
        //lineSelectionDiv.style.transform = `translate(${start_visualColumnStart * EDI_characterWidth}px, ${editor.lineHeight * startLine}px)`;
        //lineSelectionDiv.style.width = (end_visualColumnStart - start_visualColumnStart) * EDI_characterWidth + 'px';


        const selStartCol = start_visualColumnStart;
        const selEndCol = end_visualColumnStart;
        //
        // Fast Monospace Layout Math: Multiply columns directly by character width!
        const x = selStartCol * EDI_characterWidth;
        const width = (selEndCol - selStartCol) * EDI_characterWidth;
        //
        // Draw a background highlighting block behind the text positions
        ctx.fillRect(x, viewportY, width, local_lineHeight);


        viewportY += local_lineHeight;
    }
    else {
        {
        // start line
        //lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
        //lineSelectionDiv.style.transform = `translate(${start_visualColumnStart * EDI_characterWidth}px, ${editor.lineHeight * startLine}px)`;
        EDI_ret_getLineBoundaryPositions_raw(startLine);
        let lineVisualWidth = EDI_getEntireLineVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
        
        const selStartCol = start_visualColumnStart;
        const selEndCol = lineVisualWidth;
        //
        // Fast Monospace Layout Math: Multiply columns directly by character width!
        const x = selStartCol * EDI_characterWidth;
        const width = (selEndCol - selStartCol + 1) * EDI_characterWidth;
        //
        // Draw a background highlighting block behind the text positions
        ctx.fillRect(x, viewportY, width, local_lineHeight);

        //lineSelectionDiv.style.width = (lineVisualWidth + 1 - start_visualColumnStart) * EDI_characterWidth + 'px';
        viewportY += local_lineHeight;
        }

        // between lines
        for (var lineI = startLine + 1; lineI < INCLUSIVEendLine; lineI++) {
            //lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            //lineSelectionDiv.style.transform = `translate(0px, ${editor.lineHeight * lineI}px)`;
            EDI_ret_getLineBoundaryPositions_raw(lineI);
            let lineVisualWidth = EDI_getEntireLineVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
            //lineSelectionDiv.style.width = (lineVisualWidth + 1) * EDI_characterWidth + 'px';

            const selStartCol = 0;
            const selEndCol = lineVisualWidth;
            //
            // Fast Monospace Layout Math: Multiply columns directly by character width!
            const x = selStartCol * EDI_characterWidth;
            const width = (selEndCol - selStartCol + 1) * EDI_characterWidth;
            //
            // Draw a background highlighting block behind the text positions
            ctx.fillRect(x, viewportY, width, local_lineHeight);

            viewportY += local_lineHeight;
        }

        {
        // end line
        //lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
        //lineSelectionDiv.style.transform = `translate(0px, ${editor.lineHeight * INCLUSIVEendLine}px)`;
        //lineSelectionDiv.style.width = end_visualColumnStart * EDI_characterWidth + 'px';


        const selStartCol = 0;
        const selEndCol = end_visualColumnStart;
        //
        // Fast Monospace Layout Math: Multiply columns directly by character width!
        const x = selStartCol * EDI_characterWidth;
        const width = (selEndCol - selStartCol) * EDI_characterWidth;
        //
        // Draw a background highlighting block behind the text positions
        ctx.fillRect(x, viewportY, width, local_lineHeight);


        viewportY += local_lineHeight;
        }
    }
}

/*
Tired can't decide whether this code is an improvement or not; it probably is but nevertheless as I said I just don't feel like reading it right now and thus I can't in good faith just take this. It's such a small snippet of code, maybe you can't read every generated line of code but here it feels like a given that you'd read this one and I just can't do it right now.

function EDI_createStyleForSelection(ctx, viewportY, local_lineHeight, firstVirtualIndexLine) {
  const scrollLeft = EDI_lastReadNumber_scrollLeft;
  const charWidth = EDI_characterWidth;

  let start = editor.cursor_selectionAnchor;
  EDI_ret_getLineAndColumnIndices_raw(start);
  let startLine = editor.ret_getLineAndColumnIndices_indexLine;
  let startColumn = editor.ret_getLineAndColumnIndices_indexColumn;
  let start_visualColumnStart = editor.cursor_selectionIndexAnchorColumnVISUAL;

  let end = editor.cursor_selectionEnd;
  EDI_ret_getLineAndColumnIndices_raw(end);
  let INCLUSIVEendLine = editor.ret_getLineAndColumnIndices_indexLine;
  let INCLUSIVEendColumn = editor.ret_getLineAndColumnIndices_indexColumn;
  let end_visualColumnStart = editor.cursor_selectionIndexEndColumnVISUAL;

  // 1. Normalize backward selections FIRST before clamping to viewport
  if (start > end) {
    let temp = end;
    end = start;
    start = temp;

    let tempLine = INCLUSIVEendLine;
    INCLUSIVEendLine = startLine;
    startLine = tempLine;

    let tempColumn = INCLUSIVEendColumn;
    INCLUSIVEendColumn = startColumn;
    startColumn = tempColumn;

    let tempVisualColumn = start_visualColumnStart;
    start_visualColumnStart = end_visualColumnStart;
    end_visualColumnStart = tempVisualColumn;
  }

  // 2. Clamp to visible vertical viewport AFTER normalization
  const firstVisibleLine = editor.virtualIndexLine;
  const lastIndexLineBeingShown = firstVisibleLine + editor.virtualCount - 1;

  if (startLine < firstVisibleLine) {
    startLine = firstVisibleLine;
    startColumn = 0;
    start_visualColumnStart = 0;
  }
  if (INCLUSIVEendLine > lastIndexLineBeingShown) {
    INCLUSIVEendLine = lastIndexLineBeingShown;
    INCLUSIVEendColumn = EDI_getLastValidIndexColumn_raw(INCLUSIVEendLine);
    EDI_ret_getLineBoundaryPositions_raw(INCLUSIVEendLine);
    end_visualColumnStart = EDI_getEntireLineVisualWidth(
      editor.ret_getLineBoundaryPositions_start,
      editor.ret_getLineBoundaryPositions_end
    ) + 1;
  }

  if (startLine > firstVirtualIndexLine) {
    viewportY += (local_lineHeight * (startLine - firstVirtualIndexLine));
  }

  if (startLine === INCLUSIVEendLine) {
    // Single-line selection
    const x = (start_visualColumnStart * charWidth) - scrollLeft;
    const width = (end_visualColumnStart - start_visualColumnStart) * charWidth;
    ctx.fillRect(x, viewportY, width, local_lineHeight);
  } else {
    // Start line
    EDI_ret_getLineBoundaryPositions_raw(startLine);
    const startLineVisualWidth = EDI_getEntireLineVisualWidth(
      editor.ret_getLineBoundaryPositions_start,
      editor.ret_getLineBoundaryPositions_end
    );
    const startX = (start_visualColumnStart * charWidth) - scrollLeft;
    const startWidth = (startLineVisualWidth - start_visualColumnStart + 1) * charWidth;
    ctx.fillRect(startX, viewportY, startWidth, local_lineHeight);
    viewportY += local_lineHeight;

    // Middle lines
    for (let lineI = startLine + 1; lineI < INCLUSIVEendLine; lineI++) {
      EDI_ret_getLineBoundaryPositions_raw(lineI);
      const lineVisualWidth = EDI_getEntireLineVisualWidth(
        editor.ret_getLineBoundaryPositions_start,
        editor.ret_getLineBoundaryPositions_end
      );
      const midX = -scrollLeft;
      const midWidth = (lineVisualWidth + 1) * charWidth;
      ctx.fillRect(midX, viewportY, midWidth, local_lineHeight);
      viewportY += local_lineHeight;
    }

    // End line
    const endX = -scrollLeft;
    const endWidth = end_visualColumnStart * charWidth;
    ctx.fillRect(endX, viewportY, endWidth, local_lineHeight);
  }
}*/


/**
 * This method will NOT "put a cursor on screen". You need to ensure
 * your cursor exists as a child by appendChild'ing to EDTIOR_cursorListElement.
 * This method instead only moves a cursor that ALREADY is being shown on screen.
 * 
 * If the 'cursor' is not EDI_primaryCursor, then the 'NOTscrollCursorIntoView' parameter has no effect.
 * i.e.: only the EDI_primaryCursor will ever be scrolled into view via this method.
 * 
 * This is not dependent on the gutter width?
 * 
 * @param {boolean} NOTscrollCursorIntoView 
 */
function EDI_drawCursor(NOTscrollCursorIntoView) {
    if (!NOTscrollCursorIntoView) {
        EDI_scrollCursorIntoView();
    }
    
    EDI_render_SelectionAndCursor();
    

    //if (newY !== editor.cursor_cursorTranslateYValue) {
    //    editor.cursor_cursorTranslateYValue = newY;
    //    EDI_cursor_caretRow.style.transform = `translateY(${newY}px)`;
    //}

    //if (newX !== EDI_cursor_cursorTranslateXValue) {
    //    EDI_cursor_cursorTranslateXValue = newX;
    //    EDI_cursor_cursorElement.style.transform = `translateX(${newX}px)`;
    //}

    //EDI_createStyleForSelection();

    //if (!NOTscrollCursorIntoView) {
    //    EDI_scrollCursorIntoView();
    //}

    /*if (editor.isChecking_cursorBlinkTrailingEdge === 0) {
        // Why track "isChecking_..." anymore if you're doing this clearTimeout logic?
        // Because the assumption is that I was wrong about how expensive 'clearTimeout' and 'setTimeout' were
        // with respect to when the timeout doesn't end up being executed due to repeatedly setting and cancelling over and over.
        //
        // That is not to say however that my modifications to the UI are not expensive.
        // So I don't want to change more than 1 variable at a time here.
        //
        editor.isChecking_cursorBlinkTrailingEdge = 1;
        EDI_cursor_cursorElement.style.animationPlayState = 'paused';
        const animations = EDI_cursor_cursorElement.getAnimations();
        if (animations.length > 0) {
            animations[0].currentTime = 0; // Instantly snaps the blink track back to 0%, making it 100% visible
        }
    }*/
    // The question comes down to what each stage of a setTimeout costs.
    // Previously I assumed 'setTimeout' allocated an object somewhere in the JavaScript heap and that it'd trigger JS GC in some way and cause visual jank.
    // Now I know it only allocates an object in C++, and the JavaScript to C++ (or vice versa) interactions are just done via the 'id'.
    // And maybe there is more to it than just an 'id' on the JavaScript side of things but I'm just modifying my assumptions a bit
    // based on new knowledge I've gained and seeing where it leads.
    //
    clearTimeout(editor.cursorBlinkingTrailingEdgeTimeoutId);
    editor.cursorBlinkingTrailingEdgeTimeoutId = setTimeout(EDI_cursorBlinkingTrailingEdge, 500);

/*
- [ ] Further necessary details:
    - [ ] Preferably if you insert text, then remove text, but the removed text is part of the text that you inserted
          that you'd just modify the "gap buffer" and avoid:
          - insert
          - remove triggers finalize of insert
          - start remove
          - eventually finalize remove
          ============================
          versus
          - insert
          - remove just modifies the inserted text
          - eventually finalize insert
        - [ ] But from an order of implementations I don't necessarily know if it is a good idea for me to concern myself with these details or not.
        - [ ] (i.e.: not yet?)
        - [ ] Thus you get the simple batching of edits 100% correct first
        - [ ] And do the other complex batching later.
*/
}

function EDI_scrollCursorIntoView() {
    const scrollContainer = EDI_scroll_viewport;
    
    // TODO: is this synchronous layouting?
    // 1. Get the viewport's current physical layout dimensions
    const viewportWidth = scrollContainer.clientWidth;
    const viewportHeight = scrollContainer.clientHeight;
    
    // Account for your gutter spacing layout allocation
    const gutterWidth = 60; 
    const usableWidth = viewportWidth - gutterWidth;

    // 2. Fetch your current cursor structural position data
    const cursorLine = editor.cursor_indexLine;
    const cursorCol = editor.cursor_indexColumn;
    const local_lineHeight = editor.lineHeight;

    // 3. Compute the cursor's absolute layout coordinates inside the full document space
    const absoluteX = cursorCol * EDI_characterWidth;
    const absoluteY = cursorLine * local_lineHeight;

    // Fetch where the scroll window is currently positioned
    let newScrollTop = scrollContainer.scrollTop;
    let newScrollLeft = scrollContainer.scrollLeft;

    // --- VERTICAL BOUNDS EVALUATION (Y-Axis) ---
    // If the cursor is above the top visible edge, scroll up to snap it to the top
    if (absoluteY < newScrollTop) {
        newScrollTop = absoluteY;
    } 
    // If the cursor is below the bottom visible edge, scroll down to bring it into view
    else if (absoluteY + local_lineHeight > newScrollTop + viewportHeight) {
        newScrollTop = absoluteY + local_lineHeight - viewportHeight;
    }

    // --- HORIZONTAL BOUNDS EVALUATION (X-Axis) ---
    // If the cursor is hidden behind the left gutter line, shift view left
    if (absoluteX < newScrollLeft) {
        newScrollLeft = absoluteX;
    } 
    // If the cursor is past the right screen border edge, shift view right
    else if (absoluteX + EDI_characterWidth > newScrollLeft + usableWidth) {
        newScrollLeft = absoluteX + EDI_characterWidth - usableWidth;
    }

    // 4. Update the native DOM properties only if a change actually occurred
    if (scrollContainer.scrollTop !== newScrollTop) {
        scrollContainer.scrollTop = newScrollTop;
    }
    if (scrollContainer.scrollLeft !== newScrollLeft) {
        scrollContainer.scrollLeft = newScrollLeft;
    }
}

export function EDI_draw_cursor_debug() {
    // TODO: This logic has way too much overhead to be in this function.
    let text = '';

    text += '(' + editor.cursor_indexLine + ', ' + editor.cursor_indexColumn + ')';
    
    if (editor.settings_editorDebugShowAdjacentCharacters) {
        //let previous = EDI_getCharacterPrevious(editor.cursor_indexColumn, EDI_getPositionIndex_cursor_raw());
        //if (previous === '\n') previous = '\\n';
        //else if (previous === '\t') previous = '\\t';
        //let current = EDI_getCharacterCurrent(editor.cursor_indexColumn, EDI_getPositionIndex_cursor_raw(), EDI_getLineEnd_pos_raw(editor.cursor_indexLine));
        //if (current === '\n') current = '\\n';
        //else if (current === '\t') current = '\\t';
        //text += ' | (' + previous + ', ' + current + ')';
        text += 'editor.settings_editorDebugShowAdjacentCharacters_is_not_implemented';
    }

    text += ' | (' + editor.cursorVisualColumnIndex + ')';
    
    text += ' | (' + editor.cursor_editLength_characters + ')';

    text += ' | (' + editor.longestLine_indexLine + ', ' + editor.longestLine_length + ')';

    const textNode = EDI_debug.firstChild;
    textNode.replaceData(0, textNode.length, text);
}

export function EDI_render_do_Resize() {
    EDI_resizeCanvases();
    editor.recentBoundingClientRect_isNull = true;
    //EDI_render_do_Scroll();
    

    //editor.longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar = 1; // necessary for the first render, otherwise the if statement sees 0 !== 0.
    //EDI_drawHorizontalScrollbar();

    //let remember_virtualCount = editor.virtualCount; // for the first render this is 0 and thus it hits
    //editor.virtualCount = Math.ceil(editor.lastReadNumber_offsetHeight / editor.lineHeight);
    //if (editor.virtualCount !== remember_virtualCount) {
    //    // TODO: This only needs to grow or shrink (NOT recreate entirely)
    //    EDI_render_do_CreateViewport();
    //    // TODO: This gets ran twice when starting the app redundantly. (here and the setText for the empty null filename)
    //    // TODO: This only needs to draw the newly came into view lines (a prior necessity is 'EDI_render_do_CreateViewport' to grow / shrink first)
    //    EDI_render_force_fullscreen_redraw();
    //}
}

export function EDI_onResize() {
    if (editor.onResize_timer === 0) {
        // TODO: '109' has no meaning behind it...
        // ...TODO: Figure out how to get this to always trigger faster than the 200ms timeout of the scroll trailing edge...
        // ...lest thou receiveth many object allocation from scroll trailing edge. You see cause you see the syntax highlight happening while resizing.
        editor.onResize_timer = setTimeout(EDI_onResize_startThrottleTimeout_aaa, 109);
    }
}

function EDI_onResize_startThrottleTimeout_aaa() {
    EDI_render_request(2 /*RenderKind.Resize: 2*/);
    editor.onResize_timer = 0;
}

export function EDI_onMouseDown(event) {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }

    if (tooltip.exists) {
        TOOLTIP_hide();
    }
    
    if (autocomplete.exists) {
        AUTOCOMPLETE_hide();
    }

    if (editor.recentBoundingClientRect_isNull) {
        let boundingClientRect = editor.baseElement.getBoundingClientRect();
        editor.recentBoundingClientRect_left = boundingClientRect.left;
        editor.recentBoundingClientRect_top = boundingClientRect.top;
        editor.recentBoundingClientRect_isNull = false;
    }

    if (event.button === 0) {
        editor.mousemove_eventListener_isActive = 1;
        editor.baseElement.addEventListener('mousemove', EDI_onMouseMove_WRAPIT);
    }
    else if (event.button === 3) {
        EDI_moveCursor_indexLine_indexColumn(editor.priorToLastJump_indexLine, editor.priorToLastJump_indexColumn);
        return;
    }

    let rY = event.clientY - editor.recentBoundingClientRect_top + EDI_lastReadNumber_scrollTop;
    let rX = event.clientX - editor.recentBoundingClientRect_left - editor.gutterWidthTotal + EDI_lastReadNumber_scrollLeft;
    
    let indexLine = Math.floor(rY / editor.lineHeight);
    let indexColumn = Math.round(rX / EDI_characterWidth);
    let indexColumnVisual = indexColumn;

    if (indexLine < 0) {
        indexLine = 0;
    }

    if (indexColumn < 0) {
        indexColumn = 0;
        indexColumnVisual = indexColumn;
    }

    if (indexLine >= editor.lineEndPositionList_count) {
        indexLine = editor.lineEndPositionList_count - 1;
    }

    EDI_ret_getLineBoundaryPositions_raw(indexLine);

    if (editor.cursor_indexLine === indexLine) {
        if (rX >= EDI_cursor_cursorTranslateXValue) {
            EDI_ret_getIndexFromX_sameLine_newRxIsLarger(rX, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end, editor.cursor_indexColumn, editor.cursorVisualColumnIndex);
        }
        else {
            EDI_ret_getIndexFromX_sameLine_newRxIsSmaller(rX, editor.ret_getLineBoundaryPositions_start, editor.cursor_indexColumn, editor.cursorVisualColumnIndex);
        }
    }
    else {
        EDI_ret_getIndexFromX_RESET(rX, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
    }
    indexColumn = editor.ret_getIndexFromX_indexColumn;
    indexColumnVisual = editor.ret_getIndexFromX_visualColumns;

    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);
    if (indexColumn > lastValidIndexColumn) {
        indexColumn = lastValidIndexColumn;
        indexColumnVisual = indexColumn;
    }

    if (rX < -1 * editor.gutterPaddingRight) {
        editor.detailRank = 3;
        EDI_onMouseDownDetailRankThree(event.button, event.shiftKey, indexLine, indexColumn);
        return;
    }

    if (event.detail % 3 === 0) {
        editor.detailRank = 3;
        EDI_onMouseDownDetailRankThree(event.button, event.shiftKey, indexLine, indexColumn);
    }
    else if (event.detail % 2 === 0) {
        editor.detailRank = 2;
        EDI_onMouseDownDetailRankTwo(event.button, event.shiftKey, indexLine, indexColumn, indexColumnVisual);
    }
    else {
        editor.detailRank = 1;
        EDI_onMouseDownDetailRankOne(event.button, event.shiftKey, indexLine, indexColumn, indexColumnVisual);
    }
}

function EDI_onMouseDownDetailRankOne(event_button, event_shiftKey, indexLineClicked, indexColumnClicked, indexColumnVisual) {

    let selectionPlusContextMenuCase = event_button === 2 && EDI_cursor_hasSelection();

    if (event_shiftKey && !selectionPlusContextMenuCase) {
        if (!EDI_cursor_hasSelection()) {
            editor.cursor_selectionAnchor = EDI_getPositionIndex_cursor_raw();
            editor.cursor_selectionIndexAnchorColumnVISUAL = indexColumnVisual;
        }
    }

    if (!selectionPlusContextMenuCase) {
        editor.cursor_indexLine = indexLineClicked;
        editor.cursor_indexColumn = indexColumnClicked;
        editor.cursorVisualColumnIndex = indexColumnVisual;
        editor.cursor_STORED_visualWidth = indexColumnVisual;
    
        editor.cursor_selectionEnd = EDI_getPositionIndex_cursor_raw();
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

        if (!event_shiftKey) {
            editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;
        }
    }

    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

function EDI_onMouseDownDetailRankTwo(event_button, event_shiftKey, indexLineClicked, indexColumnClicked, indexColumnVisual) {
    if (event_shiftKey) {
        EDI_onMouseDownDetailRankOne(event_button, event_shiftKey, indexLineClicked, indexColumnClicked);
        return;
    }

    editor.cursor_indexLine = indexLineClicked;
    editor.cursor_indexColumn = indexColumnClicked;
    editor.cursorVisualColumnIndex = indexColumnVisual;
    let positionIndex = EDI_getPositionIndex_cursor_raw();
    
    EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
    const line_start = editor.ret_getLineBoundaryPositions_start;
    const line_end = editor.ret_getLineBoundaryPositions_end;

    let leftCharacterKind = EDI_getCharacterPrevious_KIND(editor.cursor_indexColumn, positionIndex);
    let rightCharacterKind = EDI_getCharacterCurrent_KIND(editor.cursor_indexColumn, positionIndex, line_end);

    if (leftCharacterKind === rightCharacterKind) {
        let goalCharacterKind = rightCharacterKind;

        let tempIndexColumn = editor.cursor_indexColumn;
        let tempIndexColumnVisual = editor.cursorVisualColumnIndex;
        let tempPositionIndex = EDI_getPositionIndex_Overload(editor.cursor_indexLine, tempIndexColumn);
        while (tempIndexColumn > 0) {
            tempIndexColumn--;
            tempIndexColumnVisual--; // TODO: if '\t'
            tempPositionIndex--;
            leftCharacterKind = EDI_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                editor.cursor_selectionAnchor = tempPositionIndex;
                editor.cursor_selectionIndexAnchorColumnVISUAL = tempIndexColumnVisual;
                break;
            }
        }

        let lineLength = line_end - line_start;
        let rightWasFound = false;
        tempIndexColumn = editor.cursor_indexColumn;
        tempIndexColumnVisual = editor.cursorVisualColumnIndex;
        tempPositionIndex = EDI_getPositionIndex_Overload(editor.cursor_indexLine, tempIndexColumn);
        while (tempIndexColumn < lineLength) {
            tempIndexColumn++;
            tempIndexColumnVisual++; // TODO: if '\t'
            tempPositionIndex++;
            rightCharacterKind = EDI_getCharacterCurrent_KIND(tempIndexColumn, tempPositionIndex, line_end);
            if (rightCharacterKind !== goalCharacterKind) {
                editor.cursor_indexColumn = tempIndexColumn;
                editor.cursor_selectionEnd = tempPositionIndex;
                editor.cursor_selectionIndexEndColumnVISUAL = tempIndexColumnVisual;
                editor.cursorVisualColumnIndex = tempIndexColumnVisual;
                rightWasFound = true;
                break;
            }
        }

        if (!rightWasFound) {
            // end of line
            editor.cursor_indexColumn = tempIndexColumn;
            editor.cursor_selectionEnd = tempPositionIndex;
            editor.cursor_selectionIndexEndColumnVISUAL = tempIndexColumnVisual;
            editor.cursorVisualColumnIndex = tempIndexColumnVisual;
        }

        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    else if (leftCharacterKind > rightCharacterKind) {
        let goalCharacterKind = leftCharacterKind;

        let tempIndexColumn = editor.cursor_indexColumn;
        let tempIndexColumnVisual = editor.cursorVisualColumnIndex;
        let originalPositionIndex = EDI_getPositionIndex_Overload(editor.cursor_indexLine, tempIndexColumn);
        let tempPositionIndex = originalPositionIndex;

        while (editor.cursor_indexColumn > 0) {
            tempIndexColumn--;
            tempIndexColumnVisual--; // TODO: if '\t'
            tempPositionIndex--;
            leftCharacterKind = EDI_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                editor.cursor_selectionAnchor = tempPositionIndex;
                editor.cursor_selectionIndexAnchorColumnVISUAL = tempIndexColumnVisual;
                break;
            }
        }

        editor.cursor_selectionEnd = originalPositionIndex;
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    else {
        let goalCharacterKind = rightCharacterKind;

        let positionIndex = EDI_getPositionIndex_Overload(editor.cursor_indexLine, editor.cursor_indexColumn);
        editor.cursor_selectionAnchor = positionIndex;
        editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;

        let lineLength = line_end - line_start;
        let rightWasFound = false;

        while (editor.cursor_indexColumn < lineLength) {
            editor.cursor_indexColumn++;
            editor.cursorVisualColumnIndex++;
            positionIndex++;
            rightCharacterKind = EDI_getCharacterCurrent_KIND(editor.cursor_indexColumn, positionIndex, line_end);
            if (rightCharacterKind !== goalCharacterKind) {
                editor.cursor_selectionEnd = positionIndex;
                editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
                rightWasFound = true;
                break;
            }
        }

        if (!rightWasFound) {
            // end of line
            editor.cursor_selectionEnd = positionIndex;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        }

        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }

    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        editor.detail_smallPosition = editor.cursor_selectionAnchor;
        editor.detail_largePosition = editor.cursor_selectionEnd;
        editor.detail_smallColumnVisual = editor.cursor_selectionIndexAnchorColumnVISUAL;
        editor.detail_largeColumnVisual = editor.cursor_selectionIndexEndColumnVISUAL;
    }
    else {
        editor.detail_smallPosition = editor.cursor_selectionEnd;
        editor.detail_largePosition = editor.cursor_selectionAnchor;
        editor.detail_smallColumnVisual = editor.cursor_selectionIndexEndColumnVISUAL;
        editor.detail_largeColumnVisual = editor.cursor_selectionIndexAnchorColumnVISUAL;
    }
}

function EDI_onMouseDownDetailRankThree(event_button, event_shiftKey, indexLineClicked, indexColumnClicked) {
    if (event_shiftKey) {
        EDI_onMouseDownDetailRankOne(event_button, event_shiftKey, indexLineClicked, indexColumnClicked);
        return;
    }

    editor.cursor_indexLine = indexLineClicked;
    editor.cursor_indexColumn = indexColumnClicked;
    editor.cursorVisualColumnIndex = indexColumnClicked;
    
    editor.cursor_selectionAnchor = EDI_getPositionIndex_Overload(editor.cursor_indexLine, 0);
    editor.cursor_selectionIndexAnchorColumnVISUAL = 0;
    
    editor.detailRank3OriginLine = editor.cursor_indexLine;

    if (editor.cursor_indexLine === editor.lineEndPositionList_count - 1) {
        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        editor.cursor_selectionEnd = editor.ret_getLineBoundaryPositions_end;
        editor.cursor_selectionIndexEndColumnVISUAL = EDI_getEntireLineVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    else {
        editor.cursor_indexLine++;
        editor.cursor_indexColumn = 0;
        editor.cursorVisualColumnIndex = 0;
        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        editor.cursor_selectionEnd = editor.ret_getLineBoundaryPositions_start;
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }

    if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
        editor.detail_smallPosition = editor.cursor_selectionAnchor;
        editor.detail_largePosition = editor.cursor_selectionEnd;
        editor.detail_smallColumnVisual = editor.cursor_selectionIndexAnchorColumnVISUAL;
        editor.detail_largeColumnVisual = editor.cursor_selectionIndexEndColumnVISUAL;
    }
    else {
        editor.detail_smallPosition = editor.cursor_selectionEnd;
        editor.detail_largePosition = editor.cursor_selectionAnchor;
        editor.detail_smallColumnVisual = editor.cursor_selectionIndexEndColumnVISUAL;
        editor.detail_largeColumnVisual = editor.cursor_selectionIndexAnchorColumnVISUAL;
    }
}

export function EDI_onMouseMove_WRAPIT(event) {
    if ((event.buttons & 1) && !editor.recentBoundingClientRect_isNull) {
        // TODO: Consider short circuiting at via event.clientX and clientY by tracking the necessary thresholds for the cursor position to pass rather than the previous and current indices. (you can possibly thereby skip the calculation of the indices entirely for the redundant events).
        // TODO: Is it correct to use the cursor's indexLine and indexColumn directly as a means of determining redundancy? I worry about odd interactions, but I have no proof that such an odd interaction could exist.

        let rX = Math.max(0, event.clientX - editor.recentBoundingClientRect_left - editor.gutterWidthTotal + EDI_lastReadNumber_scrollLeft);
        let rY = Math.max(0, event.clientY - editor.recentBoundingClientRect_top + EDI_lastReadNumber_scrollTop);

        let indexColumn = Math.round(rX / EDI_characterWidth);
        let indexLine = Math.floor(rY / editor.lineHeight);
        let indexColumnVisual = indexColumn;

        if (indexLine >= editor.lineEndPositionList_count) {
            indexLine = editor.lineEndPositionList_count - 1;
        }

        EDI_ret_getLineBoundaryPositions_raw(indexLine);

        if (editor.cursor_indexLine === indexLine) {
            if (rX >= EDI_cursor_cursorTranslateXValue) {
                EDI_ret_getIndexFromX_sameLine_newRxIsLarger(rX, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end, editor.cursor_indexColumn, editor.cursorVisualColumnIndex);
            }
            else {
                EDI_ret_getIndexFromX_sameLine_newRxIsSmaller(rX, editor.ret_getLineBoundaryPositions_start, editor.cursor_indexColumn, editor.cursorVisualColumnIndex);
            }
        }
        else {
            EDI_ret_getIndexFromX_RESET(rX, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
        }
        indexColumn = editor.ret_getIndexFromX_indexColumn;
        indexColumnVisual = editor.ret_getIndexFromX_visualColumns;

        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);
        if (indexColumn > lastValidIndexColumn) {
            indexColumn = lastValidIndexColumn;
        }

        if (editor.cursor_indexLine === indexLine && editor.cursor_indexColumn === indexColumn) {
            return;
        }
        
        editor.cursor_indexLine = indexLine;
        editor.cursor_indexColumn = indexColumn;
        editor.cursorVisualColumnIndex = indexColumnVisual;

        if (editor.detailRank === 3) {
            EDI_onMouseMoveDetailRankThree(indexLine, indexColumn);
        }
        else if (editor.detailRank === 2) {
            EDI_onMouseMoveDetailRankTwo(indexLine, indexColumn, indexColumnVisual);
        }
        else if (editor.detailRank === 1) {
            EDI_onMouseMoveDetailRankOne(indexLine, indexColumn, indexColumnVisual);
        }
    }
    else {
        editor.mousemove_eventListener_isActive = 0;
        editor.baseElement.removeEventListener('mousemove', EDI_onMouseMove_WRAPIT);
    }
}

function EDI_onMouseMoveDetailRankOne(indexLineClicked, indexColumnClicked, indexColumnVisual) {
    // TODO: These two sets the ones to line and column seem redundant weren't these just done by the original EDI_onMouseMove_WRAPIT?
    editor.cursor_indexLine = indexLineClicked;
    editor.cursor_indexColumn = indexColumnClicked;
    editor.cursorVisualColumnIndex = indexColumnVisual;

    editor.cursor_selectionEnd = EDI_getPositionIndex_cursor_raw();
    editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

    EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
}

function EDI_onMouseMoveDetailRankTwo(indexLineClicked, indexColumnClicked, indexColumnVisual) {
    let nextPositionIndex = EDI_getPositionIndex_Overload(indexLineClicked, indexColumnClicked);

    if (nextPositionIndex < editor.detail_smallPosition) {
        if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
            editor.cursor_selectionAnchor = editor.detail_largePosition;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.detail_largeColumnVisual;
        }

        editor.cursor_indexLine = indexLineClicked;
        editor.cursor_indexColumn = indexColumnClicked;
        editor.cursorVisualColumnIndex = indexColumnClicked;
        let positionIndex = nextPositionIndex;

        editor.cursor_selectionEnd = positionIndex;
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

        let goalCharacterKind = EDI_getCharacterCurrent_KIND(editor.cursor_indexColumn, positionIndex, EDI_getLineEnd_pos_raw(editor.cursor_indexLine));
        let leftWasFound = false;
        let tempPositionIndex = positionIndex;

        while (editor.cursor_indexColumn > 0) {
            let leftCharacterKind = EDI_getCharacterPrevious_KIND(editor.cursor_indexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                editor.cursor_selectionEnd = tempPositionIndex;
                editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
                leftWasFound = true;
                break;
            }
            tempPositionIndex--;
            editor.cursor_indexColumn--;
            editor.cursorVisualColumnIndex--;
        }

        if (!leftWasFound) {
            editor.cursor_selectionEnd = tempPositionIndex;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        }
    }
    else if (nextPositionIndex > editor.detail_largePosition) {
        if (editor.cursor_selectionAnchor > editor.cursor_selectionEnd) {
            editor.cursor_selectionAnchor = editor.detail_smallPosition;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.detail_smallColumnVisual;
        }

        editor.cursor_indexLine = indexLineClicked;
        editor.cursor_indexColumn = indexColumnClicked;
        editor.cursorVisualColumnIndex = indexColumnVisual;
        let positionIndex = nextPositionIndex;

        editor.cursor_selectionEnd = positionIndex;
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

        let leftCharacterKind = EDI_getCharacterPrevious_KIND(editor.cursor_indexColumn, positionIndex);
        let goalCharacterKind = leftCharacterKind;

        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        const line_end = editor.ret_getLineBoundaryPositions_end;
        let lineLength = line_end - editor.ret_getLineBoundaryPositions_start;
        let rightWasFound = false;

        let tempPositionIndex = positionIndex;
        while (editor.cursor_indexColumn < lineLength) {
            let rightCharacterKind = EDI_getCharacterCurrent_KIND(editor.cursor_indexColumn, tempPositionIndex, line_end);
            if (rightCharacterKind !== goalCharacterKind) {
                editor.cursor_selectionEnd = tempPositionIndex;
                //editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
                rightWasFound = true;
                break;
            }
            tempPositionIndex++;
            editor.cursor_indexColumn++;
            editor.cursorVisualColumnIndex++;
            editor.cursor_selectionIndexEndColumnVISUAL++; // TODO: '\t'
        }

        if (!rightWasFound) {
            // end of line
            editor.cursor_selectionEnd = tempPositionIndex;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        }
    }
    else {
        if (editor.cursor_selectionAnchor > editor.cursor_selectionEnd) {
            editor.cursor_selectionAnchor = editor.detail_smallPosition;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.detail_smallColumnVisual;
        }

        EDI_ret_getLineAndColumnIndices_raw(editor.detail_largePosition);
        let largeLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
        let largeLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
        editor.cursor_indexLine = largeLineAndColumnIndices_indexLine;
        editor.cursor_indexColumn = largeLineAndColumnIndices_indexColumn;
        editor.cursorVisualColumnIndex = editor.detail_largeColumnVisual;
        editor.cursor_selectionEnd = editor.detail_largePosition;
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
    }

    EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
}

function EDI_onMouseMoveDetailRankThree(indexLineClicked, indexColumnClicked) {
    // TODO: I remember this being bugged I think it makes sense why. You're checking if the cursor is exactly at the threshold rather than determining if the distance from previous event to this one puts you past the threshold.
    if (indexLineClicked === editor.detailRank3OriginLine) {
        // TODO: 'cursor.positionIndex' is incorrect there is no such field, but was this referring to the clicked position or the position that the cursor currently is at...
        // ...it is presumed to be the position that the cursor is currently at because it would explain the bug where if you move the cursor somewhere that the mouse move events don't get
        // sent then bring your mouse back into a place where they do you'll snap ahead by some indices and skip the threshold and it visually bugs.
        // You could attach to I think it is window? but then I'm wondering if a race condition could ever occur.
        // so you'd probably want to do both attach to window and protect against large movements that skip the exact threshold when transitioning.
        //
        if (EDI_getPositionIndex_cursor_raw() !== editor.detail_smallPosition) {
            EDI_ret_getLineAndColumnIndices_raw(editor.detail_smallPosition);
            let smallLineAndColumnPositionIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
            let smallLineAndColumnPositionIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
            editor.cursor_indexLine = smallLineAndColumnPositionIndices_indexLine;
            editor.cursor_indexColumn = smallLineAndColumnPositionIndices_indexColumn;
            editor.cursorVisualColumnIndex = smallLineAndColumnPositionIndices_indexColumn;
        }

        if (editor.cursor_selectionEnd !== editor.detail_smallPosition) {
            editor.cursor_selectionEnd = editor.detail_smallPosition;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        }

        if (editor.cursor_selectionAnchor !== editor.detail_largePosition) {
            editor.cursor_selectionAnchor = editor.detail_largePosition;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;
        }

        EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
    }
    else if (indexLineClicked < editor.detailRank3OriginLine) {
        if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
            EDI_ret_getLineAndColumnIndices_raw(editor.detail_smallPosition);
            let smallLineAndColumnPositionIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
            let smallLineAndColumnPositionIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;

            editor.cursor_indexLine = smallLineAndColumnPositionIndices_indexLine;
            editor.cursor_indexColumn = smallLineAndColumnPositionIndices_indexColumn;
            editor.cursorVisualColumnIndex = smallLineAndColumnPositionIndices_indexColumn;

            editor.cursor_selectionEnd = editor.detail_smallPosition;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

            EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
        }

        editor.cursor_indexLine = indexLineClicked;
        editor.cursor_indexColumn = 0;
        editor.cursorVisualColumnIndex = 0;

        editor.cursor_selectionEnd = EDI_getPositionIndex_Overload(indexLineClicked, 0);
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;

        EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
    }
    else if (indexLineClicked > editor.detailRank3OriginLine) {

        if (editor.cursor_selectionAnchor !== editor.detail_smallPosition) {
            editor.cursor_selectionAnchor = editor.detail_smallPosition;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;
        }

        editor.cursor_indexLine = indexLineClicked;
        editor.cursor_indexColumn = indexColumnClicked;
        editor.cursorVisualColumnIndex = indexColumnClicked;
        let positionIndex = EDI_getPositionIndex_Overload(indexLineClicked, indexColumnClicked);

        // move to end of line...
        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        let lineLength = editor.ret_getLineBoundaryPositions_end - editor.ret_getLineBoundaryPositions_start;
        positionIndex += lineLength - editor.cursor_indexColumn;

        if (editor.cursor_indexLine === editor.lineEndPositionList_count - 1) {
            editor.cursor_indexColumn = lineLength;
            editor.cursorVisualColumnIndex = lineLength;
            editor.cursor_selectionEnd = positionIndex;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        }
        else {
            // wrap to the next line
            editor.cursor_indexLine++;
            editor.cursor_indexColumn = 0;
            editor.cursorVisualColumnIndex = 0;
            positionIndex++;

            editor.cursor_selectionEnd = positionIndex;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
        }

        EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
    }
}

/**
 * If a line has an indentation of 4 space characters, but the user's cursor is positioned after the second space character,
 * then only the first 2 space characters will be used as indentation.
 * 
 * This is intentional, it seems like the more expected behavior in my mind.
 * 
 * Returns the 'endExclusiveIndentationIndexColumn' of the indentation i.e.: "the column index that exclusively ends the indentation.".
 * Sets the state for:
 * - editor.cursor_cached_indentation_string_visualWidth
 * - EDI_cursor_enterKey_newLinePlusIndentation_byteList
 * - EDI_cursor_cached_indentation_string
 * 
 * Internally uses 'editor.cursor_enterKeyEventKind'.
 */
function EDI_cacheIndentation(originalIndexLine, originalIndexColumn, lastValidIndexColumn) {
    EDI_ret_getLineBoundaryPositions_raw(originalIndexLine);
    const line_start = editor.ret_getLineBoundaryPositions_start;

    let upperLimitIndexColumn = lastValidIndexColumn;
    if (originalIndexColumn < lastValidIndexColumn) {
        upperLimitIndexColumn = originalIndexColumn;
    }

    let count = 0;
    let indentation_string_visualWidth = 0;

    // Currently an enter key press only batches with other enter key presses so either the edit is finalized or the indentation was already cached and thus this code wouldn't run,
    // i.e.: you can read directly from the byte array without worrying about a pending edit.
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
        switch (EDI_textByteList_bytes[line_start + i]) {
            case CONST_EDI_ASCII_SPACE:
                indentation_string_visualWidth++;
                count++;
                break;
            case CONST_EDI_ASCII_TAB:
                indentation_string_visualWidth += 4 - (indentation_string_visualWidth % 4);
                count++;
                break;
            default:
                break outer;
        }
    }

    editor.cursor_cached_indentation_string_visualWidth = indentation_string_visualWidth;

    const uint8Array_length = 1 + count; // '1 +' for the '\n'. This might not always exist in the byte array for example if pressing enter key on the 0th index line there is no existing '\n' to copy from the byte array so just always make it.
    EDI_cursor_enterKey_newLinePlusIndentation_byteList = new Uint8Array(uint8Array_length);

    let setOffset = 1;

    switch (editor.cursor_enterKeyEventKind) {
        case 1 /*EnterKeyEventKind.StartOfLine: 1*/:
        case 4 /*EnterKeyEventKind.EndOfLine: 4*/:
            setOffset = 0;
            EDI_cursor_enterKey_newLinePlusIndentation_byteList[uint8Array_length - 1] = CONST_EDI_ASCII_LINE_FEED;
            break;
        case 3 /*EnterKeyEventKind.AmongALine: 3*/:
        case 6 /*EnterKeyEventKind.EndOfFile: 6*/:
            EDI_cursor_enterKey_newLinePlusIndentation_byteList[0] = CONST_EDI_ASCII_LINE_FEED;
            break;
        default:
            throw new Error();
    }

    if (count > 0) {
        let subarray = EDI_textByteList_bytes.subarray(line_start, line_start + count);
        EDI_cursor_enterKey_newLinePlusIndentation_byteList.set(subarray, setOffset);
        EDI_cursor_cached_indentation_string = ' '.repeat(indentation_string_visualWidth);
    }
    else {
        EDI_cursor_cached_indentation_string = '';
    }
}

/**
 * @param {*} shiftKey 
 */
function EDI_preKeyboardMovementSelectionLogic(shiftKey) {
    if (shiftKey) {
        if (!EDI_cursor_hasSelection()) {
            editor.cursor_selectionAnchor = EDI_getPositionIndex_cursor_raw();
            editor.cursor_selectionIndexAnchorLine = editor.cursor_indexLine;
            editor.cursor_selectionIndexAnchorColumn = editor.cursor_indexColumn;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;
        }
    }
    else {
        if (EDI_cursor_hasSelection()) {
            editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
            editor.cursor_selectionIndexAnchorLine = editor.cursor_selectionIndexEndLine;
            editor.cursor_selectionIndexAnchorColumn = editor.cursor_selectionIndexEndColumn;
            editor.cursor_selectionIndexAnchorColumnVISUAL = editor.cursorVisualColumnIndex;
        }
    }
}

/**
 * @param {*} shiftKey 
 */
function EDI_postKeyboardMovementSelectionLogic(shiftKey) {
    if (shiftKey) {
        editor.cursor_selectionEnd = EDI_getPositionIndex_cursor_raw();
        editor.cursor_selectionIndexEndLine = editor.cursor_indexLine;
        editor.cursor_selectionIndexEndColumn = editor.cursor_indexColumn;
        editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
    }
}

//#region keydown
/**
 * < The browser's event listener engine ignores the return value of event handlers.
 * < If you return a Promise, the browser treats it exactly like returning undefined, true, or a string. It drops the return value on the floor.
 * 
 * TODO: timing issue of async paste and copy
 */
export function EDI_onKeyDown(event) {
    switch (event.key) {
        case 'ArrowLeft':
            EDI_onKeyDown_ArrowLeft(event);
            break;
        case 'ArrowDown':
            if (EDI_onKeyDown_ArrowDown(event)) {
                return; // 'EDI_onKeyDown_ArrowDown' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'ArrowUp':
            if (EDI_onKeyDown_ArrowUp(event)) {
                return; // 'EDI_onKeyDown_ArrowUp' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'ArrowRight':
            EDI_onKeyDown_ArrowRight(event);
            break;
        case 'Home':
            if (EDI_onKeyDown_Home(event)) {
                return; // 'EDI_onKeyDown_Home' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'End':
            if (EDI_onKeyDown_End(event)) {
                return; // 'EDI_onKeyDown_End' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'PageDown':
            EDI_onKeyDown_PageDown(event);
            break;
        case 'PageUp':
            EDI_onKeyDown_PageUp(event);
            break;
        case 'Delete':
            EDI_editEvent(2 /*EditKind.DeleteLtr: 2*/, event);
            break;
        case 'Backspace':
            EDI_editEvent(3 /*EditKind.BackspaceRtl: 3*/, event);
            break;
        case 'Escape':
            EDI_finalizeEdit();
            if (autocomplete.exists) { AUTOCOMPLETE_hide(); }
            break;
        case 'Tab':
            event.preventDefault();
            EDI_editEvent(5 /*EditKind.Tab: 5*/, event);
            break;
        case 'Enter':
            // Enter key relies on cached data that would be cleared, pattern doesn't match on purpose
            EDI_editEvent(8 /*EditKind.Enter: 8*/, event);
            break;
        case 'F12':
            EDI_doEditorGoToDefinitionRequest(event.ctrlKey);
            break;
        default:
            // TODO: Checking for a length of 1 is probably wrong but it'll let me start writing some code
            if (event.key.length === 1) {
                if (event.ctrlKey) {
                    return EDI_onKeyDown_keyLengthEqualsOne_ctrlKey(event);
                }
                else if (event.altKey) {
                    EDI_onKeyDown_keyLengthEqualsOne_altKey(event);
                }
                else {
                    event.preventDefault();
                    EDI_editEvent(1 /*EditKind.InsertLtr: 1*/, event);
                }
            }
            break;
    }
}

function EDI_onKeyDown_ArrowLeft(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }

    if (autocomplete.exists) { AUTOCOMPLETE_hide(); }

    if (EDI_cursor_hasSelection() && !event.shiftKey) {
        let small;
        if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
            small = editor.cursor_selectionAnchor;
        }
        else {
            small = editor.cursor_selectionEnd;
        }
        EDI_ret_getLineAndColumnIndices_raw(small); // TODO: Check all of these whether they can be inlined (remove the single stage middle-man variable)
        let lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
        let lineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
        editor.cursor_indexLine = lineAndColumnIndices_indexLine;
        editor.cursor_indexColumn = lineAndColumnIndices_indexColumn;
        editor.cursorVisualColumnIndex = lineAndColumnIndices_indexColumn;
        editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
        editor.cursor_selectionIndexAnchorLine = editor.cursor_selectionIndexEndLine;
        editor.cursor_selectionIndexAnchorColumn = editor.cursor_selectionIndexEndColumn;
    }
    else {
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);

        if (event.ctrlKey && editor.cursor_indexColumn > 0) {
            EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
            const lineStart = editor.ret_getLineBoundaryPositions_start
            const lineEnd = editor.ret_getLineBoundaryPositions_end;

            // TODO: use lineStart variable since it exists?
            let indexPosition = editor.ret_getLineBoundaryPositions_start + editor.cursor_indexColumn;
            let originalCharacterKind = EDI_getCharacterPrevious_KIND(editor.cursor_indexColumn, indexPosition);
            indexPosition--;
            editor.cursor_indexColumn--;
            editor.cursorVisualColumnIndex--;
            let visualCorruption = false;
            visualCorruption = visualCorruption || (originalCharacterKind === 1 /*CharacterKind.Whitespace: 1*/ && String.fromCharCode(EDI_textByteList_bytes[indexPosition]) === '\t');
            
            while (editor.cursor_indexColumn > 0) {
                if (EDI_getCharacterPrevious_KIND(editor.cursor_indexColumn, indexPosition) === originalCharacterKind) {
                    indexPosition--;
                    editor.cursor_indexColumn--;
                    editor.cursorVisualColumnIndex--;
                    visualCorruption = visualCorruption || (originalCharacterKind === 1 /*CharacterKind.Whitespace: 1*/ && String.fromCharCode(EDI_textByteList_bytes[indexPosition]) === '\t');
                }
                else {
                    break;
                }
            }

            if (visualCorruption) {
                EDI_ret_getIndexFromColumn_RESET(editor.cursor_indexColumn, lineStart, lineEnd);
                editor.cursorVisualColumnIndex = editor.ret_getIndexFromX_visualColumns;
            }
        }
        else {
            if (editor.cursor_indexColumn > 0) {
                editor.cursor_indexColumn--;
                if (String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                    //editor.cursorVisualColumnIndex -= (4 - (editor.cursorVisualColumnIndex % 4)); // (tabLength)
                    EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
                    EDI_ret_getIndexFromColumn_RESET(editor.cursor_indexColumn, editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
                    editor.cursorVisualColumnIndex = editor.ret_getIndexFromX_visualColumns;
                }
                else {
                    editor.cursorVisualColumnIndex--;
                }
            }
            else if (editor.cursor_indexLine > 0) {
                editor.cursor_indexLine--;
                editor.cursor_indexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);
                EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
                editor.cursorVisualColumnIndex = EDI_getEntireLineVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
            }
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    }
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_ArrowDown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey) {
        // TODO: raf or something this scrollBy?
        EDI_scroll_viewport.scrollBy(0, editor.lineHeight);
    }
    else {
        // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
        if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
            EDI_finalizeEdit();
        }
        if (autocomplete.exists) { AUTOCOMPLETE_hide(); }
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
        if (editor.cursor_indexLine < editor.lineEndPositionList_count - 1) {
            editor.cursor_indexLine++;
            EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
            EDI_set_indexColumn_and_visualColumn_relativeTo_storedVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);

        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    return false;
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_ArrowUp(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey) {
        // TODO: raf or something this scrollBy?
        EDI_scroll_viewport.scrollBy(0, -1 * editor.lineHeight);
    }
    else {
        // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
        if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
            EDI_finalizeEdit();
        }
        if (autocomplete.exists) { AUTOCOMPLETE_hide(); }
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
        if (editor.cursor_indexLine > 0) {
            editor.cursor_indexLine--;
            EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
            EDI_set_indexColumn_and_visualColumn_relativeTo_storedVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    return false;
}

function EDI_onKeyDown_ArrowRight(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }

    if (autocomplete.exists) { AUTOCOMPLETE_hide(); }

    if (EDI_cursor_hasSelection() && !event.shiftKey) {
        let large;
        if (editor.cursor_selectionAnchor < editor.cursor_selectionEnd) {
            large = editor.cursor_selectionEnd;
        }
        else {
            large = editor.cursor_selectionAnchor;
        }
        EDI_ret_getLineAndColumnIndices_raw(large);
        let lineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
        let lineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
        editor.cursor_indexLine = lineAndColumnIndices_indexLine;
        editor.cursor_indexColumn = lineAndColumnIndices_indexColumn;
        editor.cursorVisualColumnIndex = lineAndColumnIndices_indexColumn;
        editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
        editor.cursor_selectionIndexAnchorLine = editor.cursor_selectionIndexEndLine;
        editor.cursor_selectionIndexAnchorColumn = editor.cursor_selectionIndexEndColumn;
    }
    else {
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);
        if (event.ctrlKey && editor.cursor_indexColumn < lastValidIndexColumn) {
            EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
            const line_end = editor.ret_getLineBoundaryPositions_end;
            let indexPosition = editor.ret_getLineBoundaryPositions_start + editor.cursor_indexColumn;
            let originalCharacterKind = EDI_getCharacterCurrent_KIND(editor.cursor_indexColumn, indexPosition, line_end);
            if (originalCharacterKind === 1 /*CharacterKind.Whitespace: 1*/ && String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                editor.cursorVisualColumnIndex += (4 - (editor.cursorVisualColumnIndex % 4)); // (tabLength)
            }
            else {
                editor.cursorVisualColumnIndex++;
            }
            editor.cursor_indexColumn++;
            indexPosition++;

            while (editor.cursor_indexColumn < lastValidIndexColumn) {
                if (EDI_getCharacterCurrent_KIND(editor.cursor_indexColumn, indexPosition, line_end) === originalCharacterKind) {
                    if (originalCharacterKind === 1 /*CharacterKind.Whitespace: 1*/ && String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                        editor.cursorVisualColumnIndex += (4 - (editor.cursorVisualColumnIndex % 4)); // (tabLength)
                    }
                    else {
                        editor.cursorVisualColumnIndex++;
                    }
                    editor.cursor_indexColumn++;
                    indexPosition++;
                }
                else {
                    break;
                }
            }
        }
        else {
            if (editor.cursor_indexColumn < lastValidIndexColumn) {
                if (String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                    editor.cursorVisualColumnIndex += (4 - (editor.cursorVisualColumnIndex % 4)); // (tabLength)
                }
                else {
                    editor.cursorVisualColumnIndex++;
                }
                editor.cursor_indexColumn++;
            }
            else if (editor.cursor_indexLine < editor.lineEndPositionList_count - 1) {
                editor.cursor_indexColumn = 0;
                editor.cursor_indexLine++;
                editor.cursorVisualColumnIndex = 0;
            }
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    }
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_Home(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }
    if (autocomplete.exists) { AUTOCOMPLETE_hide(); }
    EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
    if (event.ctrlKey) {
        editor.cursor_indexLine = 0;
        editor.cursor_indexColumn = 0;
        editor.cursorVisualColumnIndex = 0;
    }
    else {
        let endExclusiveIndentationIndexColumn = EDI_measureEndExclusiveIndentationIndexColumn();
        if (editor.cursor_indexColumn === endExclusiveIndentationIndexColumn) {
            editor.cursor_indexColumn = 0;
            editor.cursorVisualColumnIndex = 0;
        }
        else {
            editor.cursor_indexColumn = endExclusiveIndentationIndexColumn;
            editor.cursorVisualColumnIndex = editor.cursor_cached_indentation_string_visualWidth;
        }
    }
    EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    return false;
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_End(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (editor.cursor_editKind !== 0 /*EditKind.None: 0*/) {
        EDI_finalizeEdit();
    }
    if (autocomplete.exists) { AUTOCOMPLETE_hide(); }
    EDI_preKeyboardMovementSelectionLogic(event.shiftKey);

    const originalLine = editor.cursor_indexLine;
    const originalColumn = editor.cursor_indexColumn;

    if (event.ctrlKey) {
        editor.cursor_indexLine = editor.lineEndPositionList_count - 1;
    }
    editor.cursor_indexColumn = EDI_getLastValidIndexColumn_raw(editor.cursor_indexLine);

    // TODO: if 'originalLine === editor.cursor_indexLine' but 'originalColumn !== editor.cursor_indexColumn'...
    // ...then you should determine the remaining visual width of the line given your current column prior to moving to the lastValidIndexColumn.
    //
    if (originalLine !== editor.cursor_indexLine || originalColumn !== editor.cursor_indexColumn) {
        EDI_ret_getLineBoundaryPositions_raw(editor.cursor_indexLine);
        editor.cursorVisualColumnIndex = EDI_getEntireLineVisualWidth(editor.ret_getLineBoundaryPositions_start, editor.ret_getLineBoundaryPositions_end);
    }

    EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    editor.cursor_STORED_visualWidth = editor.cursorVisualColumnIndex;
    EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    return false;
}

function EDI_onKeyDown_PageDown(event) {
    event.stopPropagation();
    event.preventDefault();

    if (event.ctrlKey) {
        editor.cursor_indexLine = editor.virtualIndexLine + editor.virtualCount;
        if (editor.virtualCount > 1) {
            // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
            editor.cursor_indexLine--;
        }
        if (editor.cursor_indexLine >= editor.lineEndPositionList_count) {
            // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
            editor.cursor_indexLine = editor.lineEndPositionList_count - 1;
        }
        editor.cursor_indexColumn = 0;
        editor.cursorVisualColumnIndex = 0;
        // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
        editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    else {
        EDI_scroll_viewport.scrollBy(0, editor.lineHeight * editor.virtualCount);
    }
}

function EDI_onKeyDown_PageUp(event) {
    event.stopPropagation();
    event.preventDefault();

    if (event.ctrlKey) {        
        editor.cursor_indexLine = editor.virtualIndexLine;
        if (editor.virtualCount > 1) {
            // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
            editor.cursor_indexLine++;
        }
        if (editor.cursor_indexLine >= editor.lineEndPositionList_count) {
            // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
            editor.cursor_indexLine = editor.lineEndPositionList_count - 1;
        }
        editor.cursor_indexColumn = 0;
        editor.cursorVisualColumnIndex = 0;
        // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
        editor.cursor_selectionAnchor = editor.cursor_selectionEnd;
        EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
    }
    else {
        EDI_scroll_viewport.scrollBy(0, -1 * editor.lineHeight * editor.virtualCount);
    }
}

/**
 * Make a list of the reasons why this "is async":
 * - case 'c': (EDI_copySelection)
 * - case 'x': (EDI_copySelection)
 * - case 'v': (window.myAPI.readClipboard)
 * 
 * In otherwords:
 * 
 * TODO:
 * - the tiny details of the ipc calls i.e.: what lines run synchronously
 * - is it enough lines that run synchronously before an await that it "just works"
 * 
 * - EDI_copySelection
 *     - synchronous copy with textarea and 'success = document.execCommand('copy');'
 *     - async copy logic
 *         - you could determine the text to copy immediately I wonder?
 *         - problematic is that you'd need to copy the bytes otherwise you'd be getting a subarray that points at the same data
 *         - so you'd either have to copy the data to another "array"
 *         - or lock the editor UI while the copy is being completed.
 * - window.myAPI.readClipboard
 *     - Solutions:
 *         - The synchronous paste event
 *             - side note you always wondered why they focused a textarea, in part it is from what I understand so you can paste into it and synchronously get the pasted text.
 *             - problematic case is that you can't rebind paste event
 *         - async paste logic
 *             - problematic case is that you need to lock the editor UI while the paste is being completed.
*/
async function EDI_onKeyDown_keyLengthEqualsOne_ctrlKey(event) {
    // TODO: I'm moving 'EDI_movementBasedCacheInvalidation' to the finalize of the respective edits...
    // ...this invocation doesn't have a 'EDI_finalizeEdit();' invocation immediately above it.
    // ...(!!!!this isn't the same comment as the others) THIS ONE SHOULD PROBABLY JUST INVOKE 'EDI_finalizeEdit();' STRAIGHT UP IF EDIT IS NOT NONE
    //
    // Ah you'll have to put it per case cause the paste ctrl+v for example you need to let batch.
    // 
    switch (event.key) {
        case 'c':
            
            event.preventDefault();
            event.stopPropagation();

            EDI_finalizeEdit();
            await EDI_copySelection();
            break;
        case 'x':

            event.preventDefault();
            event.stopPropagation();

            EDI_finalizeEdit();
            await EDI_copySelection();
            EDI_removeSelection();
            EDI_render_request(18 /*RenderKind.Cursor_n: 18*/);
            break;
        case 'v':

            event.preventDefault();
            event.stopPropagation();

            await EDI_read_clipboard();
            EDI_editEvent(9 /*EditKind.Paste: 9*/, event);
            break;
        case 'd':

            event.preventDefault();
            event.stopPropagation();

            EDI_editEvent(10 /*EditKind.Duplicate: 10*/, event);
            break;
        case 'r':

            if (autocomplete.exists) {
                //AUTOCOMPLETE_events_scroll_render_trailingEdgeDo(EDI_autocomplete_get_filter());
            }

            event.preventDefault();
            event.stopPropagation();
            break;
        case 'a':

            event.preventDefault();
            event.stopPropagation();

            EDI_finalizeEdit();
            editor.cursor_selectionAnchor = 0;
            editor.cursor_selectionIndexAnchorColumnVISUAL = 0;
            editor.cursor_selectionEnd = editor.textByteList_count;
            editor.cursor_selectionIndexEndColumnVISUAL = editor.cursorVisualColumnIndex;
            EDI_ret_getLineAndColumnIndices_raw(editor.cursor_selectionEnd);
            let selectionEndLineAndColumnIndices_indexLine = editor.ret_getLineAndColumnIndices_indexLine;
            let selectionEndLineAndColumnIndices_indexColumn = editor.ret_getLineAndColumnIndices_indexColumn;
            editor.cursor_indexLine = selectionEndLineAndColumnIndices_indexLine;
            editor.cursor_indexColumn = selectionEndLineAndColumnIndices_indexColumn;
            editor.cursorVisualColumnIndex = selectionEndLineAndColumnIndices_indexColumn;
            EDI_render_request(17 /*RenderKind.Cursor_flag_doNotScrollIntoView: 17*/);
            break;
        case 'f':

            event.preventDefault();
            event.stopPropagation();

            EDI_findOverlay_showSetter(!editor.findOverlay_show);
            break;
        case 'z':
            //alert('undo');
            break;
        case 'y':
            //alert('redo');
            break;
        case ' ':
            event.preventDefault();
            event.stopPropagation();
            EDI_requestLspComplete();
            break;
        case '-':
            event.preventDefault();
            event.stopPropagation();
            EDI_moveCursor_indexLine_indexColumn(editor.priorToLastJump_indexLine, editor.priorToLastJump_indexColumn);
            break;
    }
}

function EDI_onKeyDown_keyLengthEqualsOne_altKey(event) {
    
}
//#endregion

function EDI_render_do_ResetSyntaxHighlighting() {
    const EDI_lineStringCache_length = EDI_lineStringCache.length;
    for (let i = 0; i < EDI_lineStringCache_length; i++) {
        EDI_lineStringCache[i].length = 0;
    }
    EDI_render_force_fullscreen_redraw();
}

/*
// If you have an extension listed here, it is expected that the "function to invoke" exists.
// As of right now any patterns to naming the function that gets invoked are tentative.
// But I am not checking whether JS_full_lex or JS_line_lex exist, I'm just switching on ExtensionKind and presuming that function exists.
// 
const ExtensionKind = Object.freeze({
    None: 0,
    JavaScript: 1,
});
*/

/*
// DeleteLtr and BackspaceRtl are both forms of removing text,
// their edits are stored the same (i.e.: both in "the form of a delete" keypress)
// The kind delete/backspace tells you how to restore the cursor when doing a ctrl+z and etc...?
// 
const EditKind = Object.freeze({
    None: 0,
    InsertLtr: 1,
    DeleteLtr: 2,
    BackspaceRtl: 3,
    RemoveTextNoBatching: 4,
    Tab: 5,
    IndentMore: 6,
    IndentLess: 7,
    Enter: 8,
    Paste: 9,
    Duplicate: 10,
});
*/

/*
// TODO: Long term this likely should be removed and all enter key logic reduced into an insertion but this will help in the time being.
// TODO: There's tons of '0' checks rather than using 'EnterKeyEventKind_None' that I'm seeing throughout the code...
// 
const EnterKeyEventKind = Object.freeze({
    None: 0,
    StartOfLine: 1,
    AmongALine: 3,
    EndOfLine: 4,
    EndOfFile: 6,
});
*/

/*
// Do not change the order/values of these, they are used in equality comparisons, the larger the number says when double clicking between a character and a punctuation
// whoever has larger number gets selected then the selection continues while the same kind is being read.
// 
const CharacterKind = Object.freeze({
    None: 0,
    Whitespace: 1,
    Punctuation: 2,
    LetterOrDigit: 3,
});
*/

/*
const RenderKind = Object.freeze({
    None: 0,
    Scroll: 1,
    Resize: 2,
    InsertLtr: 3,
    TabKey: 4,
    IndentMore: 5,
    IndentLess: 6,
    BackspaceRtl: 7,
    DeleteLtr: 8,
    RemoveSelection: 9,
    Enter: 10,
    DuplicateOrPaste: 11,
    Clear: 12,
    SetText: 13,
    CreateViewport: 14,
    SyntaxHighlighting: 15,
    Cursor_flag_scrollIntoViewExplicit: 16,
    Cursor_flag_doNotScrollIntoView: 17,
    Cursor_n: 18,
});
*/

