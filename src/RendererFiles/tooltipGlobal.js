let TOOLTIP_pending_textContent = null;

class Tooltip {
    constructor() {
        this.isRenderPending = false;

        /**
         * 0 => None
         * 1 => Show
         * 2 => Hide
         */
        this.pending_renderKind = 0;

        this.exists = false;
    }
}

export const tooltip = new Tooltip();

function TOOLTIP_render_request(renderKind) {
    tooltip.pending_renderKind = renderKind;
    
    if (!tooltip.isRenderPending) {
        tooltip.isRenderPending = 1;
        requestAnimationFrame(TOOLTIP_renderDo);
    }
}

function TOOLTIP_renderDo() {
    let renderKind = tooltip.pending_renderKind;
    tooltip.pending_renderKind = 0;

    if (renderKind === 1) {
        TOOLTIP_render_do_show();
    }
    else if (renderKind === 2) {
        TOOLTIP_render_do_hide();
    }
    else {
        throw new Error();
    }
    
    tooltip.isRenderPending = false; // Reset the paint lock
};

function TOOLTIP_render_do_show() {
    TOOLTIP_render_request(1);

    let tooltipElement;

    if (tooltip.exists) {
        tooltipElement = document.getElementById('TOOLTIP');
        // This is why I worry about doing a bool check in the other UIs
        // I worry about the state getting corrupted somehow.
        //
        // And then if it is truly meaningful from an optimization standpoint such as the scrolling of the editor
        // I take on the state corruption risk, otherwise I just defensively handle it.
        if (!tooltipElement) {
            tooltip.exists = 0;
            TOOLTIP_show(textContent);
            return;
        }
    }
    else {
        tooltipElement = document.createElement('div');
        tooltipElement.id = 'TOOLTIP';
        tooltipElement.style.left = '0px';
        tooltipElement.style.top = '0px';
        document.body.appendChild(tooltipElement);
    }
    
    // This was quickest first way of writing things that came to my mind.
    // I don't like it cause you're appending the child, then setting textContent
    // but it is sufficient for the first version.
    tooltipElement.textContent = TOOLTIP_pending_textContent;
    TOOLTIP_pending_textContent = null;

    tooltip.exists = 1;
}

function TOOLTIP_show(textContent) {
    TOOLTIP_pending_textContent = textContent;
    TOOLTIP_render_request(1);
}

function TOOLTIP_render_do_hide() {
    const tooltip = document.getElementById('TOOLTIP');
    if (tooltip) {
        tooltip.remove();
    }

    tooltip.exists = 0;
}

function TOOLTIP_hide() {
    TOOLTIP_pending_textContent = null;
    TOOLTIP_render_request(2);
}
