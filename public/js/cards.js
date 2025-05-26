// Enhanced Cards Interface Management
const Cards = {
    // Current state
    cards: [],
    filteredCards: [],
    selectedCard: null,
    currentFilter: 'all',
    scrollCards: null,
    
    // Initialize card system
    init() {
        this.setupEventListeners();
        this.scrollCards = new ScrollCards();
        this.loadTodaysCards();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Creation buttons
        document.querySelectorAll('.create-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.openCreationModal(type);
            });
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.applyFilter(filter);
                
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Creation modal controls
        document.getElementById('creationModalClose')?.addEventListener('click', this.closeCreationModal.bind(this));
        document.getElementById('creationModalCancel')?.addEventListener('click', this.closeCreationModal.bind(this));
        document.getElementById('creationModalSave')?.addEventListener('click', this.saveCreatedItem.bind(this));
        
        // Chat modal controls
        document.getElementById('chatModalClose')?.addEventListener('click', this.closeCardModal.bind(this));
        
        // Header actions
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            MemorySettings.showSettingsModal();
        });
        
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            Auth.logout();
        });
        
        // Close modals on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'chatModal') this.closeCardModal();
            if (e.target.id === 'creationModal') this.closeCreationModal();
        });
    },
    
    // Load today's priority cards
    async loadTodaysCards() {
        try {
            this.showLoading(true);
            
            // Get today's important items
            const response = await API.get('/api/memories/today');
            this.cards = response || [];
            this.filteredCards = [...this.cards];
            
            this.renderScrollCards();
            this.updateMemoryCount();
            
        } catch (error) {
            console.error('Error loading cards:', error);
            this.showError('Failed to load your items');
        } finally {
            this.showLoading(false);
        }
    },
    
    // Apply filter to cards
    applyFilter(filter) {
        this.currentFilter = filter;
        
        if (filter === 'all') {
            this.filteredCards = [...this.cards];
        } else if (filter === 'priority') {
            this.filteredCards = this.cards.filter(card => (card.priority || 1) >= 4);
        } else {
            this.filteredCards = this.cards.filter(card => card.type === filter);
        }
        
        this.renderScrollCards();
        this.updateMemoryCount();
    },
    
    // Open creation modal for specific type
    openCreationModal(type) {
        const modal = document.getElementById('creationModal');
        const title = document.getElementById('creationModalTitle');
        const body = document.getElementById('creationModalBody');
        
        title.textContent = `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        body.innerHTML = this.generateCreationForm(type);
        
        modal.classList.add('show');
        modal.dataset.currentType = type;
    },
    
    // Generate creation form based on type
    generateCreationForm(type) {
        const forms = {
            routine: `
                <div class="form-group">
                    <label>Routine Name *</label>
                    <input type="text" id="itemTitle" placeholder="e.g., Morning workout" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="itemDescription" placeholder="Describe your routine..."></textarea>
                </div>
                <div class="form-group">
                    <label>Routine Type</label>
                    <select id="routineType">
                        <option value="morning">Morning</option>
                        <option value="evening">Evening</option>
                        <option value="work">Work</option>
                        <option value="exercise">Exercise</option>
                        <option value="health">Health</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Frequency</label>
                    <select id="frequency">
                        <option value="daily">Daily</option>
                        <option value="weekdays">Weekdays</option>
                        <option value="weekends">Weekends</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Time Required</label>
                    <input type="text" id="requiredTime" placeholder="e.g., 30 minutes">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="priority">
                        <option value="3">Normal</option>
                        <option value="4">High</option>
                        <option value="5">Urgent</option>
                        <option value="2">Low</option>
                        <option value="1">Optional</option>
                    </select>
                </div>
            `,
            task: `
                <div class="form-group">
                    <label>Task Title *</label>
                    <input type="text" id="itemTitle" placeholder="What needs to be done?" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="itemDescription" placeholder="Task details..."></textarea>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="dueDate">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="priority">
                        <option value="3">Normal</option>
                        <option value="4">High</option>
                        <option value="5">Urgent</option>
                        <option value="2">Low</option>
                        <option value="1">Optional</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Estimated Time</label>
                    <input type="text" id="requiredTime" placeholder="e.g., 2 hours">
                </div>
            `,
            goal: `
                <div class="form-group">
                    <label>Goal Title *</label>
                    <input type="text" id="itemTitle" placeholder="What do you want to achieve?" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="itemDescription" placeholder="Describe your goal in detail..."></textarea>
                </div>
                <div class="form-group">
                    <label>Goal Type</label>
                    <select id="goalType">
                        <option value="short-term">Short-term</option>
                        <option value="long-term">Long-term</option>
                        <option value="habit">Habit</option>
                        <option value="project">Project</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Target Date</label>
                    <input type="date" id="dueDate">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="priority">
                        <option value="4">High</option>
                        <option value="5">Urgent</option>
                        <option value="3">Normal</option>
                        <option value="2">Low</option>
                    </select>
                </div>
            `,
            habit: `
                <div class="form-group">
                    <label>Habit Name *</label>
                    <input type="text" id="itemTitle" placeholder="e.g., Read for 30 minutes" required>
                </div>
                <div class="form-group">
                    <label>Habit Type</label>
                    <select id="habitType">
                        <option value="create">Create new habit</option>
                        <option value="break">Break bad habit</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="itemDescription" placeholder="Why is this habit important?"></textarea>
                </div>
                <div class="form-group">
                    <label>Frequency</label>
                    <select id="frequency">
                        <option value="daily">Daily</option>
                        <option value="weekdays">Weekdays</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Trigger/Cue</label>
                    <input type="text" id="trigger" placeholder="What will remind you?">
                </div>
            `,
            event: `
                <div class="form-group">
                    <label>Event Title *</label>
                    <input type="text" id="itemTitle" placeholder="Meeting, appointment, etc." required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="itemDescription" placeholder="Event details..."></textarea>
                </div>
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" id="dueDate" required>
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <input type="time" id="eventTime">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="location" placeholder="Where is this event?">
                </div>
            `,
            memory: `
                <div class="form-group">
                    <label>Memory Title *</label>
                    <input type="text" id="itemTitle" placeholder="What do you want to remember?" required>
                </div>
                <div class="form-group">
                    <label>Memory Type</label>
                    <select id="memoryType">
                        <option value="insight">Insight</option>
                        <option value="preference">Preference</option>
                        <option value="event">Important Event</option>
                        <option value="system">System Note</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Details</label>
                    <textarea id="itemDescription" placeholder="Describe this memory in detail..."></textarea>
                </div>
                <div class="form-group">
                    <label>Context/Location</label>
                    <input type="text" id="location" placeholder="Where or when did this happen?">
                </div>
            `
        };
        
        return forms[type] || forms.task;
    },
    
    // Save created item
    async saveCreatedItem() {
        const modal = document.getElementById('creationModal');
        const type = modal.dataset.currentType;
        
        const title = document.getElementById('itemTitle')?.value.trim();
        if (!title) {
            this.showFeedback('Please enter a title', 'error');
            return;
        }
        
        try {
            const itemData = this.collectFormData(type);
            itemData.type = type;
            itemData.content = title;
            itemData.status = 'active';
            
            await API.post('/api/memories', itemData);
            
            this.closeCreationModal();
            this.loadTodaysCards(); // Refresh cards
            this.showFeedback(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully!`, 'success');
            
        } catch (error) {
            this.showFeedback('Failed to create item', 'error');
        }
    },
    
    // Collect form data based on type
    collectFormData(type) {
        const data = {};
        
        // Common fields
        const description = document.getElementById('itemDescription')?.value;
        const priority = document.getElementById('priority')?.value;
        const dueDate = document.getElementById('dueDate')?.value;
        const requiredTime = document.getElementById('requiredTime')?.value;
        const location = document.getElementById('location')?.value;
        
        if (description) data.notes = description;
        if (priority) data.priority = priority;
        if (dueDate) data.due = dueDate;
        if (requiredTime) data.required_time = requiredTime;
        if (location) data.location = location;
        
        // Type-specific fields
        switch (type) {
            case 'routine':
                const routineType = document.getElementById('routineType')?.value;
                const frequency = document.getElementById('frequency')?.value;
                if (routineType) data.routine_type = routineType;
                if (frequency) data.frequency = frequency;
                break;
                
            case 'goal':
                const goalType = document.getElementById('goalType')?.value;
                if (goalType) data.goal_type = goalType;
                break;
                
            case 'habit':
                const habitType = document.getElementById('habitType')?.value;
                const habitFreq = document.getElementById('frequency')?.value;
                const trigger = document.getElementById('trigger')?.value;
                if (habitType) data.habit_type = habitType;
                if (habitFreq) data.frequency = habitFreq;
                if (trigger) data.trigger = trigger;
                break;
                
            case 'event':
                const eventTime = document.getElementById('eventTime')?.value;
                if (eventTime) data.event_time = eventTime;
                break;
                
            case 'memory':
                const memoryType = document.getElementById('memoryType')?.value;
                if (memoryType) data.memory_type = memoryType;
                break;
        }
        
        return data;
    },
    
    // Close creation modal
    closeCreationModal() {
        document.getElementById('creationModal').classList.remove('show');
    },
    
    // Render cards in ScrollCards format
    renderScrollCards() {
        const viewport = document.getElementById('cardsViewport');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredCards.length === 0) {
            viewport.innerHTML = '';
            emptyState?.classList.add('show');
            return;
        }
        
        emptyState?.classList.remove('show');
        
        // Sort by priority and due date
        const sortedCards = this.filteredCards.sort((a, b) => {
            const priorityDiff = (b.priority || 1) - (a.priority || 1);
            if (priorityDiff !== 0) return priorityDiff;
            
            if (a.due && b.due) {
                return new Date(a.due) - new Date(b.due);
            }
            if (a.due) return -1;
            if (b.due) return 1;
            
            return 0;
        });
        
        viewport.innerHTML = sortedCards.map(card => this.createScrollCardHTML(card)).join('');
        
        // Initialize ScrollCards functionality
        if (this.scrollCards) {
            this.scrollCards.updateCards();
        }
    },
    
    // Create HTML for a single scroll card
    createScrollCardHTML(memory) {
        const type = memory.type || 'memory';
        const priority = memory.priority || 1;
        const title = memory.content_short || memory.content?.substring(0, 80) || 'Untitled';
        const description = memory.notes || memory.content?.substring(80, 200) || '';
        
        // Calculate due date status
        let dueMeta = '';
        if (memory.due) {
            const dueDate = new Date(memory.due);
            const today = new Date();
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                dueMeta = `<div class="meta-item due-today"><i class="fas fa-exclamation-triangle"></i> Overdue</div>`;
            } else if (diffDays === 0) {
                dueMeta = `<div class="meta-item due-today"><i class="fas fa-calendar-day"></i> Due Today</div>`;
            } else if (diffDays === 1) {
                dueMeta = `<div class="meta-item due-soon"><i class="fas fa-calendar-alt"></i> Due Tomorrow</div>`;
            } else if (diffDays <= 7) {
                dueMeta = `<div class="meta-item"><i class="fas fa-calendar-alt"></i> Due in ${diffDays} days</div>`;
            }
        }
        
        // Streak indicator for routines
        let streakHTML = '';
        if (memory.performance_streak && memory.performance_streak > 0) {
            streakHTML = `<div class="streak-indicator">
                <i class="fas fa-fire"></i> ${memory.performance_streak} day streak
            </div>`;
        }
        
        // Progress bar for goals
        let progressHTML = '';
        if (memory.type === 'goal' && memory.progress) {
            const progress = Math.min(100, Math.max(0, memory.progress));
            progressHTML = `
                <div class="card-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>Progress: ${progress}%</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="memory-card" data-memory-id="${memory.id}" data-type="${type}">
                <div class="card-content-area">
                    <div class="card-header">
                        <div class="card-type-badge ${type}">${type}</div>
                        <div class="card-priority">
                            <span class="priority-stars">${'★'.repeat(priority)}</span>
                        </div>
                    </div>
                    
                    <div class="card-main-content">
                        <div class="card-title">${title}</div>
                        ${description ? `<div class="card-description">${description}</div>` : ''}
                        
                        <div class="card-meta">
                            ${dueMeta}
                            ${memory.required_time ? `<div class="meta-item"><i class="fas fa-clock"></i> ${memory.required_time}</div>` : ''}
                            ${memory.location ? `<div class="meta-item"><i class="fas fa-map-marker-alt"></i> ${memory.location}</div>` : ''}
                            ${memory.energy_requirements ? `<div class="meta-item"><i class="fas fa-battery-three-quarters"></i> ${memory.energy_requirements} energy</div>` : ''}
                        </div>
                        
                        ${streakHTML}
                        ${progressHTML}
                    </div>
                </div>
                
                <div class="card-controls">
                    <button class="control-btn complete" data-label="Complete" data-action="complete">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="control-btn chat" data-label="Chat" data-action="chat">
                        <i class="fas fa-comments"></i>
                    </button>
                    <button class="control-btn edit" data-label="Edit" data-action="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="control-btn delete" data-label="Delete" data-action="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    // Handle card actions
    async handleCardAction(memoryId, action) {
        const memory = this.filteredCards.find(c => c.id === memoryId) || this.cards.find(c => c.id === memoryId);
        if (!memory) return;
        
        switch (action) {
            case 'complete':
                await this.completeCard(memoryId);
                break;
            case 'chat':
                this.openCardChat(memoryId);
                break;
            case 'edit':
                this.editCard(memoryId);
                break;
            case 'delete':
                this.deleteCard(memoryId);
                break;
        }
    },
    
    // Complete a card
    async completeCard(memoryId) {
        try {
            await API.put(`/api/memories/${memoryId}`, {
                status: 'completed',
                completed_date: new Date().toISOString().split('T')[0]
            });
            
            // Remove from current view
            this.cards = this.cards.filter(c => c.id !== memoryId);
            this.applyFilter(this.currentFilter); // Reapply current filter
            this.updateMemoryCount();
            
            this.showFeedback('Item completed! 🎉', 'success');
            
        } catch (error) {
            this.showFeedback('Failed to complete item', 'error');
        }
    },
    
    // Open card chat modal
    openCardChat(memoryId) {
        const memory = this.filteredCards.find(c => c.id === memoryId) || this.cards.find(c => c.id === memoryId);
        if (!memory) return;
        
        this.selectedCard = memory;
        
        const modal = document.getElementById('chatModal');
        const title = document.getElementById('chatModalTitle');
        const cardTitle = memory.content_short || memory.content;
        
        title.textContent = cardTitle;
        modal.classList.add('show');
        
        // Clear previous messages and add context message
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="chat-message assistant">
                Hi! I can help you with "${cardTitle}". What would you like to discuss or change?
            </div>
        `;
        
        // Setup chat for this card
        this.setupCardChat(memoryId);
    },
    
    // Setup chat functionality for a specific card
    setupCardChat(memoryId) {
        const input = document.getElementById('chatInput');
        const sendBtn = document.getElementById('chatSendBtn');
        
        // Remove any existing listeners
        const newInput = input.cloneNode(true);
        const newSendBtn = sendBtn.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        const sendMessage = async () => {
            const message = newInput.value.trim();
            if (!message) return;
            
            newInput.value = '';
            
            // Add user message to chat
            this.addCardChatMessage('user', message);
            
            try {
                // Send context-aware message to Claude
                const memory = this.selectedCard;
                const contextPrompt = `About my ${memory.type}: "${memory.content}"\n\nUser question: ${message}`;
                
                const response = await API.post('/api/claude', {
                    messages: [{ role: 'user', content: contextPrompt }]
                });
                
                this.addCardChatMessage('assistant', response.content[0].text);
                
            } catch (error) {
                this.addCardChatMessage('assistant', 'Sorry, I had trouble processing that. Please try again.');
            }
        };
        
        newSendBtn.addEventListener('click', sendMessage);
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    },
    
    // Add message to card chat
    addCardChatMessage(role, content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.textContent = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    // Edit card (placeholder)
    editCard(memoryId) {
        this.showFeedback('Edit functionality coming soon', 'info');
    },
    
    // Delete card
    async deleteCard(memoryId) {
        if (confirm('Are you sure you want to delete this card?')) {
            try {
                await API.delete(`/api/memories/${memoryId}`);
                
                // Remove from current view
                this.cards = this.cards.filter(c => c.id !== memoryId);
                this.applyFilter(this.currentFilter);
                this.updateMemoryCount();
                
                this.showFeedback('Card deleted', 'success');
                
            } catch (error) {
                this.showFeedback('Failed to delete card', 'error');
            }
        }
    },
    
    // Close card modal
    closeCardModal() {
        document.getElementById('chatModal').classList.remove('show');
        this.selectedCard = null;
    },
    
    // Show/hide loading state
    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const container = document.getElementById('cardsViewport');
        
        if (show) {
            loading?.classList.add('show');
        } else {
            loading?.classList.remove('show');
        }
    },
    
    // Show error message
    showError(message) {
        Utils.showAlert(message, 'error');
    },
    
    // Update memory count in header
    updateMemoryCount() {
        const countEl = document.getElementById('memoryCount');
        if (countEl) {
            const filteredCount = this.filteredCards.length;
            const totalCount = this.cards.length;
            
            if (this.currentFilter === 'all') {
                countEl.textContent = `${totalCount} items today`;
            } else {
                countEl.textContent = `${filteredCount} of ${totalCount} items`;
            }
        }
    },
    
    // Show feedback message
    showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#667eea'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            z-index: 3000;
            font-weight: 600;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        feedback.textContent = message;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.style.opacity = '1', 10);
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => document.body.removeChild(feedback), 300);
        }, 2000);
    }
};

// ScrollCards Class (unchanged but enhanced)
class ScrollCards {
    constructor() {
        this.currentCardIndex = 0;
        this.cards = [];
        this.isScrolling = false;
        this.init();
    }

    init() {
        this.setupCards();
        this.setupNavigation();
        this.setupControls();
        this.updateNavigationDots();
    }

    setupCards() {
        this.updateCards();
        const viewport = document.getElementById('cardsViewport');
        
        if (viewport) {
            viewport.addEventListener('scroll', this.handleScroll.bind(this));
        }
        
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }
    
    updateCards() {
        this.cards = Array.from(document.querySelectorAll('.memory-card'));
        this.updateNavigationDots();
    }

    setupNavigation() {
        let startY = 0;
        let startTime = 0;
        const viewport = document.getElementById('cardsViewport');
        
        if (!viewport) return;

        viewport.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });

        viewport.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            const deltaY = startY - endY;
            const deltaTime = endTime - startTime;

            if (Math.abs(deltaY) > 50 && deltaTime < 300) {
                if (deltaY > 0) {
                    this.nextCard();
                } else {
                    this.previousCard();
                }
            }
        });
    }

    setupControls() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.control-btn')) {
                const btn = e.target.closest('.control-btn');
                const action = btn.dataset.action;
                const card = btn.closest('.memory-card');
                const memoryId = parseInt(card.dataset.memoryId);
                
                Cards.handleCardAction(memoryId, action);
            }
        });
    }

    handleScroll() {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        setTimeout(() => {
            this.updateCurrentCard();
            this.isScrolling = false;
        }, 100);
    }

    updateCurrentCard() {
        const viewport = document.getElementById('cardsViewport');
        if (!viewport) return;
        
        const scrollTop = viewport.scrollTop;
        const cardHeight = window.innerHeight - 70;
        
        this.currentCardIndex = Math.round(scrollTop / cardHeight);
        this.updateNavigationDots();
    }

    updateNavigationDots() {
        const navigation = document.getElementById('cardNavigation');
        if (!navigation) return;
        
        navigation.innerHTML = '';
        
        this.cards.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `nav-dot ${index === this.currentCardIndex ? 'active' : ''}`;
            dot.addEventListener('click', () => this.goToCard(index));
            navigation.appendChild(dot);
        });
    }

    goToCard(index) {
        if (index >= 0 && index < this.cards.length) {
            const viewport = document.getElementById('cardsViewport');
            if (!viewport) return;
            
            const cardHeight = window.innerHeight - 70;
            
            viewport.scrollTo({
                top: index * cardHeight,
                behavior: 'smooth'
            });
            
            this.currentCardIndex = index;
            this.updateNavigationDots();
        }
    }

    nextCard() {
        this.goToCard(this.currentCardIndex + 1);
    }

    previousCard() {
        this.goToCard(this.currentCardIndex - 1);
    }

    handleKeyboard(e) {
        switch (e.key) {
            case 'ArrowDown':
            case ' ':
                e.preventDefault();
                this.nextCard();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.previousCard();
                break;
            case 'Escape':
                document.getElementById('chatModal')?.classList.remove('show');
                document.getElementById('creationModal')?.classList.remove('show');
                break;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Cards.init();
});
