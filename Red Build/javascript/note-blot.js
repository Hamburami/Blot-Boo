// Configuration
const CONFIG = {
    blot: {
        moveSpeed: 0.08,
        approachDistance: 120,
        patientDistance: 110,
        menuRadius: 50,
        smoothingFactor: 0.92
    },
    typing: {
        mouseStillThreshold: 30,
        storageKey: 'noteai-thoughts' // huh?
    },
    thought: {
        dragThreshold: 1
    }
};
import { Archive } from './archive.js';
import { Blot } from './blot.js';
import { Thought } from './thought.js';
// THIS SHOULD ALL BE IN THE EVENT MANAGER AND IT NEEDS A BETTER NAME
// Global variables
// This could replace appMode, if currentThought == null then appMode = new_thought else appMode = currentThought
let thoughts = [];
let deepThoughts = [];
let archive;
let eventManager;
let blot;
// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    eventManager = new EventManager();
    archive = new Archive(eventManager);
    blot = new Blot(eventManager);
    // For drawing graph
    //canvas = document.getElementById("canvas") as HTMLCanvasElement;
    // Setup clear button
    //document.getElementById('clearButton').addEventListener('click', eventManager.clearAllThoughts.bind(eventManager)); //bind? or do () => {function} or would just adding () work?
    const tlButton = document.getElementById('tlButton');
    // Use pointerup to work reliably on both mouse and touch devices
    let lastToggleTime = 0;
    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Prevent double-firing (pointerup and click can both fire)
        const now = Date.now();
        if (now - lastToggleTime > 100) {
            archive.toggleThoughtList();
            lastToggleTime = now;
        }
    };
    tlButton.addEventListener('pointerup', handleToggle);
    tlButton.addEventListener('click', handleToggle);
    //document.getElementById('generateButton').addEventListener('click', generateThoughts);
    //drawConnections()
});
// TODO this should be moved to its own class
let canvas;
function drawConnections() {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    // Scale context to match device pixel ratio
    //  ctx.scale(dpr, dpr);
    // Clear the ENTIRE canvas, not just 200x200!
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // Reset transform after clearing (or work in logical coordinates)
    //  ctx.setTransform(1, 0, 0, 1, 0, 0);
    //  ctx.scale(dpr, dpr);
    if (eventManager.connectingThought) {
        let thoughtCenter = eventManager.connectingThought.getCenterCords();
        let dir = [
            eventManager.mouseX - thoughtCenter[0],
            eventManager.mouseY - thoughtCenter[1]
        ];
        let node0Pt = eventManager.connectingThought.getConnectionEdgeCords([dir[0], dir[1]]);
        ctx.beginPath();
        ctx.moveTo(node0Pt[0], node0Pt[1]);
        ctx.lineTo(eventManager.mouseX, eventManager.mouseY);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }
    archive.connections.forEach(connection => {
        if (connection.nodes[0].active && connection.nodes[1].active) {
            let dir = [
                connection.nodes[1].getDisplayCords()[0] - connection.nodes[0].getDisplayCords()[0],
                connection.nodes[1].getDisplayCords()[1] - connection.nodes[0].getDisplayCords()[1]
            ];
            let node0Pt = connection.nodes[0].getConnectionEdgeCords([dir[0], dir[1]]);
            let node1Pt = connection.nodes[1].getConnectionEdgeCords([-dir[0], -dir[1]]);
            ctx.beginPath();
            ctx.moveTo(node0Pt[0], node0Pt[1]);
            ctx.lineTo(node1Pt[0], node1Pt[1]);
            // ctx.moveTo(connection.nodes[0].x, connection.nodes[0].y)
            // ctx.lineTo(connection.nodes[1].x, connection.nodes[1].y)
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        }
    });
    requestAnimationFrame(drawConnections);
}
function generateThoughts() {
    let tillThereWasYou = [
        "There were bells on a hill\nBut I never heard them ringing\nNo, I never heard them at all\nTill there was you",
        "There were birds in the sky\nBut I never saw them winging\nNo, I never saw them at all\nTill there was you",
        "Then there was music and wonderful roses\nThey tell me in sweet fragrant meadows\nOf dawn and dew",
        "There was love all around\nBut I never heard it singing\nNo, I never heard it at all\nTill there was you",
        "Then there was music and wonderful roses\nThey tell me in sweet fragrant meadows\nOf dawn and dew",
        "There was love all around\nBut I never heard it singing\nNo, I never heard it at all\nTill there was you\nTill there was you"
    ];
    let inMyLife = [
        "There are places I'll remember\nAll my life though some have changed\nSome forever not for better\nSome have gone and some remain",
        "All these places had their moments\nWith lovers and friends I still can recall\nSome are dead and some are living\nIn my life I've loved them all",
        "But of all these friends and lovers\nThere is no one compares with you\nAnd these memories lose their meaning\nWhen I think of love as something new",
        "Though I know I'll never lose affection\nFor people and things that went before\nI know I'll often stop and think about them\nIn my life I love you more",
        "Though I know I'll never lose affection\nFor people and things that went before\nI know I'll often stop and think about them\nIn my life I love you more",
        "In my life I love you more"
    ];
    let withinYouWithoutYou = [
        "We were talking about the space between us all\nAnd the people who hide themselves behind a wall of illusion",
        "Never glimpse the truth, then it's far too late, when they pass away",
        "We were talking about the love we all could share\nWhen we find it, to try our best to hold it there with our love",
        "With our love, we could save the world, if they only knew",
        "Try to realise it's all within yourself",
        "No one else can make you change\nAnd to see you're really only very small",
        "And life flows on within you and without you",
        "We were talking about the love that's gone so cold",
        "And the people who gain the world and lose their soul",
        "They don't know, they can't see, are you one of them?",
        "When you've seen beyond yourself then you may find",
        "Peace of mind is waiting there\nAnd the time will come when you see we're all one",
        "And life flows on within you and without you"
    ];
    for (let i = 0; i < 5; i++) {
        let set;
        let rand = Math.floor(Math.random() * 3.0);
        console.log(rand);
        switch (rand) {
            case 0:
                set = tillThereWasYou;
                break;
            case 1:
                set = inMyLife;
                break;
            default:
                set = withinYouWithoutYou;
        }
        eventManager.createThoughtAtPosition(set[Math.floor(Math.random() * set.length)], Math.random() * 1000, Math.random() * 800).updateText();
    }
}
export class EventManager {
    constructor() {
        this.currentThought = null;
        this.connectingThought = null;
        this.thoughtsContainer = null;
        this.currentPage = null;
        this.endOfPageMarker = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.setupEventListeners();
        this.currentThought = null;
        this.thoughtsContainer = document.getElementById('thoughtsContainer');
        this.endOfPageMarker = document.getElementById('endOfPageMarker');
        this.currentPage = this.createNewPage();
        const observer = new IntersectionObserver(([entry]) => {
            //console.log("entry ratio: " + entry.intersectionRatio);
            if (this.currentPage.childElementCount > 0 && Array.from(this.currentPage.children).some(child => { var _a; return (_a = child.textContent) === null || _a === void 0 ? void 0 : _a.trim(); })) {
                this.currentPage = this.createNewPage();
                let blue = entry.intersectionRatio * 255;
                let red = 200 - (entry.intersectionRatio * 200);
                this.endOfPageMarker.style.backgroundColor = `rgba(${red}, 0, ${blue})`;
            }
            else {
                this.endOfPageMarker.classList.add('new-page-not-possible');
            }
        }, { root: null, threshold: 0.9 });
        observer.observe(this.endOfPageMarker);
        //  this.currentPage = this.createNewPage();
        //  this.currentPage.dataset.empty = 'true';
    }
    getCurrentThought() {
        return this.currentThought;
    }
    setCurrentThought(thought) {
        // deactivate the current thought
        if (this.currentThought && this.currentThought != thought) {
            this.currentThought.disableEditing();
        }
        // activate the input thought or set currentThought to null
        if (thought instanceof Thought) {
            this.currentThought = thought;
            //currentThought.activate();
        }
        else {
            this.currentThought = null;
        }
    }
    getBlot() {
        return blot;
    }
    getThoughts() {
        return thoughts;
    }
    getArchive() {
        return archive;
    }
    setupEventListeners() {
        // Mouse tracking variables
        let mouseDownTime = 0;
        let mouseDown = false;
        let mouseDownX = 0; // weird how these can be declared outside of the scope that the eventlisteners are using and this is jsut a single function that would unload these variables after runnning?
        let mouseDownY = 0;
        let mouseScreenDownX = 0;
        let mouseScreenDownY = 0;
        let deltaX = 0;
        let deltaY = 0;
        let screenDeltaX = 0;
        let screenDeltaY = 0;
        // let hasMoved = false;
        let draggedThought = null;
        let draggingBlot = false;
        let startedBlotDrag = false;
        let dragThreshold = CONFIG.thought.dragThreshold;
        let tabPressed = false;
        // These should each be discrete functions for readablity and simplicity
        // Mouse movement tracking
        const handleMove = (e) => {
            // Prevent scrolling on mobile when dragging
            if (e.pointerType === 'touch' && draggedThought && mouseDown) {
                e.preventDefault();
            }
            this.mouseX = e.clientX + window.scrollX;
            this.mouseY = e.clientY + window.scrollY;
            // Debug: create dot at touch/mouse position
            // const debugDot = document.createElement('div');
            // debugDot.style.position = 'absolute';
            // debugDot.style.left = this.mouseX + 'px';
            // debugDot.style.top = this.mouseY + 'px';
            // debugDot.style.width = '10px';
            // debugDot.style.height = '10px';
            // debugDot.style.borderRadius = '50%';
            // debugDot.style.backgroundColor = 'red';
            // debugDot.style.pointerEvents = 'none';
            // debugDot.style.zIndex = '10000';
            // document.body.appendChild(debugDot);
            // setTimeout(() => debugDot.remove(), 500);
            if (!mouseDown) {
                this.updateSelectedThought(); // update what the current thought is
            }
            if (!startedBlotDrag || !draggingBlot) {
                deltaX = this.mouseX - mouseDownX;
                deltaY = this.mouseY - mouseDownY;
                screenDeltaX = e.clientX - mouseScreenDownX;
                screenDeltaY = e.clientY - mouseScreenDownY;
            }
            if (draggedThought) {
                if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                    draggedThought.isDragging = true;
                    blot.untarget();
                }
                if (draggedThought.isDragging) {
                    draggedThought.drag(deltaX, deltaY);
                }
            }
            else if (mouseDown && draggingBlot) {
                if (!startedBlotDrag && (Math.abs(screenDeltaX) > dragThreshold || Math.abs(screenDeltaY) > dragThreshold)) {
                    startedBlotDrag = true;
                    blot.element.classList.add('no-transition');
                }
                if (startedBlotDrag) {
                    blot.drag(screenDeltaX, screenDeltaY, e.clientX, e.clientY);
                }
            }
            else {
                draggingBlot = false;
                startedBlotDrag = false;
                blot.element.classList.remove('no-transition');
            }
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('focusout', (e) => {
            if (!tabPressed) {
                this.removeEmptyCurrentThought();
            }
        });
        document.addEventListener('pointerdown', (e) => {
            var _a, _b;
            if (e.pointerType == 'mouse') {
                mouseDown = true;
                mouseDownX = e.clientX + window.scrollX; //should these be set regardless?
                mouseDownY = e.clientY + window.scrollY;
                mouseScreenDownX = e.clientX;
                mouseScreenDownY = e.clientY;
                const target = e.target;
                let thoughtElement = (_a = target.closest) === null || _a === void 0 ? void 0 : _a.call(target, '.thought');
                if (thoughtElement) { // mouse over thought
                    let selectedThought = thoughts.find(t => t.element === thoughtElement);
                    if (selectedThought) {
                        // if (this.shifting) { // If holding shift and thought selected, connect thought
                        //     e.preventDefault();
                        //     this.connect(selectedThought);
                        //     console.log("connecting " + selectedThought.text);
                        // } 
                        // else 
                        if (selectedThought.element.isContentEditable) {
                            // Clicking while editing - allow default behavior for text selection
                        }
                        else {
                            //e.preventDefault();
                            this.setCurrentThought(selectedThought);
                            draggedThought = selectedThought;
                        }
                    }
                }
                else if (target.id === 'inkBlot') {
                    draggingBlot = true;
                }
                else if (target.classList.contains('menu-item')) {
                }
                else if (target.classList.contains('thoughts-container') || target.classList.contains('thoughts-container__page')) {
                    //console.log(target.classList);
                    this.setCurrentThought(null);
                    blot.updateTarget();
                    blot.resetPosition();
                }
            }
            else { // MOBILE TOUCH INPUT pointerdown
                mouseDown = true;
                mouseDownX = e.clientX + window.scrollX;
                mouseDownY = e.clientY + window.scrollY;
                this.mouseX = e.clientX + window.scrollX;
                this.mouseY = e.clientY + window.scrollY;
                mouseScreenDownX = e.clientX;
                mouseScreenDownY = e.clientY;
                const target = e.target;
                let thoughtElement = (_b = target.closest) === null || _b === void 0 ? void 0 : _b.call(target, '.thought');
                if (thoughtElement) { // touch over thought
                    let selectedThought = thoughts.find(t => t.element === thoughtElement);
                    if (selectedThought) {
                        if (selectedThought.element.isContentEditable) {
                            // Clicking while editing - allow default behavior for text selection
                        }
                        else {
                            e.preventDefault(); // Prevent scrolling when starting drag
                            this.setCurrentThought(selectedThought);
                            draggedThought = selectedThought;
                        }
                    }
                }
                else if (target.id === 'inkBlot') {
                    draggingBlot = true;
                }
                else if (target.classList.contains('menu-item')) {
                }
                else if (target.classList.contains('thoughts-container') || target.classList.contains('thoughts-container__page')) {
                    //console.log(target.classList);
                    this.setCurrentThought(null);
                    blot.updateTarget();
                    blot.resetPosition();
                }
            }
        });
        // Single mouse up handler - ALWAYS clears drag state
        document.addEventListener('pointerup', (e) => {
            if (e.pointerType == 'mouse') {
                mouseDown = false;
                if (draggedThought) {
                    if (draggedThought.isDragging) {
                        //draggedThought.moveTo(draggedThought.x + this.mouseX - mouseDownX, draggedThought.y + this.mouseY - mouseDownY);
                        draggedThought.commitDrag();
                        let page = this.findPageAtY(draggedThought.y);
                        if (draggedThought.element.parentElement != page && page) {
                            page.appendChild(draggedThought.element);
                        }
                        this.updateEndOfPageMarkerStyle();
                    }
                    else {
                        draggedThought.enableEditing();
                        blot.updateTarget();
                    }
                    draggedThought.isDragging = false;
                    draggedThought = null;
                }
            }
            else { // MOBILE TOUCH INPUT pointerup
                mouseDown = false;
                let target = e.target;
                if (draggedThought) {
                    if (draggedThought.isDragging) {
                        //draggedThought.moveTo(draggedThought.x + this.mouseX - mouseDownX, draggedThought.y + this.mouseY - mouseDownY);
                        draggedThought.commitDrag();
                        let page = this.findPageAtY(draggedThought.y);
                        if (draggedThought.element.parentElement != page && page) {
                            page.appendChild(draggedThought.element);
                        }
                        this.updateEndOfPageMarkerStyle();
                    }
                    else {
                        draggedThought.enableEditing();
                        blot.updateTarget();
                    }
                    draggedThought.isDragging = false;
                    draggedThought = null;
                }
                else if (!draggingBlot) {
                    // Check if click is within archive menu area - don't create new thought if so
                    const archiveMenu = document.getElementById('thoughtList');
                    const archiveContainer = document.getElementById('thought-list-and-button');
                    const isInArchiveMenu = archiveMenu && (target.closest('#thoughtList') || target.closest('#thought-list-and-button') || target.classList.contains('thought-card') || target.closest('.thought-card'));
                    // Only create new thought if clicking on background, not on archive menu
                    if (!isInArchiveMenu && (target.classList.contains('thoughts-container') || target.classList.contains('thoughts-container__page'))) {
                        if (this.currentThought) {
                            this.removeEmptyCurrentThought();
                        }
                        else {
                            this.createThought('');
                        }
                    }
                }
                this.mouseX = e.clientX + window.scrollX;
                this.mouseY = e.clientY + window.scrollY;
            }
            // Don't update blot target if clicking on blot or menu items
            const target = e.target;
            if (!target.classList.contains('menu-item') && target.id !== 'inkBlot') {
                blot.updateTarget();
            }
        });
        // Blot hover handling: should this be an event listener on the blot instead of the document?
        document.addEventListener('mouseenter', (e) => {
            var _a;
            const target = e.target;
            if (target.id === 'inkBlot' && blot) {
                blot.expandMenu();
            }
            if ((_a = target.closest) === null || _a === void 0 ? void 0 : _a.call(target, '.thought')) {
                let hoveredThought = thoughts.find(t => t.element === e.target);
                if (hoveredThought) {
                    this.setCurrentThought(hoveredThought);
                }
            }
        }, true);
        document.addEventListener('mouseleave', (e) => {
            const target = e.target;
            if (target.id === 'inkBlot' && blot) {
                // Add small delay to prevent flickering
                setTimeout(() => {
                    if (!blot.element.matches(':hover')) {
                        blot.collapseMenu();
                    }
                }, 100);
            }
        }, true);
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('menu-item')) {
                e.preventDefault();
                e.stopPropagation();
                const action = target.getAttribute('data-action');
                blot.executeAction(action);
                return;
            }
            if (target.id === 'inkBlot') {
                blot.executeAction('default-click');
                return;
            }
        });
        // keydown for creating thoughts
        document.addEventListener('keydown', (e) => {
            let input = e.key;
            if (input == 'Shift') {
                this.shifting = true;
            }
            if (e.key === 'Tab') { // Quick new thought creation
                tabPressed = true;
                let currentThought;
                if (this.currentThought) {
                    currentThought = this.currentThought;
                }
                else {
                    currentThought = blot.getTargetThought();
                }
                if (!currentThought) {
                    return; // No thought to create from
                }
                e.preventDefault();
                let newThoughtX = currentThought.x;
                let newThoughtY = currentThought.y;
                if (e.shiftKey) {
                    newThoughtX += currentThought.getWidth() + 10;
                }
                else {
                    newThoughtY += 40;
                }
                this.currentThought = this.createThoughtAtPosition('', newThoughtX, newThoughtY);
                this.currentThought.enableEditing();
                blot.updateTarget();
                return;
            }
            if (!this.currentThought && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // TODO make this case statement?
                if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape' || e.key === ' ') {
                    return; // prevent creating thoughts for these keys
                }
                // Regular character input
                //e.preventDefault();
                if (input != e.key || e.key.length === 1) {
                    this.createThought(input); // <---------------------
                    blot.updateTarget();
                }
            }
        });
        //keyup for updating thoughts
        document.addEventListener('keyup', (e) => {
            let input = e.key;
            if (input === 'Shift') {
                this.shifting = false;
                this.connectingThought = null;
            }
            if (this.currentThought && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === 'Enter') {
                    //input = '\n';
                    //document.execCommand("insertLineBreak");
                    //e.preventDefault();
                }
                else if (e.key === 'Backspace' || e.key === 'Delete') {
                    input = '\b';
                }
                else if (e.key === 'Escape') {
                    input = '\x1b';
                }
                else if (e.key === 'Tab') { // TODO fix tab
                    input = '\t';
                    e.preventDefault();
                    tabPressed = false;
                    return;
                }
                if (input != e.key || e.key.length === 1) {
                    this.updateCurrentThought();
                }
            }
        });
        //document.addEventListener('visibilitychange', () => {
    }
    createNewPage() {
        const newPage = document.createElement('div');
        newPage.className = 'thoughts-container__page';
        newPage.style.height = window.innerHeight + 'px';
        this.thoughtsContainer.insertBefore(newPage, this.endOfPageMarker);
        return newPage;
    }
    createThought(char) {
        this.currentThought = this.createThoughtAtPosition(char, this.mouseX, this.mouseY - 15);
        this.currentThought.enableEditing(); // enables text editing
    }
    createThoughtAtPosition(txt, x, y) {
        var _a;
        //console.log("Creating thought at position:", x, y);
        const newThought = new Thought(txt, x, y);
        let correspondingPage = this.findPageAtY(y);
        if (correspondingPage) {
            correspondingPage.appendChild(newThought.element);
        }
        else {
            console.warn("No corresponding page found for thought at y = " + y +
                " for thought: " + (((_a = newThought.text) === null || _a === void 0 ? void 0 : _a.trim()) ? newThought.text : "empty Thought"));
            newThought.moveTo(x, window.scrollY - 100); // NOT TESTED
            this.currentPage.appendChild(newThought.element);
        }
        this.updateEndOfPageMarkerStyle();
        thoughts.push(newThought);
        archive.add(newThought);
        return newThought;
    }
    updateEndOfPageMarkerStyle() {
        if (this.currentPage.childElementCount > 0) {
            this.endOfPageMarker.classList.remove('new-page-not-possible');
        }
        else {
            this.endOfPageMarker.classList.add('new-page-not-possible');
        }
    }
    findPageAtY(y) {
        let pages = this.thoughtsContainer.querySelectorAll('.thoughts-container__page');
        let curHeight = 0;
        let correspondingPage = null;
        correspondingPage = null;
        for (let i = 0; i < pages.length; i++) {
            curHeight += pages[i].scrollHeight;
            if (y < curHeight) {
                correspondingPage = pages[i];
                break;
            }
        }
        return correspondingPage;
    }
    updateCurrentThought() {
        if (this.currentThought) { // update
            this.currentThought.setTextVisible();
            archive.organizeThoughtList();
        }
    }
    updateSelectedThought() {
        if (this.currentThought) {
            // Check if mouse is over blot - if so, don't switch modes
            const blotRect = document.getElementById('inkBlot').getBoundingClientRect();
            const mouseOverBlot = this.mouseX >= blotRect.left && this.mouseX <= blotRect.right &&
                this.mouseY >= blotRect.top && this.mouseY <= blotRect.bottom;
            if (mouseOverBlot) {
                // Don't change mode when hovering over blot
                return;
            }
            // Check if thought element is being hovered using CSS :hover selector
            if (!this.currentThought.element.matches(':hover')) {
                // Mouse moved off current thought - switch to new thought mode
                //delete empty thought that isn't current thought
                this.removeEmptyCurrentThought();
                document.body.style.cursor = 'text';
            }
            else {
                document.body.style.cursor = 'default';
            }
        }
    }
    activateThought(thought) {
        thoughts.push(thought);
        this.thoughtsContainer.appendChild(thought.element);
        thought.setActive();
    }
    removeEmptyCurrentThought() {
        if (this.currentThought.text == '') {
            const index = thoughts.indexOf(this.currentThought);
            if (index > -1) {
                thoughts.splice(index, 1);
            }
            else {
                console.warn("Tried to delete current thought but it was not found in thoughts array.");
            }
            this.currentThought.vanish(); // So much redundecy here
            archive.ignore(this.currentThought);
        }
        this.setCurrentThought(null);
    }
    findNearbyThought(x, y) {
        return thoughts.find(thought => {
            const distance = Math.sqrt(Math.pow((x - thought.x), 2) + Math.pow((y - thought.y), 2));
            return distance < CONFIG.typing.mouseStillThreshold;
        });
    }
    deleteCurrentThought() {
        if (this.currentThought) {
            // Delete the current thought
            const index = thoughts.indexOf(this.currentThought);
            if (index > -1) {
                this.currentThought.vanish();
                thoughts.splice(index, 1);
                this.currentThought = null;
                blot.updateTarget(); //This is when I want the blot to stay where it is and not be linked to a thought)
            }
        }
    }
    clearAllThoughts() {
        this.getThoughts().forEach(thought => thought.vanish());
        archive.organizeThoughtList();
        thoughts = [];
        this.setCurrentThought(null);
        blot.updateTarget();
    }
    connect(thought) {
        if (this.connectingThought && thought != this.connectingThought) {
            archive.connections.push({
                label: "nada",
                weight: 1,
                //id: this.connectingThought.timestamp.id + "-" + thought.timestamp.id, // is this bloated ewith info?
                id: this.connectingThought.text + "-" + thought.text, // is this bloated ewith info?
                nodes: [this.connectingThought, thought],
                drawn: true
            });
            this.connectingThought = null;
        }
        else {
            this.connectingThought = thought;
        }
        //console.log(archive.connections);
    }
}
