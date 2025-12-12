// === THOUGHT CLASS ===
interface Timestamp {
    date: Date
    time: number
    id: number // linear measure of time that includes date and time? ID must take into account if thoughts are made at same time and use the text to differentiate
}




export class Thought {
    text: string
    x: number
    y: number
    tempX: number
    tempY: number
    element: HTMLElement
    isDragging: boolean
    dragStartX: number
    dragStartY: number
    timestamp: Timestamp
    active: boolean

    
    constructor(text: string, x: number, y: number, id?: string) {
        this.text = text;
        //this.displayText = text; // this could be an easy way to capitalize or uncapitalize without loosing original case
        this.x = x;
        this.y = y;
        this.tempX = 0;
        this.tempY = 0;
        this.element = this.createElement();
        this.active = true
        //this.element.textContent = this.text;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        const date = new Date();
        const time = date.getTime();

        if (!id) id = date.getUTCFullYear() 
                        + (date.getUTCMonth() < 9 ? "0" : "") + date.getUTCMonth() 
                        + (date.getUTCDate() < 10 ? "0" : "") + date.getUTCDate() 
                        + (date.getUTCHours() < 10 ? "0" : "") + date.getUTCHours() 
                        + (date.getUTCMinutes() < 10 ? "0" : "") + date.getUTCMinutes() 
                        + (date.getUTCSeconds() < 10 ? "0" : "") + date.getUTCSeconds() 
                        + (date.getUTCMilliseconds() < 100 ? "0" : "") + (date.getUTCMilliseconds() < 10 ? "0" : "") + date.getUTCMilliseconds();
        this.timestamp = { time: time, date: date, id: +id }; //stamp should be single linear value of creation time
        //console.log("new thought " + this.timestamp.id);
    }

    

    createElement(): HTMLElement {
        const element = document.createElement('div');
        element.className = 'thought';
        element.style.left = this.x + 'px';
        element.style.top = this.y + 'px';
        //element.textContent = this.text;
        element.contentEditable = 'false'; // What is this for? The div is not editable by defaut? ok
        return element;
    }

    getTimestamp() {
        return this.timestamp;
    }

    getId() {
        return this.timestamp.id;
    }


    // Targeted should mean the blot is focused on it, active is typing on it, selected is hovering and dragging
    target() {
        this.element.classList.add('targeted');
    }

    untarget() {
         this.element.classList.remove('targeted');
    }

    drag(tempX: number, tempY: number) { 
        // Constrain to viewport bounds to trigger auto-scroll
        const rect = this.element.getBoundingClientRect();
        const newX = this.x + tempX;
        const newY = this.y + tempY;
        
        // Keep within viewport (similar to blot's updatePosition)
        const constrainedX = Math.min(
            window.innerWidth + window.scrollX - rect.width, 
            Math.max(window.scrollX, newX)
        );
        const constrainedY = Math.min(
            window.innerHeight + window.scrollY - rect.height, 
            Math.max(window.scrollY, newY)
        );
        
        // Update temp positions (constrained deltas from original position)
        this.tempX = constrainedX - this.x;
        this.tempY = constrainedY - this.y;
        
        this.element.style.left = (this.x + this.tempX) + 'px';
        this.element.style.top = (this.y + this.tempY) + 'px';
    }

    getConnectionEdgeCords(dir: [x:number, y:number] ): [x:number, y:number] {

        const displayCords = this.getDisplayCords();
        const mag = Math.hypot(dir[0], dir[1]);
        dir[0] /= mag;
        dir[1] /= mag;
        const rect = this.element.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        const offsetX = halfWidth * dir[0];
        const offsetY = halfHeight * dir[1];
        const centerX = displayCords[0] + halfWidth;
        const centerY = displayCords[1] + halfHeight;
        const edgeX = centerX + offsetX;
        const edgeY = centerY + offsetY;
        return [edgeX, edgeY];
        //
        //return [this.x + this.tempX, this.y + this.tempY]
    }

    getDisplayCords(): [x:number, y:number] {
        return [this.x + this.tempX, this.y + this.tempY]
    }

    getCenterCords(): [x:number, y:number] { // These should be labeled as Display Cords. I Guess???
        const rect = this.element.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        return [this.x + this.tempX + halfWidth, this.y + this.tempY + halfHeight];
    }


    enableEditing() {
        this.element.contentEditable = 'true';
        this.element.focus();
        
        // Position cursor at end of text
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(this.element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        this.target();
    }

    disableEditing() {
        this.element.contentEditable = 'false';
        //this.untarget();
    }


    updateText() {
           this.element.textContent = this.text;
    }

    setTextVisible() {     
        if (this.element.hasChildNodes()) {
            this.text ="";
            for (let i = 0; i < this.element.childNodes.length; i++) {
                const child = this.element.childNodes[i];
                
                if (child.nodeType === Node.TEXT_NODE) {
                    this.text += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {

                    const display = window.getComputedStyle(child as HTMLElement).display;
                    if (display === "block") this.text += "\n";
                    this.text += child.textContent;
                }
            }
        }  else { 
            this.text = this.element.innerHTML
        }

        if (this.text.trim() === "") {
            //this.vanish();
        }
    }

    addText(text: string) {
        this.text += text;
        this.element.textContent = this.text; // This should be the function updateScreenText or something like that
    }

    addParagraph(){
        this.text += '\n';
    }

    moveTo(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        this.tempX = 0;
        this.tempY = 0;
    }

    commitDrag () {
        this.moveTo(this.x + this.tempX, this.y + this.tempY);
        this.tempX = 0;
        this.tempY = 0;
    }

    format(type: string) {
        switch (type) {
            case 'bold':
                this.element.style.fontWeight = 
                    this.element.style.fontWeight === 'bold' ? 'normal' : 'bold';
                break;
            case 'italic':
                this.element.style.fontStyle = 
                    this.element.style.fontStyle === 'italic' ? 'normal' : 'italic';
                break;
            case 'upper':
                this.element.textContent = this.element.textContent.toUpperCase();
                break;
            case 'lower':
                this.element.textContent = this.element.textContent.toLowerCase();
                break;
        }
    }
    vanish() {
        this.element.remove();
        this.active = false;
    }
    setActive() {
        this.active = true;
    }


    getWidth(): number {
        return this.element.getBoundingClientRect().width
    }
    
    getHeight(): number {
        return this.element.getBoundingClientRect().height;
    }



    // connect(thought: Thought) {
    //     const connection: Connection = {
    //                                         label: "default",
    //                                         weight: 1,
    //                                         id: this.timestamp.id + "-" + thought.timestamp.id,
    //                                         nodes: [this, thought],
    //                                         drawn: false
    //                                     }
    //     if (!this.connections.includes(connection)) this.connections.push(connection) 
    //     if (!thought.connections.includes(connection)) thought.connections.push(connection)
    // }
}