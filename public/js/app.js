// Global Application State
const MindOS = {
    // Authentication
    token: localStorage.getItem('mindos_token'),
    user: JSON.parse(localStorage.getItem('mindos_user') || '{}'),
    
    // App State
    isLoading: false,
    sessionInfo: {},
    userMemories: [],
    selectedMemory: null,
    pendingAction: null,
    memoryChanges: {},
    autoSaveTimeout: null,
    currentConfigMode: null,
    configData: {},
    pendingMemories: [],
    
    // DOM Elements (populated on init)
    elements: {},
    
    // Configuration
    config: {
        autoSaveDelay: 2000,
        maxMessages: 20,
        typingDelay: 1000
    }
};

// Add this to the top of app.js after the MindOS object
const MemoryConfig = {
    MODES: {
        AUTO: 'auto',
        CONFIRM: 'confirm', 
        MANUAL: 'manual'
    },
    
    currentMode: localStorage.getItem('mindos_memory_mode') || 'confirm',
    
    setMode(mode) {
        this.currentMode = mode;
        localStorage.setItem('mindos_memory_mode', mode);
        console.log('🧠 Memory mode set to:', mode);
    },
    
    getMode() {
        return this.currentMode;
    }
};

// Memory Field Definitions
const memoryFieldDefinitions = {
    type: { 
        label: 'Type', 
        icon: 'fas fa-tag', 
        type: 'select', 
        options: ['goal', 'routine', 'preference', 'insight', 'event', 'system'], 
        required: true 
    },
    content: { 
        label: 'Full Content', 
        icon: 'fas fa-align-left', 
        type: 'textarea', 
        required: true 
    },
    content_short: { 
        label: 'Summary', 
        icon: 'fas fa-compress-alt', 
        type: 'text' 
    },
    notes: { 
        label: 'Notes', 
        icon: 'fas fa-sticky-note', 
        type: 'textarea' 
    },
    priority: { 
        label: 'Priority', 
        icon: 'fas fa-star', 
        type: 'select', 
        options: ['1', '2', '3', '4', '5'] 
    },
    status: { 
        label: 'Status', 
        icon: 'fas fa-flag', 
        type: 'select', 
        options: ['active', 'completed', 'paused', 'archived'] 
    },
    stage: { 
        label: 'Stage', 
        icon: 'fas fa-layer-group', 
        type: 'select', 
        options: ['planned', 'current', 'completed', 'paused'] 
    },
    performance_streak: { 
        label: 'Current Streak', 
        icon: 'fas fa-fire', 
        type: 'number' 
    },
    performance_rate: { 
        label: 'Success Rate', 
        icon: 'fas fa-percentage', 
        type: 'number', 
        step: '0.01', 
        min: '0', 
        max: '1' 
    },
    due: { 
        label: 'Due Date', 
        icon: 'fas fa-calendar-alt', 
        type: 'date' 
    },
    trigger: { 
        label: 'Trigger', 
        icon: 'fas fa-play', 
        type: 'text' 
    },
    energy_requirements: { 
        label: 'Energy Level', 
        icon: 'fas fa-battery-three-quarters', 
        type: 'select', 
        options: ['low', 'medium', 'high'] 
    },
    required_time: { 
        label: 'Time Required', 
        icon: 'fas fa-clock', 
        type: 'text' 
    },
    success_criteria: { 
        label: 'Success Criteria', 
        icon: 'fas fa-check-circle', 
        type: 'textarea' 
    },
    resources: { 
        label: 'Resources', 
        icon: 'fas fa-tools', 
        type: 'textarea' 
    },
    location: { 
        label: 'Location', 
        icon: 'fas fa-map-marker-alt', 
        type: 'text' 
    },
    weather: { 
        label: 'Weather Context', 
        icon: 'fas fa-cloud-sun', 
        type: 'text' 
    },
    mood: { 
        label: 'Mood', 
        icon: 'fas fa-smile', 
        type: 'text' 
    },
    emotion: { 
        label: 'Emotion', 
        icon: 'fas fa-heart', 
        type: 'text' 
    },
    search_query: { 
        label: 'Related Searches', 
        icon: 'fas fa-search', 
        type: 'text' 
    },
    shoppingideas: { 
        label: 'Shopping Ideas', 
        icon: 'fas fa-shopping-cart', 
        type: 'textarea' 
    }
};

// Utility Functions
const Utils = {
    // Show alert message
    showAlert(message, type = 'info', duration = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        alertDiv.textContent = message;
        
        const authAlert = document.getElementById('authAlert');
        authAlert.appendChild(alertDiv);
        
        setTimeout(() => alertDiv.remove(), duration);
    },
    
    // Format date for display
    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString();
    },
    
    // Format time for display
    formatTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    // Truncate text
    truncate(text, length = 100) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Generate unique ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // Check if valid email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
};

// API Helper Functions
const API = {
    // Base fetch wrapper
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(MindOS.token && { 'Authorization': `Bearer ${MindOS.token}` })
            }
        };
        
        const config = { ...defaultOptions, ...options };
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    // GET request
    get(url) {
        return this.request(url);
    },
    
    // POST request
    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: data
        });
    },
    
    // PUT request
    put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: data
        });
    },
    
    // DELETE request
    delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }
};

// Event Handlers
const EventHandlers = {
    // Initialize all event listeners
    init() {
        this.setupAuthTabHandlers();
        this.setupSidebarHandlers();
        this.setupChatHandlers();
        this.setupModalHandlers();
        this.setupKeyboardShortcuts();
    },
    
    // Auth tab switching
    setupAuthTabHandlers() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.dataset.tab;
                this.switchAuthTab(tabType);
            });
        });
    },
    
    switchAuthTab(tabType) {
        // Update tab appearance
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');
        
        // Show/hide forms
        if (tabType === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }
    },
    
    // Sidebar event handlers
    setupSidebarHandlers() {
        // Hamburger menu
        document.getElementById('hamburgerBtn').addEventListener('click', UI.toggleSidebar);
        
        // Overlay click
        document.getElementById('overlay').addEventListener('click', UI.closeSidebar);
        
        // Menu item handlers
        document.querySelectorAll('.menu-item[data-action]').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                Config.openConfigMode(action);
            });
        });
        
        // Memory management buttons
        document.getElementById('viewAllMemoriesBtn').addEventListener('click', Memory.openAllMemoriesModal);
        document.getElementById('refreshMemoriesBtn').addEventListener('click', Memory.refreshMemories);
        document.getElementById('clearSessionBtn').addEventListener('click', Chat.clearSession);
        document.getElementById('exportChatBtn').addEventListener('click', Chat.exportChat);
        document.getElementById('logoutBtn').addEventListener('click', Auth.logout);
    },
    
    // Chat input handlers
    setupChatHandlers() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        // Send button
        sendBtn.addEventListener('click', Chat.sendMessage);
        
        // Input handlers
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                Chat.sendMessage();
            }
        });
        
        messageInput.addEventListener('input', (e) => {
            Chat.autoResize(e.target);
        });
    },
    
    // Modal event handlers
    setupModalHandlers() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                Modals.closeAllModals();
            }
        });
    },
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals and sidebar
            if (e.key === 'Escape') {
                Modals.closeAllModals();
                UI.closeSidebar();
            }
            
            // Ctrl/Cmd + Enter sends message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                Chat.sendMessage();
            }
        });
    }
};

// UI Helper Functions
const UI = {
    // Show loading state
    setLoading(loading) {
        MindOS.isLoading = loading;
        const typingIndicator = document.getElementById('typingIndicator');
        const sendBtn = document.getElementById('sendBtn');
        
        if (loading) {
            typingIndicator.classList.add('show');
            sendBtn.disabled = true;
            document.getElementById('headerStatus').textContent = 'MindOS is thinking...';
        } else {
            typingIndicator.classList.remove('show');
            sendBtn.disabled = false;
            document.getElementById('headerStatus').textContent = 'AI Assistant Ready';
        }
    },
    
    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar.classList.contains('open')) {
            UI.closeSidebar();
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        }
    },
    
    // Close sidebar
    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
    },
    
    // Show auth screen
    showAuthScreen() {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('chatApp').classList.add('hidden');
    },
    
    // Show chat app
    showChatApp() {
        document.getElementById('authScreen').classList.add('hidden');
        const chatApp = document.getElementById('chatApp');
        chatApp.classList.remove('hidden');
        chatApp.style.display = 'flex';
        
        // Update user info
        document.getElementById('sidebarUsername').textContent = MindOS.user.username || 'User';
    },
    
    // Update session display
    updateSessionDisplay() {
        const messagesCount = MindOS.sessionInfo.messageCount || 0;
        document.getElementById('sessionMessages').textContent = `${messagesCount} messages`;
    },
    
    // Update memory count display
    updateMemoryDisplay() {
        document.getElementById('memoryCount').textContent = `${MindOS.userMemories.length} memories`;
    }
};

// Application Initialization
const App = {
    // Initialize the application
    async init() {
        console.log('🚀 Initializing MindOS...');
        
        try {
            // Setup event handlers
            EventHandlers.init();
            
            // Check authentication
            if (MindOS.token && MindOS.token !== 'null' && MindOS.token !== 'undefined') {
                await this.attemptAutoLogin();
            } else {
                UI.showAuthScreen();
            }
            
            console.log('✅ MindOS initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize MindOS:', error);
            Utils.showAlert('Failed to initialize application', 'error');
        }
    },
    
    // Attempt auto-login with stored token
    async attemptAutoLogin() {
        try {
            const response = await API.get('/api/user-status');
            if (response.user) {
                MindOS.user = response.user;
                await this.showChatApp();
            } else {
                this.clearAuth();
                UI.showAuthScreen();
            }
        } catch (error) {
            console.log('Auto-login failed:', error);
            this.clearAuth();
            UI.showAuthScreen();
        }
    },
    
    // Show chat app and load data
    async showChatApp() {
        UI.showChatApp();
        
        // Load session info and memories
        await Promise.all([
            this.loadSessionInfo(),
            this.loadMemories()
        ]);
        
        // Add welcome message if no existing messages
        Chat.addWelcomeMessage();
    },
    
    // Load session information
    async loadSessionInfo() {
        try {
            MindOS.sessionInfo = await API.get('/api/session-info');
            UI.updateSessionDisplay();
        } catch (error) {
            console.log('Failed to load session info:', error);
        }
    },
    
    // Load user memories
    async loadMemories() {
        try {
            MindOS.userMemories = await API.get('/api/memories');
            UI.updateMemoryDisplay();
            Memory.updateSidebarMemories();
        } catch (error) {
            console.log('Failed to load memories:', error);
        }
    },
    
    // Clear authentication data
    clearAuth() {
        localStorage.removeItem('mindos_token');
        localStorage.removeItem('mindos_user');
        MindOS.token = null;
        MindOS.user = {};
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
