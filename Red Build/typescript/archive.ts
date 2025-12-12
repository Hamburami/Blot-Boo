import { Thought } from "./thought";
import { EventManager } from "./note-blot";

export interface Connection {
    label: string
    weight: number
    id: string // is this bloated ewith info?
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

        // if (localStorage.getItem('archive-data')) {
        //     const data = JSON.parse(localStorage.getItem('archive-data') as string);
        //     this.allThoughts = data.thoughts.map((t: any) => new Thought(t.text, t.x, t.y, t.id));
        //     this.connections = data.connections.map((c: any) => ({
        //         label: c.label,
        //         weight: c.weight,
        //         id: c.id,
        //         nodes: c.nodes.map((n: any) => this.allThoughts.find(t => t.getId() === n)!)
        //     }));
        // }

        if (!this.thoughtList) {
            throw new Error("Thought list element not found");
        }
    }

    add(thought: Thought) {
        //console.log("Adding thought to archive:", this.allThoughts);
        this.allThoughts.push(thought);
        this.addThoughtListCard(thought);
        this.organize();
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
                // TODO add an addition confirmation button to reactivate deleted thought
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
        //for (let i = 0; i < Math.min(255, thought.text.length); i++) {
        for (let i = 0; i < thought.text.length; i++) {
            let char = thought.text[i];
            if (char === '\n') {
                char = '<br>';
                lineCount++;
                if (lineCount >= 3) {
                    break;
                }
            }
            htmlContent += (thought.text[i] === '\n') ? '<br>' : thought.text[i];
        }
        // if (thought.text.length > 255 || lineCount >= 3) {
        //     text.classList.add('thought-card__text--truncated');
        // }
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
            this.organizeThoughtList(); //safety
            this.thoughtList.classList.remove('hidden');
            // No need to check if thoughtcard exists because we add it everytime one is added to archive
            // this.thoughtList.innerHTML = '';
            // this.allThoughts.forEach(t => {
                
            // });
        } else {
            this.thoughtList.classList.add('hidden');
        }
    }

    save() {
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
        )
    }

    ignore(Thought: Thought) {
        const index = this.allThoughts.indexOf(Thought);
        if (index > -1) {
            this.allThoughts.splice(index, 1);
        }
    }
}
