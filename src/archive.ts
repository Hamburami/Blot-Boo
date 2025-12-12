import { Thought } from "./thought";
import { EventManager } from "./note-blot";

const API_URL = 'https://blot.boo/api';

export interface Connection {
    label: string
    weight: number
    id: string
    nodes: [Thought, Thought]
    drawn: boolean
}

export class Archive {
    allThoughts: Thought[]
    eventManager: EventManager
    thoughtList: HTMLElement;
    connections: Connection[];

    constructor(em: EventManager) {
        this.eventManager = em;
        this.thoughtList = document.getElementById('thoughtList') as HTMLElement;
        this.allThoughts = [];
        this.connections = [];

        if (!this.thoughtList) {
            throw new Error("Thought list element not found");
        }
    }

    getToken(): string | null {
        return localStorage.getItem('blot_session_token');
    }

    isLoggedIn(): boolean {
        return this.getToken() !== null;
    }

    add(thought: Thought) {
        this.allThoughts.push(thought);
        this.addThoughtListCard(thought);
        this.organize();
        
        // Save to DB if logged in
        if (this.isLoggedIn()) {
            this.saveThoughtToDb(thought);
        }
    }

    async saveThoughtToDb(thought: Thought) {
        const token = this.getToken();
        if (!token) return;

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
        } catch (error) {
            console.error('Failed to save thought:', error);
        }
    }

    async updateThoughtInDb(thought: Thought) {
        // Same as save - upsert handles both
        await this.saveThoughtToDb(thought);
    }

    async deleteThoughtFromDb(thought: Thought) {
        const token = this.getToken();
        if (!token) return;

        try {
            await fetch(`${API_URL}/user/thoughts/${thought.getId()}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to delete thought:', error);
        }
    }

    async loadThoughtsFromDb(): Promise<void> {
        const token = this.getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/user/thoughts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            if (!data.thoughts || !Array.isArray(data.thoughts)) return;

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
        } catch (error) {
            console.error('Failed to load thoughts:', error);
        }
    }

    async syncAllThoughts() {
        const token = this.getToken();
        if (!token) return;

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
        } catch (error) {
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
        this.allThoughts.sort((a: Thought, b: Thought) => a.getId() - b.getId());
        let duplicates: number[] = [];
        for (let i = 0; i < this.allThoughts.length-1; i++) {
            if (this.allThoughts[i].getId() == this.allThoughts[i + 1].getId()
                && this.allThoughts[i].text == this.allThoughts[i + 1].text) {
                duplicates.push(i+1);
            }
        }

        for (const i of duplicates) {
            this.allThoughts.splice(i, 1);
        }
    }

    addThoughtListCard(thought: Thought) {
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
                if (lineCount >= 3) break;
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
        } else {
            this.thoughtList.classList.add('hidden');
        }
    }

    save() {
        // Local storage backup
        localStorage.setItem('archive-data',
            JSON.stringify({ 
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
            })
        );

        // Also sync to DB if logged in
        if (this.isLoggedIn()) {
            this.syncAllThoughts();
        }
    }

    ignore(thought: Thought) {
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
