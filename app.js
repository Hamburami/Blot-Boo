var BlotApp = (function (exports) {
    'use strict';

    class Thought {
        constructor(text, x, y, id) {
            this.text = text;
            //this.displayText = text; // this could be an easy way to capitalize or uncapitalize without loosing original case
            this.x = x;
            this.y = y;
            this.tempX = 0;
            this.tempY = 0;
            this.element = this.createElement();
            this.active = true;
            //this.element.textContent = this.text;
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            const date = new Date();
            const time = date.getTime();
            if (!id)
                id = date.getUTCFullYear()
                    + (date.getUTCMonth() < 9 ? "0" : "") + date.getUTCMonth()
                    + (date.getUTCDate() < 10 ? "0" : "") + date.getUTCDate()
                    + (date.getUTCHours() < 10 ? "0" : "") + date.getUTCHours()
                    + (date.getUTCMinutes() < 10 ? "0" : "") + date.getUTCMinutes()
                    + (date.getUTCSeconds() < 10 ? "0" : "") + date.getUTCSeconds()
                    + (date.getUTCMilliseconds() < 100 ? "0" : "") + (date.getUTCMilliseconds() < 10 ? "0" : "") + date.getUTCMilliseconds();
            this.timestamp = { time: time, date: date, id: +id }; //stamp should be single linear value of creation time
            //console.log("new thought " + this.timestamp.id);
        }
        createElement() {
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
        drag(tempX, tempY) {
            // Constrain to viewport bounds to trigger auto-scroll
            const rect = this.element.getBoundingClientRect();
            const newX = this.x + tempX;
            const newY = this.y + tempY;
            // Keep within viewport (similar to blot's updatePosition)
            const constrainedX = Math.min(window.innerWidth + window.scrollX - rect.width, Math.max(window.scrollX, newX));
            const constrainedY = Math.min(window.innerHeight + window.scrollY - rect.height, Math.max(window.scrollY, newY));
            // Update temp positions (constrained deltas from original position)
            this.tempX = constrainedX - this.x;
            this.tempY = constrainedY - this.y;
            this.element.style.left = (this.x + this.tempX) + 'px';
            this.element.style.top = (this.y + this.tempY) + 'px';
        }
        getConnectionEdgeCords(dir) {
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
        getDisplayCords() {
            return [this.x + this.tempX, this.y + this.tempY];
        }
        getCenterCords() {
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
                this.text = "";
                for (let i = 0; i < this.element.childNodes.length; i++) {
                    const child = this.element.childNodes[i];
                    if (child.nodeType === Node.TEXT_NODE) {
                        this.text += child.textContent;
                    }
                    else if (child.nodeType === Node.ELEMENT_NODE) {
                        const display = window.getComputedStyle(child).display;
                        if (display === "block")
                            this.text += "\n";
                        this.text += child.textContent;
                    }
                }
            }
            else {
                this.text = this.element.innerHTML;
            }
            if (this.text.trim() === "") ;
        }
        addText(text) {
            this.text += text;
            this.element.textContent = this.text; // This should be the function updateScreenText or something like that
        }
        addParagraph() {
            this.text += '\n';
        }
        moveTo(x, y) {
            this.x = x;
            this.y = y;
            this.element.style.left = x + 'px';
            this.element.style.top = y + 'px';
            this.tempX = 0;
            this.tempY = 0;
        }
        commitDrag() {
            this.moveTo(this.x + this.tempX, this.y + this.tempY);
            this.tempX = 0;
            this.tempY = 0;
        }
        format(type) {
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
        getWidth() {
            return this.element.getBoundingClientRect().width;
        }
        getHeight() {
            return this.element.getBoundingClientRect().height;
        }
    }

    const API_URL = 'https://blot.boo/api';
    class Archive {
        constructor(em) {
            this.eventManager = em;
            this.thoughtList = document.getElementById('thoughtList');
            this.allThoughts = [];
            this.connections = [];
            if (!this.thoughtList) {
                throw new Error("Thought list element not found");
            }
        }
        getToken() {
            return localStorage.getItem('blot_session_token');
        }
        isLoggedIn() {
            return this.getToken() !== null;
        }
        add(thought) {
            this.allThoughts.push(thought);
            this.addThoughtListCard(thought);
            this.organize();
            // Save to DB if logged in
            if (this.isLoggedIn()) {
                this.saveThoughtToDb(thought);
            }
        }
        async saveThoughtToDb(thought) {
            const token = this.getToken();
            if (!token)
                return;
            try {
                await fetch(`${API_URL}/user/thoughts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id: String(thought.getId()),
                        content: thought.text,
                        x: thought.x,
                        y: thought.y,
                        time_created: thought.timestamp.time
                    })
                });
            }
            catch (error) {
                console.error('Failed to save thought:', error);
            }
        }
        async updateThoughtInDb(thought) {
            // Same as save - upsert handles both
            await this.saveThoughtToDb(thought);
        }
        async deleteThoughtFromDb(thought) {
            const token = this.getToken();
            if (!token)
                return;
            try {
                await fetch(`${API_URL}/user/thoughts/${thought.getId()}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            catch (error) {
                console.error('Failed to delete thought:', error);
            }
        }
        async loadThoughtsFromDb() {
            const token = this.getToken();
            if (!token)
                return;
            try {
                const response = await fetch(`${API_URL}/user/thoughts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok)
                    return;
                const data = await response.json();
                if (!data.thoughts || !Array.isArray(data.thoughts))
                    return;
                // Clear existing thoughts
                this.clearAllThoughts();
                // Create thoughts from DB data
                for (const t of data.thoughts) {
                    const thought = new Thought(t.content, t.x, t.y, t.id);
                    this.allThoughts.push(thought);
                    this.eventManager.getThoughts().push(thought);
                    this.eventManager.addThoughtToPage(thought, true); // showText=true for DB loaded thoughts
                }
                this.organizeThoughtList();
            }
            catch (error) {
                console.error('Failed to load thoughts:', error);
            }
        }
        async syncAllThoughts() {
            const token = this.getToken();
            if (!token)
                return;
            const thoughts = this.allThoughts.map(t => ({
                id: String(t.getId()),
                content: t.text,
                x: t.x,
                y: t.y,
                time_created: t.timestamp.time
            }));
            try {
                await fetch(`${API_URL}/user/thoughts/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ thoughts })
                });
            }
            catch (error) {
                console.error('Failed to sync thoughts:', error);
            }
        }
        clearAllThoughts() {
            // Remove from DOM
            this.allThoughts.forEach(t => t.vanish());
            this.allThoughts = [];
            this.thoughtList.innerHTML = '';
            // Also clear the EventManager's thoughts array
            this.eventManager.clearThoughtsArray();
        }
        organize() {
            this.allThoughts.sort((a, b) => a.getId() - b.getId());
            let duplicates = [];
            for (let i = 0; i < this.allThoughts.length - 1; i++) {
                if (this.allThoughts[i].getId() == this.allThoughts[i + 1].getId()
                    && this.allThoughts[i].text == this.allThoughts[i + 1].text) {
                    duplicates.push(i + 1);
                }
            }
            for (const i of duplicates) {
                this.allThoughts.splice(i, 1);
            }
        }
        addThoughtListCard(thought) {
            const card = document.createElement('div');
            card.className = 'thought-card' + (thought.active ? '' : ' thought-card--inactive');
            card.onclick = () => {
                const blot = this.eventManager.getBlot();
                if (!thought.active) {
                    this.eventManager.activateThought(thought);
                    card.classList.remove('thought-card--inactive');
                }
                blot.target(thought);
                blot.goToTarget();
            };
            const text = document.createElement('div');
            text.className = 'thought-card__text';
            let htmlContent = '';
            let lineCount = 0;
            for (let i = 0; i < thought.text.length; i++) {
                let char = thought.text[i];
                if (char === '\n') {
                    char = '<br>';
                    lineCount++;
                    if (lineCount >= 3)
                        break;
                }
                htmlContent += (thought.text[i] === '\n') ? '<br>' : thought.text[i];
            }
            text.innerHTML = htmlContent;
            const time = document.createElement('div');
            time.textContent = new Date(thought.timestamp.time).toLocaleTimeString();
            time.className = 'thought-card__timestamp';
            card.appendChild(text);
            card.appendChild(time);
            this.thoughtList.prepend(card);
        }
        organizeThoughtList() {
            this.organize();
            this.thoughtList.innerHTML = '';
            this.allThoughts.forEach(t => {
                this.addThoughtListCard(t);
            });
        }
        toggleThoughtList() {
            if (this.thoughtList.classList.contains('hidden')) {
                this.organizeThoughtList();
                this.thoughtList.classList.remove('hidden');
            }
            else {
                this.thoughtList.classList.add('hidden');
            }
        }
        save() {
            // Local storage backup
            localStorage.setItem('archive-data', JSON.stringify({
                thoughts: this.allThoughts.map(t => ({
                    text: t.text,
                    x: t.x,
                    y: t.y,
                    id: t.getId()
                })),
                connections: this.connections.map(c => ({
                    label: c.label,
                    weight: c.weight,
                    id: c.id,
                    nodes: c.nodes.map(n => n.getId())
                }))
            }));
            // Also sync to DB if logged in
            if (this.isLoggedIn()) {
                this.syncAllThoughts();
            }
        }
        ignore(thought) {
            const index = this.allThoughts.indexOf(thought);
            if (index > -1) {
                this.allThoughts.splice(index, 1);
            }
            // Delete from DB if logged in
            if (this.isLoggedIn()) {
                this.deleteThoughtFromDb(thought);
            }
        }
    }

    const AUTH_API_URL = 'https://blot.boo/api/auth';
    // Callback for when user logs in - set by note-blot.ts
    let onLoginCallback = null;
    function setOnLoginCallback(callback) {
        onLoginCallback = callback;
    }
    class AuthManager {
        constructor() {
            this.currentUser = null;
            this.authPanel = document.getElementById('authPanel');
            this.authButton = document.getElementById('authButton');
            this.loginForm = document.getElementById('loginForm');
            this.signupForm = document.getElementById('signupForm');
            this.loggedInView = document.getElementById('loggedInView');
            this.sessionToken = localStorage.getItem('blot_session_token');
            this.setupEventListeners();
            this.checkSession();
        }
        setupEventListeners() {
            this.authButton.addEventListener('click', () => this.authPanel.classList.toggle('hidden'));
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
            });
            document.getElementById('loginSubmit').addEventListener('click', () => this.handleLogin());
            document.getElementById('loginPassword').addEventListener('keypress', (e) => {
                if (e.key === 'Enter')
                    this.handleLogin();
            });
            document.getElementById('signupSubmit').addEventListener('click', () => this.handleSignup());
            document.getElementById('signupPasswordConfirm').addEventListener('keypress', (e) => {
                if (e.key === 'Enter')
                    this.handleSignup();
            });
            document.getElementById('logoutButton').addEventListener('click', () => this.handleLogout());
        }
        switchTab(tabName) {
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            this.loginForm.classList.toggle('hidden', tabName !== 'login');
            this.signupForm.classList.toggle('hidden', tabName === 'login');
        }
        async handleLogin() {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (!email || !password) {
                this.showMessage('login', 'Please enter email and password', 'error');
                return;
            }
            try {
                this.showMessage('login', 'Signing in...', 'success');
                const response = await fetch(`${AUTH_API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    this.sessionToken = data.token;
                    localStorage.setItem('blot_session_token', data.token);
                    this.currentUser = data.user;
                    this.showLoggedInView();
                }
                else {
                    this.showMessage('login', data.error || 'Login failed', 'error');
                }
            }
            catch (error) {
                this.showMessage('login', 'Network error', 'error');
            }
        }
        async handleSignup() {
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
            if (!email || !password || !passwordConfirm) {
                this.showMessage('signup', 'Please fill all fields', 'error');
                return;
            }
            if (!email.includes('@')) {
                this.showMessage('signup', 'Please enter a valid email', 'error');
                return;
            }
            if (password !== passwordConfirm) {
                this.showMessage('signup', 'Passwords do not match', 'error');
                return;
            }
            try {
                this.showMessage('signup', 'Creating account...', 'success');
                const response = await fetch(`${AUTH_API_URL}/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    this.sessionToken = data.token;
                    localStorage.setItem('blot_session_token', data.token);
                    this.currentUser = data.user;
                    this.showLoggedInView();
                }
                else {
                    this.showMessage('signup', data.error || 'Signup failed', 'error');
                }
            }
            catch (error) {
                this.showMessage('signup', 'Network error', 'error');
            }
        }
        handleLogout() {
            this.sessionToken = null;
            this.currentUser = null;
            localStorage.removeItem('blot_session_token');
            this.showLoginView();
        }
        async checkSession() {
            if (!this.sessionToken) {
                this.showLoginView();
                return;
            }
            try {
                const response = await fetch(`${AUTH_API_URL}/verify`, {
                    headers: { 'Authorization': `Bearer ${this.sessionToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.showLoggedInView();
                }
                else {
                    this.handleLogout();
                }
            }
            catch (error) {
                this.handleLogout();
            }
        }
        showLoggedInView() {
            this.loginForm.classList.add('hidden');
            this.signupForm.classList.add('hidden');
            document.querySelector('.auth-panel__header')?.classList.add('hidden');
            this.loggedInView.classList.remove('hidden');
            document.getElementById('userEmail').textContent = this.currentUser?.email || 'User';
            document.getElementById('loginMessage').textContent = '';
            document.getElementById('signupMessage').textContent = '';
            this.authButton.classList.add('logged-in');
            // Trigger callback to load user's thoughts
            if (onLoginCallback)
                onLoginCallback();
        }
        showLoginView() {
            document.querySelector('.auth-panel__header')?.classList.remove('hidden');
            this.loginForm.classList.remove('hidden');
            this.signupForm.classList.add('hidden');
            this.loggedInView.classList.add('hidden');
            this.authButton.classList.remove('logged-in');
            this.switchTab('login');
        }
        showMessage(form, message, type) {
            const messageEl = document.getElementById(`${form}Message`);
            messageEl.textContent = message;
            messageEl.className = `auth-form__message ${type}`;
        }
        getUser() {
            return this.currentUser;
        }
        getToken() {
            return this.sessionToken;
        }
        isLoggedIn() {
            return this.currentUser !== null;
        }
    }

    class Blot {
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
            if (this.targetThought) ;
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
            else if (this.currentMessage != "") ;
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

    // Configuration
    const CONFIG = {
        typing: {
            mouseStillThreshold: 30},
        thought: {
            dragThreshold: 1
        }
    };
    // Global variables
    let thoughts = [];
    let archive;
    let eventManager;
    let blot;
    // === INITIALIZATION ===
    document.addEventListener('DOMContentLoaded', () => {
        eventManager = new EventManager();
        archive = new Archive(eventManager);
        blot = new Blot(eventManager);
        // Set callback for when user logs in
        setOnLoginCallback(() => {
            archive.loadThoughtsFromDb();
        });
        new AuthManager();
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
    class EventManager {
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
                if (this.currentPage.childElementCount > 0 && Array.from(this.currentPage.children).some(child => child.textContent?.trim())) {
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
        clearThoughtsArray() {
            thoughts = [];
        }
        getArchive() {
            return archive;
        }
        setupEventListeners() {
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
                if (e.pointerType == 'mouse') {
                    mouseDown = true;
                    mouseDownX = e.clientX + window.scrollX; //should these be set regardless?
                    mouseDownY = e.clientY + window.scrollY;
                    mouseScreenDownX = e.clientX;
                    mouseScreenDownY = e.clientY;
                    const target = e.target;
                    let thoughtElement = target.closest?.('.thought');
                    if (thoughtElement) { // mouse over thought
                        let selectedThought = thoughts.find(t => t.element === thoughtElement);
                        if (selectedThought) {
                            // if (this.shifting) { // If holding shift and thought selected, connect thought
                            //     e.preventDefault();
                            //     this.connect(selectedThought);
                            //     console.log("connecting " + selectedThought.text);
                            // } 
                            // else 
                            if (selectedThought.element.isContentEditable) ;
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
                    else if (target.classList.contains('menu-item')) ;
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
                    let thoughtElement = target.closest?.('.thought');
                    if (thoughtElement) { // touch over thought
                        let selectedThought = thoughts.find(t => t.element === thoughtElement);
                        if (selectedThought) {
                            if (selectedThought.element.isContentEditable) ;
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
                    else if (target.classList.contains('menu-item')) ;
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
                            draggedThought.commitDrag();
                            // Sync position to DB
                            if (archive.isLoggedIn()) {
                                archive.updateThoughtInDb(draggedThought);
                            }
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
                            draggedThought.commitDrag();
                            // Sync position to DB
                            if (archive.isLoggedIn()) {
                                archive.updateThoughtInDb(draggedThought);
                            }
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
                        document.getElementById('thought-list-and-button');
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
                const target = e.target;
                if (target.id === 'inkBlot' && blot) {
                    blot.expandMenu();
                }
                if (target.closest?.('.thought')) {
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
                // Skip if typing in input fields (auth forms, etc.)
                const tag = e.target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA')
                    return;
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
                // Skip if typing in input fields (auth forms, etc.)
                const tag = e.target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA')
                    return;
                let input = e.key;
                if (input === 'Shift') {
                    this.shifting = false;
                    this.connectingThought = null;
                }
                if (this.currentThought && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (e.key === 'Enter') ;
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
            const newThought = new Thought(txt, x, y);
            this.addThoughtToPage(newThought);
            thoughts.push(newThought);
            archive.add(newThought);
            return newThought;
        }
        // Add thought to DOM without adding to archive (used when loading from DB)
        addThoughtToPage(thought, showText = false) {
            let correspondingPage = this.findPageAtY(thought.y);
            if (correspondingPage) {
                correspondingPage.appendChild(thought.element);
            }
            else {
                // Create pages as needed for the thought's y position
                while (!correspondingPage) {
                    this.currentPage = this.createNewPage();
                    correspondingPage = this.findPageAtY(thought.y);
                }
                correspondingPage.appendChild(thought.element);
            }
            // Only show text when loading from DB, not when creating new thought
            if (showText)
                thought.updateText();
            this.updateEndOfPageMarkerStyle();
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
            if (this.currentThought) {
                this.currentThought.setTextVisible();
                archive.organizeThoughtList();
                // Sync to DB
                if (archive.isLoggedIn()) {
                    archive.updateThoughtInDb(this.currentThought);
                }
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
                const distance = Math.sqrt((x - thought.x) ** 2 + (y - thought.y) ** 2);
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

    exports.EventManager = EventManager;

    return exports;

})({});
//# sourceMappingURL=app.js.map
