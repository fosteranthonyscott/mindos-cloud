// Authentication Module
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
            
            Utils.showAlert(`Welcome back, ${MindOS.user.username}!`, 'success');
            
        } catch (error) {
            Utils.showAlert(error.message, 'error');
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
            
            Utils.showAlert(`Welcome to MindOS, ${MindOS.user.username}!`, 'success');
            
        } catch (error) {
            Utils.showAlert(error.message, 'error');
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
        UI.closeSidebar();
        Modals.closeAllModals();
        
        // Show auth screen
        UI.showAuthScreen();
        
        Utils.showAlert('Logged out successfully', 'success');
    },
    
    // Validate login form
    validateLoginForm(email, password) {
        if (!email || !password) {
            Utils.showAlert('Please fill in all fields', 'error');
            return false;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showAlert('Please enter a valid email address', 'error');
            return false;
        }
        
        return true;
    },
    
    // Validate register form
    validateRegisterForm(username, email, password) {
        if (!username || !email || !password) {
            Utils.showAlert('Please fill in all fields', 'error');
            return false;
        }
        
        if (username.length < 3) {
            Utils.showAlert('Username must be at least 3 characters long', 'error');
            return false;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showAlert('Please enter a valid email address', 'error');
            return false;
        }
        
        if (password.length < 6) {
            Utils.showAlert('Password must be at least 6 characters long', 'error');
            return false;
        }
        
        // Check for basic password strength
        if (!this.isPasswordStrong(password)) {
            Utils.showAlert('Password should contain at least one letter and one number', 'warning');
        }
        
        return true;
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
    
    // Clear login form
    clearLoginForm() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    },
    
    // Clear register form
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
    },
    
    // Update user profile (for future use)
    async updateProfile(updates) {
        try {
            const response = await API.put('/api/user/profile', updates);
            MindOS.user = { ...MindOS.user, ...response.user };
            localStorage.setItem('mindos_user', JSON.stringify(MindOS.user));
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Change password (for future use)
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await API.post('/api/user/change-password', {
                currentPassword,
                newPassword
            });
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Request password reset (for future use)
    async requestPasswordReset(email) {
        try {
            const response = await API.post('/api/auth/forgot-password', { email });
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Reset password with token (for future use)
    async resetPassword(token, newPassword) {
        try {
            const response = await API.post('/api/auth/reset-password', {
                token,
                newPassword
            });
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Validate session (check if token is still valid)
    async validateSession() {
        if (!this.isAuthenticated()) {
            return false;
        }
        
        try {
            const response = await API.get('/api/user-status');
            return response.user ? true : false;
        } catch (error) {
            return false;
        }
    },
    
    // Auto-refresh token (for future implementation)
    async refreshToken() {
        try {
            const response = await API.post('/api/auth/refresh');
            if (response.token) {
                MindOS.token = response.token;
                localStorage.setItem('mindos_token', MindOS.token);
            }
            return response;
        } catch (error) {
            // If refresh fails, logout user
            this.logout();
            throw error;
        }
    }
};

// Initialize auth module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
