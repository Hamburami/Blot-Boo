export class Blot {
    constructor(em) {
        this.currentMessage = ""; //"Hello I'm Blot.";
        this.messageSequence = [
            "Hello I'm Blot.",
            "Click and drag me anywhere on the screen.",
            "Move your cursor and start typing to create a new thought.",
        ];
        this.targetThought = null; // Should be Thought type when available
        this.eventManager = em;
        this.archive = em.getArchive();
        this.element = document.getElementById('inkBlot');
        // Default blot size - can be changed dynamically
        this.blotWidth = 75;
        this.blotHeight = 70;
        this.menuWidth = 105;
        this.menuHeight = 100;
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.menuExpanded = false;
        this.targetThought = null; // Track which thought this blot is positioned next to
        this.menuItems = [
            { text: 'B', action: 'bold', angle: 0 },
            { text: 'I', action: 'italic', angle: 60 },
            { text: 'a', action: 'lower', angle: 120 },
            { text: 'A', action: 'upper', angle: 180 },
            { text: '×', action: 'delete', angle: 280 }
        ];
        this.updateSize();
        this.updateTarget();
        this.renderBlot();
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.updatePosition();
    }
    // Set blot size and maintain center position
    setSize(width, height) {
        this.blotWidth = width;
        this.blotHeight = height;
        this.updateSize();
        this.updateTarget(); // Recalculate position to maintain center
    }
    // Update the actual DOM element size and styling
    updateSize() {
        const currentWidth = this.menuExpanded ? this.menuWidth : this.blotWidth;
        const currentHeight = this.menuExpanded ? this.menuHeight : this.blotHeight;
        this.element.style.width = currentWidth + 'px';
        this.element.style.height = currentHeight + 'px';
    }
    // Get current center offsets based on current size
    getCurrentCenterOffsets() {
        const currentWidth = this.menuExpanded ? this.menuWidth : this.blotWidth;
        const currentHeight = this.menuExpanded ? this.menuHeight : this.blotHeight;
        return {
            centerX: currentWidth / 2,
            centerY: currentHeight / 2
        };
    }
    drag(deltaX, deltaY, mouseX, mouseY) {
        this.x = mouseX + deltaX;
        this.y = mouseY + deltaY;
        this.updatePosition();
    }
    updateTarget() {
        if (this.targetThought) {
            //this.targetThought.untarget();
        }
        if (this.eventManager.getCurrentThought()) {
            this.target(this.eventManager.getCurrentThought()); // Set which thought we're positioned next to
            //this.targetThought.target();
            this.goToTarget();
            this.executeAction('default-click');
            // Keep within screen bounds (accounting for current blot size)
            const { centerX, centerY } = this.getCurrentCenterOffsets();
        }
        else {
            // no current thought
            this.untarget();
        }
        // Position using center coordinates (subtract half current width/height)
        this.updatePosition();
    }
    resetPosition() {
        this.x = window.innerWidth / 8;
        this.y = window.innerHeight / 8;
        this.updatePosition();
    }
    goToTarget() {
        if (this.targetThought) {
            // Check if the element is in view
            const rect = this.targetThought.element.getBoundingClientRect();
            const isInView = (rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth);
            // Only scroll if not in view
            if (!isInView) {
                this.targetThought.element.scrollIntoView({
                    behavior: 'auto',
                    block: 'center',
                    inline: 'center'
                });
            }
            // Position the blot with updated scroll values
            this.x = this.targetThought.x - 40 - window.scrollX;
            this.y = this.targetThought.y + 0 - window.scrollY;
        }
        this.updateTargetThoughtPosition();
    }
    getTargetThought() {
        return this.targetThought;
    }
    updatePosition() {
        const { centerX, centerY } = this.getCurrentCenterOffsets();
        this.x = Math.min(window.innerWidth - centerX, Math.max(centerX, this.x));
        this.y = Math.min(window.innerHeight - centerY, Math.max(centerY, this.y));
        this.element.style.left = (this.x - centerX) + 'px';
        this.element.style.top = (this.y - centerY) + 'px';
    }
    updateTargetThoughtPosition() {
        const { centerX, centerY } = this.getCurrentCenterOffsets();
        this.x = Math.min(window.innerWidth - 2 * centerX, Math.max(0, this.x - centerX));
        this.y = Math.min(window.innerHeight - 2 * centerY, Math.max(0, this.y - centerY));
        this.element.style.left = (this.x) + 'px';
        this.element.style.top = (this.y) + 'px';
    }
    target(thought) {
        if (this.targetThought !== thought) {
            if (this.targetThought) {
                this.targetThought.untarget();
            }
            this.targetThought = thought;
        }
        thought.target();
    }
    untarget() {
        //console.log("untargeting blot: " + this.targetThought?.text);
        if (this.targetThought) {
            this.targetThought.untarget();
            this.targetThought = null;
        }
    }
    // Called from ThoughtManager on hover
    expandMenu() {
        if (this.targetThought) {
            this.menuExpanded = true;
            this.element.classList.add('menu-expanded');
            this.updateSize(); // Update size first
            this.renderBlot();
        }
    }
    // Called from ThoughtManager on mouse leave
    collapseMenu() {
        this.menuExpanded = false;
        this.element.classList.remove('menu-expanded');
        this.updateSize(); // Update size first
        this.renderBlot();
    }
    renderBlot() {
        if (this.menuExpanded) {
            this.element.innerHTML = this.getMenuHTML();
        }
        else if (this.currentMessage != "") {
            //this.element.innerHTML = this.getMsgHTML(this.currentMessage);
        }
        else {
            this.element.innerHTML = '';
        }
    }
    getMenuHTML() {
        let html = '';
        // Use current blot center as reference
        const { centerX, centerY } = this.getCurrentCenterOffsets();
        const radius = 30;
        this.menuItems.forEach((item, index) => {
            const angle = item.angle;
            const x = centerX + radius * Math.cos(angle * Math.PI / 180);
            const y = centerY + radius * Math.sin(angle * Math.PI / 180);
            html += `<div class="menu-item${item.action === 'delete' ? ' menu-item--delete' : ''}" data-action="${item.action}" style="
                position: absolute;
                left: ${x - 8}px;
                top: ${y - 12}px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.9rem;
                font-weight: bold;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                animation: fadeIn 0.3s ease ${index * 0.05}s both;
            ">${item.text}</div>`;
        });
        return html;
    }
    getMsgHTML(msg) {
        return `<div class="ink-blot__msg">${msg}</div>`;
    }
    // Called from ThoughtManager when menu item is clicked
    executeAction(action) {
        // Use targetThought (the thought we're positioned next to) instead of currentThought
        const targetThought = this.targetThought;
        // if (!targetThought) return;
        switch (action) {
            case 'bold':
            case 'italic':
            case 'upper':
            case 'lower':
                targetThought.format(action);
                if (window.eventManager)
                    window.eventManager.saveThoughts();
                break;
            case 'move':
                // nothing already done elsewhere
                break;
            case 'delete':
                // vanish the target thought
                const index = this.eventManager.getThoughts().indexOf(targetThought);
                if (index > -1) {
                    targetThought.vanish();
                    this.archive.organizeThoughtList();
                    this.eventManager.getThoughts().splice(index, 1);
                    this.targetThought = null;
                    if (this.eventManager.getCurrentThought() === targetThought) {
                        this.eventManager.setCurrentThought(null);
                    }
                    this.updateTarget();
                    this.collapseMenu();
                }
                break;
            case 'default-click':
                const currentIndex = this.messageSequence.indexOf(this.currentMessage);
                if (this.currentMessage == this.messageSequence[this.messageSequence.length - 1] || currentIndex < 0) {
                    this.currentMessage = "";
                }
                else {
                    if (currentIndex < this.messageSequence.length - 1) {
                        this.currentMessage = this.messageSequence[currentIndex + 1];
                    }
                }
                this.renderBlot();
        }
    }
}
