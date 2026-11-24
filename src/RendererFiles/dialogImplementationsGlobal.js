import {aaaApp} from "./applicationRendererRoot.js"
import {TreeViewComponent, TreeViewNodeKind, treeViewComponent_staticRunner} from "./treeViewComponent.js"
import {editor, CONST_EDI_ASCII_TAB, CONST_EDI_ASCII_SPACE, EDI_textSourceIdentifier, EDI_moveCursor_position} from './editorGlobal_edit.js'
import {EXPLORER_openInEditor} from './explorerGlobal.js'
import { APP_colors, set_colors_to_dark, set_colors_to_light } from "./fieldBuffer.js"

/**
 * @type {TreeViewComponent}
 */
const FindAll_treeViewComponent = new TreeViewComponent(
    16, treeViewComponent_staticRunner, FindAll_renderLines, FindAll_expandCollapseIconWasClicked, FindAll_dblClick_or_space_or_enter, FindAll_oncontextmenu, FindAll_onMeasure);

let FindAll_actualData = null;
const FindAll_actualData_EMPTY = {
    fileEntries: []
};
const FindAll_actualData_EMPTY_FILE_MATCHES = new Uint32Array(0);
let FindAll_ringBufferCache = null;

let FindAll_dialog_was_resized_or_moved_timeoutId = 0;
const FindAll_dialog_was_resized_or_moved_timeout_DELAY = 500;

function FindAll_onMeasure() {
    if (FindAll_ringBufferCache === null || FindAll_ringBufferCache === undefined || FindAll_ringBufferCache.length !== FindAll_treeViewComponent.virtualCount) {
        const virtualCount = FindAll_treeViewComponent.virtualCount;
        FindAll_ringBufferCache = new Array(virtualCount);
        for (let i = 0; i < virtualCount; i++) {
            FindAll_ringBufferCache[i] = {
                displayName: '~',
                count: null,
                iterateMatches: false
            };
        }
    }
}

export function FindAll_dialog_was_resized_or_moved() {
    if (FindAll_dialog_was_resized_or_moved_timeoutId !== 0) {
        clearTimeout(FindAll_dialog_was_resized_or_moved_timeoutId);
    }

    FindAll_dialog_was_resized_or_moved_timeoutId = setTimeout(FindAll_dialog_was_resized_or_moved_doer, FindAll_dialog_was_resized_or_moved_timeout_DELAY);
}

function FindAll_dialog_was_resized_or_moved_doer() {
    FindAll_treeViewComponent.eventResize();
}

function FindAll_setData_causes_state_reset(actualData) {
    FindAll_actualData = actualData;

    FindAll_treeViewComponent.clear();
    // TODO: probably draw scrollbar height here incase you return or maybe in the return conditional branch you draw it or something idk

    // key, nodeKind is the way to draw this specific tree view very quickly.
    // maybe the depth is it actually idk

    if (!FindAll_actualData) {
        return;
    }

    const fileEntries = FindAll_actualData.fileEntries;

    for (let i = 0; i < fileEntries.length; i++) {
        FindAll_treeViewComponent.insert(FindAll_treeViewComponent.countAbstract, 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/, i, 0);
    }
    
    FindAll_treeViewComponent.drawScrollbarHeight();
    FindAll_treeViewComponent.forceFullscreen_renderScroll();
}

function FindAll_renderLines(lineIndexLower, lineIndexUpper, ringBufferIndex, decodingBoundLower, decodingBoundUpper) {
    const ctx = FindAll_treeViewComponent.canvasContext2d;
    ctx.clearRect(0, 0, FindAll_treeViewComponent.canvas.width, FindAll_treeViewComponent.canvas.height);
    
    let vertical = -(FindAll_treeViewComponent.scrollTop % FindAll_treeViewComponent.itemHeightNumber);

    // TODO: All of the below 'Optimization heuristic goal' suck. Cause you have no idea whether they're actually effective you're just hearing rumors and then throwing them all at a dart board and hoping everything works out.
    // ^ I'm specifically referencing my blind application of them en masse like a fool without ever having confirmed that they are improvements let alone meaningful ones.
    // ^ for absolute clarification I'm not saying the heuristics suck I'm saying I suck cause I never once validated their usefulness.
    //
    /** Optimization heuristic goal: assumedly reduce reference chasing by creating a const reference to fields that are frequently accessed via a member access on a reference variable. It is rumored that this permits loop optimization. */
    /** Optimization heuristic goal: similarly^ assumedly improve caching by explicitly telling the code generator that the reference which 'foo' points to "will not change". In garbage collection, when defragmenting the heap every reference to an object that was repositioned needs to have its reference updated to point to the new location of the object, so I'm not quite sure how this works out idk. It is rumored that this permits loop optimization. */
    const VIRTUAL_COUNT = FindAll_treeViewComponent.virtualCount;
    const COUNT_ABSTRACT = FindAll_treeViewComponent.countAbstract;
    const LINE_CACHE = FindAll_ringBufferCache;
    const ITEM_HEIGHT_NUMBER = FindAll_treeViewComponent.itemHeightNumber;
    /** Optimization heuristic goal: This one specifically is to bring this global scope variable into local scope rather than relying on caching alone this ought to signal further the importance of the variable being cached. It is rumored that this permits loop optimization. */
    //const STRINGS_MAP_BY_PATH_ID = FindAll_pathIdToDisplayNameMap;

    /** Optimization heuristic goal: make the upper bound a constant, and do not modify 'i' within the loop, have not measured if this is truly impactful. It is rumored that this permits loop optimization. */
    const LINE_INDEX_UPPER = lineIndexUpper;

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#3f7581'; // Solid cursor accent color
    const cursorLine = FindAll_treeViewComponent.cursorIndex;
    if (cursorLine >= lineIndexLower && cursorLine < lineIndexUpper) {
        const cursorY = (cursorLine - lineIndexLower) * FindAll_treeViewComponent.itemHeightNumber + vertical;
        ctx.fillRect(0, cursorY, FindAll_treeViewComponent.canvas.width, FindAll_treeViewComponent.itemHeightNumber);
    }

    ctx.fillStyle = APP_colors.standardText;

    let previousDepthString = '';
    let previousDepthStringDepth = 0;

    if (FindAll_actualData === null) {
        FindAll_actualData = FindAll_actualData_EMPTY;
    }

    let indexFile = 0;
    let fileMatches = FindAll_actualData_EMPTY_FILE_MATCHES;
    let fileMatchesIndex = -1; // -1, you are at the node which represents the filename

    if (FindAll_actualData.fileEntries.length > 0) {
        FindAll_treeViewComponent.getElementAt(lineIndexLower);
        indexFile = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
        let l_depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
        if (l_depth !== 0) {
            let parentIndexAndDistanceToParent = FindAll_treeViewComponent.getParentItemIndex_andTheDistanceToParent(lineIndexLower);
            if (parentIndexAndDistanceToParent === null || parentIndexAndDistanceToParent === undefined) {
                return; // throw error ???
            }
            indexFile = FindAll_treeViewComponent.getKey(parentIndexAndDistanceToParent.parentIndex);
            fileMatches = FindAll_actualData.fileEntries[indexFile].matches;
            fileMatchesIndex = parentIndexAndDistanceToParent.distanceToParent - 1;
        }
        else {
            fileMatches = FindAll_actualData.fileEntries[indexFile].matches;
        }
    }
    else {
        fileMatchesIndex = 0; // To indicate everything is '~' and that you're out of bounds of the matches so don't try to do anything
    }

    for (let i = lineIndexLower; i < LINE_INDEX_UPPER; i++) {
        ringBufferIndex++;
        if (ringBufferIndex >= VIRTUAL_COUNT) {
            ringBufferIndex -= VIRTUAL_COUNT;
        }

        if (i >= decodingBoundLower && i < decodingBoundUpper) {
            if (i < COUNT_ABSTRACT) {
                FindAll_treeViewComponent.getElementAt(i);
                // key is the index of the ...
                const key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
                const depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
                const nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

                let name = '~';
                if (fileMatchesIndex !== -1) {
                    name = fileMatches[fileMatchesIndex];
                    LINE_CACHE[ringBufferIndex].count = null;
                    LINE_CACHE[ringBufferIndex].iterateMatches = true;
                }
                else if (indexFile < FindAll_actualData.fileEntries.length) {
                    const entry = FindAll_actualData.fileEntries[indexFile];
                    name = entry.filename;
                    LINE_CACHE[ringBufferIndex].count = entry.matches.length;
                    LINE_CACHE[ringBufferIndex].iterateMatches = nodeKind === 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/;
                }

                let chevronRepresentation = '';
                switch (nodeKind) {
                    case 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/:
                        chevronRepresentation = '-';
                        break;
                    case 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/:
                        chevronRepresentation = '+';
                        break;
                    case 3 /*TreeViewNodeKind.NOTisExpandable_isExpanded: 3*/:
                        chevronRepresentation = ' ';
                        break;
                    case 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/:
                        chevronRepresentation = ' ';
                        break;
                }
                // I see what I was doing here now. I don't want to query depth in order to render something that was already cached with respect to text...
                // ...ummm TODO: decide on this, maybe you should just query depth in order to render something.
                if (previousDepthStringDepth !== depth) { // TODO: this is probably premature and unmeasured optimization that can thrash and provide no benefit when alternating back and forth between depth values.
                    previousDepthString = ' '.repeat(depth * FindAll_treeViewComponent.offsetPerDepthInCharacterWidths);
                    previousDepthStringDepth = depth;
                }
                LINE_CACHE[ringBufferIndex].displayName = previousDepthString + chevronRepresentation + name;
            }
            else {
                LINE_CACHE[ringBufferIndex].displayName = '~';
                LINE_CACHE[ringBufferIndex].count = null;
                LINE_CACHE[ringBufferIndex].iterateMatches = false;
            }
        }

        const cacheEntry = LINE_CACHE[ringBufferIndex];
        
        ctx.fillText(cacheEntry.displayName, 0, vertical);
        if (cacheEntry.count !== null) {
            ctx.fillStyle = '#CE9178';
            ctx.fillText(cacheEntry.count, (cacheEntry.displayName.length + 1) * FindAll_treeViewComponent.characterWidth, vertical);
            ctx.fillStyle = APP_colors.standardText;
        }
        vertical += ITEM_HEIGHT_NUMBER;

        if (cacheEntry.iterateMatches && fileMatchesIndex < fileMatches.length - 1) {
            fileMatchesIndex++;
        }
        else if (indexFile < FindAll_actualData.fileEntries.length - 1) {
            indexFile++;
            fileMatchesIndex = -1;
            fileMatches = FindAll_actualData.fileEntries[indexFile].matches;
        }
        else {
            indexFile = FindAll_actualData.fileEntries.length;
        }
    }
}

function FindAll_expandCollapseIconWasClicked(indexItem, ringBufferIndexItem) {
    FindAll_treeViewComponent.getElementAt(indexItem);
    const key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
    const depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    const nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

    if (nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/) {
        FindAll_treeViewComponent.setNodeKind(indexItem, 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/);

        const childFilesystemEntries = FindAll_actualData.fileEntries[key].matches;
        const insertionCount = childFilesystemEntries.length;
        if (insertionCount === 0) { FindAll_treeViewComponent.forceFullscreen_renderScroll(); return; }

        for (let i = 0; i < insertionCount; i++) {
            const entry = childFilesystemEntries[i];
            // TODO: Insert range, or at the least 'pre-emptively' resize the list so that it fits each insertion without resizing per insertion.
            FindAll_treeViewComponent.insert(indexItem + 1 + i, 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/, entry.id, depth + 1);
        }

        FindAll_treeViewComponent.drawScrollbarHeight();
        FindAll_treeViewComponent.forceFullscreen_renderScroll();
    }
    else if (nodeKind === 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/) {
        FindAll_treeViewComponent.setNodeKind(indexItem, 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/);

        const startIndex = indexItem + 1;

        let countChildren = 0;
        for (let i = startIndex; i < FindAll_treeViewComponent.countAbstract; i++) {
            // If currentDepth < ithElementDepth; // then current is a parent of ithElement.
            if (depth < FindAll_treeViewComponent.getDepth(i)) {
                countChildren++;
            }
            else {
                break;
            }
        }

        if (countChildren === 0) { FindAll_treeViewComponent.forceFullscreen_renderScroll(); return; }

        FindAll_treeViewComponent.removeAt(startIndex, countChildren);
        
        FindAll_treeViewComponent.drawScrollbarHeight();
        FindAll_treeViewComponent.forceFullscreen_renderScroll();
    }
}

async function FindAll_dblClick_or_space_or_enter(eventKey, indexItem, ringBufferIndexItem) {
    let indexFile = 0;
    let fileMatches = FindAll_actualData_EMPTY_FILE_MATCHES;
    let fileMatchesIndex = -1; // -1, you are at the node which represents the filename

    if (FindAll_actualData.fileEntries.length > 0) {
        FindAll_treeViewComponent.getElementAt(indexItem);
        indexFile = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
        let l_depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
        if (l_depth !== 0) {
            let parentIndexAndDistanceToParent = FindAll_treeViewComponent.getParentItemIndex_andTheDistanceToParent(indexItem);
            if (parentIndexAndDistanceToParent === null || parentIndexAndDistanceToParent === undefined) {
                return; // throw error ???
            }
            indexFile = FindAll_treeViewComponent.getKey(parentIndexAndDistanceToParent.parentIndex);
            fileMatches = FindAll_actualData.fileEntries[indexFile].matches;
            fileMatchesIndex = parentIndexAndDistanceToParent.distanceToParent - 1;
        }
        else {
            fileMatches = FindAll_actualData.fileEntries[indexFile].matches;
        }
    }
    else {
        fileMatchesIndex = 0; // To indicate everything is '~' and that you're out of bounds of the matches so don't try to do anything
    }

    if (fileMatchesIndex === -1) { // Interacted with a node representing the filename
        const absolutePath = FindAll_actualData.fileEntries[indexFile].absolutePath;
        await EXPLORER_openInEditor(absolutePath, /*shouldFocus*/ true);
        return;
    }
    else if (fileMatchesIndex < fileMatches.length) { // Interacted with a node representing a position index match
        const absolutePath = FindAll_actualData.fileEntries[indexFile].absolutePath;
        if (EDI_textSourceIdentifier !== absolutePath) {
            await EXPLORER_openInEditor(absolutePath, /*shouldFocus*/ true);
        }
        const positionIndex = fileMatches[fileMatchesIndex];
        EDI_moveCursor_position(positionIndex);
    }
}

function FindAll_oncontextmenu() {
    console.log('FindAll_oncontextmenu');
}

export function DIALOG_FindAll_Create() {
    let dialogBody = document.getElementById('DIALOG_body');

    let searchTextInput = document.createElement('input');
    searchTextInput.type = "text";
    searchTextInput.placeholder = 'find all';
    searchTextInput.id = 'DIALOG_FindAll_searchTextInput';
    searchTextInput.style.marginLeft = '5px';
    searchTextInput.style.marginTop = '5px';
    searchTextInput.style.height = aaaApp.lineHeightWithPx;
    searchTextInput.style.lineHeight = aaaApp.lineHeightWithPx;
    searchTextInput.addEventListener('keydown', DIALOG_FindAll_searchTextInput_onkeydown);
    dialogBody.appendChild(searchTextInput);
    searchTextInput.focus();
    
    let divOptions = document.createElement('div');
    divOptions.style.height = aaaApp.lineHeightWithPx;
    divOptions.style.lineHeight = aaaApp.lineHeightWithPx;
    divOptions.style.whiteSpace = 'nowrap';
    let checkboxMatchWord = document.createElement('input');
    checkboxMatchWord.type = 'checkbox';
    checkboxMatchWord.id = 'DIALOG_FindAll_checkboxMatchWord';
    checkboxMatchWord.checked = editor.FindAll_options_matchWord;
    checkboxMatchWord.addEventListener('change', DIALOG_FindAll_checkboxMatchWord_onchange);
    divOptions.appendChild(checkboxMatchWord);
    let label_for_checkboxMatchWord = document.createElement('label');
    label_for_checkboxMatchWord.htmlFor = 'DIALOG_FindAll_checkboxMatchWord';
    label_for_checkboxMatchWord.textContent = 'matchWord ';
    divOptions.appendChild(label_for_checkboxMatchWord);
    // TODO: The dialog body doesn't currently have an overflow scrollbar, so this will just clip if text goes offscreen due to...
    // ...the encompassing div having 'white-space: nowrap' style.
    // But this behavior is contrary to the ctrl+f. So I wanted to note it in some way with some immediacy before I continued.
    let spanNotes = document.createElement('span');
    spanNotes.id = 'DIALOG_FindAll_spanNotes';
    spanNotes.style.color = APP_colors.commentText;
    divOptions.appendChild(spanNotes);
    dialogBody.appendChild(divOptions);

    // TODO: Remove 'searchResultsDiv'? It is pointlessly wrapping.
    let searchResultsDiv = document.createElement('div');
    searchResultsDiv.id = 'DIALOG_FindAll_searchResultsDiv';
    const searchResultsDivHeightString = `calc(100% - ${2 * aaaApp.lineHeight}px - 2px)`;
    searchResultsDiv.style.height = searchResultsDivHeightString;
    searchResultsDiv.style.lineHeight = searchResultsDivHeightString;
    dialogBody.appendChild(searchResultsDiv);

    FindAll_treeViewComponent.initialize(searchResultsDiv, null);
}

export function DIALOG_FindAll_Delete() {
    let searchTextInput = document.getElementById('DIALOG_FindAll_searchTextInput');
    if (searchTextInput) {
        searchTextInput.removeEventListener('keydown', DIALOG_FindAll_searchTextInput_onkeydown);
    }
    
    let checkboxMatchWord = document.getElementById('DIALOG_FindAll_checkboxMatchWord');
    if (checkboxMatchWord) {
    	checkboxMatchWord.removeEventListener('change', DIALOG_FindAll_checkboxMatchWord_onchange);
    }

    if (FindAll_treeViewComponent) {
        FindAll_treeViewComponent.softDispose();
    }
}

async function DIALOG_FindAll_searchTextInput_onkeydown(event) {
    if (event.key === 'Enter') {
        let dialogBody = document.getElementById('DIALOG_body');
        if (!dialogBody) return;
        let searchResultsDiv = document.getElementById('DIALOG_FindAll_searchResultsDiv');
        if (!searchResultsDiv) return;
        let searchTextInput = document.getElementById('DIALOG_FindAll_searchTextInput');
        if (!searchTextInput) return;
        let spanNotes = document.getElementById('DIALOG_FindAll_spanNotes');
	    if (spanNotes) {
	        spanNotes.textContent = '';
	    }

        let search = searchTextInput.value;
        if (!search) {
            return;
        }

        let results = await window.myAPI.findAll(search, editor.FindAll_options_matchWord);
        FindAll_setData_causes_state_reset(results);
    }
}

function DIALOG_FindAll_checkboxMatchWord_onchange() {
	// for an onchange event, event.target might always be precise?
	let checkboxMatchWord = document.getElementById('DIALOG_FindAll_checkboxMatchWord');
    if (checkboxMatchWord) {
    	editor.FindAll_options_matchWord = checkboxMatchWord.checked;
    	let spanNotes = document.getElementById('DIALOG_FindAll_spanNotes');
	    if (spanNotes) {
	        spanNotes.textContent = 'NOTE: changing \'matchWord\' here does not re-do the search';
	    }
    }
}

export function DIALOG_Settings_Create() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;

    let buttonTheme = document.createElement('button');
    buttonTheme.id = 'SETTINGS_theme';
    buttonTheme.textContent = 'Theme';
    buttonTheme.addEventListener('click', DIALOG_buttonTheme_onclick);
    dialogBody.appendChild(buttonTheme);
    
    //const buttonVerifyLspTextAgainstEditorText = document.createElement('button');
    //buttonVerifyLspTextAgainstEditorText.id = 'SETTINGS_verifyLspTextAgainstEditorText';
    //buttonVerifyLspTextAgainstEditorText.textContent = 'VerifyLspTextAgainstEditorText';
    //buttonVerifyLspTextAgainstEditorText.addEventListener('click', DIALOG_buttonVerifyLspTextAgainstEditorText_onclick);
    //dialogBody.appendChild(buttonVerifyLspTextAgainstEditorText);

    let checkboxTrueTabsFalseSpaces = document.createElement('input');
    checkboxTrueTabsFalseSpaces.type = 'checkbox';
    checkboxTrueTabsFalseSpaces.id = 'SETTINGS_trueTabs_falseSpaces';
    checkboxTrueTabsFalseSpaces.checked = editor.settings_trueTabs_falseSpaces; // Optional: sets the initial state to checked
    checkboxTrueTabsFalseSpaces.addEventListener('change', DIALOG_checkboxTrueTabsFalseSpaces_onchange);
    dialogBody.appendChild(checkboxTrueTabsFalseSpaces);
	// -----------------------------------------------------------
    let label_for_checkboxTrueTabsFalseSpaces = document.createElement('label');
    label_for_checkboxTrueTabsFalseSpaces.htmlFor = 'SETTINGS_trueTabs_falseSpaces';
    label_for_checkboxTrueTabsFalseSpaces.textContent = 'trueTabs_falseSpaces';
    dialogBody.appendChild(label_for_checkboxTrueTabsFalseSpaces);
    
    let checkboxEditorDebugShowAdjacentCharacters = document.createElement('input');
    checkboxEditorDebugShowAdjacentCharacters.type = 'checkbox';
    checkboxEditorDebugShowAdjacentCharacters.id = 'SETTINGS_editorDebugShowAdjacentCharacters';
    checkboxEditorDebugShowAdjacentCharacters.checked = editor.settings_editorDebugShowAdjacentCharacters; // Optional: sets the initial state to checked
    checkboxEditorDebugShowAdjacentCharacters.addEventListener('change', DIALOG_checkboxEditorDebugShowAdjacentCharacters_onchange);
    dialogBody.appendChild(checkboxEditorDebugShowAdjacentCharacters);
	// -----------------------------------------------------------
    let label_for_checkboxEditorDebugShowAdjacentCharacters = document.createElement('label');
    label_for_checkboxEditorDebugShowAdjacentCharacters.htmlFor = 'SETTINGS_editorDebugShowAdjacentCharacters';
    label_for_checkboxEditorDebugShowAdjacentCharacters.textContent = 'editorDebugShowAdjacentCharacters';
    dialogBody.appendChild(label_for_checkboxEditorDebugShowAdjacentCharacters);
}

export function DIALOG_Settings_Delete() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;
    
    let buttonTheme = document.getElementById('SETTINGS_theme');
    if (buttonTheme) {
        buttonTheme.removeEventListener('click', DIALOG_buttonTheme_onclick);
    }

    let checkboxTrueTabsFalseSpaces = document.getElementById('SETTINGS_trueTabs_falseSpaces');
    if (checkboxTrueTabsFalseSpaces) {
        checkboxTrueTabsFalseSpaces.removeEventListener('change', DIALOG_checkboxTrueTabsFalseSpaces_onchange);
    }
    
    let checkboxEditorDebugShowAdjacentCharacters = document.getElementById('SETTINGS_editorDebugShowAdjacentCharacters');
    if (checkboxEditorDebugShowAdjacentCharacters) {
    	checkboxEditorDebugShowAdjacentCharacters.removeEventListener('change', DIALOG_checkboxEditorDebugShowAdjacentCharacters_onchange);
    }
}

function DIALOG_buttonTheme_onclick() {
    if (aaaApp.isDark) {
        aaaApp.isDark = false;
        set_colors_to_light();
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }
    else {
        aaaApp.isDark = true;
        set_colors_to_dark();
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
}

function DIALOG_buttonVerifyLspTextAgainstEditorText_onclick() {
    //window.myAPI.editorVerifyLspTextAgainstEditorText();
}

function DIALOG_checkboxTrueTabsFalseSpaces_onchange() {
    let checkboxTrueTabsFalseSpaces = document.getElementById('SETTINGS_trueTabs_falseSpaces');
    if (!checkboxTrueTabsFalseSpaces) return;

    EDI_finalizeEdit();
    editor.settings_trueTabs_falseSpaces = checkboxTrueTabsFalseSpaces.checked;
    if (editor.settings_trueTabs_falseSpaces) {
        EDI_on_tab_bytes = new Uint8Array(1);
        EDI_on_tab_bytes[0] = CONST_EDI_ASCII_TAB;
        editor.ontab_visualWidth_perCharacter = 4;
    }
    else {
        EDI_on_tab_bytes = new Uint8Array(4);
        EDI_on_tab_bytes[0] = CONST_EDI_ASCII_SPACE;
        EDI_on_tab_bytes[1] = CONST_EDI_ASCII_SPACE;
        EDI_on_tab_bytes[2] = CONST_EDI_ASCII_SPACE;
        EDI_on_tab_bytes[3] = CONST_EDI_ASCII_SPACE;
        editor.ontab_visualWidth_perCharacter = 1;
    }
}

function DIALOG_checkboxEditorDebugShowAdjacentCharacters_onchange() {
    let checkboxEditorDebugShowAdjacentCharacters = document.getElementById('SETTINGS_editorDebugShowAdjacentCharacters');
    if (!checkboxEditorDebugShowAdjacentCharacters) return;

    editor.settings_editorDebugShowAdjacentCharacters = checkboxEditorDebugShowAdjacentCharacters.checked;
    EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
}

export function DIALOG_DocumentSymbol_Create() {
}

export function DIALOG_DocumentSymbol_Delete() {
}

export function DIALOG_Debug_Create() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;

    const beforeDiv = document.createElement('div');
    beforeDiv.id = 'DEBUG_DIALOG_beforeDiv';
    beforeDiv.style.marginTop = aaaApp.lineHeightWithPx; // Dialog looks jank at the moment I'm gonna just do this so I can read the text
    beforeDiv.style.height = aaaApp.lineHeightWithPx;
    beforeDiv.appendChild(document.createTextNode('LISTENING'));

    const amongDiv = document.createElement('div');
    amongDiv.id = 'DEBUG_DIALOG_amongDiv';
    amongDiv.style.height = aaaApp.lineHeightWithPx;
    amongDiv.appendChild(document.createTextNode('LISTENING'));

    const afterDiv = document.createElement('div');
    afterDiv.id = 'DEBUG_DIALOG_afterDiv';
    afterDiv.style.height = aaaApp.lineHeightWithPx;
    afterDiv.appendChild(document.createTextNode('LISTENING'));

    dialogBody.appendChild(beforeDiv);
    dialogBody.appendChild(amongDiv);
    dialogBody.appendChild(afterDiv);
}

export function DIALOG_Debug_Delete() {
}

export function DIALOG_Debug_Refresh(customEditorGetNodesAdjacentToCursorFromLspRequestResponse) {
    const beforeDiv = document.getElementById('DEBUG_DIALOG_beforeDiv');
    const amongDiv = document.getElementById('DEBUG_DIALOG_amongDiv');
    const afterDiv = document.getElementById('DEBUG_DIALOG_afterDiv');

    let textNode = null;

    textNode = beforeDiv.firstChild;
    textNode.replaceData(0, textNode.length, `${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.Before.SyntaxKindString}\n\t${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.Before.Identifier}\n\t(${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.Before.PositionIndex})`);

    textNode = amongDiv.firstChild;
    textNode.replaceData(0, textNode.length, `${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.Among.SyntaxKindString}\n\t${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.Among.Identifier}\n\t(${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.Among.PositionIndex})`);

    textNode = afterDiv.firstChild;
    textNode.replaceData(0, textNode.length, `${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.After.SyntaxKindString}\n\t${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.After.Identifier}\n\t(${customEditorGetNodesAdjacentToCursorFromLspRequestResponse.After.PositionIndex})`);
}
