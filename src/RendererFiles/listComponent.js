const LISTrenderKind = Object.freeze({
    None: 0,
    Cursor: 1,
    Create: 2,
    Batch: 3,
    Scroll: 4,
    SetItems: 5,
    FullReset: 6,
    Scroll_PullDataDrawResult: 7,
    Resize: 8,
});

/**
 * TODO: maybe combine the staticRunner instances into one?
 */
class ListComponent_staticRunner {
    constructor() {
        this.queueHead = 0;
        this.queueTail = 0;
        this.renderIsPending = false;

        this.CAPACITY = 32;
        this.UI_SLOT_MASK = this.CAPACITY - 1; // 31
        this.MASTER_RENDER_BUFFER = new Uint8Array(this.CAPACITY * 2); // 64 bytes

        this.runnerContexts = [];
        this.freeRunnerIds = [];

        // Bind once in constructor so rAF doesn't allocate a closure per frame
        this.renderLoop = this.List_render_do.bind(this);
    }

    List_render_request(renderKind, runnerId) {
        const count = this.queueTail - this.queueHead;
        
        if (count > 0) {
            const lastByteOffset = ((this.queueTail - 1) & this.UI_SLOT_MASK) << 1;
            if (
                this.MASTER_RENDER_BUFFER[lastByteOffset] === renderKind &&
                this.MASTER_RENDER_BUFFER[lastByteOffset + 1] === runnerId
            ) {
                return;
            }
        }

        // Guard against buffer overflow within a single frame
        if (count >= this.CAPACITY) {
            this.List_render_do();
        }

        const byteOffset = (this.queueTail & this.UI_SLOT_MASK) << 1;
        this.MASTER_RENDER_BUFFER[byteOffset] = renderKind;
        this.MASTER_RENDER_BUFFER[byteOffset + 1] = runnerId;
        this.queueTail++;

        if (!this.renderIsPending) {
            this.renderIsPending = true;
            requestAnimationFrame(this.renderLoop);
        }
    }

    List_render_do() {
        while (this.queueHead !== this.queueTail) {
            const byteOffset = (this.queueHead & this.UI_SLOT_MASK) << 1;
            const renderKind = this.MASTER_RENDER_BUFFER[byteOffset];
            const runnerId = this.MASTER_RENDER_BUFFER[byteOffset + 1];
            this.queueHead++;

            const component = this.runnerContexts[runnerId];
            if (!component) continue; // Component was removed before frame fired

            switch (renderKind) {
                case LISTrenderKind.Scroll:
                    component.renderScroll();
                    break;
                case LISTrenderKind.Cursor:
                    component.List_render_do_Cursor();
                    break;
                case LISTrenderKind.Resize:
                    component.renderResize();
                    break;
                // ... remaining cases
            }
        }
        this.renderIsPending = false;
    }

    add(listComponent) {
        if (this.freeRunnerIds.length > 0) {
            const reusedId = this.freeRunnerIds.pop();
            this.runnerContexts[reusedId] = listComponent;
            return reusedId;
        }
        this.runnerContexts.push(listComponent);
        return this.runnerContexts.length - 1;
    }

    remove(listComponent) {
        const id = listComponent.runnerId;
        if (id == null || this.runnerContexts[id] !== listComponent) {
            throw new Error("Invalid or unregistered runnerId");
        }
        this.runnerContexts[id] = null;
        this.freeRunnerIds.push(id);
    }
}

// TODO: an idea to consider:
// Create a "single" "staticRunner" and use a size of 32 or maybe 64 and then use the same one for every component? instead of everyone having 32 slots and 99% of the time only 1 component is using its slots at a time.
// because the array of "components" or something is just internally an array of object references so there's no deoptimization relative to what currently exists for you putting any object reference in it.


/** TODO: Does JavaScript have static classes, I don't want to go down a rabbit hole right now. */
export const listComponent_staticRunner = new ListComponent_staticRunner();

/**
 * You could probably calculate the ringBuffer diff in the scroll event then pass that information to a non-TreeViewComponent defined function.
 * The consumer of the 'TreeViewComponent' would provide a function that knows how to draw everything?
 * The main thing to avoid is probably invoking "per line being drawn" some function that knows how to draw a line.
 */
export class ListComponent {
    /**
     * @param {number} initialCapacity 
     * @param {ListComponent_staticRunner} listComponent_staticRunner 
     */
    constructor(initialCapacity, listComponent_staticRunner, renderLines, click_or_space_or_enter, oncontextmenu, onMeasure, onBlur) {

        this.renderLines = renderLines;
        this.click_or_space_or_enter = click_or_space_or_enter;
        this.oncontextmenu = oncontextmenu;
        this.onMeasure = onMeasure;
        this.onBlur = onBlur;

        this.listComponent_staticRunner = listComponent_staticRunner;
        
        this.runnerId = listComponent_staticRunner.add(this);

        this.rootElement = document.createElement('div');
        this.rootElement.classList.add('LIST', 'unselectable');
        this.rootElement.tabIndex = 0;
        this.rootElement.style.height = '100%';

        this.scrollViewport = document.createElement('div');
        this.scrollViewport.className = 'LIST_scroll_viewport';
        this.scrollbarSpaceGenerator = document.createElement('div');
        this.scrollbarSpaceGenerator.className = 'LIST_scrollbar_space_generator';
        this.scrollViewport.appendChild(this.scrollbarSpaceGenerator);
        this.rootElement.appendChild(this.scrollViewport);

        this.visualCanvas = document.createElement('div');
        this.visualCanvas.className = 'LIST_visual_canvas';
        this.canvas = document.createElement('canvas');
        this.canvasContext2d = this.canvas.getContext('2d');
        this.visualCanvas.appendChild(this.canvas);
        this.rootElement.appendChild(this.visualCanvas);

        this.itemHeightTotal = 0;
        this.itemHeightNumber = 0;

        this.characterWidth = 0;
        this.offsetPerDepthInPixels = 0;
        this.offsetPerDepthInCharacterWidths = 0;

        this.cursorIndex = 0;

        this.currentVirtualIndex = 0;
        this.currentVirtualCount = 0;

        this.previousVirtualIndex = 0;
        this.previousVirtualCount = 0;

        this.scrollLeft = 0;
        this.scrollTop = 0;
        
        this.ringBufferIndexZero = 0;

        this.WIDTH_NODE_DRAWN_NUMBER_IN_CH_UNITS_NO_PADDING = 2;

        this.LARGEST_DEPTH_SEEN_NOT_THE_CSS_JUST_THE_DEPTH = 0;

        this.offsetWidth = 0;
        this.offsetHeight = 0;

        this.boundingClientRectLeft = 0;
        this.boundingClientRectTop = 0;

        // Bind once in constructor so ... doesn't allocate a closure per ...
        this.eventScroll = this.event_scroll.bind(this);
        this.eventClick = this.event_click.bind(this);
        this.eventMouseMove = this.event_mousemove.bind(this);
        this.eventKeydown = this.event_keydown.bind(this);
        this.eventContextmenu = this.event_contextmenu.bind(this);
        this.eventBlur = this.event_blur.bind(this);
        this.eventResize = this.event_windowResize.bind(this);

        this.data = new Uint32Array(initialCapacity);
        this.capacity = initialCapacity;

        this.count = 0;
    }

    dispose() {
        this.draw_removeEvents();
        this.listComponent_staticRunner.remove(this);
        this.rootElement.remove();
    }
    
    softDispose() {
        this.draw_removeEvents();
        this.rootElement.remove();
    }

    draw_addEvents() {
        this.scrollViewport.addEventListener('scroll', this.eventScroll, { passive: true });
        
        this.rootElement.addEventListener('click', this.eventClick);
        this.rootElement.addEventListener('mousemove', this.eventMouseMove);
        this.rootElement.addEventListener('keydown', this.eventKeydown);
        this.rootElement.addEventListener('contextmenu', this.eventContextmenu);
        this.rootElement.addEventListener('blur', this.eventBlur);

        window.addEventListener('resize', this.eventResize);

        // TODO: put events on 'this.visualCanvas' instead of 'this.rootElement' maybe?...
        // ...in 'measure' function you getBoundingClient rect of 'visualCanvas'.
        // The old code in this class got the 'left' and 'top' from 'rootElement' via 'this.rootElement.getBoundingClientRect();'.
        // This incosistency should be resolved so you don't redundantly 'getBoundingClientRect()' of both (which is likely redundant if not one being more correct than the other).
    }
    
    draw_removeEvents() {
        this.scrollViewport.removeEventListener('scroll', this.eventScroll, { passive: true }); // TODO: You don't pass '{ passive: true }' when removing an event that was added with it but this doesn't error and it makes me feel less anxious.

        this.rootElement.removeEventListener('click', this.eventClick);
        this.rootElement.removeEventListener('mousemove', this.eventMouseMove);
        this.rootElement.removeEventListener('keydown', this.eventKeydown);
        this.rootElement.removeEventListener('contextmenu', this.eventContextmenu);
        this.rootElement.removeEventListener('blur', this.eventBlur);

        window.removeEventListener('resize', this.eventClick);
    }

    forceFullscreen_renderScroll() {
        this.currentVirtualIndex = (this.scrollTop / this.itemHeightNumber) | 0;
        this.previousVirtualIndex = this.currentVirtualIndex + this.virtualCount;
        this.renderScroll();
    }

    renderScroll() {
        this.currentVirtualIndex = this.scrollTop / this.itemHeightNumber | 0;

        const local_prevVli = this.previousVirtualIndex;
        const local_currVli = this.currentVirtualIndex;
        this.previousVirtualIndex = local_currVli;

        let diff = local_currVli - local_prevVli;

        let decodingBoundLower = 0;

        if (diff !== 0) {
            if (diff >= this.virtualCount || diff <= -(this.virtualCount)) {
                decodingBoundLower = local_currVli;
                diff = this.virtualCount; // Bound the loop run to the size of your screen viewport
            }
            else if (diff > 0) {
                decodingBoundLower = local_prevVli + this.virtualCount;
                this.ringBufferIndexZero = (this.ringBufferIndexZero + diff) % this.virtualCount;
            }
            else {
                decodingBoundLower = local_currVli;
                diff *= -1;
                this.ringBufferIndexZero = (this.ringBufferIndexZero - diff + this.virtualCount) % this.virtualCount;
            }
        }
        else { // If diff is 0 (like a pure horizontal scroll), no newly visible lines need decoding
            decodingBoundLower = 0;
            diff = 0;
        }

        this.renderLines(
            this.currentVirtualIndex /*lower*/,
            this.currentVirtualIndex + this.virtualCount /*upper*/,
            this.ringBufferIndexZero - 1 /*ringBufferIndex*/,
            decodingBoundLower,
            decodingBoundLower + diff /*decodingBoundUpper*/);
    }

    /**
     * TODO: Consider moving the cursor to its own canvas.
     * 
     * If you check whether the cursor needs to be scrolled into view, you'll trigger a downstream 'renderCursor' due to the scroll event.
     * Otherwise, assume you still need to ensure the 'renderCursor' is invoked so force it.
     * 
     * (the ScrollIntoView is relative to `this.cursorIndex` NOT the position you last rendered the cursor)
     * 
     * TODO: 'this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex);' is vestigial-ish logic. Originally there was a function that set 'this.cursorIndex' and as a side effect would scroll it into view. These statements need to be modified to have that side effect occur.
     */
    renderCursor_ScrollIntoView_Or_RenderCursor() {
        this.renderLines(
            this.currentVirtualIndex /*lower*/,
            this.currentVirtualIndex + this.virtualCount /*upper*/,
            this.ringBufferIndexZero - 1 /*ringBufferIndex*/,
            0 /*decodingBoundLower*/,
            0 /*decodingBoundUpper*/);
    }

    state_cursor_validateIndex(indexItem) {
        if (indexItem >= this.count) {
            indexItem = this.count - 1;
        }
        if (indexItem < 0) {
            indexItem = 0;
        }
        return indexItem;
    }

    toRingBufferIndex(itemIndex) {
        let virtualIndex = itemIndex - this.currentVirtualIndex;
        if (virtualIndex >= this.virtualCount || virtualIndex < 0) {
            virtualIndex = -1;
        }
        else {
            return (virtualIndex + this.ringBufferIndexZero) % this.virtualCount;
        }
    }

    /**
     * TODO: To detect whether the "expand/collapse icon" was clicked, the logic 'if(event.target === nodeElement.children[0])' is used...
     * ...this logic is flawed if one ever were to put an element within the span that became the target...
     * ...thus, you should consider checking the x position of the event against the x position of the nodeElement.children[0].
     * @param {*} event 
     */
    event_click(event) {
        const event_clientY = event.clientY;
        event = null;

        let rY = event_clientY - this.boundingClientRect.top + this.scrollTop;
        let indexItem = Math.floor(rY / this.itemHeightNumber);
        indexItem = this.state_cursor_validateIndex(indexItem);

        let ringBufferIndexItem = this.toRingBufferIndex(indexItem);
        if (ringBufferIndexItem < 0) return;

        this.cursorIndex = indexItem;
        this.renderCursor_ScrollIntoView_Or_RenderCursor();
        this.click_or_space_or_enter(undefined /*key*/, this.cursorIndex, ringBufferIndexItem);
    }
    
    event_mousemove(event) {
        const event_clientY = event.clientY;
        event = null;

        let rY = event_clientY - this.boundingClientRect.top + this.scrollTop;
        let indexItem = Math.floor(rY / this.itemHeightNumber);
        indexItem = this.state_cursor_validateIndex(indexItem);

        if (this.cursorIndex === indexItem) { return; }

        this.cursorIndex = indexItem;
        this.renderCursor_ScrollIntoView_Or_RenderCursor();
    }

    event_contextmenu(event) {
        const event_button = event.button;
        const event_clientX = event.clientX;
        const event_clientY = event.clientY;
        event = null;

        if (event_button === 2) {
            let rY = event_clientY - this.boundingClientRect.top + this.scrollTop;

            this.cursorIndex = this.state_cursor_validateIndex(Math.floor(rY / this.itemHeightNumber));
            this.renderCursor_ScrollIntoView_Or_RenderCursor();

            let ringBufferIndexItem = this.toRingBufferIndex(this.cursorIndex);
            if (ringBufferIndexItem < 0) return;

            this.oncontextmenu(this.cursorIndex, event_button, event_clientX, event_clientY, ringBufferIndexItem);
        }
        else {
            this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex);
            this.renderCursor_ScrollIntoView_Or_RenderCursor();

            let ringBufferIndexItem = this.toRingBufferIndex(this.cursorIndex);
            if (ringBufferIndexItem < 0) return;

            // TODO: Handle context menu with keyboard when active node is out of view
            this.oncontextmenu(this.cursorIndex, event_button, event_clientX, event_clientY, ringBufferIndexItem);
        }
    }

    event_blur() {
        this.onBlur();
    }

    event_keydown(event) {
        const eventKey = event.key;
        const eventCtrlKey = event.ctrlKey;

        switch (eventKey) {
            case 'ArrowDown':
                event.preventDefault();
                event.stopPropagation();
                this.arrowDown(eventCtrlKey);
                return;
            case 'ArrowUp':
                event.preventDefault();
                event.stopPropagation();
                this.arrowUp(eventCtrlKey);
                return;
            case 'ArrowRight':
                event.preventDefault();
                event.stopPropagation();
                event = null; // these ones have async code that runs downstream and I need to do this for my own sanity for now TODO: is this true?
                this.arrowRight(eventCtrlKey);
                return;
            case 'ArrowLeft':
                event.preventDefault();
                event.stopPropagation();
                event = null; // these ones have async code that runs downstream and I need to do this for my own sanity for now TODO: is this true?
            	this.arrowLeft(eventCtrlKey);
            	return;
            case ' ':
            case 'Enter':
                event.preventDefault();
                event.stopPropagation();
                event = null; // these ones have async code that runs downstream and I need to do this for my own sanity for now TODO: is this true?
                this.space_or_enter(eventKey);
                return;
        }
    }

    arrowDown(ctrlKey) {
        if (ctrlKey) {
            this.scrollViewport.scrollBy(0, this.itemHeightNumber);
        }
        else {
            this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex + 1);
            this.renderCursor_ScrollIntoView_Or_RenderCursor();
        }
    }

    arrowUp(ctrlKey) {
        if (ctrlKey) {
            this.scrollViewport.scrollBy(0, -1 * this.itemHeightNumber);
        }
        else {
            this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex - 1);
            this.renderCursor_ScrollIntoView_Or_RenderCursor();
        }
    }

    arrowRight(ctrlKey) {
        // TODO: consider: If holding ctrl, don't preventDefault so the user can scroll horizontally?

        this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex);

        // TODO: 'ArrowRight' when the cursor is on a valid item but isn't part of the virtualization result.
        let ringBufferIndexItem = this.toRingBufferIndex(this.cursorIndex);
        if (ringBufferIndexItem < 0) return;

        this.getElementAt(this.cursorIndex);
        let depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
        let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
        
        if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {
            if (this.cursorIndex + 1 < this.count) {
                if (this.getDepth(this.cursorIndex + 1) > depth) {
                    this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex + 1);
                    this.renderCursor_ScrollIntoView_Or_RenderCursor();
                }
            }
        }
        else if (nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded) {
            this.expandCollapseIconWasClicked(this.cursorIndex, ringBufferIndexItem);
        }
    }

    arrowLeft(ctrlKey) {
        // TODO: consider: If holding ctrl, don't preventDefault so the user can scroll horizontally?

        this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex);

        // TODO: 'ArrowLeft' when the cursor is on a valid item but isn't part of the virtualization result.
        let ringBufferIndexItem = this.toRingBufferIndex(this.cursorIndex);
        if (ringBufferIndexItem < 0) return;

        this.getElementAt(this.cursorIndex);
        let depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
        let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
        
        if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {
            this.expandCollapseIconWasClicked(this.cursorIndex, ringBufferIndexItem);
        }
        else {
            let distanceToParent = 0;
            for (let i = this.cursorIndex - 1; i >= 0; i--) {
                // If ithElementDepth < currentDepth; // then ithElement is the parent of current.
                if (this.getDepth(i) < depth) {
                    distanceToParent++;
                    break;
                }
                else {
                    distanceToParent++;
                }
            }
            if (distanceToParent > 0) {
                this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex - distanceToParent);
                this.renderCursor_ScrollIntoView_Or_RenderCursor();
            }
        }
    }

    space_or_enter(key) {
        this.cursorIndex = this.state_cursor_validateIndex(this.cursorIndex);
                
        let ringBufferIndexItem = this.toRingBufferIndex(this.cursorIndex);
        if (ringBufferIndexItem < 0) return;

        this.click_or_space_or_enter(key, this.cursorIndex, ringBufferIndexItem);
    }

    /**
     * @param {HTMLElement} parent 
     * @param {HTMLElement?} beforeChild for the `insertBefore` invocation, `null` will result in an append.
     */
    initialize(parent, beforeChild) {
        parent.insertBefore(this.rootElement, beforeChild);
        this.measure();
        this.drawScrollbarHeight();
        this.draw_addEvents();
        this.forceFullscreen_renderScroll();
    }

    /** TODO: name this function. */
    resetTheUi() {
        this.drawScrollbarHeight();
        this.forceFullscreen_renderScroll();
    }

    drawScrollbarHeight() {
        this.itemHeightTotal = (this.count + 2) * this.itemHeightNumber;
        this.scrollbarSpaceGenerator.style.height = this.itemHeightTotal + 'px';
    }

    measure() {
        const dpr = window.devicePixelRatio || 1;

        const viewportRect = this.visualCanvas.getBoundingClientRect();
        const viewWidth = viewportRect.width;
        const viewHeight = viewportRect.height;

        this.boundingClientRect = this.rootElement.getBoundingClientRect();
        this.virtualCount = Math.ceil(this.rootElement.offsetHeight / this.itemHeightNumber);

        const textCanvas = this.canvas;
        const textLayoutWidth = viewWidth;
        textCanvas.style.width = textLayoutWidth + 'px';
        textCanvas.style.height = viewHeight + 'px';
        textCanvas.width = textLayoutWidth * dpr;
        textCanvas.height = viewHeight * dpr;

        const ctxText = textCanvas.getContext('2d');
        ctxText.scale(dpr, dpr);
        ctxText.font = '14px monospace';
        ctxText.textBaseline = 'top';
        ctxText.fillStyle = '#ffffff';

        const metrics = ctxText.measureText('M');

        const fontHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const linePadding = 6; // Total padding between lines
        this.itemHeightNumber = fontHeight + linePadding;
        
        const charWidth = ctxText.measureText('M').width; // The exact pixel width of every single character in a monospace font
        this.characterWidth = charWidth;
        this.offsetPerDepthInPixels = charWidth;
        this.offsetPerDepthInCharacterWidths = 1;

        ctxText.font = '14px monospace'; // Run once during setup / font configuration

        this.offsetWidth = Math.floor(viewportRect.width);
        this.offsetHeight = Math.floor(viewportRect.height);

        this.virtualCount = Math.ceil(this.offsetHeight / this.itemHeightNumber);

        this.onMeasure();
    }

    renderResize() {
        this.measure();
        this.forceFullscreen_renderScroll();
    }

    /**
     * TODO: intra-app resizes or movements will also invoke this; i.e.: if a list is shown in a dialog and the dialog is resized or moved.
     */
    event_windowResize() {
        this.listComponent_staticRunner.List_render_request(LISTrenderKind.Resize, this.runnerId);
    }

    event_scroll() {
        this.scrollLeft = this.scrollViewport.scrollLeft;
        this.scrollTop = this.scrollViewport.scrollTop;
        this.listComponent_staticRunner.List_render_request(LISTrenderKind.Scroll, this.runnerId);
    }

    // tvnl_

    /**
     * Does not clear the information, only sets 'this.count' to '0'.
     */
    clear() {
        this.count = 0;
    }

    insert(index, key) {
        this.ensureCapacityForInsertion(index, 1);

        if (index !== this.count) {
            this.copyTo(this.data, index, this.data, index + 1, this.count - index);
        }

        this.data[index] = key;

        this.count++;
    }

    /**
     * Does not clear trailing information.
     * 
     * count === 0 immediately returns
     */
    removeAt(index, count) {

        if (index > this.count) { throw new Error('removeAt(...): index_abstract > this.count_abstract'); }
        if (index + count > this.count) { throw new Error('removeAt(...): index_abstract + count_abstract > this.count_abstract'); }
        if (count === 0) { return; }

        if (index + count === this.count) {
            let shiftableCount = this.count - (index + count);
            if (shiftableCount > 0) {
                this.copyTo(
                    this.data,
                    index + count,
                    this.data,
                    index,
                    shiftableCount);
            }
        }
        else {
            this.copyTo(
                this.data,
                index + count,
                this.data,
                index,
                this.count - (index + count));
        }

        this.count -= count;
    }

    ensureCapacityForInsertion(index, count) {
        // TODO: sparse insertions?
        const requiredCapacity = Math.max(this.count + count, index);
        
        // If we already have enough capacity, do absolutely nothing
        if (requiredCapacity <= this.capacity) {
            return;
        }

        // Calculate the new capacity by doubling until it fits
        let capacityNew = this.capacity || 1; // Prevent infinite loops if capacity is 0
        while (capacityNew < requiredCapacity) {
            capacityNew *= 2;
        }

        // Safety check against integer overflow / negative bounds
        if (capacityNew < this.capacity) {
            throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
        }

        // Allocate and copy EXACTLY ONCE
        let dataNew = new Uint32Array(capacityNew);
        this.copyTo(this.data, 0, dataNew, 0, this.count);
        
        // Commit the changes to your global/module state
        this.data = dataNew;
        this.capacity = capacityNew;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
        if (bytesSource === bytesDestination) {
            if (bytesSource !== this.data) {
                throw new Error('bytesSource === bytesDestination ; but bytesSource !== this.data');
            }
    
            this.data.copyWithin(destinationStart, sourceStart, sourceStart + length);
        }
        else {
            bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
        }
    }
}
