import * as f from './fieldBuffer.js'
import {aaaApp} from "./applicationRendererRoot.js"
import {listComponent_staticRunner, ListComponent} from './listComponent.js'

export const CommandKind = Object.freeze({
    None: 0,
    Submenu: 1,
    Copy: 2,
    CopyAbsolutePath: 3,
    Cut: 4,
    Paste: 5,
    NewFile_Directory: 6,
    NewFile_File: 7,
    DeleteFile_Directory: 8,
    DeleteFile_File: 9,
    RenameFile_Directory: 10,
    RenameFile_File: 11,
    Find: 12,
    SelectFolder: 13,
    SelectWorkspace: 14,
});

const MENUrenderKind = Object.freeze({
    None: 0,
    Cursor: 1,
    Set: 2,
    Hide: 3,
});

class Menu {
    constructor() {
        this.isRenderPending = false;
        this.queueHead = 0;
        this.queueTail = 0;

        this.ticketId_counter = 1;

        this.ticketId_drawn = 0;

        this.renderKind_Set_countOfPendingRequests = 0;
    }
}

export const menu = new Menu();

export const OFFSET_MENU = 96; // Slots 96 to 127 // Define the unique byte offset where each UI's memory space begins

/**
 * @callback MENU_OnCompleteAction
 * @param {boolean} isCancelled
 * @param {MenuOption | undefined} menuOption the 'MenuOption' that exists at the 'request.index' or undefined if 'request.index' out of range;
 * @param {MenuRequest} request
 * @returns {Promise}
 */

/**
 * @typedef {Object} MenuOption
 * @property {number} commandKind
 * @property {any} text
 */

/**
 * @typedef {Object} MenuRequest
 * @property {number} left
 * @property {number} top
 * @property {number} recentBoundingClientRectTop
 * @property {MENU_OnCompleteAction} onCompleteAction
 * @property {any} target
 * @property {MenuOption[]} optionList
 * @property {number} index (use this to set the 'initiallySelectedIndex' / see the index of targeted 'MenuOption' within 'optionList')
 * @property {number} ticket
 * @property {HTMLDivElement[]} ArrayFrom_menuOptionList_children
 * @property {HTMLElement} elementToFocusOnCompleted
 * @property {boolean} disableFocusOnCompleted
 */

/** @type {MenuRequest} */
let MENU_request = null;

let MENU_listComponent_ringBufferCache = [];

function MENU_listComponent_onMeasure() {
    if (MENU_listComponent_ringBufferCache === null || MENU_listComponent_ringBufferCache === undefined || MENU_listComponent_ringBufferCache.length !== MENU_listComponent.virtualCount) {
        MENU_listComponent_ringBufferCache = new Array(MENU_listComponent.virtualCount);
    }
}

export const MENU_listComponent = new ListComponent(
    16, listComponent_staticRunner, MENU_listComponent_renderLines, MENU_listComponent_dblClick_or_space_or_enter, MENU_listComponent_oncontextmenu, MENU_listComponent_onMeasure, MENU_listComponent_onblur);

function MENU_listComponent_renderLines(lineIndexLower, lineIndexUpper, ringBufferIndex, decodingBoundLower, decodingBoundUpper) {

    const ctx = MENU_listComponent.canvasContext2d;
    ctx.clearRect(0, 0, MENU_listComponent.canvas.width, MENU_listComponent.canvas.height);
    
    let vertical = 0;

    // TODO: All of the below 'Optimization heuristic goal' suck. Cause you have no idea whether they're actually effective you're just hearing rumors and then throwing them all at a dart board and hoping everything works out.
    // ^ I'm specifically referencing my blind application of them en masse like a fool without ever having confirmed that they are improvements let alone meaningful ones.
    // ^ for absolute clarification I'm not saying the heuristics suck I'm saying I suck cause I never once validated their usefulness.
    //
    /** Optimization heuristic goal: assumedly reduce reference chasing by creating a const reference to fields that are frequently accessed via a member access on a reference variable. It is rumored that this permits loop optimization. */
    /** Optimization heuristic goal: similarly^ assumedly improve caching by explicitly telling the code generator that the reference which 'foo' points to "will not change". In garbage collection, when defragmenting the heap every reference to an object that was repositioned needs to have its reference updated to point to the new location of the object, so I'm not quite sure how this works out idk. It is rumored that this permits loop optimization. */
    const VIRTUAL_COUNT = MENU_listComponent.virtualCount;
    const COUNT = MENU_listComponent.count;
    const LINE_CACHE = MENU_listComponent_ringBufferCache;
    const ITEM_HEIGHT_NUMBER = MENU_listComponent.itemHeightNumber;

    /** Optimization heuristic goal: make the upper bound a constant, and do not modify 'i' within the loop, have not measured if this is truly impactful. It is rumored that this permits loop optimization. */
    const LINE_INDEX_UPPER = lineIndexUpper;

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#3f7581'; // Solid cursor accent color
    const cursorLine = MENU_listComponent.cursorIndex;
    if (cursorLine >= lineIndexLower && cursorLine < lineIndexUpper) {
        const cursorY = (cursorLine - lineIndexLower) * MENU_listComponent.itemHeightNumber;
        ctx.fillRect(0, cursorY, MENU_listComponent.canvas.width, MENU_listComponent.itemHeightNumber);
    }

    ctx.fillStyle = '#d4d4d4';

    for (let i = lineIndexLower; i < LINE_INDEX_UPPER; i++) {
        ringBufferIndex++;
        if (ringBufferIndex >= VIRTUAL_COUNT) {
            ringBufferIndex -= VIRTUAL_COUNT;
        }

        if (i >= decodingBoundLower && i < decodingBoundUpper) {
            if (i < COUNT) {
                const key = MENU_listComponent.data[i];
                LINE_CACHE[ringBufferIndex] = MENU_request.optionList[key].text;
            }
            else {
                LINE_CACHE[ringBufferIndex] = '~';
            }
        }

        ctx.fillText(LINE_CACHE[ringBufferIndex], 0, vertical); // There's a max width argument in the fillText?
        vertical += ITEM_HEIGHT_NUMBER;
    }
}

function MENU_listComponent_onblur() {
    MENU_completeForm(/*forceIsCancelled*/ true, /*changingFocusIsReasonable*/ false);
}

function MENU_listComponent_dblClick_or_space_or_enter(eventKey, indexItem, ringBufferIndexItem) {
    //MENU_ensure_boundingClientRect();
    //let indexClicked = menuGetRelativeMouseEventData(event.clientY);
    //MENU_setCursorIndex(indexClicked);
    //MENU_validateCursor();
    MENU_completeForm(false, true);
}

function MENU_listComponent_oncontextmenu(indexItem, event_button, event_clientX, event_clientY, relativeIndex) {
}

function MENU_render_request(renderKind) {
    if (menu.queueHead !== menu.queueTail) {
        const lastAbsoluteIndex = OFFSET_MENU + ((menu.queueTail - 1) & f.UI_SLOT_MASK);
        if (f.MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_MENU + (menu.queueTail & f.UI_SLOT_MASK);
    f.MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    if (renderKind === MENUrenderKind.Set) menu.renderKind_Set_countOfPendingRequests++;
    menu.queueTail++;
    
    if (!menu.isRenderPending) {
        menu.isRenderPending = true;
        requestAnimationFrame(MENU_render_do);
    }
}

function MENU_render_do() {
    while (menu.queueHead !== menu.queueTail) {
        // Uses the exact same masking logic, but reads from the higher memory region
        const absoluteIndex = OFFSET_MENU + (menu.queueHead & f.UI_SLOT_MASK);
        const renderKind = f.MASTER_RENDER_BUFFER[absoluteIndex];
        menu.queueHead++;

        switch (renderKind) {
            case MENUrenderKind.Set:
                if (menu.renderKind_Set_countOfPendingRequests-- > 1) break;
                MENU_render_do_Set();
                break;
            case MENUrenderKind.Hide:
                MENU_render_do_Hide();
                break;
        }
    }
    menu.isRenderPending = false;
}

function MENU_render_do_Set() {
    let menuElement = document.getElementById('MENU');
    if (menuElement) {
        menuElement = null; // Superstitiously setting this to null in the name of GC, this is a bad thing to do because here it doesn't have any reason than anxiety and I'm giving into said anxiety and only making it stronger in the long run.
        MENU_render_do_Hide();
    }

    menuElement = document.createElement('div');
    menuElement.id = 'MENU';
    //menuElement.tabIndex = 0;
    document.body.appendChild(menuElement);

    //MENU_addEvents();
    MENU_listComponent.clear();

    for (var i = 0; i < MENU_request.optionList.length; i++) {
        MENU_listComponent.insert(MENU_listComponent.count, i);
    }

    if (!MENU_request.elementToFocusOnCompleted) {
        MENU_request.elementToFocusOnCompleted = document.activeElement;
    }
    
    menu.ticketId_drawn = MENU_request.ticket;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalLeft = MENU_request.left;
    let finalTop = MENU_request.top;
    //let rect = menuElement.getBoundingClientRect();

    // Check right edge
    //if (rect.right > viewportWidth) {
    if (MENU_request.left + menuElement.offsetWidth > viewportWidth) {
      finalLeft = viewportWidth - menuElement.offsetWidth - 10; // 10px padding boundary
    }
    // Check left edge (fallback if menu is wider than screen)
    if (finalLeft < 0) finalLeft = 10;

    // Check bottom edge
    //if (rect.bottom > viewportHeight) {
    if (MENU_request.top + menuElement.offsetHeight > viewportHeight) {
      finalTop = viewportHeight - menuElement.offsetHeight - 10; 
    }
    // Check top edge
    if (finalTop < 0) finalTop = 10;

    // 3. Apply the corrected coordinates
    menuElement.style.left = `${finalLeft}px`;
    menuElement.style.top = `${finalTop}px`;

    MENU_request.recentBoundingClientRectTop = finalTop;

    MENU_listComponent.cursorIndex = MENU_request.index;
    MENU_listComponent.initialize(menuElement);

    MENU_listComponent.rootElement.focus();
}

/**
 * @param {MenuOption[]} optionList 
 * @param {number} left 
 * @param {number} top 
 * @param {MENU_OnCompleteAction} onCompleteAction 
 * @param {any} target 
 * @param {HTMLElement} elementToFocusOnCompleted 
 * @param {boolean} disableFocusOnCompleted 
 * @param {number} index (use this to set the "initiallySelectedIndex", the MenuOption within 'optionList' that should start as the initially selected MenuOption.)
 */
export function menuSet(optionList, left, top, onCompleteAction, target, elementToFocusOnCompleted, disableFocusOnCompleted, index) {
    if (MENU_request) { MENU_completeForm(true); }

    if (!optionList || optionList.length <= 0) {
        throw new Exception('!optionList || optionList.length <= 0');
    }

    MENU_request = {
        left: left,
        top: top,
        recentBoundingClientRectTop: top,
        onCompleteAction: onCompleteAction,
        target: target,
        optionList: optionList,
        index: index ?? 0,
        ticket: menu.ticketId_counter++,
        ArrayFrom_menuOptionList_children: null,
        elementToFocusOnCompleted: elementToFocusOnCompleted,
        disableFocusOnCompleted: disableFocusOnCompleted
    };

    MENU_render_request(MENUrenderKind.Set);
}

function MENU_render_do_Hide() {
    const menu = document.getElementById('MENU');
    if (!menu) return;

    menu.ticketId_drawn = 0;
    MENU_listComponent.softDispose();
    menu.remove();
}

/**
 * Nobody should invoke this, the goal is that if someone shows a menu they ought to always get a 'MENU_completeForm' invocation for their 'MENU_request'.
 * If you invoke this you'll silently skip someone's 'MENU_request', if there is one.
 */
function MENU_hide() {
    MENU_request = null;
    MENU_listComponent.draw_removeEvents(); // Ensure you cannot "double submit the form"
    MENU_render_request(MENUrenderKind.Hide);
}

/**
 * TODO: 'changingFocusIsReasonable' might do "nothing". Because tab isn't preventDefault'd and the tab default behavior triggers after...
 * ...i.e.: it removes the focus invocation but the end result is the same I think.
 * 
 * @param {*} changingFocusIsReasonable A blur event should not change focus.
 */
function MENU_completeForm(forceIsCancelled, changingFocusIsReasonable) {
    const local_request = MENU_request;
    if (local_request === null) {
        return; // TODO: Since you remove the events in MENU_hide you shouldn't need this.
    }

    local_request.index = MENU_listComponent.cursorIndex;

    MENU_hide();
    if (changingFocusIsReasonable && !local_request.disableFocusOnCompleted && local_request.elementToFocusOnCompleted) {
        local_request.elementToFocusOnCompleted.focus();
    }
    if (!forceIsCancelled && local_request.ticket !== menu.ticketId_drawn) {
        forceIsCancelled = true;
    }
    let menuOption = undefined;
    if (local_request.index >= 0 && local_request.index < local_request.optionList.length) {
        menuOption = local_request.optionList[local_request.index];
    }
    local_request.onCompleteAction(forceIsCancelled, menuOption, local_request);
}

/**
 * @param {number} commandKind
 * @param {any} text
 * @returns {MenuOption} menuOption
 */
export function MENU_MenuOption_factory(commandKind, text) {
    return {
        commandKind: commandKind,
        text: text
    };
}
