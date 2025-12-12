const AUTH_API_URL = 'https://blot.boo/api/auth';

interface User {
    id: number | string;
    email: string;
}

// Callback for when user logs in - set by note-blot.ts
let onLoginCallback: (() => void) | null = null;

export function setOnLoginCallback(callback: () => void) {
    onLoginCallback = callback;
}

export class AuthManager {
    authPanel: HTMLElement;
    authButton: HTMLElement;
    loginForm: HTMLElement;
    signupForm: HTMLElement;
    loggedInView: HTMLElement;
    currentUser: User | null = null;
    sessionToken: string | null;

    constructor() {
        this.authPanel = document.getElementById('authPanel')!;
        this.authButton = document.getElementById('authButton')!;
        this.loginForm = document.getElementById('loginForm')!;
        this.signupForm = document.getElementById('signupForm')!;
        this.loggedInView = document.getElementById('loggedInView')!;
        this.sessionToken = localStorage.getItem('blot_session_token');
        
        this.setupEventListeners();
        this.checkSession();
    }

    setupEventListeners() {
        this.authButton.addEventListener('click', () => this.authPanel.classList.toggle('hidden'));

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab((e.target as HTMLElement).dataset.tab!));
        });

        document.getElementById('loginSubmit')!.addEventListener('click', () => this.handleLogin());
        document.getElementById('loginPassword')!.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('signupSubmit')!.addEventListener('click', () => this.handleSignup());
        document.getElementById('signupPasswordConfirm')!.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignup();
        });

        document.getElementById('logoutButton')!.addEventListener('click', () => this.handleLogout());
    }

    switchTab(tabName: string) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabName);
        });
        this.loginForm.classList.toggle('hidden', tabName !== 'login');
        this.signupForm.classList.toggle('hidden', tabName === 'login');
    }

    async handleLogin() {
        const email = (document.getElementById('loginEmail') as HTMLInputElement).value.trim();
        const password = (document.getElementById('loginPassword') as HTMLInputElement).value;

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
            } else {
                this.showMessage('login', data.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.showMessage('login', 'Network error', 'error');
        }
    }

    async handleSignup() {
        const email = (document.getElementById('signupEmail') as HTMLInputElement).value.trim();
        const password = (document.getElementById('signupPassword') as HTMLInputElement).value;
        const passwordConfirm = (document.getElementById('signupPasswordConfirm') as HTMLInputElement).value;

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
            } else {
                this.showMessage('signup', data.error || 'Signup failed', 'error');
            }
        } catch (error) {
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
            } else {
                this.handleLogout();
            }
        } catch (error) {
            this.handleLogout();
        }
    }

    showLoggedInView() {
        this.loginForm.classList.add('hidden');
        this.signupForm.classList.add('hidden');
        document.querySelector('.auth-panel__header')?.classList.add('hidden');
        this.loggedInView.classList.remove('hidden');
        document.getElementById('userEmail')!.textContent = this.currentUser?.email || 'User';
        document.getElementById('loginMessage')!.textContent = '';
        document.getElementById('signupMessage')!.textContent = '';
        this.authButton.classList.add('logged-in');
        
        // Trigger callback to load user's thoughts
        if (onLoginCallback) onLoginCallback();
    }

    showLoginView() {
        document.querySelector('.auth-panel__header')?.classList.remove('hidden');
        this.loginForm.classList.remove('hidden');
        this.signupForm.classList.add('hidden');
        this.loggedInView.classList.add('hidden');
        this.authButton.classList.remove('logged-in');
        this.switchTab('login');
    }

    showMessage(form: string, message: string, type: string) {
        const messageEl = document.getElementById(`${form}Message`)!;
        messageEl.textContent = message;
        messageEl.className = `auth-form__message ${type}`;
    }

    getUser(): User | null {
        return this.currentUser;
    }

    getToken(): string | null {
        return this.sessionToken;
    }

    isLoggedIn(): boolean {
        return this.currentUser !== null;
    }
}

