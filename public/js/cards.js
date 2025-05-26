// Cards Module - Fixed for Real Data Loading and Working Action Buttons
const Cards = {
    memories: [],
    isLoading: false,
    
    init() {
        console.log('🃏 Cards module initializing...');
        this.setupEventListeners();
        // Don't load data here - let App.js handle it after auth
    },
    
    setupEventListeners() {
        // Header buttons
        const settingsBtn = document.getElementById('settingsBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined') {
                    Auth.logout();
                }
            });
        }
        
        // Action buttons - Fixed integration with Config system
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                
                // Visual feedback
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = '', 150);
                
                // Handle the action
                this.handleActionButton(action);
            });
        });
        
        // Chat modal
        this.setupChatModal();
    },
    
    handleActionButton(action) {
        console.log(`🎯 Action button clicked: ${action}`);
        
        switch(action) {
            case 'add-task':
                if (typeof Config !== 'undefined') {
                    Config.openConfigMode('create-task');
                } else {
                    Utils.showAlert('Task creation not available', 'error');
                }
                break;
                
            case 'add-routine':
                if (typeof Config !== 'undefined') {
                    Config.openConfigMode('create-routine');
                } else {
                    Utils.showAlert('Routine creation not available', 'error');
                }
                break;
                
            case 'add-goal':
                if (typeof Config !== 'undefined') {
                    Config.openConfigMode('set-goals');
                } else {
                    Utils.showAlert('Goal creation not available', 'error');
                }
                break;
                
            case 'add-event':
                this.showQuickCreateDialog('event');
                break;
                
            case 'add-memory':
                this.showQuickCreateDialog('memory');
                break;
                
            case 'show-all':
                if (typeof Memory !== 'undefined') {
                    // Open all memories modal
                    this.openAllMemoriesModal();
                } else {
                    Utils.showAlert('Memory management not available', 'error');
                }
                break;
        }
    },
    
    async loadTodaysCards() {
        console.log('📅 Loading today\'s cards...');
        this.showLoading(true);
        
        try {
            // Check if user is authenticated
            if (!MindOS.token) {
                console.log('No auth token, skipping card load');
                this.showEmptyState();
                return;
            }
            
            const response = await API.get('/api/memories/today');
            this.memories = response || [];
            
            console.log(`✅ Loaded ${this.memories.length} items for today`);
            
            if (this.memories.length === 0) {
                this.showEmptyState();
            } else {
                this.renderCards();
            }
            
            this.updateMemoryCount();
            
        } catch (error) {
            console.error('❌ Failed to load today\'s cards:', error);
            this.showError('Failed to load your items for today');
        } finally {
            this.showLoading(false);
        }
    },
    
    renderCards() {
        const cardsFeed = document.getElementById('cardsFeed');
        if (!cardsFeed) {
            console.error('Cards feed container not found');
            return;
        }
        
        // Hide loading and empty states
        this.hideLoadingAndEmpty();
        
        // Clear existing cards
        cardsFeed.innerHTML = '';
        
        // Render each memory as a card
        this.memories.forEach(memory => {
            const cardHTML = this.createCardHTML(memory);
            cardsFeed.innerHTML += cardHTML;
        });
        
        // Setup card action handlers
        this.setupCardActions();
        
        console.log(`✅ Rendered ${this.memories.length} cards`);
    },
    
    createCardHTML(memory) {
        const type = memory.type || 'memory';
        const priority = parseInt(memory.priority) || 1;
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
                <div class="card-header">
                    <div class="card-type-badge ${type}">${type}</div>
                    <div class="priority-indicator">
                        ${priorityStars}
                    </div>
                </div>
                
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
                
                <div class="card-actions">
                    <button class="action-btn-small complete" title="Complete" data-action="complete">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn-small edit" title="Edit" data-action="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn-small delete" title="Delete" data-action="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    setupCardActions() {
        document.querySelectorAll('.action-btn-small').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const card = btn.closest('.memory-card');
                const memoryId = parseInt(card.dataset.memoryId);
                
                await this.handleCardAction(action, memoryId, card);
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
            case 'edit':
                this.editMemory(memory);
                break;
            case 'delete':
                await this.deleteMemory(memory, cardElement);
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
            cardElement.style.opacity = '0.7';
            cardElement.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                this.removeCard(memory.id);
            }, 1000);
            
            Utils.showAlert('Item completed! 🎉', 'success');
            
        } catch (error) {
            console.error('Error completing memory:', error);
            Utils.showAlert('Failed to complete item', 'error');
        }
    },
    
    editMemory(memory) {
        if (typeof Memory !== 'undefined') {
            Memory.viewDetails(memory.id);
        } else {
            Utils.showAlert('Memory editing not available', 'error');
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
        
        // Remove card from DOM
        const cardElement = document.querySelector(`[data-memory-id="${memoryId}"]`);
        if (cardElement) {
            cardElement.remove();
        }
        
        if (this.memories.length === 0) {
            this.showEmptyState();
        }
        
        this.updateMemoryCount();
    },
    
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
        if (!config) {
            Utils.showAlert(`${type} creation not available`, 'error');
            return;
        }

        if (typeof Modals !== 'undefined') {
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
                              style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #e0e6ff; border-radius: 8px; font-family: inherit; resize: vertical;"></textarea>
                    
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
                    onclick: `Cards.submitQuickCreate('${type}')`
                }
            ]);

            // Focus the input
            setTimeout(() => {
                const input = document.getElementById(`quickCreate${type}Input`);
                if (input) input.focus();
            }, 100);
        }
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
            await this.refresh();
            
            Modals.removeModal(`create${type}Modal`);
            
        } catch (error) {
            console.error(`Error creating ${type}:`, error);
            Utils.showAlert(`Failed to create ${type}: ${error.message}`, 'error');
        }
    },
    
    openAllMemoriesModal() {
        // Simple version - just show an alert for now
        // In a full implementation, this would open a modal with all memories
        Utils.showAlert('All memories view - would open full memory browser', 'info');
    },
    
    setupChatModal() {
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
    },
    
    closeChatModal() {
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    async sendChatMessage() {
        // Basic chat implementation
        const input = document.getElementById('chatInput');
        if (!input || !input.value.trim()) return;
        
        const message = input.value.trim();
        input.value = '';
        
        Utils.showAlert('Chat feature coming soon!', 'info');
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
        if (empty) {
            empty.style.display = 'flex';
        }
        this.hideLoading();
    },
    
    hideLoadingAndEmpty() {
        const loading = document.getElementById('loadingState');
        const empty = document.getElementById('emptyState');
        
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'none';
    },
    
    hideLoading() {
        this.showLoading(false);
    },
    
    showError(message) {
        Utils.showAlert(message, 'error');
        this.showEmptyState();
    },
    
    showSettings() {
        if (typeof MemorySettings !== 'undefined') {
            MemorySettings.showSettingsModal();
        } else {
            Utils.showAlert('Settings not available', 'info');
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
