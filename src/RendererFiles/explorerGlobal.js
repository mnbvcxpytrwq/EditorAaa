import {
    TreeViewComponent,
    treeViewComponent_staticRunner,
} from './treeViewComponent.js'
import {
    MENU_MenuOption_factory,
    menuSet,
} from './menuGlobal.js'
import {set_shouldUseCSharpToSaveFileWhenPossible, sendTransaction_MessageKind_textDocument_didOpen} from './applicationRendererRoot.js'
import {EDI_state_setText_byteArray, EDI_toExtensionKind, EDI_onResize} from './editorGlobal_edit.js'
import {WIDGET_show} from './widgetGlobal.js'
import { APP_colors } from "./fieldBuffer.js"

/**
 * TODO: Only use a single menuOptionCut_object that is located in "MENU_" to reduce the chance of memory leaks due to a 'cut' that never gets
 * followed up with a paste or etc... then you have like 3 active menu cut objects sitting around eventually, you probably want them to overwrite eachother.
 * You'd need to track the source of the cut menu object though if you were to do this.
 */
let EXPLORER_menuOptionPaste_object = null;
let EXPLORER_ringBufferCache = null;

function EXPLORER_onMeasure() {
    if (EXPLORER_ringBufferCache === null || EXPLORER_ringBufferCache === undefined || EXPLORER_ringBufferCache.length !== EXPLORER_treeViewComponent.virtualCount) {
        EXPLORER_ringBufferCache = new Array(EXPLORER_treeViewComponent.virtualCount);
    }
}

class Explorer {
    constructor() {
        /**
         * TODO: This is approaching the point of being obsolete
         * 
         * 8 or the measured value
         */
        this.firstSpanWidthValue = 8;

        this.menuOptionX = 0;
        this.menuOptionY = 0;

        /** TODO: obsolete */
        this.itemHeightTotal = 0;

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorIndex = 0;

        this.virtualIndex_ofScrollTop = 0;

        /**
         * Hacky: Must initialize to a number other than 0 or else nothing renders.
         * 
         * TODO: This is no longer true because there is a function named 'forceFullscreen_renderScroll' so change this comment.
         */
        this.virtualCount = 1;

        this.unknownIdCounter = 1;

        this.lastReadNumber_scrollTop = 0;

        this.ringBufferIndexZero = 0;

        this.ringBuffer_length = 0;

        /** TODO: what height should this start at? applicationRendererRoot.ts will eventually run initialization logic that actually does the measuring. */
        this.itemHeightNumber = 20;

        this.boundingClientRect_left = 0;
        this.boundingClientRect_top = 0;

        this.show = 1;

        this.isRenderPending = false;
        this.isCheckingTrailingEdge = false;
        this.scrollIsFetchingData = false;
        this.boundingClientRect_isValid = false;

        this.visualWidth_ofLongestLine_inChUnits = 0;
    }
}

export const explorer = new Explorer();

/*
When collapse maybe you reset the length of the longest line or something

===

also need to update the width of the cursor to the largest width seen div thing so it visually looks correct
need to make sure the code does a min-width esque logic. Probably don't want the css but just for the code that sets the style to consider it for you avoids min-width overhead if exists?


NO ASYNC EVENTS
- higher likelihood of memory leaking PerformanceEventTiming due to inability for browser to clear buffer on time requiring manual clearing of the long term buffer.
*/

/**
 * If a TreeView contains the same "file" rendered as two separate "tree view nodes".
 * When you collapse such that one of those nodes is no longer part of the EXPLORER_treeViewComponent.dataLiteral
 * then the pathId will be removed from this map,
 * and that second node will proceed to render as unknown_{explorer.unknownIdCounter++}.
 * 
 * For this specific UI the behavior is intentional.
 * For a TreeView where showing the same "data" as two separate nodes at the same time is a reasonable use case,
 * one such way of handling this is to map the pathId to a { filename: string, links: int }.
 * 
 * The consumer of a TreeViewComponent has control over the expand/collapse logic,
 * and thus the consumer may decide to increment and decrement the links field in order to know when
 * all TreeView nodes of that data are no longer part of dataLiteral.
 */
const EXPLORER_pathIdToDisplayNameMap = new Map();

/**
 * @type {TreeViewComponent}
 */
const EXPLORER_treeViewComponent = new TreeViewComponent(
    16, treeViewComponent_staticRunner, EXPLORER_renderLines, EXPLORER_expandCollapseIconWasClicked, EXPLORER_dblClick_or_space_or_enter, EXPLORER_oncontextmenu, EXPLORER_onMeasure);
EXPLORER_treeViewComponent.initialize(document.getElementById('EXPLORER'), null);

function EXPLORER_setChosenDirectory(chosenDirectoryAbsolutePath, chosenDirectoryBasename, chosenDirectoryAbsolutePathId) {
    EXPLORER_pathIdToDisplayNameMap.clear();
    EXPLORER_treeViewComponent.clear();
    if (!chosenDirectoryAbsolutePath) return;

    EXPLORER_treeViewComponent.insert(EXPLORER_treeViewComponent.countAbstract, 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/, chosenDirectoryAbsolutePathId, 0);
    EXPLORER_pathIdToDisplayNameMap.set(chosenDirectoryAbsolutePathId, chosenDirectoryBasename);
    if (chosenDirectoryBasename.length > explorer.visualWidth_ofLongestLine_inChUnits) {
        explorer.visualWidth_ofLongestLine_inChUnits = chosenDirectoryBasename.length;
        EXPLORER_treeViewComponent.drawScrollBarWidthToThisPixelValue(explorer.visualWidth_ofLongestLine_inChUnits * EXPLORER_treeViewComponent.characterWidth);
    }
}

function EXPLORER_setChosenWorkspace(chooseWorkspaceResult) {
    EXPLORER_pathIdToDisplayNameMap.clear();
    EXPLORER_treeViewComponent.clear();
    if (!chooseWorkspaceResult.workspaceFileAbsolutePath) return;

    if (chooseWorkspaceResult.workspaceFileAbsolutePath === "C:\\Users\\hunte\\Repos\\New folder (8)\\EditorAaa.code-workspace") {
        // enable experimental behavior only if the path matches my own.
        // This is not 100% fool proof but for my temporary use case it is likely 100% secure
        // given the extremely small amount of people running the code i.e.: maybe I'm the only one that even runs this code I don't know.
        // Nevertheless for this sample size this statistically I imagine approaches 100% security.
        set_shouldUseCSharpToSaveFileWhenPossible(true);
    }

    for (let i = 0; i < chooseWorkspaceResult.directories.length; i++) {
        const directory = chooseWorkspaceResult.directories[i];
        EXPLORER_treeViewComponent.insert(EXPLORER_treeViewComponent.countAbstract, 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/, directory.id, 0);
        EXPLORER_pathIdToDisplayNameMap.set(directory.id, directory.basename);
        if (directory.basename.length > explorer.visualWidth_ofLongestLine_inChUnits) {
            explorer.visualWidth_ofLongestLine_inChUnits = directory.basename.length;
            EXPLORER_treeViewComponent.drawScrollBarWidthToThisPixelValue(explorer.visualWidth_ofLongestLine_inChUnits * EXPLORER_treeViewComponent.characterWidth);
        }
    }
}

function EXPLORER_renderLines(lineIndexLower, lineIndexUpper, ringBufferIndex, decodingBoundLower, decodingBoundUpper) {

    const ctx = EXPLORER_treeViewComponent.canvasContext2d;
    ctx.clearRect(0, 0, EXPLORER_treeViewComponent.canvas.width, EXPLORER_treeViewComponent.canvas.height);
    
    let vertical = 0;

    // TODO: All of the below 'Optimization heuristic goal' suck. Cause you have no idea whether they're actually effective you're just hearing rumors and then throwing them all at a dart board and hoping everything works out.
    // ^ I'm specifically referencing my blind application of them en masse like a fool without ever having confirmed that they are improvements let alone meaningful ones.
    // ^ for absolute clarification I'm not saying the heuristics suck I'm saying I suck cause I never once validated their usefulness.
    //
    /** Optimization heuristic goal: assumedly reduce reference chasing by creating a const reference to fields that are frequently accessed via a member access on a reference variable. It is rumored that this permits loop optimization. */
    /** Optimization heuristic goal: similarly^ assumedly improve caching by explicitly telling the code generator that the reference which 'foo' points to "will not change". In garbage collection, when defragmenting the heap every reference to an object that was repositioned needs to have its reference updated to point to the new location of the object, so I'm not quite sure how this works out idk. It is rumored that this permits loop optimization. */
    const VIRTUAL_COUNT = EXPLORER_treeViewComponent.virtualCount;
    const COUNT_ABSTRACT = EXPLORER_treeViewComponent.countAbstract;
    const LINE_CACHE = EXPLORER_ringBufferCache;
    const ITEM_HEIGHT_NUMBER = EXPLORER_treeViewComponent.itemHeightNumber;
    /** Optimization heuristic goal: This one specifically is to bring this global scope variable into local scope rather than relying on caching alone this ought to signal further the importance of the variable being cached. It is rumored that this permits loop optimization. */
    const STRINGS_MAP_BY_PATH_ID = EXPLORER_pathIdToDisplayNameMap;

    /** Optimization heuristic goal: make the upper bound a constant, and do not modify 'i' within the loop, have not measured if this is truly impactful. It is rumored that this permits loop optimization. */
    const LINE_INDEX_UPPER = lineIndexUpper;

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#3f7581'; // Solid cursor accent color
    const cursorLine = EXPLORER_treeViewComponent.cursorIndex;
    if (cursorLine >= lineIndexLower && cursorLine < lineIndexUpper) {
        const cursorY = (cursorLine - lineIndexLower) * EXPLORER_treeViewComponent.itemHeightNumber;
        ctx.fillRect(0, cursorY, EXPLORER_treeViewComponent.canvas.width, EXPLORER_treeViewComponent.itemHeightNumber);
    }

    if (EXPLORER_menuOptionPaste_object !== null && EXPLORER_menuOptionPaste_object !== undefined) {
        if (EXPLORER_menuOptionPaste_object.indexItem !== null && EXPLORER_menuOptionPaste_object.indexItem !== undefined) {
            if (lineIndexLower <= EXPLORER_menuOptionPaste_object.indexItem && LINE_INDEX_UPPER > EXPLORER_menuOptionPaste_object.indexItem) {
                ctx.fillStyle = '#845a17';
                const y = (EXPLORER_menuOptionPaste_object.indexItem - lineIndexLower) * EXPLORER_treeViewComponent.itemHeightNumber;
                ctx.fillRect(0, y, EXPLORER_treeViewComponent.canvas.width, EXPLORER_treeViewComponent.itemHeightNumber);
            }
        }
    }

    ctx.fillStyle = APP_colors.standardText;

    let previousDepthString = '';
    let previousDepthStringDepth = 0;

    for (let i = lineIndexLower; i < LINE_INDEX_UPPER; i++) {
        ringBufferIndex++;
        if (ringBufferIndex >= VIRTUAL_COUNT) {
            ringBufferIndex -= VIRTUAL_COUNT;
        }

        if (i >= decodingBoundLower && i < decodingBoundUpper) {
            if (i < COUNT_ABSTRACT) {
                EXPLORER_treeViewComponent.getElementAt(i);
                const key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
                const depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
                const nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

                let name = STRINGS_MAP_BY_PATH_ID.get(key);
                if (name === null || name === undefined) {
                    name = `unknown_${explorer.unknownIdCounter++}`;
                    STRINGS_MAP_BY_PATH_ID.set(key, name);
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
                    previousDepthString = ' '.repeat(depth * EXPLORER_treeViewComponent.offsetPerDepthInCharacterWidths);
                    previousDepthStringDepth = depth;
                }
                LINE_CACHE[ringBufferIndex] = previousDepthString + chevronRepresentation + name;
            }
            else {
                LINE_CACHE[ringBufferIndex] = '~';
            }
        }

        ctx.fillText(LINE_CACHE[ringBufferIndex], 0, vertical); // There's a max width argument in the fillText?
        vertical += ITEM_HEIGHT_NUMBER;
    }
}

async function EXPLORER_expandCollapseIconWasClicked(indexItem, ringBufferIndexItem) {
    EXPLORER_treeViewComponent.getElementAt(indexItem);
    const key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
    const depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    const nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

    if (nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/) {
        EXPLORER_treeViewComponent.setNodeKind(indexItem, 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/);

        const childFilesystemEntries = await window.myAPI.getFilesystemEntries_argumentIsId(key);
        const insertionCount = childFilesystemEntries.length;
        if (insertionCount === 0) { EXPLORER_treeViewComponent.forceFullscreen_renderScroll(); return; }

        // Assuming the longestLine's depth was equal to that of the incoming children,
        // what would the length of the name shown on screen have been equal to?
        //
        let length_estimated_threshold = explorer.visualWidth_ofLongestLine_inChUnits - depth;
        let longestLine = explorer.visualWidth_ofLongestLine_inChUnits;

        for (let i = 0; i < insertionCount; i++) {
            const entry = childFilesystemEntries[i];
            const nodeKind = entry.isDirectory
                ? 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/
                : 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;
            // TODO: Insert range, or at the least 'pre-emptively' resize the list so that it fits each insertion without resizing per insertion.
            EXPLORER_treeViewComponent.insert(indexItem + 1 + i, nodeKind, entry.id, depth + 1);
            EXPLORER_pathIdToDisplayNameMap.set(entry.id, entry.basename);
            if (entry.basename.length > length_estimated_threshold) {
                length_estimated_threshold = entry.basename.length;
                longestLine = entry.basename.length + depth;
            }
        }

        if (longestLine > explorer.visualWidth_ofLongestLine_inChUnits) {
            explorer.visualWidth_ofLongestLine_inChUnits = longestLine;
            EXPLORER_treeViewComponent.drawScrollBarWidthToThisPixelValue(explorer.visualWidth_ofLongestLine_inChUnits * EXPLORER_treeViewComponent.characterWidth);
        }

        if (EXPLORER_menuOptionPaste_object !== null && EXPLORER_menuOptionPaste_object !== undefined) {
            if (EXPLORER_menuOptionPaste_object.indexItem === null || EXPLORER_menuOptionPaste_object.indexItem === undefined) {
                if (EXPLORER_menuOptionPaste_object.parentPathId === key) {
                    EXPLORER_findCutTreeViewNodeAmongChildren(indexItem + 1, insertionCount);
                }
            }
            else if (EXPLORER_menuOptionPaste_object.indexItem >= indexItem + 1) {
                EXPLORER_menuOptionPaste_object.indexItem += insertionCount;
            }
        }

        EXPLORER_treeViewComponent.drawScrollbarHeight();
        EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
    }
    else if (nodeKind === 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/) {
        EXPLORER_treeViewComponent.setNodeKind(indexItem, 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/);

        const startIndex = indexItem + 1;

        let countChildren = 0;
        for (let i = startIndex; i < EXPLORER_treeViewComponent.countAbstract; i++) {
            // If currentDepth < ithElementDepth; // then current is a parent of ithElement.
            if (depth < EXPLORER_treeViewComponent.getDepth(i)) {
                EXPLORER_pathIdToDisplayNameMap.delete(EXPLORER_treeViewComponent.getKey(i));
                countChildren++;
            }
            else {
                break;
            }
        }

        if (countChildren === 0) { EXPLORER_treeViewComponent.forceFullscreen_renderScroll(); return; }

        EXPLORER_treeViewComponent.removeAt(startIndex, countChildren);

        if (EXPLORER_menuOptionPaste_object !== null && EXPLORER_menuOptionPaste_object !== undefined) {
            if (EXPLORER_menuOptionPaste_object.indexItem !== null && EXPLORER_menuOptionPaste_object.indexItem !== undefined) {
                if (startIndex <= EXPLORER_menuOptionPaste_object.indexItem && startIndex + countChildren > EXPLORER_menuOptionPaste_object.indexItem) {
                    EXPLORER_menuOptionPaste_object.indexItem = null;
                }
                else if (startIndex < EXPLORER_menuOptionPaste_object.indexItem) { // TODO: Is this else if redundant can it just be an else I just don't have the energy to think about it right now
                    EXPLORER_menuOptionPaste_object.indexItem -= countChildren;
                }
            }
        }
        
        EXPLORER_treeViewComponent.drawScrollbarHeight();
        EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
    }
}

function EXPLORER_findCutTreeViewNodeAmongChildren(startIndex, insertionCount) {
    const upperLimit = startIndex + insertionCount;
    let pathId = EXPLORER_menuOptionPaste_object.pathId;
    for (let i = startIndex; i < upperLimit; i++) {
        if (EXPLORER_treeViewComponent.getKey(i) === pathId) {
            EXPLORER_menuOptionPaste_object.indexItem = i;
            break;
        }
    }

    // TODO: If not found clear the 'EXPLORER_menuOptionPaste_object' entirely?
}

async function EXPLORER_dblClick_or_space_or_enter(eventKey, indexItem, ringBufferIndexItem) {
    EXPLORER_treeViewComponent.getElementAt(indexItem);
    let key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
    let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

    if (nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/) {
        // TODO: open the file by id in one ipc call
        const entry = await window.myAPI.getFilesystemEntryById(key);
        if (!entry) return;

        if (!entry.isDirectory) {
            // TODO: eventKey!==' ' feels a bit awkward. (I don't think dblClick has a eventKey is the issue but if you check !space...?)
            await EXPLORER_openInEditor(entry.absolutePath, /*shouldFocus*/ eventKey!==' ');
        }
    }
}

function EXPLORER_oncontextmenu(indexItem, event_button, event_clientX, event_clientY, relativeIndex) {

    if (EXPLORER_treeViewComponent.countAbstract === 0) {
        return;
    }

    let optionList = [
        MENU_MenuOption_factory(2 /*CommandKind.Copy: 2*/, 'Copy'),
        MENU_MenuOption_factory(3 /*CommandKind.CopyAbsolutePath: 3*/, 'Copy Absolute Path'),
    ];

    // TODO: !!!! You might need to be careful with async and the TreeView_pooledNode; I'm not certain whether you do or don't have to be careful, and I don't feel like looking into it at the moment.
    EXPLORER_treeViewComponent.getElementAt(indexItem);
    let key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
    let depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

    let target = {
        id: key,
        depth: depth,
        nodeKind: nodeKind,
        indexItem: indexItem,
        divRelativeIndex: relativeIndex,
    };

    let left = 0;
    let top = 0;

    if (event_button === 2) {
        EXPLORER_addSpecificMenuOptionsForTarget(optionList, target);
        left = explorer.menuOptionX = event_clientX;
        top = explorer.menuOptionY = event_clientY;
    }
    else {
        EXPLORER_addSpecificMenuOptionsForTarget(optionList, target);
        left = explorer.menuOptionX=explorer.boundingClientRect_left;
        top = explorer.menuOptionY = (explorer.boundingClientRect_top + ((explorer.cursorIndex + 1) * explorer.itemHeightNumber) - explorer.lastReadNumber_scrollTop);
    }

    menuSet(optionList, left, top, EXPLORER_MenuOnClick, target, /*elementToFocusOnCompleted*/ null, /*disableFocusOnCompleted*/ false, /*index*/ 0);
}

/**
 * This method should only pertain itself with the contents of the flat list, any UI changes will be made based on the returned 'changeCount'
 * which is interpreted as one for the item itself, plus the count of any children that were recursively removed.
 * 
 * TODO: Include the word "directory"?
 * 
 * @param {*} indexItem 
 * @returns 
 */
function EXPLORER_removeFromNodeList(indexItem) {
    EXPLORER_treeViewComponent.getElementAt(indexItem);
    let key = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_key;
    let depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;

    if (nodeKind === 3 /*TreeViewNodeKind.NOTisExpandable_isExpanded: 3*/) {
        alert("TODO: if (nodeKind === ...TreeViewNodeKind.NOTisExpandable_isExpanded())");
        return;
    }

    EXPLORER_pathIdToDisplayNameMap.delete(key);

    let countChildren = 0;

    if (nodeKind === 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/ || nodeKind === 3 /*TreeViewNodeKind.NOTisExpandable_isExpanded: 3*/) {
        for (let i = indexItem + 1; i < EXPLORER_treeViewComponent.countAbstract; i++) {
            // If currentDepth < ithElementDepth; then current is a parent of ithElement.
            if (depth < EXPLORER_treeViewComponent.getDepth(i)) {
                EXPLORER_pathIdToDisplayNameMap.delete(EXPLORER_treeViewComponent.getKey(i));
                countChildren++;
            }
            else {
                break;
            }
        }
    }

    EXPLORER_treeViewComponent.removeAt(indexItem, 1 + countChildren);
    return 1 + countChildren;
}

/** TODO: any usage of this needs to respect the actual zeroth UI div not the literal. */
function EXPLORER_setNodeListEntryId(indexItem, pathId) {
    EXPLORER_treeViewComponent.setKey(indexItem, pathId);
}

function EXPLORER_addSpecificMenuOptionsForTarget(optionList, target) {
    if (!target) return;

    // check the "text icon": { '-', '+', '' }
    if (target.nodeKind === 1 /*TreeViewNodeKind.isExpandable_isExpanded: 1*/ ||
        target.nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/) {
        
        // Directory
        optionList.push(MENU_MenuOption_factory(7 /*CommandKind.NewFile_File: 7*/, 'NewFile'));
        optionList.push(MENU_MenuOption_factory(6 /*CommandKind.NewFile_Directory: 6*/, 'NewDirectory'));
        optionList.push(MENU_MenuOption_factory(8 /*CommandKind.DeleteFile_Directory: 8*/, 'Delete'));
        optionList.push(MENU_MenuOption_factory(10 /*CommandKind.RenameFile_Directory: 10*/, 'Rename'));
        optionList.push(MENU_MenuOption_factory(5 /*CommandKind.Paste: 5*/, 'Paste'));
        optionList.push(MENU_MenuOption_factory(4 /*CommandKind.Cut: 4*/, 'Cut'));
    }
    else {
        // File
        optionList.push(MENU_MenuOption_factory(9 /*CommandKind.DeleteFile_File: 9*/, 'Delete'));
        optionList.push(MENU_MenuOption_factory(11 /*CommandKind.RenameFile_File: 11*/, 'Rename'));
        optionList.push(MENU_MenuOption_factory(4 /*CommandKind.Cut: 4*/, 'Cut'));
    }
}

// function EXPLORER_init
// V8 can optimize away these initialization statements that exist at the module scope but not an "initialization function"
const EXPLORER_pickFolderOrWorkspaceButton = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
if (EXPLORER_pickFolderOrWorkspaceButton) { EXPLORER_pickFolderOrWorkspaceButton.addEventListener('click', EXPLORER_pickFolderOrWorkspaceButton_onClick); }
//
let toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
toggleShowExplorerButton.checked = explorer.show;
toggleShowExplorerButton.addEventListener('click', toggleShowExplorerButton_onClick);

function toggleShowExplorerButton_onClick() {
    // TODO: Will shadowing 'toggleShowExplorerButton' with a declaration of the same name in here cause any oddities in relation to app long garbage collection overhead....
    // ...presumably the answer is 99.999% no but I can't bear to deal with this right now, thus the variable name 'avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton'.
    let avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
    if (avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton) {
        EXPLORER_setShow(avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton.checked);
    }
}

async function EXPLORER_pickFolderOrWorkspaceButton_onClick() {
    const EXPLORER_pickFolderOrWorkspaceButton = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
    let optionList = [
        MENU_MenuOption_factory(13 /*CommandKind.SelectFolder: 13*/, 'Folder'),
        MENU_MenuOption_factory(14 /*CommandKind.SelectWorkspace: 14*/, 'Workspace'),
    ];
    let boundingClientRect = EXPLORER_pickFolderOrWorkspaceButton.getBoundingClientRect();
    menuSet(optionList, boundingClientRect.left, boundingClientRect.top + boundingClientRect.height, EXPLORER_pickFolderOrWorkspaceButton_MenuOnClick, /*target*/ null, /*elementToFocusOnCompleted*/ null, /*disableFocusOnCompleted*/ false, /*index*/ 0);
}

/**
Hiding an element's visibility rather than removing the HTML has a cost associated with it.
If a UI piece isn't integral to the app, I wouldn't even transitionally use this as a solution
because it could "slip through the cracks" and never get optimized.

That being said, the explorer in this app IS integral, so I'll go down this route to start off.

...more details involved but I'm thinking and deciding.
*/
function EXPLORER_setShow(shouldShow) {
    const EXPLORER_Element = document.getElementById('EXPLORER');
    if (!EXPLORER_Element) return;

	if (shouldShow && !explorer.show) {
		let editorHackElement = document.getElementById('EDI_hack');
		EXPLORER_Element.style.width = '200px';
		EXPLORER_Element.style.visibility = '';
		editorHackElement.style.width = 'calc(100% - 200px)';
		explorer.show = shouldShow;
		let toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
		toggleShowExplorerButton.checked = explorer.show;
		EDI_onResize();
	}
	else if (!shouldShow && explorer.show) {
		// !show is redundant, but exists for readability.
		let editorHackElement = document.getElementById('EDI_hack');
		EXPLORER_Element.style.width = '0px';
		EXPLORER_Element.style.visibility = 'hidden';
		editorHackElement.style.width = '100%';
		explorer.show = shouldShow;
		let toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
		toggleShowExplorerButton.checked = explorer.show;
		EDI_onResize();
	}
}

export async function EXPLORER_openInEditor(absolutePath, shouldFocus) {
    const itHasBom = await window.myAPI.editorReadAllText_byteArray(absolutePath);

    if (!itHasBom.paddedUint8Array) {
        return;
    }

    EDI_state_setText_byteArray(
        itHasBom.paddedUint8Array,
        itHasBom.textByteLength,
        itHasBom.fileStartsWithBom,
        /*textSourceIdentifier*/ absolutePath,
        /*FORMATTED_textSourceIdentifier*/ itHasBom.formattedAbsolutePath,
        /*extensionKind*/ EDI_toExtensionKind(itHasBom.extension),
        itHasBom.lineEndString,
        itHasBom.lineEndCount);

    if (shouldFocus) {
        let editor = document.getElementById('EDITOR_inner_container');
        if (editor) {
            editor.focus();
        }
    }

    sendTransaction_MessageKind_textDocument_didOpen(itHasBom.formattedAbsolutePath);
}

/**
 * 
 * @param {*} isCancelled 
 * @param {MenuOption} menuOption 
 * @param {*} request 
 * @returns 
 */
async function EXPLORER_pickFolderOrWorkspaceButton_MenuOnClick(isCancelled, menuOption, request) {
    if (isCancelled || !menuOption) { return; }
    
    const commandKind = menuOption.commandKind;
    if (!commandKind) { return; }

    switch (commandKind) {
        case 13 /*CommandKind.SelectFolder: 13*/:
            {
                const EXPLORER_Element = document.getElementById('EXPLORER');
                if (!EXPLORER_Element) return;
                const EXPLORER_PickFolder = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
                if (!EXPLORER_PickFolder) return;
    
                // { basename: basename, openedDirectory: openedDirectory }
                let chooseDirectoryResult = await window.myAPI.chooseDirectory();
                if (chooseDirectoryResult.canceled) return;
    
                EXPLORER_setShow(true);
                let chosenDirectoryAbsolutePath = chooseDirectoryResult.openedDirectory;
                EXPLORER_PickFolder.textContent = chooseDirectoryResult.basename;
                EXPLORER_PickFolder.title = chosenDirectoryAbsolutePath;
    
                EXPLORER_setChosenDirectory(chosenDirectoryAbsolutePath, chooseDirectoryResult.basename, chooseDirectoryResult.id);
                EXPLORER_treeViewComponent.resetTheUi();
            }
            break;
        case 14 /*CommandKind.SelectWorkspace: 14*/:
            {
                const EXPLORER_Element = document.getElementById('EXPLORER');
                if (!EXPLORER_Element) return;
                
                let chooseWorkspaceResult = await window.myAPI.chooseWorkspace();
                if (chooseWorkspaceResult.canceled) return;
    
                EXPLORER_setShow(true);
    
                let pickWorkspaceButton = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
                pickWorkspaceButton.textContent = chooseWorkspaceResult.workspaceFileNameWithoutExtension;
                pickWorkspaceButton.title = chooseWorkspaceResult.workspaceFileAbsolutePath;
    
                EXPLORER_setChosenWorkspace(chooseWorkspaceResult);
                EXPLORER_treeViewComponent.resetTheUi();
            }
            break;
    }
}

async function EXPLORER_MenuOnClick(isCancelled, menuOption, menuRequest) {
    if (isCancelled || !menuOption) { return; }
    
    const commandKind = menuOption.commandKind;
    if (!commandKind) { return; }

    if (commandKind !== 2 /*CommandKind.Copy: 2*/ && commandKind !== 4 /*CommandKind.Cut: 4*/ && commandKind !== 5 /*CommandKind.Paste: 5*/) {
        EXPLORER_menuOptionPaste_object = null;
    }

    if (!menuRequest.target.id) return;

    const entry = await window.myAPI.getFilesystemEntryById(menuRequest.target.id);
    if (!entry) return;

    switch (commandKind) {
        case 2 /*CommandKind.Copy: 2*/:
            EXPLORER_menuOptionPaste_object = {
                id: null, // This id is only used when doing a cut->paste in order to determine whether the source file matches and should be deleted. If id is null then it was a copy->paste
                basename: entry.basename,
                indexItem: menuRequest.target.indexItem,
                divRelativeIndex: menuRequest.target.divRelativeIndex,
                pathId: menuRequest.target.id, // pathId tracks whether the source of an absolute path came from the main process by checking a sqlite database. Here is used to double check that the tree view node which was cut had not changed since the cut event occurred.
                parentPathId: null // this is used to track whether the cut node is visible. For copy, this is just set to null.
                // TODO: ^ every possible way to edit the treeView needs to iterated over with respect to the target being the cut node's parent.
            };
            await window.myAPI.setClipboard('file:///' + entry.absolutePath);
            break;
        case 4 /*CommandKind.Cut: 4*/:
            let parentPathId = null;
            let parentItemIndex = EXPLORER_treeViewComponent.getParentItemIndex(menuRequest.target.indexItem);
            if (parentItemIndex !== -1) {
                parentPathId = EXPLORER_treeViewComponent.getKey(parentItemIndex);
            }
            const text = 'file:///' + entry.absolutePath; // TODO: id: text????... I see id is the absolute path maybe that is ultimately the final source of truth and is better than pathId? I'm not sure.
            EXPLORER_menuOptionPaste_object = {
                id: text,
                basename: entry.basename,
                indexItem: menuRequest.target.indexItem,
                divRelativeIndex: menuRequest.target.divRelativeIndex,
                pathId: menuRequest.target.id, // pathId tracks whether the source of an absolute path came from the main process by checking a sqlite database. Here is used to double check that the tree view node which was cut had not changed since the cut event occurred.
                parentPathId: parentPathId // this is used to track whether the cut node is visible. For copy, this is just set to null.
                // TODO: ^ every possible way to edit the treeView needs to iterated over with respect to the target being the cut node's parent.
                // TODO: Consider a root tree view node, I believe this will work regardless
            };
            EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
            await window.myAPI.setClipboard(text);
            break;
        case 3 /*CommandKind.CopyAbsolutePath: 3*/:
            await window.myAPI.setClipboard(entry.absolutePath);
            break;
        case 5 /*CommandKind.Paste: 5*/:
            await CommandKind_Paste_MenuOnClick_Paste(entry, menuRequest);
            break;
        case 6 /*CommandKind.NewFile_Directory: 6*/:
            await WIDGET_show(1 /*WidgetKind.InputText: 1*/, explorer.menuOptionX, explorer.menuOptionY, 'filename', entry, menuRequest.target, menuRequest.elementToFocusOnCompleted, false, NewFile_Directory_WIDGET_InputText_callback);
            break;
        case 7 /*CommandKind.NewFile_File: 7*/:
            await WIDGET_show(1 /*WidgetKind.InputText: 1*/, explorer.menuOptionX, explorer.menuOptionY, 'filename', entry, menuRequest.target, menuRequest.elementToFocusOnCompleted, false, NewFile_File_WIDGET_InputText_callback);
            break;
        case 8 /*CommandKind.DeleteFile_Directory: 8*/:
            await WIDGET_show(2 /*WidgetKind.YesCancel: 2*/, explorer.menuOptionX, explorer.menuOptionY, 'delete ' + entry.basename, entry, menuRequest.target, menuRequest.elementToFocusOnCompleted, false, DeleteFile_Directory_YesCancel_callback);
            break;
        case 9 /*CommandKind.DeleteFile_File: 9*/:
            await WIDGET_show(2 /*WidgetKind.YesCancel: 2*/, explorer.menuOptionX, explorer.menuOptionY, 'delete ' + entry.basename, entry, menuRequest.target, menuRequest.elementToFocusOnCompleted, false, DeleteFile_File_YesCancel_callback);
            break;
        case 10 /*CommandKind.RenameFile_Directory: 10*/:
            await WIDGET_show(1 /*WidgetKind.InputText: 1*/, explorer.menuOptionX, explorer.menuOptionY, 'rename', entry.basename, {MENU_target:menuRequest.target, entry:entry}, menuRequest.elementToFocusOnCompleted, false, RenameFile_Directory_InputText_callback);
            break;
        case 11 /*CommandKind.RenameFile_File: 11*/:
            // TODO: Maybe the only difference between the _Directory and _File cases for each ..._... is the bool for isDirectory but I'm exhausted and I cannot reduce the code duplication here because my head doesn't function.
            await WIDGET_show(1 /*WidgetKind.InputText: 1*/, explorer.menuOptionX, explorer.menuOptionY, 'rename', entry.basename, {MENU_target: menuRequest.target, entry: entry}, menuRequest.elementToFocusOnCompleted, false, RenameFile_File_InputText_callback);
            break;
    }
}

async function CommandKind_Paste_MenuOnClick_Paste(entry, menuRequest) {
    let local_EXPLORER_menuOptionPaste_object = EXPLORER_menuOptionPaste_object;
    EXPLORER_menuOptionPaste_object = null;
    if (local_EXPLORER_menuOptionPaste_object === null || local_EXPLORER_menuOptionPaste_object === undefined) { return; }

    EXPLORER_treeViewComponent.getElementAt(menuRequest.target.indexItem);
    let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
    let depthOfTheParent = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    let destinationIsCollapsed = nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/ || nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

    const pasteResult = await window.myAPI.pasteClipboardAbsolutePathToDirectory(entry.absolutePath, local_EXPLORER_menuOptionPaste_object.id);
    if (!pasteResult.success) { return; }

    // TODO: I belive this final paste logic that comes after this comment and within this scope is extremely similar to the new file logic...

    if (pasteResult.isDirectory) {
        nodeKind = 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/;
    }
    else {
        nodeKind = 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;
    }

    let theUiChanged = false;

    let someIndex = menuRequest.target.indexItem + 1;

    // TODO: What if you collapse in the other direction?

    if (!destinationIsCollapsed) {
        theUiChanged = true;

        let targetDepth = depthOfTheParent + 1;
        // 'someIndex' variable declared outside if statement so accessible

        // TODO: 'i_targetDepth' is a bad variable name, you're looping a minimum of until 'pasteResult.indexOf' and each loop you check
        // whether that sibling is expanded, if so you skip all the children of the sibling.
        //
        for (let i_targetDepth = 0; i_targetDepth < pasteResult.indexOf; i_targetDepth++) {
            EXPLORER_treeViewComponent.getElementAt(someIndex);
            let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
            let isCollapsed = nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/ || nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

            let d_of_presumed_correct_depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
            if (d_of_presumed_correct_depth !== targetDepth) {
                // Validate the target you paste into's child count
                break;
            }

            someIndex++;

            if (!isCollapsed) {
                while (someIndex < EXPLORER_treeViewComponent.countAbstract) {
                    let d_of_perhaps_too_large_depth = EXPLORER_treeViewComponent.getDepth(someIndex);
                    if (d_of_perhaps_too_large_depth > targetDepth) {
                        someIndex++;
                    }
                    else {
                        break;
                    }
                    // TODO: Check if depth is less than targetDepth? This would only happen if the tree view were somehow in an incorrect state.
                }
            }

            // TODO: You're missing a 'someIndex < EXPLORER_treeViewComponent.countAbstract' check for after the while loop.
        }

        EXPLORER_treeViewComponent.insert(someIndex, nodeKind, pasteResult.pathId, menuRequest.target.depth + 1);
        EXPLORER_pathIdToDisplayNameMap.set(pasteResult.pathId, local_EXPLORER_menuOptionPaste_object.basename);
    }

    if (pasteResult.sourceFileWasDeleted && local_EXPLORER_menuOptionPaste_object.indexItem !== null && local_EXPLORER_menuOptionPaste_object.indexItem !== undefined) {
        // ^when the cut node is removed from dataLiteral due to a "collapse of an ancestor", the 'EXPLORER_menuOptionPaste_object.indexItem' is set to null.
        // 
        // Furthermore, given the current simplistic expand-collase implementation that doesn't remember the expand-collapse state of the children when removing them from the dataLiteral due to a "collapse of an ancestor":
        // that only 'parentPathId' is needed to determine whether the cut node came back into view.
        // You determine this by checking whether the expand-collapse event node target's pathId is equal to 'EXPLORER_menuOptionPaste_object.parentPathId'
        // if so you set the 'EXPLORER_menuOptionPaste_object.indexItem' during the event.
        //
        // for clarification you use 'parentPathId' only when expanding
        // the collapse needs to be relative to a collapse of ANY ancestor so you check the intersection

        let indexItem = local_EXPLORER_menuOptionPaste_object.indexItem;

        // I think this says "if the pasted node's index comes prior to that of the cut node then the cut node needs to be given an offset of '+1' from the original position."
        if (someIndex <= indexItem) {
            indexItem += 1;
        }

        if (EXPLORER_treeViewComponent.getKey(indexItem) === local_EXPLORER_menuOptionPaste_object.pathId) {
            // This can happen but only if the user modifies the TreeView state without doing so through a menu option.
            // For example, if you cut a treeViewNode and then collapse its parent.
            // Some other treeViewNode may now exist at that index within treeViewComponent.dataLiteral.
            // dataLiteral tracks the treeViewNodes that are possibly visible not every file on the operating system.
            // so if you cut then collapse you still will delete the file on the OS side just that there is nothing to do on the UI side cause the node isn't possibly visible.

            theUiChanged = true;

            if (pasteResult.isDirectory) {
                let countChanges = EXPLORER_removeFromNodeList(indexItem);
            }
            else {
                EXPLORER_treeViewComponent.removeAt(indexItem, 1);
            }
        }
    }

    if (theUiChanged) {
        EXPLORER_treeViewComponent.drawScrollbarHeight();
        EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
    }
}

async function NewFile_Directory_WIDGET_InputText_callback(widgetResult) {
    if (widgetResult.isCancelled) return;

    const entry = widgetResult.request.value;
    const target = widgetResult.request.target;

    EXPLORER_treeViewComponent.getElementAt(target.indexItem);
    let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
    let depthOfTheParent = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    let isCollapsed = nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/ || nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

    const newFileResult = await window.myAPI.newFile(entry.absolutePath, widgetResult.resultData, /*isDirectory*/ true);
    if (!newFileResult.success) { return; }

    // TODO: I belive this final new directory logic that comes after this comment and within this scope is 1 to 1 an exact duplication of the new file logic...
    
    nodeKind = 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/;

    if (!isCollapsed) {

        let targetDepth = depthOfTheParent + 1;
        let someIndex = target.indexItem + 1;

        // TODO: 'i_targetDepth' is a bad variable name, you're looping a minimum of until 'newFileResult.indexOf' and each loop you check
        // whether that sibling is expanded, if so you skip all the children of the sibling.
        //
        for (let i_targetDepth = 0; i_targetDepth < newFileResult.indexOf; i_targetDepth++) {
            EXPLORER_treeViewComponent.getElementAt(someIndex);
            let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
            let isCollapsed = nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/ || nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

            let d_of_presumed_correct_depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
            if (d_of_presumed_correct_depth !== targetDepth) {
                // Validate the target you paste into's child count
                break;
            }

            someIndex++;

            if (!isCollapsed) {
                while (someIndex < EXPLORER_treeViewComponent.countAbstract) {
                    let d_of_perhaps_too_large_depth = EXPLORER_treeViewComponent.getDepth(someIndex);
                    if (d_of_perhaps_too_large_depth > targetDepth) {
                        someIndex++;
                    }
                    else {
                        break;
                    }
                    // TODO: Check if depth is less than targetDepth? This would only happen if the tree view were somehow in an incorrect state.
                }
            }

            // TODO: You're missing a 'someIndex < EXPLORER_treeViewComponent.countAbstract' check for after the while loop.
        }

        EXPLORER_treeViewComponent.insert(someIndex, nodeKind, newFileResult.pathId, target.depth + 1);
        EXPLORER_pathIdToDisplayNameMap.set(newFileResult.pathId, widgetResult.resultData);
        if (widgetResult.resultData.length > explorer.visualWidth_ofLongestLine_inChUnits) {
            explorer.visualWidth_ofLongestLine_inChUnits = widgetResult.resultData.length;
            EXPLORER_treeViewComponent.drawScrollBarWidthToThisPixelValue(explorer.visualWidth_ofLongestLine_inChUnits * EXPLORER_treeViewComponent.characterWidth);
        }
        EXPLORER_treeViewComponent.drawScrollbarHeight();
        EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
    }
}

async function NewFile_File_WIDGET_InputText_callback(widgetResult) {
    if (widgetResult.isCancelled) return;

    const entry = widgetResult.request.value;
    const target = widgetResult.request.target;
    
    EXPLORER_treeViewComponent.getElementAt(target.indexItem);
    let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
    let depthOfTheParent = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
    let isCollapsed = nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/ || nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

    const newFileResult = await window.myAPI.newFile(entry.absolutePath, widgetResult.resultData, /*isDirectory*/ false);
    if (!newFileResult.success) { return; }

    nodeKind = 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

    if (isCollapsed) { return; }

    let targetDepth = depthOfTheParent + 1;
    let someIndex = target.indexItem + 1;

    // TODO: 'i_targetDepth' is a bad variable name, you're looping a minimum of until 'newFileResult.indexOf' and each loop you check
    // whether that sibling is expanded, if so you skip all the children of the sibling.
    //
    for (let i_targetDepth = 0; i_targetDepth < newFileResult.indexOf; i_targetDepth++) {
        EXPLORER_treeViewComponent.getElementAt(someIndex);
        let nodeKind = treeViewComponent_staticRunner.byteTreeView_byteret_pooledNode_nodeKind;
        let isCollapsed = nodeKind === 2 /*TreeViewNodeKind.isExpandable_NOTisExpanded: 2*/ || nodeKind === 4 /*TreeViewNodeKind.NOTisExpandable_NOTisExpanded: 4*/;

        let d_of_presumed_correct_depth = treeViewComponent_staticRunner.fTreeView_poolret_pooledNode_depth;
        if (d_of_presumed_correct_depth !== targetDepth) {
            // Validate the target you paste into's child count
            break;
        }

        someIndex++;

        if (!isCollapsed) {
            while (someIndex < EXPLORER_treeViewComponent.countAbstract) {
                let d_of_perhaps_too_large_depth = EXPLORER_treeViewComponent.getDepth(someIndex);
                if (d_of_perhaps_too_large_depth > targetDepth) {
                    someIndex++;
                }
                else {
                    break;
                }
                // TODO: Check if depth is less than targetDepth? This would only happen if the tree view were somehow in an incorrect state.
            }
        }

        // TODO: You're missing a 'someIndex < EXPLORER_treeViewComponent.countAbstract' check for after the while loop.
    }

    EXPLORER_treeViewComponent.insert(someIndex, nodeKind, newFileResult.pathId, target.depth + 1);
    EXPLORER_pathIdToDisplayNameMap.set(newFileResult.pathId, widgetResult.resultData);
    if (widgetResult.resultData.length > explorer.visualWidth_ofLongestLine_inChUnits) {
        explorer.visualWidth_ofLongestLine_inChUnits = widgetResult.resultData.length;
        EXPLORER_treeViewComponent.drawScrollBarWidthToThisPixelValue(explorer.visualWidth_ofLongestLine_inChUnits * EXPLORER_treeViewComponent.characterWidth);
    }
    EXPLORER_treeViewComponent.drawScrollbarHeight();
    EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
}

async function DeleteFile_Directory_YesCancel_callback(widgetResult) {
    if (widgetResult.isCancelled) return;
    const entry = widgetResult.request.value;
    const target = widgetResult.request.target;
    const deleteFileResult = await window.myAPI.deleteFile(entry.absolutePath, /*isDirectory*/ true);
    if (!deleteFileResult) { return; }

    let countChanges = EXPLORER_removeFromNodeList(target.indexItem);

    EXPLORER_treeViewComponent.drawScrollbarHeight();
    EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
}

async function DeleteFile_File_YesCancel_callback(widgetResult) {
    if (widgetResult.isCancelled) return;
    const entry = widgetResult.request.value;
    const target = widgetResult.request.target;
    const deleteFileResult = await window.myAPI.deleteFile(entry.absolutePath, /*isDirectory*/ false);
    if (!deleteFileResult) { return; }

    EXPLORER_treeViewComponent.removeAt(target.indexItem, 1);
    EXPLORER_pathIdToDisplayNameMap.delete(target.id);

    EXPLORER_treeViewComponent.drawScrollbarHeight();
    EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
}

/** TODO: after renaming the file, probably should sort and ensure you have focus on that renamed one and scroll it into view if after the sort that becomes needed. */
async function RenameFile_Directory_InputText_callback(widgetResult) {
    if (widgetResult.isCancelled) return;
    // TODO: Confusing, hacky, upsetting: 'WIDGET_target.entry / WIDGET_target.MENU_target'
    const entry = widgetResult.request.target.entry;
    const target = widgetResult.request.target.MENU_target;
    const renameFileResult = await window.myAPI.renameFile(entry.absolutePath, widgetResult.resultData, /*isDirectory*/ true);
    if (!renameFileResult.success) { return; }

    EXPLORER_setNodeListEntryId(target.indexItem, renameFileResult.pathId);

    EXPLORER_pathIdToDisplayNameMap.delete(target.id);
    EXPLORER_pathIdToDisplayNameMap.set(renameFileResult.pathId, widgetResult.resultData);
    EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
}

/** TODO: after renaming the file, probably should sort and ensure you have focus on that renamed one and scroll it into view if after the sort that becomes needed. */
async function RenameFile_File_InputText_callback(widgetResult) {
    if (widgetResult.isCancelled) return;
    // TODO: Confusing, hacky, upsetting: 'WIDGET_target.entry / WIDGET_target.MENU_target'
    const entry = widgetResult.request.target.entry;
    const target = widgetResult.request.target.MENU_target;
    const renameFileResult = await window.myAPI.renameFile(entry.absolutePath, widgetResult.resultData, /*isDirectory*/ false);
    if (!renameFileResult.success) { return; }

    EXPLORER_setNodeListEntryId(target.indexItem, renameFileResult.pathId);
    
    EXPLORER_pathIdToDisplayNameMap.delete(target.id);
    EXPLORER_pathIdToDisplayNameMap.set(renameFileResult.pathId, widgetResult.resultData);
    EXPLORER_treeViewComponent.forceFullscreen_renderScroll();
}

// TODO: look at the "async" events because its nonsensical

// TODO: fine grained redrawing of only the nodes that are:
// - part of the virtualization result
// - and have changed in some way that necessitates their UI be redrawn

/*
// TODO: I saw the result was success but the indexOf was -1 when adding a file with the same name twice that seems erroneous...
// ...one such case of getting the -1 was due to not-awaited async file creation followed by reading the directory as a "sorting algorithm"-ish...
// ...cause you wanted to know where the OS put the new file among the existing children...
// ...I'm not sure whether the case I'm describing is what the original todo was describing and thus I'm not gonna get rid of the original todo...
// ...TODO: was the original todo referencing the case I described?

// TODO: I added 3 files total while testing various words that would alphabetically be placed at the start, end, or somewhere in the middle...
// ...I think the middle case for some reason ended up in the parent? I'm not quite sure what happened.
*/

// TODO: If menu is showing either:
// - don't let user scroll
// - when they do scroll close the menu
