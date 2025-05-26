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

// Memory Configuration for handling memory storage preferences
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

// ENHANCED Memory Field Definitions with Routine-Specific Fields
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
        required: true,
        placeholder: 'Describe this item in detail...'
    },
    content_short: { 
        label: 'Summary', 
        icon: 'fas fa-compress-alt', 
        type: 'text',
        placeholder: 'Brief summary (auto-generated if empty)'
    },
    
    // ROUTINE-SPECIFIC FIELDS
    routine_type: {
        label: 'Routine Type',
        icon: 'fas fa-list',
        type: 'select',
        options: ['morning', 'evening', 'work', 'exercise', 'health', 'learning', 'self-care', 'custom'],
        placeholder: 'What kind of routine is this?'
    },
    frequency: {
        label: 'Frequency',
        icon: 'fas fa-calendar-alt',
        type: 'select',
        options: ['daily', 'weekdays', 'weekends', 'weekly', 'bi-weekly', 'monthly', 'flexible'],
        placeholder: 'How often should this routine occur?'
    },
    
    // EXISTING ENHANCED FIELDS
    notes: { 
        label: 'Notes', 
        icon: 'fas fa-sticky-note', 
        type: 'textarea',
        placeholder: 'Additional notes, tips, or reminders...'
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
        type: 'number',
        placeholder: 'Number of consecutive days'
    },
    performance_rate: { 
        label: 'Success Rate', 
        icon: 'fas fa-percentage', 
        type: 'number', 
        step: '0.01', 
        min: '0', 
        max: '1',
        placeholder: 'Success rate (0.0 to 1.0)'
    },
    due: { 
        label: 'Due Date', 
        icon: 'fas fa-calendar-alt', 
        type: 'date' 
    },
    trigger: { 
        label: 'Trigger/Cue', 
        icon: 'fas fa-play', 
        type: 'text',
        placeholder: 'What starts this routine or goal? (e.g., alarm, after coffee)'
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
        type: 'text',
        placeholder: 'How long does this take? (e.g., 15 minutes, 1 hour)'
    },
    success_criteria: { 
        label: 'Success Criteria', 
        icon: 'fas fa-check-circle', 
        type: 'textarea',
        placeholder: 'How will you know this was completed successfully?'
    },
    resources: { 
        label: 'Resources', 
        icon: 'fas fa-tools', 
        type: 'textarea',
        placeholder: 'What do you need to complete this? (tools, materials, etc.)'
    },
    location: { 
        label: 'Location', 
        icon: 'fas fa-map-marker-alt', 
        type: 'text',
        placeholder: 'Where does this happen? (home, gym, office, etc.)'
    },
    weather: { 
        label: 'Weather Context', 
        icon: 'fas fa-cloud-sun', 
        type: 'text',
        placeholder: 'Weather conditions relevant to this item'
    },
    mood: { 
        label: 'Mood', 
        icon: 'fas fa-smile', 
        type: 'text',
        placeholder: 'Mood or emotional state associated with this'
    },
    emotion: { 
        label: 'Emotion', 
        icon: 'fas fa-heart', 
        type: 'text',
        placeholder: 'Emotional context or feeling'
    },
    search_query: { 
        label: 'Related Searches', 
        icon: 'fas fa-search', 
        type: 'text',
        placeholder: 'Search terms or keywords related to this'
    },
    shoppingideas: { 
        label: 'Shopping Ideas', 
        icon: 'fas fa-shopping-cart', 
        type: 'textarea',
        placeholder: 'Items to buy or purchase ideas related to this'
    },
    
    // ADDITIONAL ROUTINE AND PRODUCTIVITY FIELDS
    difficulty: {
        label: 'Difficulty Level',
        icon: 'fas fa-chart-line',
        type: 'select',
        options: ['very-easy', 'easy', 'medium', 'hard', 'very-hard'],
        placeholder: 'How challenging is this?'
    },
    environment: {
        label: 'Environment',
        icon: 'fas fa-home',
        type: 'select',
        options: ['home', 'office', 'gym', 'outdoor', 'anywhere', 'quiet', 'social'],
        placeholder: 'What environment works best?'
    },
    time_of_day: {
        label: 'Best Time',
        icon: 'fas fa-clock',
        type: 'select',
        options: ['early-morning', 'morning', 'afternoon', 'evening', 'night', 'flexible'],
        placeholder: 'When is the best time for this?'
    },
    dependencies: {
        label: 'Dependencies',
        icon: 'fas fa-link',
        type: 'textarea',
        placeholder: 'What needs to happen before this? (other routines, conditions, etc.)'
    },
    rewards: {
        label: 'Rewards',
        icon: 'fas fa-gift',
        type: 'textarea',
        placeholder: 'How do you celebrate or reward completion?'
    },
    obstacles: {
        label: 'Common Obstacles',
        icon: 'fas fa-exclamation-triangle',
        type: 'textarea',
        placeholder: 'What typically gets in the way of this routine?'
    },
    backup_plan: {
        label: 'Backup Plan',
        icon: 'fas fa-redo',
        type: 'textarea',
        placeholder: 'What to do if the main plan fails? (shorter version, alternative)'
    },
    tracking_method: {
        label: 'Tracking Method',
        icon: 'fas fa-clipboard-check',
        type: 'text',
        placeholder: 'How do you track completion? (app, journal, habit tracker)'
    },
    duration_target: {
        label: 'Target Duration',
        icon: 'fas fa-stopwatch',
        type: 'text',
        placeholder: 'How long should you spend on this? (exact time goal)'
    },
    repetitions: {
        label: 'Repetitions/Sets',
        icon: 'fas fa-redo-alt',
        type: 'text',
        placeholder: 'Number of repetitions, sets, or cycles (for exercise/practice)'
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

// Memory Settings for user preferences
const MemorySettings = {
    showSettingsModal() {
        const modal = Modals.createModal('memorySettingsModal', 'Memory Settings', `
            <div style="padding: 1rem;">
                <h3 style="margin-bottom: 1rem; color: #333;">How should I handle memories during conversations?</h3>
                
                <div class="config-options" style="display: grid; gap: 1rem;">
                    <div class="config-option memory-mode-option" data-mode="${MemoryConfig.MODES.AUTO}" 
                         ${MemoryConfig.getMode() === MemoryConfig.MODES.AUTO ? 'style="border-color: #667eea; background: #667eea; color: white;"' : ''}>
                        <div class="config-option-title">
                            <i class="fas fa-magic"></i> Automatic Storage
                        </div>
                        <div class="config-option-desc">
                            Store memories automatically without interruption. Conversations flow smoothly.
                        </div>
                    </div>
                    
                    <div class="config-option memory-mode-option" data-mode="${MemoryConfig.MODES.CONFIRM}"
                         ${MemoryConfig.getMode() === MemoryConfig.MODES.CONFIRM ? 'style="border-color: #667eea; background: #667eea; color: white;"' : ''}>
                        <div class="config-option-title">
                            <i class="fas fa-comments"></i> Confirm & Continue (Recommended)
                        </div>
                        <div class="config-option-desc">
                            Review memories before storing, then continue the conversation automatically.
                        </div>
                    </div>
                    
                    <div class="config-option memory-mode-option" data-mode="${MemoryConfig.MODES.MANUAL}"
                         ${MemoryConfig.getMode() === MemoryConfig.MODES.MANUAL ? 'style="border-color: #667eea; background: #667eea; color: white;"' : ''}>
                        <div class="config-option-title">
                            <i class="fas fa-hand-paper"></i> Manual Control
                        </div>
                        <div class="config-option-desc">
                            Review and confirm each memory. Conversations pause until you decide.
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; padding: 1rem; background: #f8f9ff; border-radius: 8px; font-size: 0.9rem;">
                    <strong>Current Mode:</strong> 
                    <span id="currentModeDisplay">${this.getModeDisplayName(MemoryConfig.getMode())}</span>
                </div>
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'secondary',
                onclick: "Modals.removeModal('memorySettingsModal')"
            },
            {
                text: 'Save Settings',
                class: 'primary',
                onclick: "MemorySettings.saveSettings()"
            }
        ]);
        
        // Add click handlers for mode selection
        modal.querySelectorAll('.memory-mode-option').forEach(option => {
            option.addEventListener('click', () => {
                // Remove selection from all options
                modal.querySelectorAll('.memory-mode-option').forEach(opt => {
                    opt.style.borderColor = '#e0e6ff';
                    opt.style.background = '#f8f9ff';
                    opt.style.color = '#333';
                });
                
                // Select clicked option
                option.style.borderColor = '#667eea';
                option.style.background = '#667eea';
                option.style.color = 'white';
                
                // Update display
                const mode = option.dataset.mode;
                document.getElementById('currentModeDisplay').textContent = this.getModeDisplayName(mode);
            });
        });
    },
    
    saveSettings() {
        const selectedOption = document.querySelector('.memory-mode-option[style*="background: rgb(102, 126, 234)"]');
        if (selectedOption) {
            const newMode = selectedOption.dataset.mode;
            MemoryConfig.setMode(newMode);
            Utils.showAlert(`Memory mode set to: ${this.getModeDisplayName(newMode)}`, 'success');
        }
        Modals.removeModal('memorySettingsModal');
    },
    
    getModeDisplayName(mode) {
        switch (mode) {
            case MemoryConfig.MODES.AUTO: return 'Automatic Storage';
            case MemoryConfig.MODES.CONFIRM: return 'Confirm & Continue';
            case MemoryConfig.MODES.MANUAL: return 'Manual Control';
            default: return 'Unknown';
        }
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
    
    // FIXED: Event handler binding in setupSidebarHandlers function
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
        
        // Memory management buttons - FIXED: Proper binding
        document.getElementById('viewAllMemoriesBtn').addEventListener('click', () => Memory.openAllMemoriesModal());
        document.getElementById('refreshMemoriesBtn').addEventListener('click', () => Memory.refreshMemories());
        document.getElementById('clearSessionBtn').addEventListener('click', () => Chat.clearSession());
        document.getElementById('exportChatBtn').addEventListener('click', () => Chat.exportChat());
        document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
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
