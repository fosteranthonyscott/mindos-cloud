// Authentication Module - FIXED VERSION
const Auth = {
    // Initialize auth event listeners
    init() {
        this.setupEventListeners();
    },
    
    // Setup authentication event listeners
    setupEventListeners() {
        // Login form
        document.getElementById('loginBtn').addEventListener('click', this.login.bind(this));
        
        // Register form
        document.getElementById('registerBtn').addEventListener('click', this.register.bind(this));
        
        // Enter key on input fields
        document.querySelectorAll('#loginForm input, #registerForm input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const form = input.closest('#loginForm') ? 'login' : 'register';
                    if (form === 'login') {
                        this.login();
                    } else {
                        this.register();
                    }
                }
            });
        });
    },
    
    // Helper function to safely show alerts
    showAlert(message, type = 'error') {
        if (typeof Utils !== 'undefined' && Utils.showAlert) {
            Utils.showAlert(message, type);
        } else {
            // Fallback to native alert if Utils not available
            alert(message);
        }
    },
    
    // Login function
    async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validation
        if (!this.validateLoginForm(email, password)) {
            return;
        }
        
        const loginBtn = document.getElementById('loginBtn');
        this.setButtonLoading(loginBtn, true);
        
        try {
            const response = await API.post('/api/login', { email, password });
            
            // Store auth data
            MindOS.token = response.token;
            MindOS.user = response.user;
            localStorage.setItem('mindos_token', MindOS.token);
            localStorage.setItem('mindos_user', JSON.stringify(MindOS.user));
            
            // Clear form
            this.clearLoginForm();
            
            // Show chat app
            await App.showChatApp();
            
            this.showAlert(`Welcome back, ${MindOS.user.username}!`, 'success');
            
        } catch (error) {
            this.showAlert(error.message, 'error');
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    },
    
    // Register function
    async register() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        // Validation
        if (!this.validateRegisterForm(username, email, password)) {
            return;
        }
        
        const registerBtn = document.getElementById('registerBtn');
        this.setButtonLoading(registerBtn, true);
        
        try {
            const response = await API.post('/api/register', { username, email, password });
            
            // Store auth data
            MindOS.token = response.token;
            MindOS.user = response.user;
            localStorage.setItem('mindos_token', MindOS.token);
            localStorage.setItem('mindos_user', JSON.stringify(MindOS.user));
            
            // Clear form
            this.clearRegisterForm();
            
            // Show chat app
            await App.showChatApp();
            
            this.showAlert(`Welcome to MindOS, ${MindOS.user.username}!`, 'success');
            
        } catch (error) {
            this.showAlert(error.message, 'error');
        } finally {
            this.setButtonLoading(registerBtn, false);
        }
    },
    
    // Logout function
    logout() {
        // Clear auth data
        App.clearAuth();
        
        // Reset app state
        MindOS.sessionInfo = {};
        MindOS.userMemories = [];
        MindOS.selectedMemory = null;
        MindOS.pendingAction = null;
        MindOS.memoryChanges = {};
        MindOS.currentConfigMode = null;
        MindOS.configData = {};
        MindOS.pendingMemories = [];
        
        // Clear auto-save timeout
        if (MindOS.autoSaveTimeout) {
            clearTimeout(MindOS.autoSaveTimeout);
            MindOS.autoSaveTimeout = null;
        }
        
        // Close sidebar and modals
        if (typeof UI !== 'undefined' && UI.closeSidebar) UI.closeSidebar();
        if (typeof Modals !== 'undefined' && Modals.closeAllModals) Modals.closeAllModals();
        
        // Show auth screen
        if (typeof UI !== 'undefined' && UI.showAuthScreen) UI.showAuthScreen();
        
        this.showAlert('Logged out successfully', 'success');
    },
    
    // Validate login form - FIXED
    validateLoginForm(email, password) {
        if (!email || !password) {
            this.showAlert('Please fill in all fields', 'error');
            return false;
        }
        
        if (!this.isValidEmail(email)) {
            this.showAlert('Please enter a valid email address', 'error');
            return false;
        }
        
        return true;
    },
    
    // Validate register form - FIXED
    validateRegisterForm(username, email, password) {
        if (!username || !email || !password) {
            this.showAlert('Please fill in all fields', 'error');
            return false;
        }
        
        if (username.length < 3) {
            this.showAlert('Username must be at least 3 characters long', 'error');
            return false;
        }
        
        if (!this.isValidEmail(email)) {
            this.showAlert('Please enter a valid email address', 'error');
            return false;
        }
        
        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters long', 'error');
            return false;
        }
        
        // Check for basic password strength
        if (!this.isPasswordStrong(password)) {
            this.showAlert('Password should contain at least one letter and one number', 'warning');
        }
        
        return true;
    },
    
    // Email validation helper
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Check password strength
    isPasswordStrong(password) {
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        return hasLetter && hasNumber;
    },
    
    // Set button loading state
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            button.setAttribute('data-original-text', button.textContent);
            button.textContent = 'Loading...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.textContent = originalText;
                button.removeAttribute('data-original-text');
            }
        }
    },
    
    // Clear forms
    clearLoginForm() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    },
    
    clearRegisterForm() {
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        return MindOS.token && MindOS.token !== 'null' && MindOS.token !== 'undefined';
    },
    
    // Get current user
    getCurrentUser() {
        return MindOS.user;
    }
};

// Initialize auth module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
