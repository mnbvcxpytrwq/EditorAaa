import * as f from './fieldBuffer.js';
import { ListComponent, listComponent_staticRunner } from "./listComponent.js";
import {editor, EDI_characterWidth} from "./editorGlobal_edit.js";

class Autocomplete {
    constructor() {
        this.exists = false;
        this.isRenderPending = false;
        
        this.queueHead = 0;
        this.queueTail = 0;

        this.rootElement = null;

        this.data = [];
    }
}

export const autocomplete = new Autocomplete();

let AUTOCOMPLETE_listComponent_ringBufferCache = [];

function AUTOCOMPLETE_listComponent_onMeasure() {
    if (AUTOCOMPLETE_listComponent_ringBufferCache === null || AUTOCOMPLETE_listComponent_ringBufferCache === undefined || AUTOCOMPLETE_listComponent_ringBufferCache.length !== AUTOCOMPLETE_listComponent.virtualCount) {
        AUTOCOMPLETE_listComponent_ringBufferCache = new Array(AUTOCOMPLETE_listComponent.virtualCount);
    }
}

export const AUTOCOMPLETE_listComponent = new ListComponent(
    16, listComponent_staticRunner, AUTOCOMPLETE_listComponent_renderLines, AUTOCOMPLETE_listComponent_dblClick_or_space_or_enter, AUTOCOMPLETE_listComponent_oncontextmenu, AUTOCOMPLETE_listComponent_onMeasure, AUTOCOMPLETE_listComponent_onblur);

function AUTOCOMPLETE_listComponent_renderLines(lineIndexLower, lineIndexUpper, ringBufferIndex, decodingBoundLower, decodingBoundUpper) {

    const ctx = AUTOCOMPLETE_listComponent.canvasContext2d;
    ctx.clearRect(0, 0, AUTOCOMPLETE_listComponent.canvas.width, AUTOCOMPLETE_listComponent.canvas.height);
    
    let vertical = 0;

    // TODO: All of the below 'Optimization heuristic goal' suck. Cause you have no idea whether they're actually effective you're just hearing rumors and then throwing them all at a dart board and hoping everything works out.
    // ^ I'm specifically referencing my blind application of them en masse like a fool without ever having confirmed that they are improvements let alone meaningful ones.
    // ^ for absolute clarification I'm not saying the heuristics suck I'm saying I suck cause I never once validated their usefulness.
    //
    /** Optimization heuristic goal: assumedly reduce reference chasing by creating a const reference to fields that are frequently accessed via a member access on a reference variable. It is rumored that this permits loop optimization. */
    /** Optimization heuristic goal: similarly^ assumedly improve caching by explicitly telling the code generator that the reference which 'foo' points to "will not change". In garbage collection, when defragmenting the heap every reference to an object that was repositioned needs to have its reference updated to point to the new location of the object, so I'm not quite sure how this works out idk. It is rumored that this permits loop optimization. */
    const VIRTUAL_COUNT = AUTOCOMPLETE_listComponent.virtualCount;
    const COUNT = AUTOCOMPLETE_listComponent.count;
    const LINE_CACHE = AUTOCOMPLETE_listComponent_ringBufferCache;
    const ITEM_HEIGHT_NUMBER = AUTOCOMPLETE_listComponent.itemHeightNumber;

    /** Optimization heuristic goal: make the upper bound a constant, and do not modify 'i' within the loop, have not measured if this is truly impactful. It is rumored that this permits loop optimization. */
    const LINE_INDEX_UPPER = lineIndexUpper;

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#3f7581'; // Solid cursor accent color
    const cursorLine = AUTOCOMPLETE_listComponent.cursorIndex;
    if (cursorLine >= lineIndexLower && cursorLine < lineIndexUpper) {
        const cursorY = (cursorLine - lineIndexLower) * AUTOCOMPLETE_listComponent.itemHeightNumber;
        ctx.fillRect(0, cursorY, AUTOCOMPLETE_listComponent.canvas.width, AUTOCOMPLETE_listComponent.itemHeightNumber);
    }

    ctx.fillStyle = f.APP_colors.standardText;

    for (let i = lineIndexLower; i < LINE_INDEX_UPPER; i++) {
        ringBufferIndex++;
        if (ringBufferIndex >= VIRTUAL_COUNT) {
            ringBufferIndex -= VIRTUAL_COUNT;
        }

        if (i >= decodingBoundLower && i < decodingBoundUpper) {
            if (i < COUNT) {
                const key = AUTOCOMPLETE_listComponent.data[i];
                LINE_CACHE[ringBufferIndex] = '' + key;
            }
            else {
                LINE_CACHE[ringBufferIndex] = '~';
            }
        }

        ctx.fillText(LINE_CACHE[ringBufferIndex], 0, vertical); // There's a max width argument in the fillText?
        vertical += ITEM_HEIGHT_NUMBER;
    }
}

function AUTOCOMPLETE_listComponent_onblur() {
}

function AUTOCOMPLETE_listComponent_dblClick_or_space_or_enter(eventKey, indexItem, ringBufferIndexItem) {
}

function AUTOCOMPLETE_listComponent_oncontextmenu(indexItem, event_button, event_clientX, event_clientY, relativeIndex) {
}

const OFFSET_AUTOCOMPLETE = 32; // Slots 32 to 63 // Define the unique byte offset where each UI's memory space begins

function AUTOCOMPLETE_render_request(renderKind) {
    if (autocomplete.queueHead !== autocomplete.queueTail) {
        const lastAbsoluteIndex = OFFSET_AUTOCOMPLETE + ((autocomplete.queueTail - 1) & f.UI_SLOT_MASK);
        if (f.MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_AUTOCOMPLETE + (autocomplete.queueTail & f.UI_SLOT_MASK);
    f.MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    autocomplete.queueTail++;
    
    if (!autocomplete.isRenderPending) {
        autocomplete.isRenderPending = true;
        requestAnimationFrame(AUTOCOMPLETE_render_do);
    }
}

function AUTOCOMPLETE_render_do() {
    while (autocomplete.queueHead !== autocomplete.queueTail) {
        // Uses the exact same masking logic, but reads from the higher memory region
        const absoluteIndex = OFFSET_AUTOCOMPLETE + (autocomplete.queueHead & f.UI_SLOT_MASK);
        const renderKind = f.MASTER_RENDER_BUFFER[absoluteIndex];
        autocomplete.queueHead++; 

        switch (renderKind) {
            case 1 /*AUTOCOMPLETErenderKind.Show: 1*/:
                AUTOCOMPLETE_render_do_show();
                break;
            case 2 /*AUTOCOMPLETErenderKind.Hide: 2*/:
                AUTOCOMPLETE_render_do_hide();
                break;
        }
    }
    autocomplete.isRenderPending = false;
}

function AUTOCOMPLETE_render_do_show() {
    if (autocomplete.exists) {
        //AUTOCOMPLETE_render_RESET_lines(AUTOCOMPLETE_itemList);
    }
    else {
        autocomplete.rootElement = document.createElement('div');
        autocomplete.rootElement.id = 'AUTOCOMPLETE';
        autocomplete.rootElement.style.left = (editor.recentBoundingClientRect_left + 60/*the currently hardcoded gutter width*/) + 'px';
        autocomplete.rootElement.style.top = editor.recentBoundingClientRect_top + 'px';
        const newY = (editor.cursor_indexLine + 1) * editor.lineHeight;
        const newX = editor.cursorVisualColumnIndex * EDI_characterWidth;
        autocomplete.rootElement.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        document.body.appendChild(autocomplete.rootElement);
        autocomplete.exists = true;
        AUTOCOMPLETE_listComponent.initialize(autocomplete.rootElement);
        AUTOCOMPLETE_listComponent.drawScrollbarHeight();
        AUTOCOMPLETE_listComponent.rootElement.focus();
    }
}

export function AUTOCOMPLETE_show(lspResult) {
    AUTOCOMPLETE_render_request(1 /*AUTOCOMPLETErenderKind.Show: 1*/);
}

function AUTOCOMPLETE_render_do_hide() {
    if (autocomplete.exists) {
        autocomplete.exists = false;
        autocomplete.rootElement.remove();
        AUTOCOMPLETE_listComponent.softDispose();
    }
}

export function AUTOCOMPLETE_hide() {
    AUTOCOMPLETE_render_request(2 /*AUTOCOMPLETErenderKind.Hide: 2*/);
}

export function AUTOCOMPLETE_setData(data) {
    autocomplete.data = data;
    AUTOCOMPLETE_listComponent.clear();
    for (let i = 0; i < autocomplete.data.length; i++) {
        AUTOCOMPLETE_listComponent.insert(AUTOCOMPLETE_listComponent.count, autocomplete.data[i]);
    }
    AUTOCOMPLETE_listComponent.drawScrollbarHeight();
    AUTOCOMPLETE_listComponent.forceFullscreen_renderScroll();
}

/*
const AUTOCOMPLETErenderKind = Object.freeze({
    None: 0,
    Show: 1,
    Hide: 2,
    CursorSet: 3,
    CreateLines: 4,
    Scroll: 5,
});
*/
