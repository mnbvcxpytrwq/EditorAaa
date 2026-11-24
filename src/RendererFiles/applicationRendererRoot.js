import {editor, EDI_init, EDI_encoder, EDI_decoder_CUSTOM, EDI_styleBuffer, set_EDI_styleBuffer, EDI_render_request, RenderKind, EDI_moveCursor_position, EDI_textSourceIdentifier, EDI_getFinalizedEditsAndRawSaveFileData} from './editorGlobal_edit.js'
import {DIALOG_show, DialogKind} from './dialogGlobal.js'
import {DIALOG_Debug_Refresh, FindAll_dialog_was_resized_or_moved} from './dialogImplementationsGlobal.js'

export let shouldUseCSharpToSaveFileWhenPossible = false;
export function set_shouldUseCSharpToSaveFileWhenPossible(value) {
    shouldUseCSharpToSaveFileWhenPossible = value;
}

/**
 * TODO: I'm worried that there will exist a variable named 'App' or 'app' etc... and that this class will overwrite it. That's why I prefixed this with 'Aaa'...
 * ...maybe with modules this isn't even possible. I'm not thinking about my own variable I'm thinking about someone elses.
 * I don't actually think what I'm saying here even makes sense it sounds ridiculous (given this is a module)
 * but anxiety runs my life. And I can only tussle with so many sources of anxiety at once so I need to quiet this source for the time being.
 */
class AaaApp {
    constructor() {
        this.isDark = true;
        /**
         * This value ought to be an int (no decimal places) due to its high frequency usage in drawing UI,
         * and visually this having decimal places being of little to no value to the user when you could just ceil whatever height measurement you get.
         * 
         * TODO: (speculation) I've never liked saying "line height" I believe that deals with the vertical alignment of text within some container is "line height" a good wording.
         * */
        this.lineHeight = 0;

        this.lineHeightWithPx = '';
    }
}

export const aaaApp = new AaaApp();

/**
 * Connect to the single threaded C# console app (custom language server)
 * 
 * TODO: You need to be careful about a congested websocket buffer...
 * ...you say you want to remove the async logic because TCP will...
 * ...guarantee byte delivery in order...
 * ...and single threaded server means each message is only ever handled in order...
 * ...you perhaps need to coallesce or flush or etc... just keep this in mind.
 */
let socket = null;

let send_buffer = new Uint8Array(256);

let send_id = 0;

let mostRecent_kind = 0;

init();

// Example function to send your transaction buffer
function sendTransaction_MessageKind_string(messageString) {
    if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

    if (messageString.length > send_buffer.length) { throw new Exception('messageString.length > send_buffer.length'); }

    mostRecent_kind = 1;

    let index = 0;

    send_buffer[0] = 49; // '1'
    send_buffer[1] = 95; // '_'

    index += 2;

    // TODO: measure byte length of a string without encode
    const aaa = EDI_encoder.encode(send_buffer.length);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(messageString, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

// Clarification for the previous git commit message
// This isn't zero allocation but that was like the goal. I don't know I skimmed the generated code.
// I'm gonna read it one day I have it all planned out I'm serious I just am inching there day by day it is what it is (energy and etc...)

/** TODO: This is likely to have a race condition issue because Anything other than sending the exact same bytes that the editor read from the OS is likely to have a race condition issue */
export function sendTransaction_MessageKind_textDocument_didOpen(filePath) {
  if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

  const pathByteLength = EDI_decoder_CUSTOM.getUtf8ByteLength(filePath);

  if (pathByteLength + 13 > send_buffer.length) {
    throw new Error('Serialized message exceeds send_buffer.length');
  }

  mostRecent_kind = 2;

  let index = 0;
  send_buffer[index++] = 50; // '2' (message kind)
  send_buffer[index++] = 95; // '_' (delimiter)

  index = EDI_decoder_CUSTOM.writeAsciiUint(send_buffer, index, pathByteLength);

  send_buffer[index++] = 95; // '_' (delimiter)

  index = EDI_decoder_CUSTOM.writeUtf8String(send_buffer, index, filePath);

  socket.send(send_buffer.subarray(0, index));
}

export function sendTransaction_MessageKind_textDocument_definition(positionIndex) {
    if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 3;

    let index = 0;

    send_buffer[0] = 51; // '3'
    send_buffer[1] = 95; // '_'

    index += 2;

    var positionIndexString = positionIndex + '';

    // TODO: measure bytes that represent number digits without string
    const aaa = EDI_encoder.encode(positionIndexString);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

export function sendTransaction_MessageKind_custom_editorGetNodesAdjacentToCursor(positionIndex) {
    if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 4;

    let index = 0;

    send_buffer[0] = 52; // '4'
    send_buffer[1] = 95; // '_'

    index += 2;

    var positionIndexString = positionIndex + '';

    // TODO: measure bytes that represent number digits without string
    const aaa = EDI_encoder.encode(positionIndexString);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

export function sendTransaction_MessageKind_custom_saveFile() {
    if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 5;

    let index = 0;

    send_buffer[0] = 53; // '5'
    send_buffer[1] = 95; // '_'

    index += 2;

    //var positionIndexString = positionIndex + '';
//
    //// TODO: measure bytes that represent number digits without string
    //const aaa = EDI_encoder.encode(positionIndexString);
    //const byteLengthString = aaa.length + '';
//
    //const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));
//
    //index += writtenAaa.written;
//
    //send_buffer[index] = 95; // '_'
    //index += 1;
//
    //const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));
//
    //index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

export function sendTransaction_MessageKind_custom_edit_InsertLtr(positionIndex, bytes) {
    if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 6;

    let index = 0;

    send_buffer[0] = 54; // '6'
    send_buffer[1] = 95; // '_'

    index += 2;

    var positionIndexString = positionIndex + '';

    // TODO: measure bytes that represent number digits without string
    const aaa = EDI_encoder.encode(positionIndexString);
    // TODO: byte length of the bytes without encoding.
    // TODO: send the bytes themselves 0 allocation either side for the message itself
    //const bbb = EDI_encoder.encode(bytes);
    const byteLengthString = (aaa.length + bytes.length + 1 /*the '_' intra message that separates position from bytes*/) + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));
    index += writtenAaa.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));
    index += writtenBbb.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    send_buffer.set(bytes, index);
    index += bytes.length;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

export function sendTransaction_MessageKind_custom_edit_Remove(positionIndex, length) {
    if (!socket || socket.readyState !== WebSocket.OPEN) { return; }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 7;

    let index = 0;

    send_buffer[0] = 55; // '7'
    send_buffer[1] = 95; // '_'

    index += 2;

    var positionIndexString = positionIndex + '';
    var lengthString = length + '';

    // TODO: measure bytes that represent number digits without string
    const aaa = EDI_encoder.encode(positionIndexString);
    // TODO: byte length of the bytes without encoding.
    // TODO: send the bytes themselves 0 allocation either side for the message itself
    const bbb = EDI_encoder.encode(lengthString);
    const byteLengthString = (aaa.length + bbb.length + 1 /*the '_' intra message that separates position from length*/) + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));
    index += writtenAaa.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));
    index += writtenBbb.written;

    send_buffer[index] = 95; // '_'
    index += 1;

    const writtenCcc = EDI_encoder.encodeInto(length, send_buffer.subarray(index, send_buffer.length));
    index += writtenCcc.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

// Goal is to use the same wording as LSP where possible for clarity of communication.
//const MessageKind_string = 1;
//const MessageKind_textDocument_didOpen = 2;
//const MessageKind_textDocument_definition = 3;
//const MessageKind_custom_editorGetNodesAdjacentToCursor = 4;
//const MessageKind_custom_saveFile = 5;
//const MessageKind_custom_edit_InsertLtr = 6;
//const MessageKind_custom_edit_Remove = 7;

// The save can actually be done from the C# code.
// (from whichever it is more sensible to do from I mean)
// (cause I presume the UI would have the most overhead and that C# would recover from the GC overhead of a save much faster.)

function init() {
    document
        .getElementById('HEADER_buttonSettings')
        .addEventListener('click', HEADER_buttonSettings_onClick);

    //window.myAPI.onMessage(window_myAPI_onMessage);

    //const EDI_gotoF_button = document.getElementById('EDI_gotoF');
    //EDI_gotoF_button.addEventListener('click', window.myAPI.editorDocumentSymbolsRequest);
    document.body.addEventListener('keydown', documentBody_onKeyDown);

    try {
        // 2. Assign without re-declaring 'let' or 'const' inside the block
        const tempSocket = new WebSocket('ws://127.0.0.1:8080');
        tempSocket.binaryType = 'arraybuffer';
        tempSocket.onmessage = APP_socket_onmessage; // Standard message handler

        // 3. Handle asynchronous connection drops / offline states
        tempSocket.onerror = cleanupSocket;
        tempSocket.onclose = cleanupSocket;

        // Commit to the scoped variable only if creation didn't throw synchronously
        socket = tempSocket; 
    }
    catch (error) {
        // Catches synchronous errors like malformed URLs
        socket = null;
    }

    requestAnimationFrame(APP_render_init);
}

function cleanupSocket() {
    if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket = null; // Now it is safely null for the rest of your app
    }
}

function APP_socket_onmessage(event) {
    let view;
        
    if (typeof event.data === 'string' && event.data.length > 0) {
        if (mostRecent_kind === 3) {
            EDI_moveCursor_position(Number(event.data));
        }
        else if (mostRecent_kind === 4) {
            DIALOG_Debug_Refresh(JSON.parse(event.data));
        }
        else {
            // If the server sent it as text, convert text to a Uint8Array
            view = Uint8Array.fromBase64(event.data);
            set_EDI_styleBuffer(view);
            editor.styleBuffer_count = EDI_styleBuffer.length;
            editor.styleBuffer_capacity = EDI_styleBuffer.length;
            
            EDI_render_request(RenderKind.SyntaxHighlighting);
            //view = new TextEncoder().encode(event.data);
            //EDI_styleBuffer = view;
        }
    }
    else if (event.data instanceof ArrayBuffer) {
        // If it's a true binary buffer
        view = new Uint8Array(event.data);
    }
}

/**
 * TODO: "Nothing stops you" from interacting with the UI thus it is possible to do things pre-initialization? TODO: Don't let this be the case?
 */
function APP_render_init() {
    APP_measureLineHeightAndCharacterWidth();
    EDI_init();
}

function APP_measureLineHeightAndCharacterWidth() {
    const measureElement = document.getElementById('EDI_debug');
    let rect = measureElement.getBoundingClientRect();
    aaaApp.lineHeight = Math.ceil(rect.height);
    aaaApp.lineHeightWithPx = aaaApp.lineHeight + 'px';
}

//async function window_myAPI_onMessage(data) {
//    switch (data.method) {
//        case 'window/showMessage':
//            alert(`${data.result.type}: ${data.result.message}`);
//            break;
//    }
//}

async function documentBody_onKeyDown_saveFileAs(rawData) {
    const result = await window.myAPI.editorSaveFileAs(rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
    if (result.success) {
        EDI_textSourceIdentifier = result.absolutePath;
        EDI_FORMATTED_textSourceIdentifier = result.formattedAbsolutePath;
    }
}

function documentBody_onKeyDown(event) {
    switch (event.key) {
        case 's':
        case 'S':
            if (!event.ctrlKey) return;

            const unvalidatedAbsolutePath = EDI_textSourceIdentifier;
            const rawData = EDI_getFinalizedEditsAndRawSaveFileData();

            if (rawData.uint8arrayTextBytes) {
                event.preventDefault();
                event.stopPropagation();
                if (unvalidatedAbsolutePath === null) {
                    documentBody_onKeyDown_saveFileAs(rawData);
                }
                else if (shouldUseCSharpToSaveFileWhenPossible && socket && socket.readyState === WebSocket.OPEN) {
                    sendTransaction_MessageKind_custom_saveFile();
                }
                else {
                    window.myAPI.editorSaveFile(unvalidatedAbsolutePath, rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
                }
            }
            return;
        case 'F':
            if (!event.ctrlKey) return;
            DIALOG_show(DialogKind.FindAll, FindAll_dialog_was_resized_or_moved, null);
        case 'Escape':
            const editor = document.getElementById('EDITOR_inner_container');
            if (editor) {
                editor.focus();
            }
            return;
        case 'e':
            if (event.altKey) {
                EXPLORER_setShow(true);
                const EXPLORER_Element = document.getElementById('EXPLORER');
                if (EXPLORER_Element.children.length === 1) {
                    EXPLORER_Element.children[0].focus();
                }
            }
            return;
        case 'E':
            if (event.altKey && event.shiftKey) {
                const editor = document.getElementById('EDITOR_inner_container');
                if (editor) {
                    editor.focus();
                    EXPLORER_setShow(false);
                }
            }
            return;
        case 'd':
            if (event.altKey) {
                const dialogCloseButton = document.getElementById('DIALOG_closeButton');
                if (dialogCloseButton) {
                    dialogCloseButton.focus();
                }
            }
            return;
        case 'h':
            if (event.altKey) {
                const settingsButton = document.getElementById('HEADER_buttonSettings');
                if (settingsButton) {
                    settingsButton.focus();
                }
            }
            return;
    }
}

function HEADER_buttonSettings_onClick() {
    DIALOG_show(DialogKind.Settings, null, null);
}

function DocumentSymbol_debug_onClick() {
}
