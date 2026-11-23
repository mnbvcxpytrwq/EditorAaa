function DIALOG_render_request(renderKind) {
    if (dialog.queueHead !== dialog.queueTail) {
        const lastAbsoluteIndex = OFFSET_DIALOG + ((dialog.queueTail - 1) & f.UI_SLOT_MASK);
        if (f.MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_DIALOG + (dialog.queueTail & f.UI_SLOT_MASK);
    f.MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    dialog.queueTail++;
    
    if (!dialog.isRenderPending) {
        dialog.isRenderPending = true;
        requestAnimationFrame(DIALOG_render_do);
    }
}


