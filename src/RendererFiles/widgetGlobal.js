import * as f from "./fieldBuffer.js"

class Widget {
    constructor() {
        this.isRenderPending = false;
        this.widgetKind_drawn = 0;
        this.queueHead = 0;
        this.queueTail = 0;

        /**
         * start it at 1 because you thought about starting it at 0 then using a prefix incrementation to ensure the 0 state is never used as a means of detecting an empty state
         * but if someone changes the code and moves it to postfix incrementation then everything breaks so why even take that risk when you can just start at 1
         * then if they go from postfix to prefix then you simply miss out on the number 1 and the first ticketId is 2 who cares...
         * 
         * ticketId because you're standing in line at the deli in the supermarket and you've grabbed from the machine a paper that has your number on it
         * and you're waiting for your number to be called so you can get the turkey
         * 
         * > "what is it called when you are in line at a deli and they have a machine that prints a paper with a number on it"
         * 
         * < It is called a take-a-number system or a queue management system. It uses a ticket dispenser to give out paper numbers so people can wait in order without standing in a tight line.
         * 
         * okay yeah it is a ticket dispenser we're good
         */
        this.ticketId_counter = 1;

        this.ticketId_drawn = 0;

        this.renderKind_Show_countOfPendingRequests = 0;
    }
}

export const widget = new Widget();

const OFFSET_WIDGET = 64; // Slots 64 to 95 // Define the unique byte offset where each UI's memory space begins

/**
 * @callback WIDGET_Callback
 * @param {WidgetResult} result
 * @returns {Promise}
 */

/**
 * @typedef {Object} WidgetRequest
 * @property {any} widgetKind - WidgetKind_...
 * @property {number} left
 * @property {number} top
 * @property {*} placeholder
 * @property {*} value
 * @property {*} target
 * @property {*} elementToFocusOnCompleted
 * @property {*} disableFocusOnCompleted
 * @property {WIDGET_Callback} callback
 * @property {number} ticket
 */

/**
 * @typedef {Object} WidgetResult
 * @property {boolean} isCancelled
 * @property {any} resultData
 * @property {WidgetRequest} request
 */

/** @type {WidgetRequest} */
let WIDGET_request = null;

// You aren't focusing the widget element itself so blur likely won't work.
//WIDGET_element.addEventListener('focusout', () => WIDGET_hide());

function WIDGET_render_request(renderKind) {
    if (widget.queueHead !== widget.queueTail) {
        const lastAbsoluteIndex = OFFSET_WIDGET + ((widget.queueTail - 1) & f.UI_SLOT_MASK);
        if (f.MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_WIDGET + (widget.queueTail & f.UI_SLOT_MASK);
    f.MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    if (renderKind === 1 /*WIDGETrenderKind.Show: 1*/) widget.renderKind_Show_countOfPendingRequests++;
    widget.queueTail++;
    
    if (!widget.isRenderPending) {
        widget.isRenderPending = true;
        requestAnimationFrame(WIDGET_render_do);
    }
}

function WIDGET_render_do() {
    while (widget.queueHead !== widget.queueTail) {
        // Uses the exact same masking logic, but reads from the higher memory region
        const absoluteIndex = OFFSET_WIDGET + (widget.queueHead & f.UI_SLOT_MASK);
        const renderKind = f.MASTER_RENDER_BUFFER[absoluteIndex];
        widget.queueHead++; 

        switch (renderKind) {
            case 1 /*WIDGETrenderKind.Show: 1*/:
                if (widget.renderKind_Show_countOfPendingRequests-- > 1) break;
                WIDGET_render_do_Show();
                break;
            case 2 /*WIDGETrenderKind.Hide: 2*/:
                WIDGET_render_do_Hide();
                break;
        }
    }
    widget.isRenderPending = false;
}

function WIDGET_render_do_Show() {

    let WIDGET_element = document.getElementById('WIDGET');
    if (widget.widgetKind_drawn !== 0 /*WidgetKind.None: 0*/) {
        WIDGET_element = null;
        WIDGET_render_do_Hide();
    }

    if (!WIDGET_element) {
        WIDGET_element = document.createElement('div');
        WIDGET_element.id = 'WIDGET';
        document.body.appendChild(WIDGET_element);
    }

    widget.widgetKind_drawn = WIDGET_request.widgetKind;

    if (!WIDGET_request.elementToFocusOnCompleted) {
        WIDGET_request.elementToFocusOnCompleted = document.activeElement;
    }
    
    // TODO: Move this to after the '..._Create()' invocations
    widget.ticketId_drawn = WIDGET_request.ticket;

    switch (widget.widgetKind_drawn) {
        case 1 /*WidgetKind.InputText: 1*/:
            WidgetKind_InputText_Create();
            break;
        case 2 /*WidgetKind.YesCancel: 2*/:
            WidgetKind_YesCancel_Create();
            break;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalLeft = WIDGET_request.left;
    let finalTop = WIDGET_request.top;
    //let rect = WIDGET_element.getBoundingClientRect();

    // Check right edge
    //if (rect.right > viewportWidth) {
    if (WIDGET_request.left + WIDGET_element.offsetWidth > viewportWidth) {
      finalLeft = viewportWidth - WIDGET_element.offsetWidth - 10; // 10px padding boundary
    }
    // Check left edge (fallback if menu is wider than screen)
    if (finalLeft < 0) finalLeft = 10;

    // Check bottom edge
    //if (rect.bottom > viewportHeight) {
    if (WIDGET_request.top + WIDGET_element.offsetHeight > viewportHeight) {
      finalTop = viewportHeight - WIDGET_element.offsetHeight - 10; 
    }
    // Check top edge
    if (finalTop < 0) finalTop = 10;

    // 3. Apply the corrected coordinates
    WIDGET_element.style.left = `${finalLeft}px`;
    WIDGET_element.style.top = `${finalTop}px`;
}

/**
 * Two consecutive invocations of this function will result in the first invocation's 'callback' being invoked with the cancelled state.
 * Whether the first invocation's rAF request triggered or not has no impact on things.
 * - If it was triggered the cancelled state is still passed to the first invocation's 'callback'.
 * - If it was NOT triggered, then the rAF request that relates to the first invocation in particular is skipped.
 * 
 * @param {number} widgetKind 'get_WidgetKind_%()'
 * @param {number} left 
 * @param {number} top 
 * @param {string} placeholder if the corresponding widget has a corresponding placeholder attribute this string will be provided as the attribute's value. This is stored in the variable 'WIDGET_request.placeholder'.
 * @param {string | object} value if the corresponding widget has a value attribute and this is expectedly a 'string' then this will be provided as the attribute's value. This is stored in the variable 'WIDGET_request.value'.
 * @param {object} target this is stored in the variable 'WIDGET_target'.
 * @param {WIDGET_Callback} callback this is invoked when the widget is either submitted or cancelled.
 */
export async function WIDGET_show(widgetKind, left, top, placeholder, value, target, elementToFocusOnCompleted, disableFocusOnCompleted, callback) {
    if (WIDGET_request) { await WIDGET_completeForm(true); }

    WIDGET_request = {
        widgetKind: widgetKind,
        left: left,
        top: top,
        placeholder: placeholder,
        value: value,
        target: target,
        elementToFocusOnCompleted: elementToFocusOnCompleted,
        disableFocusOnCompleted: disableFocusOnCompleted,
        callback: callback,
        ticket: widget.ticketId_counter++
    };

    WIDGET_render_request(1 /*WIDGETrenderKind.Show: 1*/);
}

function WIDGET_render_do_Hide() {
    const WIDGET_element = document.getElementById('WIDGET');

    switch (widget.widgetKind_drawn) {
        case 1 /*WidgetKind.InputText: 1*/:
            WidgetKind_InputText_Delete(WIDGET_element);
            break;
        case 2 /*WidgetKind.YesCancel: 2*/:
            WidgetKind_YesCancel_Delete(WIDGET_element);
            break;
    }
    widget.widgetKind_drawn = 0 /*WidgetKind.None: 0*/;
    widget.ticketId_drawn = 0;
    WIDGET_element.remove();
}

/**
 * Nobody should invoke this, the goal is that if someone shows a widget they ought to always get a 'WIDGET_completeForm' invocation for their 'WIDGET_request'.
 * If you invoke this you'll silently skip someone's 'WIDGET_request', if there is one.
 */
function WIDGET_hide() {
    WIDGET_request = null; // In case someone skips a 'WIDGET_completeForm', this null setting is done here.
    // TODO: remove the events here?
    WIDGET_render_request(2 /*WIDGETrenderKind.Hide: 2*/);
}

/**
 * TODO: I think you meant to remove 90% of this comment at some point (as of writing this you'd keep '...A blur event should not change focus.' (the final line) only.)
 * 
 * resultObject is of the pattern {isCancelled:isCancelled, value:input.value}.
 * 
 * This function will perform any generalized widget validation.
 * At the moment the validation relates to whether the currently displayed UI is up to date with the show/hide function invocations.
 * 
 * This function is used for the UI event handlers.
 * Any internal "completion" due to for example invoking 'hide' when a UI" is being shown skips this function.
 * If anyone desires to in the future change this such that the internal "completion" uses this function, take care because 'f.INTS[fWIDGET_ticketId_pending] === f.INTS[fWIDGET_ticketId_drawn]'
 * isn't quite as sensible when dealing with internal "completion" that needs to cancel the previous UI.
 * 
 * @param {*} changingFocusIsReasonable A blur event should not change focus.
 */
function WIDGET_completeForm(forceIsCancelled, changingFocusIsReasonable, resultData) {
    const local_request = WIDGET_request;
    if (local_request === null) {
        return;
    }
    WIDGET_hide();
    if (changingFocusIsReasonable && !local_request.disableFocusOnCompleted && local_request.elementToFocusOnCompleted) {
        local_request.elementToFocusOnCompleted.focus();
    }
    if (local_request.callback) {
        if (!forceIsCancelled && local_request.ticket !== widget.ticketId_drawn) {
            forceIsCancelled = true;
        }
        if (resultData === null) {
            switch (local_request.widgetKind) {
                case 1 /*WidgetKind.InputText: 1*/:
                    resultData = WidgetKind_InputText_GetResultData();
                    break;
                case 2 /*WidgetKind.YesCancel: 2*/:
                    resultData = WidgetKind_YesCancel_GetResultData();
                    break;
            }
        }
        return local_request.callback({
            isCancelled: forceIsCancelled,
            resultData: resultData,
            request: local_request
        });
    }
}

////

function WidgetKind_InputText_Create() {

    const WIDGET_element = document.getElementById('WIDGET');

    let input = document.createElement('input');
    input.type = "text";
    input.id = 'WIDGET_inputText';
    if (WIDGET_request.placeholder || WIDGET_request.placeholder === '') {
        input.placeholder = WIDGET_request.placeholder;
    }

    // TODO: "typeof value === 'string'" is not a bulletproof solution for checking whether the value is a string.
    // TODO: Extremely undocumented behavior in relation to the ways of using 'WIDGET_request.value'.
    //
    if ((WIDGET_request.value || WIDGET_request.value === '') && (typeof WIDGET_request.value === 'string')) {
        input.value = WIDGET_request.value;
    }

    input.addEventListener('keydown', WidgetKind_InputText_onkeydown_input);
    WIDGET_element.appendChild(input);
    input.focus();
}

function WidgetKind_InputText_Delete(WIDGET_element) {
    let input = document.getElementById('WIDGET_inputText');
    input.removeEventListener('keydown', WidgetKind_InputText_onkeydown_input);
}

function WidgetKind_InputText_GetResultData() {
    let input = document.getElementById('WIDGET_inputText');
    return input.value;
}

async function WidgetKind_InputText_onkeydown_input(event) {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === 'Escape') {
        let isCancelled = event.key === 'Enter' ? false : true;
        await WIDGET_completeForm(isCancelled, true, null);
    }
}

////

function WidgetKind_YesCancel_Create() {

    const WIDGET_element = document.getElementById('WIDGET');

    let topDivElement = document.createElement('div');
    if (WIDGET_request.placeholder || WIDGET_request.placeholder === '') {
        topDivElement.textContent = WIDGET_request.placeholder;
    }

    let bottomDivElement = document.createElement('div');
    let yesButtonElement = document.createElement('button');
    yesButtonElement.textContent = 'Yes';
    yesButtonElement.id = 'WIDGET_YesCancel_yes';
    yesButtonElement.addEventListener('click', WidgetKind_YesCancel_onclick_yes);
    bottomDivElement.appendChild(yesButtonElement);
    let cancelButtonElement = document.createElement('button');
    cancelButtonElement.textContent = 'Cancel';
    cancelButtonElement.id = 'WIDGET_YesCancel_cancel';
    cancelButtonElement.addEventListener('click', WidgetKind_YesCancel_onclick_cancel);
    bottomDivElement.appendChild(cancelButtonElement);

    WIDGET_element.appendChild(topDivElement);
    WIDGET_element.appendChild(bottomDivElement);
    yesButtonElement.focus();
}

function WidgetKind_YesCancel_Delete(WIDGET_element) {
    let yesButtonElement = document.getElementById('WIDGET_YesCancel_yes');
    yesButtonElement.removeEventListener('click', WidgetKind_YesCancel_onclick_yes);
    let cancelButtonElement = document.getElementById('WIDGET_YesCancel_cancel');
    cancelButtonElement.removeEventListener('click', WidgetKind_YesCancel_onclick_cancel);
}

function WidgetKind_YesCancel_GetResultData() {
    return null;
}

async function WidgetKind_YesCancel_onclick_yes() {
    await WIDGET_completeForm(false, true, 'Yes');
}

async function WidgetKind_YesCancel_onclick_cancel() {
    await WIDGET_completeForm(true, 'Cancel');
}

/*
export const WidgetKind = Object.freeze({
    None: 0,
    InputText: 1,
    YesCancel: 2,
});
*/

/*
const WIDGETrenderKind = Object.freeze({
    None: 0,
    Show: 1,
    Hide: 2,
});
*/
