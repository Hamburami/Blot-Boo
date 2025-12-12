// Auth Test JavaScript
// This simulates the auth flow - will connect to Cloudflare Worker API

const AUTH_API_URL = 'https://blot.boo/api/auth';

class AuthManager {
    constructor() {
        this.authPanel = document.getElementById('authPanel');
        this.authButton = document.getElementById('authButton');
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        this.loggedInView = document.getElementById('loggedInView');
        
        this.currentUser = null;
        this.sessionToken = localStorage.getItem('blot_session_token');
        
        this.setupEventListeners();
        this.checkSession();
    }

    setupEventListeners() {
        // Toggle auth panel
        this.authButton.addEventListener('click', () => {
            this.authPanel.classList.toggle('hidden');
        });

        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Login form
        document.getElementById('loginSubmit').addEventListener('click', () => {
            this.handleLogin();
        });

        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Signup form
        document.getElementById('signupSubmit').addEventListener('click', () => {
            this.handleSignup();
        });

        document.getElementById('signupPasswordConfirm').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignup();
        });

        // Logout
        document.getElementById('logoutButton').addEventListener('click', () => {
            this.handleLogout();
        });
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
            
            // Call your Cloudflare Worker API
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
                this.showMessage('login', 'Signed in successfully!', 'success');
            } else {
                this.showMessage('login', data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('login', 'Network error - using demo mode', 'error');
            // Demo mode for testing
            this.demoLogin(email);
        }
    }

    async handleSignup() {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

        // Validation
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
                this.showMessage('signup', 'Account created successfully!', 'success');
            } else {
                this.showMessage('signup', data.error || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage('signup', 'Network error - using demo mode', 'error');
            // Demo mode for testing
            this.demoLogin(email);
        }
    }

    handleLogout() {
        this.sessionToken = null;
        this.currentUser = null;
        localStorage.removeItem('blot_session_token');
        this.showLoginView();
        this.switchTab('login');
    }

    async checkSession() {
        if (!this.sessionToken) {
            this.showLoginView();
            return;
        }

        try {
            const response = await fetch(`${AUTH_API_URL}/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.showLoggedInView();
            } else {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Session check error:', error);
            // Demo mode - assume valid session
            this.demoLogin('demo@example.com');
        }
    }

    showLoggedInView() {
        // Hide forms and tabs
        this.loginForm.classList.add('hidden');
        this.signupForm.classList.add('hidden');
        document.querySelector('.auth-panel__header').classList.add('hidden');
        
        // Show logged in view
        this.loggedInView.classList.remove('hidden');
        document.getElementById('userEmail').textContent = this.currentUser?.email || 'User';
        
        // Update button to show logged in state
        this.authButton.style.background = 'rgba(76, 175, 80, 0.2)';
        this.authButton.style.borderColor = 'rgba(76, 175, 80, 0.4)';
    }

    showLoginView() {
        // Show forms and tabs
        document.querySelector('.auth-panel__header').classList.remove('hidden');
        this.loginForm.classList.remove('hidden');
        this.signupForm.classList.add('hidden');
        this.loggedInView.classList.add('hidden');
        
        // Reset button style
        this.authButton.style.background = 'rgba(44, 24, 16, 0.1)';
        this.authButton.style.borderColor = 'rgba(44, 24, 16, 0.2)';
        
        this.switchTab('login');
    }

    showMessage(form, message, type) {
        const messageEl = document.getElementById(`${form}Message`);
        messageEl.textContent = message;
        messageEl.className = `auth-form__message ${type}`;
    }

    // Demo mode for testing UI without backend
    demoLogin(email) {
        this.currentUser = { email, id: 'demo-123' };
        this.sessionToken = 'demo-token-' + Date.now();
        localStorage.setItem('blot_session_token', this.sessionToken);
        this.showLoggedInView();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    console.log('Auth test initialized - UI ready for testing');
    console.log('Note: API endpoints not connected yet - using demo mode');
});

