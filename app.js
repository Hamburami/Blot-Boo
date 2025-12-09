var ThoughtVoidApp = (function (exports) {
    'use strict';

    const State = {
        thoughts: [],
        connections: [],
        voidThoughts: new Map(), // id -> {element,vx,vy,driftX,driftY,interactionTime,pullDecayTime}
        activeThoughts: new Set(),
        hoveredId: null,
        cursor: {
            x: 0,
            y: 0,
            down: false,
            path: [],
            lastTrail: null,
            cursorTrail: [],
            fade: null
        },
        currentThought: null,
        portalOpen: false,
        geo: { latitude: null, longitude: null },
        constants: {
            FLOAT: 0.01,
            JIGGLE: 0.1,
            COLLISION_PAD: 25,
            BASE_DAMPING: 0.96,
            DECAY: 7000,
            PULL_STRENGTH: 15,
            PULL_DECAY: 10000,
            CONNECT_STRENGTH: 0.5,
            GRAVITY: 0.0003,
            GRAVITY_MIN: 80,
            GRAVITY_DURATION: 3000
        }
    };

    const globalBase = (typeof window !== 'undefined' && (window.__API_BASE__ || window.API_BASE)) ||
        '';
    const metaBase = typeof document !== 'undefined'
        ? document.querySelector('meta[name="api-base"]')?.content || ''
        : '';
    const normalized = (globalBase || metaBase || '').trim().replace(/\/$/, '');
    const API_BASE = normalized;
    function withApi(path) {
        const suffix = path.startsWith('/') ? path : `/${path}`;
        return API_BASE ? `${API_BASE}${suffix}` : suffix;
    }

    async function saveThought(text) {
        const r = await fetch(withApi('/api/thoughts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                latitude: State.geo.latitude,
                longitude: State.geo.longitude
            })
        });
        if (!r.ok) {
            const err = await safeJson(r);
            throw new Error(err?.error || 'Failed to save thought');
        }
        return r.json();
    }
    async function loadRecentThoughts() {
        const r = await fetch(withApi('/api/thoughts'));
        if (!r.ok) {
            const err = await safeJson(r);
            throw new Error(err?.error || 'Failed to load thoughts');
        }
        const d = await r.json();
        // Get timeChunkMs from response
        const timeChunkMs = d.timeChunkMs;
        const nowUtc = Date.now();
        // Flatten all chunks into a single array of thoughts
        const allThoughts = [];
        const chunks = Array.isArray(d.chunks) ? d.chunks : [];
        chunks.forEach(chunk => {
            if (chunk.thoughts) {
                allThoughts.push(...chunk.thoughts);
            }
        });
        // Categorize thoughts based on age relative to NOW
        const categorizedThoughts = [];
        for (const thought of allThoughts) {
            const thoughtTime = new Date(thought.createdAt).getTime();
            const ageMs = nowUtc - thoughtTime;
            let fadeClass;
            if (ageMs < timeChunkMs) {
                fadeClass = 'clear';
            }
            else if (ageMs < 2 * timeChunkMs) {
                fadeClass = 'almost-clear';
            }
            else if (ageMs < 3 * timeChunkMs) {
                fadeClass = 'slightly-faded';
            }
            else if (ageMs < 4 * timeChunkMs) {
                fadeClass = 'most-faded';
            }
            else {
                // Skip thoughts older than 4 time chunks
                continue;
            }
            categorizedThoughts.push({
                ...thought,
                fadeClass
            });
        }
        State.thoughts = categorizedThoughts;
        State.connections = Array.isArray(d.connections) ? d.connections : [];
    }
    async function safeJson(response) {
        try {
            return await response.json();
        }
        catch {
            return null;
        }
    }

    function renderInitial() {
        const stream = document.getElementById('void-stream');
        // Preserve existing positions before clearing
        const savedPositions = new Map();
        State.voidThoughts.forEach((vt, id) => {
            const el = vt.element;
            savedPositions.set(id, {
                left: el.style.left,
                top: el.style.top,
                vx: vt.vx,
                vy: vt.vy,
                driftX: vt.driftX,
                driftY: vt.driftY
            });
        });
        stream.innerHTML = '';
        State.voidThoughts.clear();
        const streamRect = stream.getBoundingClientRect();
        State.thoughts.forEach(t => {
            const el = document.createElement('div');
            el.className = 'void-thought';
            el.dataset.id = t.id;
            // Apply fade class from chunk-based grouping
            if (t.fadeClass) {
                el.classList.add(t.fadeClass);
            }
            const txt = document.createElement('div');
            txt.textContent = t.text;
            const time = document.createElement('time');
            time.dateTime = t.createdAt;
            time.textContent = new Date(t.createdAt).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
            });
            el.append(txt, time);
            stream.appendChild(el);
            // Restore position if it exists, otherwise set random
            const saved = savedPositions.get(t.id);
            if (saved) {
                el.style.left = saved.left;
                el.style.top = saved.top;
                State.voidThoughts.set(t.id, {
                    element: el,
                    vx: saved.vx,
                    vy: saved.vy,
                    driftX: saved.driftX,
                    driftY: saved.driftY
                });
            }
            else {
                // New thought - set random initial position
                const rect = el.getBoundingClientRect();
                const maxX = Math.max(0, streamRect.width - rect.width);
                const maxY = Math.max(0, streamRect.height - rect.height);
                const x = Math.random() * maxX;
                const y = Math.random() * maxY;
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
                State.voidThoughts.set(t.id, { element: el, vx: 0, vy: 0, driftX: 0, driftY: 0 });
            }
        });
    }
    function updateBlur() {
        const countFor = id => State.connections.filter(c => c.thought_a === id || c.thought_b === id).length;
        State.voidThoughts.forEach((t, id) => {
            const c = countFor(id);
            t.element.classList.remove('no-connections', 'one-connection', 'two-connections', 'stable');
            if (c === 0)
                t.element.classList.add('no-connections');
            else if (c === 1)
                t.element.classList.add('one-connection');
            else if (c === 2)
                t.element.classList.add('two-connections');
            else
                t.element.classList.add('stable');
        });
    }

    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
    function centerOf(el, relativeRect) {
        const r = el.getBoundingClientRect();
        return {
            x: r.left + r.width / 2 - relativeRect.left,
            y: r.top + r.height / 2 - relativeRect.top
        };
    }

    function renderConnections() {
        const svg = document.getElementById('connection-svg');
        svg.innerHTML = '';
        const stream = document.getElementById('void-stream');
        const rect = stream.getBoundingClientRect();
        const groups = new Map();
        State.connections.forEach(c => {
            const k = [c.thought_a, c.thought_b].sort().join('-');
            if (!groups.has(k))
                groups.set(k, []);
            groups.get(k).push(c);
        });
        groups.forEach((arr, key) => {
            const [a, b] = key.split('-').map(Number);
            const A = State.voidThoughts.get(a), B = State.voidThoughts.get(b);
            if (!A || !B)
                return;
            const pA = centerOf(A.element, rect), pB = centerOf(B.element, rect);
            const mid = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
            const curve = Math.abs(pB.x - pA.x) * 0.3;
            arr.forEach((_, i) => {
                const dx = i - (arr.length - 1) / 2;
                const p0 = { x: pA.x + dx * 2, y: pA.y + dx * 1.5 };
                const p2 = { x: pB.x + dx * 2, y: pB.y + dx * 1.5 };
                const p1 = { x: mid.x + dx * 2, y: mid.y - curve };
                const path = `M${p0.x},${p0.y} Q${p1.x},${p1.y} ${p2.x},${p2.y}`;
                const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                el.setAttribute('d', path);
                el.setAttribute('data-conn', key);
                el.classList.add('connection-line');
                if (arr.length > 1)
                    el.classList.add('multiple');
                svg.appendChild(el);
            });
        });
    }

    function setupCanvas() {
        const canvas = document.getElementById('draw-canvas');
        if (!canvas)
            throw new Error('draw-canvas element missing');
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('2d context unavailable');
        function resize() {
            const r = canvas.getBoundingClientRect();
            canvas.width = r.width;
            canvas.height = r.height;
        }
        resize();
        window.addEventListener('resize', resize);
        return { canvas, ctx };
    }
    function redraw(ctx) {
        const c = State.cursor;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // active stroke path (while drawing)
        if (c.down && c.path && c.path.length > 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(c.path[0].x, c.path[0].y);
            for (let i = 1; i < c.path.length; i++)
                ctx.lineTo(c.path[i].x, c.path[i].y);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
        // fade path
        if (c.fade && c.fade.path.length > 1) {
            ctx.strokeStyle = `rgba(255,255,255,${c.fade.alpha})`;
            ctx.beginPath();
            const p = c.fade.path;
            ctx.moveTo(p[0].x, p[0].y);
            for (let i = 1; i < p.length; i++)
                ctx.lineTo(p[i].x, p[i].y);
            ctx.stroke();
            c.fade.alpha -= 0.02;
            if (c.fade.alpha <= 0)
                c.fade = null;
        }
        // cursor trail
        const trail = c.cursorTrail;
        if (trail.length > 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++)
                ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
            const last = trail[trail.length - 1];
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(last.x, last.y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function updateCursorTrail(pt) {
        const c = State.cursor;
        const now = Date.now();
        if (!c.down) {
            if (!c.lastTrail || Math.hypot(pt.x - c.lastTrail.x, pt.y - c.lastTrail.y) > 1.5) {
                c.cursorTrail.push({ ...pt, time: now });
                c.lastTrail = pt;
            }
            c.cursorTrail = c.cursorTrail.filter(p => now - p.time < 200);
        }
        else {
            c.cursorTrail = [];
        }
    }

    function updateAll(state) {
        if (state.voidThoughts.size === 0)
            return;
        const streamRect = document.getElementById('void-stream').getBoundingClientRect();
        const now = Date.now();
        const C = state.constants;
        state.voidThoughts.forEach((A, idA) => {
            if (A.vx === undefined) {
                A.vx = 0;
                A.vy = 0;
            }
            if (A.driftX === undefined) {
                A.driftX = (Math.random() - 0.5) * 0.4;
                A.driftY = (Math.random() - 0.5) * 0.4;
            }
            const decaying = A.interactionTime && now - A.interactionTime < (A.pullDecayTime || C.DECAY);
            if (!decaying) {
                const speed = Math.hypot(A.vx, A.vy);
                if (speed < 0.5) {
                    A.driftX = (A.driftX + (Math.random() - 0.5) * 0.005);
                    A.driftY = (A.driftY + (Math.random() - 0.5) * 0.005);
                    A.driftX = clamp(A.driftX, -0.15, 0.15);
                    A.driftY = clamp(A.driftY, -0.15, 0.15);
                    A.vx += A.driftX * C.FLOAT;
                    A.vy += A.driftY * C.FLOAT;
                }
                else {
                    A.driftX *= 0.9;
                    A.driftY *= 0.9;
                }
            }
            else {
                A.driftX = 0;
                A.driftY = 0;
                const t = (now - A.interactionTime) / (A.pullDecayTime || C.DECAY);
                if (A.pullDecayTime) {
                    const d = 0.96 - (0.08 * Math.pow(t, 1.5));
                    A.vx *= d;
                    A.vy *= d;
                }
                else {
                    const d = 0.80 + 0.15 * t;
                    A.vx *= d;
                    A.vy *= d;
                }
            }
            if (!decaying) {
                A.vx *= C.BASE_DAMPING;
                A.vy *= C.BASE_DAMPING;
            }
            const elA = A.element;
            const rectA = elA.getBoundingClientRect();
            const xA = (parseFloat(elA.style.left) || 0) + rectA.width / 2;
            const yA = (parseFloat(elA.style.top) || 0) + rectA.height / 2;
            // collisions + gravitation
            state.voidThoughts.forEach((B, idB) => {
                if (idA === idB)
                    return;
                const elB = B.element;
                const rectB = elB.getBoundingClientRect();
                const xB = (parseFloat(elB.style.left) || 0) + rectB.width / 2;
                const yB = (parseFloat(elB.style.top) || 0) + rectB.height / 2;
                const dx = xB - xA, dy = yB - yA, d = Math.hypot(dx, dy);
                if (!d)
                    return;
                // collision
                const minD = (rectA.width + rectB.width) / 2 + C.COLLISION_PAD;
                if (d < minD) {
                    const f = (minD - d) * 0.03;
                    A.vx -= (dx / d) * f;
                    A.vy -= (dy / d) * f;
                }
                // gravitation if connected recently
                const conn = state.connections.find(c => (c.thought_a === idA && c.thought_b === idB) || (c.thought_b === idA && c.thought_a === idB));
                if (conn) {
                    const age = now - new Date(conn.createdAt).getTime();
                    if (age < C.GRAVITY_DURATION && d > C.GRAVITY_MIN) {
                        const fade = 1 - (age / C.GRAVITY_DURATION);
                        const force = C.GRAVITY * (d - C.GRAVITY_MIN) * fade;
                        A.vx += (dx / d) * force;
                        A.vy += (dy / d) * force;
                    }
                }
            });
            // hover jiggle
            if (state.hoveredId === idA && !decaying) {
                A.vx += (Math.random() - 0.5) * C.JIGGLE;
                A.vy += (Math.random() - 0.5) * C.JIGGLE;
            }
            // integrate
            const nx = xA + A.vx, ny = yA + A.vy;
            const left = clamp(nx - rectA.width / 2, 0, streamRect.width - rectA.width);
            const top = clamp(ny - rectA.height / 2, 0, streamRect.height - rectA.height);
            elA.style.left = `${left}px`;
            elA.style.top = `${top}px`;
            // decay cutoff
            if (A.interactionTime && now - A.interactionTime >= (A.pullDecayTime || C.DECAY)) {
                if (Math.abs(A.vx) < 0.003 && Math.abs(A.vy) < 0.003) {
                    A.vx = 0;
                    A.vy = 0;
                    delete A.interactionTime;
                    delete A.pullDecayTime;
                }
            }
        });
    }

    function beginStroke(pt) {
        const c = State.cursor;
        c.down = true;
        c.path = [pt];
        State.activeThoughts.clear();
    }
    function extendStroke(pt) {
        const c = State.cursor;
        if (!c.down)
            return;
        c.path.push(pt);
        detectHits(pt);
    }
    function endStroke() {
        const c = State.cursor;
        if (!c.down)
            return;
        c.down = false;
        const hits = [...State.activeThoughts];
        // if (hits.length===2){
        //   connect(hits[0], hits[1]);
        // } else if (hits.length===1){
        //   pull(hits[0], State.cursor.path);
        // } else {
        //   sever(State.cursor.path);
        // }
        pull(hits[hits.length - 1], State.cursor.path);
        fadePath();
        State.activeThoughts.clear();
    }
    function detectHits(pt) {
        const stream = document.getElementById('void-stream');
        const rect = stream.getBoundingClientRect();
        State.voidThoughts.forEach((T, id) => {
            const R = T.element.getBoundingClientRect();
            const left = R.left - rect.left, top = R.top - rect.top;
            const hit = pt.x >= left - 10 && pt.x <= left + R.width + 10 &&
                pt.y >= top - 10 && pt.y <= top + R.height + 10;
            if (hit) {
                T.element.classList.add('glowing');
                State.activeThoughts.add(id);
            }
            else {
                T.element.classList.remove('glowing');
            }
        });
    }
    function pull(id, path) {
        const T = State.voidThoughts.get(id);
        if (!T || path.length < 2)
            return;
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        }
        const scale = Math.max(0.2, Math.min(1, length / 100));
        const mid = path[Math.floor(path.length / 2)] || path[0];
        const end = path[path.length - 1];
        const dx = end.x - mid.x, dy = end.y - mid.y, L = Math.hypot(dx, dy);
        if (!L)
            return;
        const v = State.constants.PULL_STRENGTH * scale;
        T.vx += (dx / L) * v;
        T.vy += (dy / L) * v;
        T.interactionTime = Date.now();
        T.pullDecayTime = State.constants.PULL_DECAY;
    }
    function fadePath() {
        State.cursor.fade = {
            path: [...State.cursor.path],
            alpha: 0.7
        };
        State.cursor.path = [];
    }

    function setupTyping() {
        document.addEventListener('keydown', e => {
            if (State.portalOpen)
                return;
            if (e.ctrlKey || e.metaKey || e.altKey)
                return;
            if (['Enter', 'Backspace', 'Delete', 'Escape', ' '].includes(e.key))
                return;
            if (!State.currentThought && e.key.length === 1) {
                e.preventDefault();
                const canvas = document.getElementById('canvas');
                if (!canvas)
                    return;
                const r = canvas.getBoundingClientRect();
                const x = State.cursor.x - r.left, y = State.cursor.y - r.top;
                const tpl = document.getElementById('thought-template');
                if (!tpl || !tpl.content.firstElementChild)
                    return;
                const node = tpl.content.firstElementChild.cloneNode(true);
                node.style.left = `${x}px`;
                node.style.top = `${y}px`;
                node.textContent = e.key;
                document.getElementById('thought-column')?.appendChild(node);
                State.currentThought = node;
                focusAtEnd(node);
            }
        });
        // Setup drawing in the void
        const drawCanvas = document.getElementById('draw-canvas');
        if (drawCanvas) {
            drawCanvas.addEventListener('pointerdown', handlePointerDown);
            drawCanvas.addEventListener('pointermove', handlePointerMove);
            drawCanvas.addEventListener('pointerup', handlePointerUp);
            drawCanvas.addEventListener('pointercancel', handlePointerUp);
        }
        // Track cursor position globally
        document.addEventListener('pointermove', e => {
            State.cursor.x = e.clientX;
            State.cursor.y = e.clientY;
        });
    }
    function handlePointerDown(e) {
        if (!State.portalOpen)
            return;
        e.preventDefault();
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        beginStroke(pt);
    }
    function handlePointerMove(e) {
        if (!State.portalOpen)
            return;
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (State.cursor.down) {
            extendStroke(pt);
        }
        else {
            updateCursorTrail(pt);
        }
    }
    function handlePointerUp(e) {
        if (!State.portalOpen)
            return;
        e.preventDefault();
        endStroke();
    }
    function focusAtEnd(el) {
        requestAnimationFrame(() => {
            el.focus();
            const s = window.getSelection(), r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(false);
            s.removeAllRanges();
            s.addRange(r);
        });
    }

    function setupVoid() {
        const exit = document.getElementById('exit-void');
        const portal = document.getElementById('void-portal');
        const voidEl = document.getElementById('void');
        voidEl.addEventListener('click', () => {
            enterVoid();
        });
        exit.addEventListener('click', () => {
            portal.classList.remove('active');
            State.portalOpen = false;
        });
    }
    async function enterVoid() {
        const portal = document.getElementById('void-portal');
        portal.classList.add('active');
        State.portalOpen = true;
        // Reload thoughts from API to get latest data
        await loadRecentThoughts();
        renderInitial();
        updateBlur();
        //renderConnections();
    }

    let dragEl = null;
    let downX = 0;
    let downY = 0;
    function setupDragging() {
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    function handleMouseDown(event) {
        State.cursor.down = true;
        updateCursorPosition(event);
        downX = event.clientX;
        downY = event.clientY;
        const targetThought = event.target.closest('.thought');
        if (targetThought) {
            event.preventDefault();
            dragEl = targetThought;
            dragEl.isDragging = false;
            dragEl.dataset.initialLeft = dragEl.style.left || '0';
            dragEl.dataset.initialTop = dragEl.style.top || '0';
            State.currentThought = dragEl;
        }
        else {
            State.currentThought = null;
            dragEl = null;
        }
    }
    function handleMouseMove(event) {
        updateCursorPosition(event);
        if (!dragEl)
            return;
        const deltaX = event.clientX - downX;
        const deltaY = event.clientY - downY;
        if (!dragEl.isDragging && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
            dragEl.isDragging = true;
            dragEl.classList.add('dragging');
            if (document.activeElement === dragEl) {
                dragEl.blur();
            }
        }
        if (dragEl.isDragging) {
            const startX = parseFloat(dragEl.dataset.initialLeft) || 0;
            const startY = parseFloat(dragEl.dataset.initialTop) || 0;
            dragEl.style.left = `${startX + deltaX}px`;
            dragEl.style.top = `${startY + deltaY}px`;
            toggleVoidHighlight(dragEl);
        }
    }
    async function handleMouseUp() {
        State.cursor.down = false;
        if (!dragEl)
            return;
        try {
            if (dragEl.isDragging && insideVoid(dragEl)) {
                await dispatchThought(dragEl);
            }
            else if (!dragEl.isDragging) {
                dragEl.focus();
            }
        }
        catch (error) {
            console.error('Failed to dispatch thought', error);
        }
        finally {
            cleanupDrag();
        }
    }
    async function dispatchThought(el) {
        const text = el.innerText.trim();
        if (!text) {
            el.remove();
            return;
        }
        el.classList.add('launching');
        try {
            await saveThought(text);
            el.remove();
            enterVoid();
        }
        finally {
            el.classList.remove('launching');
        }
    }
    function cleanupDrag() {
        if (dragEl) {
            dragEl.classList.remove('dragging');
            dragEl.isDragging = false;
            delete dragEl.dataset.initialLeft;
            delete dragEl.dataset.initialTop;
        }
        dragEl = null;
        resetVoidHighlight();
    }
    function insideVoid(el) {
        const voidRect = document.getElementById('void').getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        const thoughtCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
        const voidCenter = {
            x: voidRect.left + voidRect.width / 2,
            y: voidRect.top + voidRect.height / 2,
        };
        return Math.hypot(thoughtCenter.x - voidCenter.x, thoughtCenter.y - voidCenter.y) < voidRect.width * 0.45;
    }
    function toggleVoidHighlight(el) {
        const voidEl = document.getElementById('void');
        const voidRect = voidEl.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        const center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
        const voidCenter = {
            x: voidRect.left + voidRect.width / 2,
            y: voidRect.top + voidRect.height / 2,
        };
        const distance = Math.hypot(center.x - voidCenter.x, center.y - voidCenter.y);
        if (distance < voidRect.width / 2) {
            voidEl.style.filter = 'blur(0)';
            voidEl.style.width = '160px';
            voidEl.style.height = '160px';
        }
        else {
            resetVoidHighlight();
        }
    }
    function resetVoidHighlight() {
        const voidEl = document.getElementById('void');
        voidEl.style.filter = '';
        voidEl.style.width = '';
        voidEl.style.height = '';
    }
    function updateCursorPosition(event) {
        State.cursor.x = event.clientX;
        State.cursor.y = event.clientY;
    }

    async function start() {
        await loadRecentThoughts();
        renderInitial();
        renderConnections();
        updateBlur();
        setupTyping();
        setupDragging();
        setupVoid();
        const { ctx } = setupCanvas();
        function loop() {
            updateAll(State);
            renderConnections();
            redraw(ctx);
            requestAnimationFrame(loop);
        }
        loop();
    }
    start();

    exports.start = start;

    return exports;

})({});
//# sourceMappingURL=app.js.map
