// Card Interface Management
const Cards = {
    // Current state
    cards: [],
    selectedCard: null,
    quickAddType: null,
    
    // Initialize card system
    init() {
        this.setupEventListeners();
        this.loadTodaysCards();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Quick add buttons
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.openQuickAdd(type);
            });
        });
        
        // Modal controls
        document.getElementById('quickAddClose').addEventListener('click', this.closeQuickAdd.bind(this));
        document.getElementById('quickAddCancel').addEventListener('click', this.closeQuickAdd.bind(this));
        document.getElementById('quickAddSave').addEventListener('click', this.saveQuickAdd.bind(this));
        
        // Card modal
        document.getElementById('cardModalClose').addEventListener('click', this.closeCardModal.bind(this));
        
        // Floating chat
        document.getElementById('floatingChatBtn').addEventListener('click', this.openGlobalChat.bind(this));
        
        // Close modals on overlay click
        document.getElementById('quickAddModal').addEventListener('click', (e) => {
            if (e.target.id === 'quickAddModal') this.closeQuickAdd();
        });
        
        document.getElementById('cardModal').addEventListener('click', (e) => {
            if (e.target.id === 'cardModal') this.closeCardModal();
        });
    },
    
    // Load today's priority cards
    async loadTodaysCards() {
        try {
            this.showLoading(true);
            
            // Get today's important items
            const response = await API.get('/api/memories/today');
            this.cards = response || [];
            
            this.renderCards();
            this.updateMemoryCount();
            
        } catch (error) {
            console.error('Error loading cards:', error);
            this.showError('Failed to load your items');
        } finally {
            this.showLoading(false);
        }
    },
    
    // Render cards in the feed
    renderCards() {
        const feed = document.getElementById('cardsFeed');
        const emptyState = document.getElementById('emptyState');
        
        if (this.cards.length === 0) {
            feed.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }
        
        emptyState.classList.remove('show');
        
        // Sort by priority and due date
        const sortedCards = this.cards.sort((a, b) => {
            // Priority first (5 = highest)
            const priorityDiff = (b.priority || 1) - (a.priority || 1);
            if (priorityDiff !== 0) return priorityDiff;
            
            // Then by due date
            if (a.due && b.due) {
                return new Date(a.due) - new Date(b.due);
            }
            if (a.due) return -1;
            if (b.due) return 1;
            
            return 0;
        });
        
        feed.innerHTML = sortedCards.map(card => this.createCardHTML(card)).join('');
        
        // Add event listeners to cards
        this.setupCardListeners();
    },
    
    // Create HTML for a single card
    createCardHTML(memory) {
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
                        <span>Progress</span>
                        <span>${progress}%</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="memory-card priority-${priority}" data-memory-id="${memory.id}" data-type="${type}">
                <div class="card-header">
                    <div class="card-type-badge ${type}">${type}</div>
                    <div class="card-priority">
                        <span class="priority-stars">${'★'.repeat(priority)}</span>
                    </div>
                </div>
                
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
                
                <div class="card-actions">
                    <button class="card-action-btn complete" data-action="complete" title="Mark Complete">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="card-action-btn chat" data-action="chat" title="Chat About This">
                        <i class="fas fa-comments"></i>
                    </button>
                    <button class="card-action-btn" data-action="edit" title="Edit Details">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="card-action-btn" data-action="delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    // Setup listeners for rendered cards
    setupCardListeners() {
        // Card click to expand
        document.querySelectorAll('.memory-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-actions')) {
                    const memoryId = parseInt(card.dataset.memoryId);
                    this.openCardDetail(memoryId);
                }
            });
        });
        
        // Card action buttons
        document.querySelectorAll('.card-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const card = btn.closest('.memory-card');
                const memoryId = parseInt(card.dataset.memoryId);
                this.handleCardAction(memoryId, action);
            });
        });
    },
    
    // Handle card actions
    async handleCardAction(memoryId, action) {
        const memory = this.cards.find(c => c.id === memoryId);
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
            this.renderCards();
            this.updateMemoryCount();
            
            Utils.showAlert('Item marked as complete!', 'success');
            
        } catch (error) {
            Utils.showAlert('Failed to complete item', 'error');
        }
    },
    
    // Open card detail modal
    openCardDetail(memoryId) {
        const memory = this.cards.find(c => c.id === memoryId);
        if (!memory) return;
        
        this.selectedCard = memory;
        
        const modalBody = document.getElementById('cardModalBody');
        modalBody.innerHTML = `
            <div class="card-detail-content">
                <div class="card-detail-header">
                    <span class="card-type-badge ${memory.type}">${memory.type}</span>
                    <div class="card-priority">Priority: ${'★'.repeat(memory.priority || 1)}</div>
                </div>
                
                <h2>${memory.content_short || memory.content}</h2>
                
                <div class="card-detail-fields">
                    ${memory.content ? `<div class="detail-field">
                        <label>Description:</label>
                        <p>${memory.content}</p>
                    </div>` : ''}
                    
                    ${memory.notes ? `<div class="detail-field">
                        <label>Notes:</label>
                        <p>${memory.notes}</p>
                    </div>` : ''}
                    
                    ${memory.due ? `<div class="detail-field">
                        <label>Due Date:</label>
                        <p>${Utils.formatDate(memory.due)}</p>
                    </div>` : ''}
                </div>
                
                <div class="card-chat-section">
                    <h3>Chat about this item</h3>
                    <div class="card-chat-messages" id="cardChatMessages">
                        <!-- Chat messages will appear here -->
                    </div>
                    <div class="card-chat-input">
                        <input type="text" id="cardChatInput" placeholder="Ask about this item or request changes...">
                        <button id="cardChatSend"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('cardModal').classList.add('show');
        
        // Setup chat for this card
        this.setupCardChat(memoryId);
    },
    
    // Setup chat functionality for a specific card
    setupCardChat(memoryId) {
        const input = document.getElementById('cardChatInput');
        const sendBtn = document.getElementById('cardChatSend');
        
        const sendMessage = async () => {
            const message = input.value.trim();
            if (!message) return;
            
            input.value = '';
            
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
        
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    },
    
    // Add message to card chat
    addCardChatMessage(role, content) {
        const messagesContainer = document.getElementById('cardChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `card-chat-message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    // Open quick add modal
    openQuickAdd(type) {
        this.quickAddType = type;
        
        document.getElementById('quickAddTitle').textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        
        // Generate form based on type
        const form = document.getElementById('quickAddForm');
        form.innerHTML = this.generateQuickAddForm(type);
        
        document.getElementById('quickAddModal').classList.add('show');
    },
    
    // Generate form fields based on type
    generateQuickAddForm(type) {
        const commonFields = `
            <div class="form-group">
                <label>Title/Description *</label>
                <input type="text" id="quickAddContent" placeholder="What needs to be done?" required>
            </div>
            <div class="form-group">
                <label>Priority</label>
                <select id="quickAddPriority">
                    <option value="3">Normal</option>
                    <option value="4">High</option>
                    <option value="5">Urgent</option>
                    <option value="2">Low</option>
                    <option value="1">Optional</option>
                </select>
            </div>
        `;
        
        const typeSpecific = {
            task: `
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="quickAddDue">
                </div>
                <div class="form-group">
                    <label>Estimated Time</label>
                    <input type="text" id="quickAddTime" placeholder="e.g., 30 minutes, 2 hours">
                </div>
            `,
            routine: `
                <div class="form-group">
                    <label>Routine Type</label>
                    <select id="quickAddRoutineType">
                        <option value="morning">Morning</option>
                        <option value="evening">Evening</option>
                        <option value="work">Work</option>
                        <option value="exercise">Exercise</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Frequency</label>
                    <select id="quickAddFrequency">
                        <option value="daily">Daily</option>
                        <option value="weekdays">Weekdays</option>
                        <option value="weekly">Weekly</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
            `,
            goal: `
                <div class="form-group">
                    <label>Target Date</label>
                    <input type="date" id="quickAddTarget">
                </div>
                <div class="form-group">
                    <label>Goal Type</label>
                    <select id="quickAddGoalType">
                        <option value="short-term">Short-term</option>
                        <option value="long-term">Long-term</option>
                        <option value="habit">Habit</option>
                        <option value="project">Project</option>
                    </select>
                </div>
            `,
            event: `
                <div class="form-group">
                    <label>Event Date *</label>
                    <input type="date" id="quickAddDate" required>
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <input type="time" id="quickAddEventTime">
                </div>
            `,
            memory: `
                <div class="form-group">
                    <label>Memory Type</label>
                    <select id="quickAddMemoryType">
                        <option value="insight">Insight</option>
                        <option value="preference">Preference</option>
                        <option value="event">Event</option>
                        <option value="system">System Note</option>
                    </select>
                </div>
            `
        };
        
        return commonFields + (typeSpecific[type] || '') + `
            <div class="form-group">
                <label>Notes</label>
                <textarea id="quickAddNotes" placeholder="Additional details..."></textarea>
            </div>
        `;
    },
    
    // Save quick add form
    async saveQuickAdd() {
        try {
            const formData = this.collectQuickAddData();
            
            if (!formData.content) {
                Utils.showAlert('Please enter a title/description', 'error');
                return;
            }
            
            const response = await API.post('/api/memories', formData);
            
            this.closeQuickAdd();
            this.loadTodaysCards(); // Refresh the view
            
            Utils.showAlert(`${this.quickAddType} added successfully!`, 'success');
            
        } catch (error) {
            Utils.showAlert('Failed to save item', 'error');
        }
    },
    
    // Collect data from quick add form
    collectQuickAddData() {
        const data = {
            type: this.quickAddType,
            content: document.getElementById('quickAddContent')?.value || '',
            priority: document.getElementById('quickAddPriority')?.value || '3',
            notes: document.getElementById('quickAddNotes')?.value || ''
        };
        
        // Add type-specific fields
        const typeFields = {
            task: ['due', 'time'],
            routine: ['routineType', 'frequency'],
            goal: ['target', 'goalType'],
            event: ['date', 'eventTime'],
            memory: ['memoryType']
        };
        
        const fields = typeFields[this.quickAddType] || [];
        fields.forEach(field => {
            const element = document.getElementById(`quickAdd${field.charAt(0).toUpperCase() + field.slice(1)}`);
            if (element?.value) {
                data[field] = element.value;
            }
        });
        
        return data;
    },
    
    // Close quick add modal
    closeQuickAdd() {
        document.getElementById('quickAddModal').classList.remove('show');
        this.quickAddType = null;
    },
    
    // Close card modal
    closeCardModal() {
        document.getElementById('cardModal').classList.remove('show');
        this.selectedCard = null;
    },
    
    // Open global chat
    openGlobalChat() {
        // Switch to chat interface temporarily
        Utils.showAlert('Global chat coming soon!', 'info');
    },
    
    // Show/hide loading state
    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const container = document.getElementById('cardsContainer');
        
        if (show) {
            loading.classList.add('show');
            container.style.display = 'none';
        } else {
            loading.classList.remove('show');
            container.style.display = 'block';
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
            countEl.textContent = `${this.cards.length} items today`;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Cards.init();
});
