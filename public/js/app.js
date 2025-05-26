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

// ENHANCED Memory Field Definitions with Task and Routine-Specific Fields
const memoryFieldDefinitions = {
    type: { 
        label: 'Type', 
        icon: 'fas fa-tag', 
        type: 'select', 
        options: ['goal', 'routine', 'task', 'preference', 'insight', 'event', 'system'], 
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

// API Helper Object
const API = {
    // Base request method with authentication and error handling
    async request(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(MindOS.token && { Authorization: `Bearer ${MindOS.token}` })
            },
            ...options
        };
        
        // Serialize body if it's an object
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            const response = await fetch(url, config);
            
            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    // If can't parse JSON error, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text();
            }
            
        } catch (error) {
            // Network or other fetch errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - please check your connection');
            }
            throw error;
        }
    },
    
    // HTTP method shortcuts
    get(url) {
        return this.request(url);
    },
    
    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: data
        });
    },
    
    put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: data
        });
    },
    
    delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    },
    
    // Health check method
    async healthCheck() {
        try {
            const response = await this.get('/health');
            return response.status === 'ok';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
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
        if (authAlert) {
            authAlert.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), duration);
        }
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

// Updated ActionButtons section
const ActionButtons = {
    init() {
        this.setupActionButtonHandlers();
    },

    setupActionButtonHandlers() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                
                // Visual feedback
                this.showClickFeedback(btn);
                
                // Handle the action
                this.handleAction(action);
            });
        });
    },

    showClickFeedback(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    },

    handleAction(action) {
        console.log(`🎯 Action clicked: ${action}`);
        
        switch(action) {
            case 'add-task':
                this.openCreateTask();
                break;
            case 'add-routine':
                this.openCreateRoutine();
                break;
            case 'add-goal':
                this.openCreateGoal();
                break;
            case 'add-event':
                this.openCreateEvent();
                break;
            case 'add-memory':
                this.openCreateMemory();
                break;
            case 'show-all':
                this.showAllMemories();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    },

    // Connect to existing Config modals
    openCreateTask() {
        if (typeof Config !== 'undefined') {
            Config.openConfigMode('create-task');
        } else {
            Utils.showAlert('Task creation not available', 'error');
        }
    },

    openCreateRoutine() {
        if (typeof Config !== 'undefined') {
            Config.openConfigMode('create-routine');
        } else {
            Utils.showAlert('Routine creation not available', 'error');
        }
    },

    openCreateGoal() {
        if (typeof Config !== 'undefined') {
            Config.openConfigMode('set-goals');
        } else {
            Utils.showAlert('Goal creation not available', 'error');
        }
    },

    openCreateEvent() {
        // Use quick create for events (no full modal exists yet)
        this.showQuickCreateDialog('event');
    },

    openCreateMemory() {
        this.showQuickCreateDialog('memory');
    },

    showAllMemories() {
        if (typeof Memory !== 'undefined' && Memory.openAllMemoriesModal) {
            Memory.openAllMemoriesModal();
        } else {
            Utils.showAlert('Memory management not available', 'info');
        }
    },

    // Quick create for types without full Config support
    showQuickCreateDialog(type) {
        const typeConfig = {
            event: {
                title: 'Create Event',
                icon: 'fas fa-calendar-plus',
                placeholder: 'Describe the event...',
                examples: ['Team meeting Thursday 2 PM', 'Doctor appointment next week']
            },
            memory: {
                title: 'Create Memory',
                icon: 'fas fa-brain',
                placeholder: 'What would you like to remember?',
                examples: ['Coffee shop recommendation', 'Meeting notes']
            }
        };

        const config = typeConfig[type];
        if (!config || typeof Modals === 'undefined') {
            Utils.showAlert(`${type} creation not available`, 'error');
            return;
        }

        const modal = Modals.createModal(`create${type}Modal`, config.title, `
            <div style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="width: 50px; height: 50px; background: #667eea; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="${config.icon}"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #333;">Quick ${config.title}</h3>
                        <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.9rem;">Describe what you want to create</p>
                    </div>
                </div>
                
                <textarea id="quickCreate${type}Input" 
                          placeholder="${config.placeholder}" 
                          style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #e0e6ff; border-radius: 8px; font-family: inherit; resize: vertical;"
                          onkeydown="if(event.key==='Enter' && event.ctrlKey) ActionButtons.submitQuickCreate('${type}')"></textarea>
                
                <div style="margin-top: 1rem; font-size: 0.8rem; color: #666;">
                    <strong>Examples:</strong><br>
                    ${config.examples.map(ex => `• ${ex}`).join('<br>')}
                </div>
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'secondary',
                onclick: `Modals.removeModal('create${type}Modal')`
            },
            {
                text: `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                class: 'primary',
                onclick: `ActionButtons.submitQuickCreate('${type}')`
            }
        ]);

        // Focus the input
        setTimeout(() => {
            const input = document.getElementById(`quickCreate${type}Input`);
            if (input) input.focus();
        }, 100);
    },

    async submitQuickCreate(type) {
        const input = document.getElementById(`quickCreate${type}Input`);
        if (!input || !input.value.trim()) {
            Utils.showAlert('Please enter a description', 'warning');
            return;
        }

        const content = input.value.trim();
        
        try {
            await API.post('/api/memories', {
                type: type,
                content: content,
                priority: '2',
                status: 'active',
                created_via: 'quick_create'
            });
            
            Utils.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully!`, 'success');
            
            // Refresh cards
            if (typeof Cards !== 'undefined' && Cards.refresh) {
                Cards.refresh();
            }
            
            Modals.removeModal(`create${type}Modal`);
            
        } catch (error) {
            console.error(`Error creating ${type}:`, error);
            Utils.showAlert(`Failed to create ${type}: ${error.message}`, 'error');
        }
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
            if (typingIndicator) typingIndicator.classList.add('show');
            if (sendBtn) sendBtn.disabled = true;
            
            const headerStatus = document.getElementById('headerStatus');
            if (headerStatus) headerStatus.textContent = 'MindOS is thinking...';
        } else {
            if (typingIndicator) typingIndicator.classList.remove('show');
            if (sendBtn) sendBtn.disabled = false;
            
            const headerStatus = document.getElementById('headerStatus');
            if (headerStatus) headerStatus.textContent = 'AI Assistant Ready';
        }
    },
    
    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar && overlay) {
            if (sidebar.classList.contains('open')) {
                UI.closeSidebar();
            } else {
                sidebar.classList.add('open');
                overlay.classList.add('show');
            }
        }
    },
    
    // Close sidebar
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    },
    
    // Show auth screen
    showAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const chatApp = document.getElementById('chatApp');
        const cardApp = document.getElementById('cardApp');
        
        if (authScreen) {
            authScreen.style.display = 'flex';
            authScreen.classList.remove('hidden');
        }
        if (chatApp) {
            chatApp.style.display = 'none';
            chatApp.classList.add('hidden');
        }
        if (cardApp) {
            cardApp.style.display = 'none';
            cardApp.classList.add('hidden');
        }
    },
    
    // Show card app
    showCardApp() {
        const authScreen = document.getElementById('authScreen');
        const chatApp = document.getElementById('chatApp');
        const cardApp = document.getElementById('cardApp');
        
        // Hide auth screen
        if (authScreen) {
            authScreen.style.display = 'none';
            authScreen.classList.add('hidden');
        }
        // Hide chat app
        if (chatApp) {
            chatApp.style.display = 'none';
            chatApp.classList.add('hidden');
        }
        // Show card app
        if (cardApp) {
            cardApp.style.display = 'flex';
            cardApp.classList.remove('hidden');
        }
        
        // Update user info
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = MindOS.user.username || 'User';
        }
    },
    
    // Show chat app
    showChatApp() {
        const authScreen = document.getElementById('authScreen');
        const chatApp = document.getElementById('chatApp');
        const cardApp = document.getElementById('cardApp');
        
        // Hide auth screen
        if (authScreen) {
            authScreen.style.display = 'none';
            authScreen.classList.add('hidden');
        }
        // Hide card app
        if (cardApp) {
            cardApp.style.display = 'none';
            cardApp.classList.add('hidden');
        }
        // Show chat app
        if (chatApp) {
            chatApp.style.display = 'flex';
            chatApp.classList.remove('hidden');
        }
        
        // Update user info
        const sidebarUsername = document.getElementById('sidebarUsername');
        if (sidebarUsername) {
            sidebarUsername.textContent = MindOS.user.username || 'User';
        }
    },
    
    // Update session display
    updateSessionDisplay() {
        const messagesCount = MindOS.sessionInfo.messageCount || 0;
        const sessionMessages = document.getElementById('sessionMessages');
        if (sessionMessages) {
            sessionMessages.textContent = `${messagesCount} messages`;
        }
    },
    
    // Update memory count display
    updateMemoryDisplay() {
        const memoryCount = document.getElementById('memoryCount');
        if (memoryCount) {
            memoryCount.textContent = `${MindOS.userMemories.length} items`;
        }
    }
};

// Chrome Browser Fixes
const ChromeFixes = {
    // Fix input container visibility in Chrome
    ensureInputVisibility() {
        const inputContainer = document.querySelector('.input-container');
        
        if (inputContainer) {
            // Force Chrome to recognize the input container
            inputContainer.style.display = 'flex';
            inputContainer.style.position = 'fixed';
            inputContainer.style.bottom = '0';
            inputContainer.style.left = '0';
            inputContainer.style.right = '0';
            inputContainer.style.zIndex = '100';
            
            console.log('✅ Input container visibility forced for Chrome');
        } else {
            console.warn('⚠️ Input container not found');
        }
    },
    
    // Fix viewport height issues in Chrome mobile
    fixViewportHeight() {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
    },
    
    // Chrome-specific input focus handling
    setupChromeInputFixes() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            // Prevent Chrome from hiding input on scroll
            messageInput.addEventListener('focus', () => {
                const inputContainer = messageInput.closest('.input-container');
                if (inputContainer) {
                    inputContainer.style.position = 'fixed';
                    inputContainer.style.bottom = '0';
                }
            });
            
            // Chrome-specific paste handling
            messageInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    if (typeof Chat !== 'undefined' && Chat.autoResize) {
                        Chat.autoResize(messageInput);
                    }
                }, 10);
            });
        }
    },
    
    // Detect Chrome and apply fixes
    init() {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        
        if (isChrome) {
            console.log('🔧 Applying Chrome-specific fixes');
            this.ensureInputVisibility();
            this.fixViewportHeight();
            this.setupChromeInputFixes();
        }
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
        ActionButtons.init(); // Initialize action buttons
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
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', UI.toggleSidebar);
        }
        
        // Overlay click
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', UI.closeSidebar);
        }
        
        // Menu item handlers
        document.querySelectorAll('.menu-item[data-action]').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (typeof Config !== 'undefined') {
                    Config.openConfigMode(action);
                }
            });
        });
        
        // Memory management buttons
        const setupButtonHandler = (id, handler) => {
            const element = document.getElementById(id);
            if (element && handler) {
                element.addEventListener('click', handler);
            }
        };
        
        setupButtonHandler('viewAllMemoriesBtn', () => {
            if (typeof Memory !== 'undefined') Memory.openAllMemoriesModal();
        });
        setupButtonHandler('refreshMemoriesBtn', () => {
            if (typeof Memory !== 'undefined') Memory.refreshMemories();
        });
        setupButtonHandler('clearSessionBtn', () => {
            if (typeof Chat !== 'undefined') Chat.clearSession();
        });
        setupButtonHandler('exportChatBtn', () => {
            if (typeof Chat !== 'undefined') Chat.exportChat();
        });
        setupButtonHandler('logoutBtn', () => {
            if (typeof Auth !== 'undefined') Auth.logout();
        });
    },
    
    // Chat input handlers
    setupChatHandlers() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (typeof Chat !== 'undefined') {
                    Chat.sendMessage();
                }
            });
        }
        
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (typeof Chat !== 'undefined') {
                        Chat.sendMessage();
                    }
                }
            });
            
            messageInput.addEventListener('input', (e) => {
                if (typeof Chat !== 'undefined' && Chat.autoResize) {
                    Chat.autoResize(e.target);
                }
            });
        }
    },
    
    // Modal event handlers
    setupModalHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                if (typeof Modals !== 'undefined') {
                    Modals.closeAllModals();
                }
            }
        });
    },
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals and sidebar
            if (e.key === 'Escape') {
                if (typeof Modals !== 'undefined') {
                    Modals.closeAllModals();
                }
                UI.closeSidebar();
            }
            
            // Ctrl/Cmd + Enter sends message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (typeof Chat !== 'undefined') {
                    Chat.sendMessage();
                }
            }
        });
    }
};

// Application Initialization
const App = {
    // Initialize the application
    async init() {
        console.log('🚀 Initializing MindOS...');
        
        try {
            // Initialize Chrome fixes first
            ChromeFixes.init();
            
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
    
    // Updated showChatApp to use card interface
    async showChatApp() {
        // Show the card interface
        UI.showCardApp();
        
        try {
            await Promise.all([
                this.loadSessionInfo(),
                this.loadMemories()
            ]);
            
            // Initialize Cards module
            if (typeof Cards !== 'undefined') {
                if (typeof Cards.init === 'function') {
                    Cards.init();
                }
                await Cards.loadTodaysCards();
            } else {
                console.warn('Cards module not loaded');
                const emptyState = document.getElementById('emptyState');
                if (emptyState) {
                    emptyState.style.display = 'flex';
                }
            }
            
            console.log('✅ Card app initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing card app:', error);
            Utils.showAlert('Failed to load your items', 'error');
        }
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
            if (typeof Memory !== 'undefined') {
                Memory.updateSidebarMemories();
            }
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
    
    // Initialize Cards module if available
    if (typeof Cards !== 'undefined') {
        Cards.init();
    } else {
        console.warn('Cards module not loaded');
    }
});
