export const RenderKind = Object.freeze({
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

function EDI_render_do() {
    // Process everything in the queue until head catches up to tail
    while (editor.queueHead !== editor.queueTail) {
        // Read the item at the head and advance the head pointer safely
        const renderKind = EDI_renderKindBuffer[editor.queueHead & f.BUFFER_MASK];
        editor.queueHead++;

        switch (renderKind) {
            case RenderKind.Scroll:
                EDI_render_do_Scroll();
                break;
            case RenderKind.Resize:
                EDI_render_do_Resize();
                break;
            case RenderKind.InsertLtr:
                EDI_render_do_InsertLtr();
                break;
            case RenderKind.TabKey:
                EDI_render_do_TabKey();
                break;
            case RenderKind.IndentMore:
                EDI_render_do_IndentMore();
                break;
            case RenderKind.IndentLess:
                EDI_render_do_IndentLess();
                break;
            case RenderKind.BackspaceRtl:
                EDI_render_do_Backspace();
                break;
            case RenderKind.DeleteLtr:
                EDI_render_do_Delete();
                break;
            case RenderKind.RemoveSelection:
                EDI_render_do_RemoveSelection();
                break;
            case RenderKind.Enter:
                EDI_render_do_EnterKey();
                break;
            case RenderKind.DuplicateOrPaste:
                EDI_render_do_DuplicateOrPaste();
                break;
            case RenderKind.Clear:
                EDI_render_do_Clear();
                break;
            case RenderKind.SetText:
                EDI_render_do_SetText();
                break;
            case RenderKind.CreateViewport:
                EDI_render_do_CreateViewport();
                break;
            case RenderKind.SyntaxHighlighting:
                EDI_render_do_ResetSyntaxHighlighting();
                break;
            case RenderKind.Cursor_flag_scrollIntoViewExplicit:
                EDI_render_do_cursor_flag_scrollIntoViewExplicit();
                break;
            case RenderKind.Cursor_flag_doNotScrollIntoView:
                EDI_drawCursor(/*NOTscrollCursorIntoView*/ true);
                break;
            case RenderKind.Cursor_n:
                EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
                break;
        }
    }
    
    editor.isRenderPending = false;
}
