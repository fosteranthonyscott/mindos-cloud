// Cards Module - Complete Implementation
const Cards = {
    currentCard: 0,
    memories: [],
    isLoading: false,
    
    init() {
        console.log('🃏 Cards module initializing...');
        this.setupEventListeners();
        this.loadTodaysCards();
    },
    
    setupEventListeners() {
        // Header buttons
        const settingsBtn = document.getElementById('settingsBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }
        
        // Chat modal
        const chatModalClose = document.getElementById('chatModalClose');
        const chatSendBtn = document.getElementById('chatSendBtn');
        const chatInput = document.getElementById('chatInput');
        
        if (chatModalClose) {
            chatModalClose.addEventListener('click', () => this.closeChatModal());
        }
        
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
        
        // Touch/swipe gestures for card navigation
        this.setupSwipeGestures();
    },
    
    async loadTodaysCards() {
        console.log('📅 Loading today\'s cards...');
        this.showLoading(true);
        
        try {
            const response = await API.get('/api/memories/today');
            this.memories = response || [];
            
            console.log(`✅ Loaded ${this.memories.length} items for today`);
            
            if (this.memories.length === 0) {
                this.showEmptyState();
            } else {
                this.renderCards();
                this.updateMemoryCount();
            }
        } catch (error) {
            console.error('❌ Failed to load today\'s cards:', error);
            this.showError('Failed to load your items for today');
        } finally {
            this.showLoading(false);
        }
    },
    
    renderCards() {
        const viewport = document.getElementById('cardsViewport');
        const navigation = document.getElementById('cardNavigation');
        
        if (!viewport) {
            console.error('Cards viewport not found');
            return;
        }
        
        // Hide empty state
        this.hideEmptyState();
        
        // Clear existing content
        viewport.innerHTML = '';
        if (navigation) navigation.innerHTML = '';
        
        // Render each card
        this.memories.forEach((memory, index) => {
            const cardHTML = this.createScrollCardHTML(memory);
            viewport.innerHTML += cardHTML;
            
            // Add navigation dot
            if (navigation) {
                const dot = document.createElement('div');
                dot.className = `nav-dot ${index === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => this.goToCard(index));
                navigation.appendChild(dot);
            }
        });
        
        // Setup card controls
        this.setupCardControls();
        
        // Initialize at first card
        this.currentCard = 0;
        this.updateCardPosition();
    },
    
    createScrollCardHTML(memory) {
        const type = memory.type || 'memory';
        const priority = memory.priority || 1;
        const title = memory.content_short || memory.content?.substring(0, 80) || 'Untitled';
        const description = memory.notes || memory.content?.substring(80, 200) || '';
        
        // Due date calculation
        let dueMeta = '';
        if (memory.due) {
            const dueDate = new Date(memory.due);
            const today = new Date();
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                dueMeta = `<div class="meta-item due-today"><i class="fas fa-exclamation-triangle"></i> ${Math.abs(diffDays)} days overdue</div>`;
            } else if (diffDays === 0) {
                dueMeta = `<div class="meta-item due-today"><i class="fas fa-calendar-day"></i> Due Today</div>`;
            } else if (diffDays === 1) {
                dueMeta = `<div class="meta-item due-soon"><i class="fas fa-calendar-alt"></i> Due Tomorrow</div>`;
            } else if (diffDays <= 7) {
                dueMeta = `<div class="meta-item due-soon"><i class="fas fa-calendar-alt"></i> Due in ${diffDays} days</div>`;
            }
        }
        
        // Priority stars
        const priorityStars = Array.from({length: 5}, (_, i) => 
            i < priority ? '<span class="priority-star">★</span>' : '<span class="priority-star empty">☆</span>'
        ).join('');
        
        // Status indicator
        let statusHTML = '';
        if (memory.status) {
            statusHTML = `<div class="status-indicator ${memory.status}">
                <i class="fas fa-${this.getStatusIcon(memory.status)}"></i>
                ${memory.status.charAt(0).toUpperCase() + memory.status.slice(1)}
            </div>`;
        }
        
        // Streak indicator
        let streakHTML = '';
        if (memory.performance_streak && memory.performance_streak > 0) {
            streakHTML = `<div class="streak-indicator">
                <i class="fas fa-fire"></i>
                <span class="streak-number">${memory.performance_streak}</span>
                <span>day streak</span>
            </div>`;
        }
        
        return `
            <div class="memory-card" data-memory-id="${memory.id}" data-type="${type}">
                <div class="card-content-area">
                    <div class="card-header">
                        <div class="card-type-badge ${type}">${type}</div>
                        <div class="priority-indicator">
                            ${priorityStars}
                        </div>
                    </div>
                    
                    <div class="card-main-content">
                        <div class="card-title">${title}</div>
                        
                        ${statusHTML}
                        
                        <div class="card-meta">
                            ${dueMeta}
                            ${memory.required_time ? `<div class="meta-item"><i class="fas fa-clock"></i> ${memory.required_time}</div>` : ''}
                            ${memory.location ? `<div class="meta-item"><i class="fas fa-map-marker-alt"></i> ${memory.location}</div>` : ''}
                            ${priority >= 4 ? `<div class="meta-item high-priority"><i class="fas fa-star"></i> High Priority</div>` : ''}
                        </div>
                        
                        ${streakHTML}
                        
                        ${description ? `<div class="card-notes">
                            <div class="notes-label">
                                <i class="fas fa-sticky-note"></i> Notes
                            </div>
                            ${description}
                        </div>` : ''}
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
    
    setupCardControls() {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const card = btn.closest('.memory-card');
                const memoryId = parseInt(card.dataset.memoryId);
                
                this.handleCardAction(action, memoryId, card);
            });
        });
    },
    
    async handleCardAction(action, memoryId, cardElement) {
        const memory = this.memories.find(m => m.id === memoryId);
        if (!memory) return;
        
        console.log(`🎯 Card action: ${action} for memory ${memoryId}`);
        
        switch (action) {
            case 'complete':
                await this.completeMemory(memory, cardElement);
                break;
            case 'chat':
                this.openChatModal(memory);
                break;
            case 'edit':
                this.editMemory(memory);
                break;
            case 'delete':
                this.deleteMemory(memory, cardElement);
                break;
        }
    },
    
    async completeMemory(memory, cardElement) {
        try {
            const updates = { status: 'completed' };
            
            // Update streak for routines
            if (memory.type === 'routine') {
                updates.performance_streak = (memory.performance_streak || 0) + 1;
            }
            
            await API.put(`/api/memories/${memory.id}`, updates);
            
            // Update local memory
            Object.assign(memory, updates);
            
            // Visual feedback
            cardElement.classList.add('completed');
            setTimeout(() => {
                this.removeCard(memory.id);
            }, 1000);
            
            Utils.showAlert('Item completed! 🎉', 'success');
            
        } catch (error) {
            console.error('Error completing memory:', error);
            Utils.showAlert('Failed to complete item', 'error');
        }
    },
    
    openChatModal(memory) {
        const modal = document.getElementById('chatModal');
        const title = document.getElementById('chatModalTitle');
        const messages = document.getElementById('chatMessages');
        
        if (!modal || !title || !messages) return;
        
        title.textContent = memory.content_short || memory.content?.substring(0, 50) || 'Item';
        messages.innerHTML = '';
        
        // Add initial context message
        this.addChatMessage('assistant', `Let's discuss your ${memory.type}: "${title.textContent}". What would you like to know or change?`);
        
        modal.classList.add('show');
        
        // Store current memory for chat context
        this.currentChatMemory = memory;
    },
    
    closeChatModal() {
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentChatMemory = null;
    },
    
    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        if (!input || !input.value.trim()) return;
        
        const message = input.value.trim();
        input.value = '';
        
        // Add user message
        this.addChatMessage('user', message);
        
        try {
            // Create context prompt
            const contextPrompt = `I'm discussing this specific item with the user:
            
Type: ${this.currentChatMemory.type}
Content: ${this.currentChatMemory.content}
Status: ${this.currentChatMemory.status || 'active'}
Priority: ${this.currentChatMemory.priority || 1}

User message: "${message}"

Please respond helpfully about this specific item. If they want to modify it, suggest what changes to make.`;
            
            const response = await API.post('/api/claude', {
                messages: [{ role: 'user', content: contextPrompt }]
            });
            
            const assistantMessage = response.content[0].text;
            this.addChatMessage('assistant', assistantMessage);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.addChatMessage('assistant', 'Sorry, I had trouble processing that. Could you try again?');
        }
    },
    
    addChatMessage(type, content) {
        const messages = document.getElementById('chatMessages');
        if (!messages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    },
    
    editMemory(memory) {
        if (typeof Memory !== 'undefined') {
            Memory.viewDetails(memory.id);
        }
    },
    
    async deleteMemory(memory, cardElement) {
        if (!confirm(`Delete "${memory.content_short || 'this item'}"?`)) return;
        
        try {
            await API.delete(`/api/memories/${memory.id}`);
            this.removeCard(memory.id);
            Utils.showAlert('Item deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            Utils.showAlert('Failed to delete item', 'error');
        }
    },
    
    removeCard(memoryId) {
        this.memories = this.memories.filter(m => m.id !== memoryId);
        
        if (this.memories.length === 0) {
            this.showEmptyState();
        } else {
            this.renderCards();
        }
        
        this.updateMemoryCount();
    },
    
    setupSwipeGestures() {
        const viewport = document.getElementById('cardsViewport');
        if (!viewport) return;
        
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        viewport.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });
        
        viewport.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
        });
        
        viewport.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const diffX = startX - currentX;
            
            if (Math.abs(diffX) > 50) { // Minimum swipe distance
                if (diffX > 0 && this.currentCard < this.memories.length - 1) {
                    this.nextCard();
                } else if (diffX < 0 && this.currentCard > 0) {
                    this.prevCard();
                }
            }
        });
    },
    
    goToCard(index) {
        if (index >= 0 && index < this.memories.length) {
            this.currentCard = index;
            this.updateCardPosition();
            this.updateNavigation();
        }
    },
    
    nextCard() {
        if (this.currentCard < this.memories.length - 1) {
            this.currentCard++;
            this.updateCardPosition();
            this.updateNavigation();
        }
    },
    
    prevCard() {
        if (this.currentCard > 0) {
            this.currentCard--;
            this.updateCardPosition();
            this.updateNavigation();
        }
    },
    
    updateCardPosition() {
        const viewport = document.getElementById('cardsViewport');
        if (!viewport) return;
        
        const cards = viewport.querySelectorAll('.memory-card');
        cards.forEach((card, index) => {
            card.style.display = index === this.currentCard ? 'flex' : 'none';
        });
    },
    
    updateNavigation() {
        const navigation = document.getElementById('cardNavigation');
        if (!navigation) return;
        
        const dots = navigation.querySelectorAll('.nav-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentCard);
        });
    },
    
    showLoading(show) {
        const loading = document.getElementById('loadingState');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
        this.isLoading = show;
    },
    
    showEmptyState() {
        const empty = document.getElementById('emptyState');
        const viewport = document.getElementById('cardsViewport');
        const navigation = document.getElementById('cardNavigation');
        
        if (empty) empty.style.display = 'flex';
        if (viewport) viewport.innerHTML = '';
        if (navigation) navigation.innerHTML = '';
    },
    
    hideEmptyState() {
        const empty = document.getElementById('emptyState');
        if (empty) empty.style.display = 'none';
    },
    
    showError(message) {
        Utils.showAlert(message, 'error');
        this.showEmptyState();
    },
    
    showSettings() {
        if (typeof MemorySettings !== 'undefined') {
            MemorySettings.showSettingsModal();
        }
    },
    
    updateMemoryCount() {
        const countElement = document.getElementById('memoryCount');
        if (countElement) {
            countElement.textContent = `${this.memories.length} items`;
        }
    },
    
    getStatusIcon(status) {
        const icons = {
            'active': 'play-circle',
            'completed': 'check-circle',
            'paused': 'pause-circle',
            'archived': 'archive',
            'planned': 'calendar-plus'
        };
        return icons[status] || 'circle';
    },
    
    // Refresh data
    async refresh() {
        await this.loadTodaysCards();
    }
};

// Export for global access
window.Cards = Cards;
