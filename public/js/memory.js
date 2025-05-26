// Memory Management Module
const Memory = {
    // Current state
    selectedMemory: null,
    changes: {},
    autoSaveTimeout: null,
    
    // Initialize memory module
    init() {
        this.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Memory modal buttons
        document.getElementById('saveCloseBtn').addEventListener('click', () => this.saveChanges(true, true));
        document.getElementById('addFieldsBtn').addEventListener('click', () => Modals.openAddFieldsModal());
        document.getElementById('discussMemoryBtn').addEventListener('click', this.openMemoryChat.bind(this));
        document.getElementById('deleteMemoryBtn').addEventListener('click', this.confirmDelete.bind(this));
        document.getElementById('closeMemoryBtn').addEventListener('click', () => Modals.closeMemoryModal());
        document.getElementById('memoryModalCloseBtn').addEventListener('click', () => Modals.closeMemoryModal());
        
        // All memories modal
        document.getElementById('allMemoriesCloseBtn').addEventListener('click', () => Modals.closeAllMemoriesModal());
    },
    
    // Load memories from server
    async loadMemories() {
        try {
            MindOS.userMemories = await API.get('/api/memories');
            this.updateDisplays();
        } catch (error) {
            console.error('Failed to load memories:', error);
            Utils.showAlert('Failed to load memories', 'error');
        }
    },
    
    // Refresh memories
    async refreshMemories() {
        await this.loadMemories();
        await App.loadSessionInfo();
        Utils.showAlert('Memories refreshed successfully', 'success');
        UI.closeSidebar();
    },
    
    // Update all memory displays
    updateDisplays() {
        UI.updateMemoryDisplay();
        this.updateSidebarMemories();
    },
    
    // Update sidebar memories display
    updateSidebarMemories() {
        const recentMemoriesDiv = document.getElementById('recentMemories');
        recentMemoriesDiv.innerHTML = '';
        
        const recentMemories = MindOS.userMemories.slice(0, 8);
        
        if (recentMemories.length === 0) {
            recentMemoriesDiv.innerHTML = '<div style="padding: 1rem; text-align: center; color: #888; font-size: 0.9rem;">No memories yet</div>';
            return;
        }
        
        recentMemories.forEach(memory => {
            const memoryDiv = document.createElement('div');
            memoryDiv.className = 'memory-item';
            memoryDiv.setAttribute('data-memory-id', memory.id);
            
            // Build metadata string
            let metadata = '';
            if (memory.priority && memory.priority > 3) metadata += '⭐ ';
            if (memory.performance_streak && memory.performance_streak > 0) {
                metadata += `🔥${memory.performance_streak}d `;
            }
            if (memory.stage) metadata += `[${memory.stage}] `;
            
            memoryDiv.innerHTML = `
                <div class="memory-item-header">
                    <div class="memory-type">${memory.type || 'general'}</div>
                    <div class="memory-actions">
                        <button class="memory-action-btn" onclick="Memory.viewDetails(${memory.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="memory-action-btn delete" onclick="Memory.confirmDeleteDirect(${memory.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="memory-content">${memory.content_short || memory.content?.substring(0, 80) || 'No content'}</div>
                ${metadata ? `<div class="memory-metadata">${metadata}</div>` : ''}
            `;
            
            // Add click handler for memory details
            memoryDiv.addEventListener('click', (e) => {
                if (!e.target.closest('.memory-actions')) {
                    this.viewDetails(memory.id);
                }
            });
            
            recentMemoriesDiv.appendChild(memoryDiv);
        });
    },
    
    // Open all memories modal
    openAllMemoriesModal() {
        UI.closeSidebar();
        this.populateAllMemoriesModal();
        document.getElementById('allMemoriesModal').classList.add('show');
    },
    
    // Populate all memories modal
    populateAllMemoriesModal() {
        // Group memories by type
        const memoryGroups = {};
        MindOS.userMemories.forEach(memory => {
            const type = memory.type || 'general';
            if (!memoryGroups[type]) memoryGroups[type] = [];
            memoryGroups[type].push(memory);
        });

        // Create filter buttons
        const filtersDiv = document.getElementById('memoryTypeFilters');
        filtersDiv.innerHTML = '<button class="filter-btn active" onclick="Memory.filterMemories(\'all\')">All</button>';
        
        Object.keys(memoryGroups).forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} (${memoryGroups[type].length})`;
            btn.onclick = () => this.filterMemories(type);
            filtersDiv.appendChild(btn);
        });

        // Display all memories
        this.displayMemoriesGrid(memoryGroups);
    },
    
    // Filter memories by type
    filterMemories(filterType) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Filter memories
        const memoryGroups = {};
        MindOS.userMemories.forEach(memory => {
            const type = memory.type || 'general';
            if (filterType === 'all' || type === filterType) {
                if (!memoryGroups[type]) memoryGroups[type] = [];
                memoryGroups[type].push(memory);
            }
        });

        this.displayMemoriesGrid(memoryGroups);
    },
    
    // Display memories grid
    displayMemoriesGrid(memoryGroups) {
        const gridDiv = document.getElementById('memoriesGrid');
        gridDiv.innerHTML = '';

        if (Object.keys(memoryGroups).length === 0) {
            gridDiv.innerHTML = '<div style="text-align: center; padding: 3rem; color: #888;">No memories found</div>';
            return;
        }

        Object.entries(memoryGroups).forEach(([type, memories]) => {
            const section = document.createElement('div');
            section.className = 'memory-type-section';
            
            const header = document.createElement('div');
            header.className = 'memory-type-header';
            header.textContent = `${type} (${memories.length})`;
            section.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'memory-grid';
            
            memories.forEach(memory => {
                const card = this.createMemoryCard(memory);
                grid.appendChild(card);
            });

            section.appendChild(grid);
            gridDiv.appendChild(section);
        });
    },
    
    // Create memory card element
    createMemoryCard(memory) {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.onclick = (e) => {
            if (!e.target.closest('.memory-card-actions')) {
                this.viewDetails(memory.id);
                Modals.closeAllMemoriesModal();
            }
        };

        let metadata = [];
        if (memory.performance_streak && memory.performance_streak > 0) {
            metadata.push(`<div class="meta-item"><i class="fas fa-fire"></i> ${memory.performance_streak} days</div>`);
        }
        if (memory.stage) {
            metadata.push(`<div class="meta-item"><i class="fas fa-layer-group"></i> ${memory.stage}</div>`);
        }
        if (memory.location) {
            metadata.push(`<div class="meta-item"><i class="fas fa-map-marker-alt"></i> ${memory.location}</div>`);
        }
        if (memory.mood) {
            metadata.push(`<div class="meta-item"><i class="fas fa-smile"></i> ${memory.mood}</div>`);
        }

        card.innerHTML = `
            <div class="memory-card-header">
                ${memory.priority ? `<div class="memory-card-priority priority-${memory.priority}">Priority ${memory.priority}</div>` : '<div></div>'}
                <div class="memory-card-actions">
                    <button class="memory-action-btn" onclick="Memory.viewDetails(${memory.id}); Modals.closeAllMemoriesModal();" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="memory-action-btn delete" onclick="Memory.confirmDeleteDirect(${memory.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="memory-card-content">${memory.content_short || memory.content?.substring(0, 120) || 'No content'}</div>
            ${metadata.length > 0 ? `<div class="memory-card-meta">${metadata.join('')}</div>` : ''}
        `;

        return card;
    },
    
    // View memory details
    viewDetails(memoryId) {
        const memory = MindOS.userMemories.find(m => m.id === memoryId);
        if (!memory) return;
        
        this.selectedMemory = memory;
        this.changes = {}; // Reset changes
        
        this.populateMemoryModal(memory);
        document.getElementById('memoryModal').classList.add('show');
    },
    
    // Populate memory detail modal
    populateMemoryModal(memory) {
        const modalContent = document.getElementById('memoryModalContent');
        modalContent.innerHTML = '';

        // Create editable fields for all existing data
        Object.entries(memory).forEach(([key, value]) => {
            if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'modified') return;
            if (value === null || value === undefined || value === '') return;

            const fieldDef = memoryFieldDefinitions[key];
            if (!fieldDef) return; // Skip unknown fields

            const section = this.createEditableField(key, value, fieldDef);
            modalContent.appendChild(section);
        });

        this.updateSaveStatus('saved');
    },
    
    // Create editable field
    createEditableField(fieldKey, value, fieldDef) {
        const section = document.createElement('div');
        section.className = 'memory-detail-section';
        section.setAttribute('data-field', fieldKey);

        const label = document.createElement('div');
        label.className = 'memory-detail-label';
        label.innerHTML = `
            ${fieldDef.label}
            ${!fieldDef.required ? `<button class="field-remove-btn" onclick="Memory.removeField('${fieldKey}')" title="Remove field">
                <i class="fas fa-times"></i>
            </button>` : ''}
        `;

        let input;
        if (fieldDef.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'memory-detail-input large';
            input.rows = 3;
        } else if (fieldDef.type === 'select') {
            input = document.createElement('select');
            input.className = 'memory-detail-select';
            fieldDef.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option;
                optionEl.textContent = option.charAt(0).toUpperCase() + option.slice(1);
                if (option == value) optionEl.selected = true;
                input.appendChild(optionEl);
            });
        } else {
            input = document.createElement('input');
            input.className = 'memory-detail-input';
            input.type = fieldDef.type || 'text';
            if (fieldDef.step) input.step = fieldDef.step;
            if (fieldDef.min) input.min = fieldDef.min;
            if (fieldDef.max) input.max = fieldDef.max;
        }

        input.value = value || '';
        input.addEventListener('input', () => this.handleFieldChange(fieldKey, input.value));
        input.addEventListener('blur', () => this.autoSaveChanges());

        section.appendChild(label);
        section.appendChild(input);

        return section;
    },
    
    // Handle field change
    handleFieldChange(fieldKey, value) {
        this.changes[fieldKey] = value;
        this.updateSaveStatus('unsaved');

        // Clear auto-save timeout and set new one
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => this.autoSaveChanges(), MindOS.config.autoSaveDelay);
    },
    
    // Auto-save changes
    async autoSaveChanges() {
        if (Object.keys(this.changes).length === 0) return;
        
        this.updateSaveStatus('saving');
        const success = await this.saveChanges(false);
        this.updateSaveStatus(success ? 'saved' : 'error');
    },
    
    // Save memory changes
    async saveChanges(showAlert = true, closeAfter = false) {
        if (!this.selectedMemory || Object.keys(this.changes).length === 0) {
            if (showAlert) Utils.showAlert('No changes to save', 'success');
            if (closeAfter) {
                setTimeout(() => {
                    document.getElementById('memoryModal').classList.remove('show');
                    this.selectedMemory = null;
                    this.changes = {};
                }, 100);
            }
            return true;
        }

        try {
            this.updateSaveStatus('saving');
            
            const updatedMemory = await API.put(`/api/memories/${this.selectedMemory.id}`, this.changes);
            
            // Update local memory object
            const memoryIndex = MindOS.userMemories.findIndex(m => m.id === this.selectedMemory.id);
            if (memoryIndex !== -1) {
                MindOS.userMemories[memoryIndex] = updatedMemory;
                this.selectedMemory = updatedMemory;
            }

            this.changes = {};
            this.updateDisplays();
            this.updateSaveStatus('saved');
            
            if (showAlert) Utils.showAlert('Memory updated successfully', 'success');
            
            if (closeAfter) {
                setTimeout(() => {
                    document.getElementById('memoryModal').classList.remove('show');
                    this.selectedMemory = null;
                    this.changes = {};
                }, 800);
            }
            return true;
        } catch (error) {
            console.error('Save error:', error);
            this.updateSaveStatus('error');
            if (showAlert) Utils.showAlert('Failed to save: ' + error.message, 'error');
            return false;
        }
    },
    
    // Update save status indicator
    updateSaveStatus(status) {
        const statusEl = document.getElementById('saveStatus');
        statusEl.className = `save-status ${status}`;
        
        switch (status) {
            case 'saved':
                statusEl.innerHTML = '<i class="fas fa-check"></i> Saved';
                break;
            case 'saving':
                statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                break;
            case 'unsaved':
                statusEl.innerHTML = '<i class="fas fa-clock"></i> Unsaved';
                break;
            case 'error':
                statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                break;
        }
    },
    
    // Remove field from memory
    removeField(fieldKey) {
        // Mark field for removal
        this.changes[fieldKey] = null;
        
        // Remove from UI
        const section = document.querySelector(`[data-field="${fieldKey}"]`);
        if (section) section.remove();
        
        this.updateSaveStatus('unsaved');
        this.autoSaveChanges();
    },
    
    // Add field to memory
    addField(fieldKey, fieldDef) {
        // Add field to memory modal
        const modalContent = document.getElementById('memoryModalContent');
        const newField = this.createEditableField(fieldKey, '', fieldDef);
        modalContent.appendChild(newField);

        // Focus on the new field
        const input = newField.querySelector('.memory-detail-input, .memory-detail-select');
        if (input) input.focus();

        this.updateSaveStatus('unsaved');
    },
    
    // Open chat about specific memory
    openMemoryChat() {
        if (!this.selectedMemory) return;
        
        Modals.closeMemoryModal();
        UI.closeSidebar();
        
        // Create a detailed prompt about this memory
        const memoryPrompt = `I'd like to discuss this specific memory in detail:

**Type**: ${this.selectedMemory.type}
**Content**: ${this.selectedMemory.content}
${this.selectedMemory.notes ? `**Notes**: ${this.selectedMemory.notes}` : ''}
${this.selectedMemory.priority ? `**Priority**: ${this.selectedMemory.priority}/5` : ''}
${this.selectedMemory.status ? `**Status**: ${this.selectedMemory.status}` : ''}
${this.selectedMemory.stage ? `**Stage**: ${this.selectedMemory.stage}` : ''}

Please provide full context about this memory and help me with any modifications, additional details, or related planning I might need.`;
        
        document.getElementById('messageInput').value = memoryPrompt;
        Chat.sendMessage();
    },
    
    // Confirm delete memory (direct)
    confirmDeleteDirect(memoryId) {
        const memory = MindOS.userMemories.find(m => m.id === memoryId);
        if (!memory) return;
        
        Modals.showConfirmDialog(
            'Delete Memory',
            `Are you sure you want to delete this memory?\n\n"${memory.content_short || memory.content?.substring(0, 100) || 'Memory'}"`,
            () => this.deleteMemory(memoryId)
        );
    },
    
    // Confirm delete current memory
    confirmDelete() {
        if (!this.selectedMemory) return;
        
        Modals.showConfirmDialog(
            'Delete Memory',
            `Are you sure you want to delete this memory?\n\n"${this.selectedMemory.content_short || this.selectedMemory.content?.substring(0, 100) || 'Memory'}"`,
            () => {
                this.deleteMemory(this.selectedMemory.id);
                Modals.closeMemoryModal();
            }
        );
    },
    
    // Delete memory
    async deleteMemory(memoryId) {
        try {
            await API.delete(`/api/memories/${memoryId}`);
            
            // Remove from local array
            MindOS.userMemories = MindOS.userMemories.filter(m => m.id !== memoryId);
            this.updateDisplays();
            
            // Add success message to chat
            Chat.addMessage('assistant', 'Memory deleted successfully. The information has been removed from my knowledge base.');
            
            // Add visual indicator
            Chat.addMemoryIndicator(1, 'deleted');
            
            Utils.showAlert('Memory deleted successfully', 'success');
            
            // Refresh all memories modal if open
            if (document.getElementById('allMemoriesModal').classList.contains('show')) {
                this.populateAllMemoriesModal();
            }
        } catch (error) {
            console.error('Delete memory error:', error);
            Utils.showAlert('Error deleting memory: ' + error.message, 'error');
        }
    },
    
    // Store memory on frontend
    async storeMemory(userId, type, content, additionalData) {
        try {
            await API.post('/api/memories', { type, content, ...additionalData });
            return true;
        } catch (error) {
            console.error('Store memory error:', error);
            return false;
        }
    },
    
    // Show memory confirmation dialog
    showMemoryConfirmation(memories, onConfirm, onDismiss) {
        const dialog = document.createElement('div');
        dialog.className = 'memory-confirmation-dialog';
        dialog.innerHTML = `
            <div class="memory-confirmation-content">
                <div class="memory-confirmation-header">
                    <div class="memory-confirmation-title">
                        <i class="fas fa-brain"></i> Store Memories?
                    </div>
                    <div class="memory-confirmation-subtitle">
                        I've identified ${memories.length} memory${memories.length > 1 ? 'ies' : ''} to store
                    </div>
                </div>
                
                <div class="memory-preview-list">
                    ${memories.map((memory, index) => `
                        <div class="memory-preview-item">
                            <div class="memory-preview-header">
                                <span class="memory-preview-type">${memory.type}</span>
                                <button class="memory-preview-edit" onclick="Memory.editPendingMemory(${index})">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="memory-preview-content">${memory.content}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="memory-confirmation-actions">
                    <button class="modal-btn secondary" onclick="Memory.dismissMemories()">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                    <button class="modal-btn success" onclick="Memory.confirmMemories()">
                        <i class="fas fa-brain"></i> Remember All
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Store callbacks globally for button handlers
        window.currentMemoryCallbacks = { onConfirm, onDismiss };
        
        window.confirmMemories = () => {
            document.body.removeChild(dialog);
            onConfirm();
            this.cleanup();
        };
        
        window.dismissMemories = () => {
            document.body.removeChild(dialog);
            onDismiss();
            this.cleanup();
        };
        
        window.editPendingMemory = (index) => {
            document.body.removeChild(dialog);
            this.openPendingMemoryEditor(index, onConfirm, onDismiss);
            this.cleanup();
        };
    },
    
    // Cleanup memory confirmation handlers
    cleanup() {
        delete window.currentMemoryCallbacks;
        delete window.confirmMemories;
        delete window.dismissMemories;
        delete window.editPendingMemory;
    },
    
    // Edit pending memory
    openPendingMemoryEditor(index, onConfirm, onDismiss) {
        const memory = MindOS.pendingMemories[index];
        if (!memory) return;
        
        const dialog = document.createElement('div');
        dialog.className = 'memory-confirmation-dialog';
        dialog.innerHTML = `
            <div class="memory-confirmation-content">
                <div class="memory-confirmation-header">
                    <div class="memory-confirmation-title">
                        <i class="fas fa-edit"></i> Edit Memory
                    </div>
                    <div class="memory-confirmation-subtitle">
                        Modify this memory before storing
                    </div>
                </div>
                
                <div class="memory-modal-body" style="max-height: 400px; overflow-y: auto;">
                    <div class="memory-detail-section">
                        <div class="memory-detail-label">Type</div>
                        <select class="memory-detail-select" id="editMemoryType">
                            <option value="goal" ${memory.type === 'goal' ? 'selected' : ''}>Goal</option>
                            <option value="routine" ${memory.type === 'routine' ? 'selected' : ''}>Routine</option>
                            <option value="preference" ${memory.type === 'preference' ? 'selected' : ''}>Preference</option>
                            <option value="insight" ${memory.type === 'insight' ? 'selected' : ''}>Insight</option>
                            <option value="event" ${memory.type === 'event' ? 'selected' : ''}>Event</option>
                            <option value="system" ${memory.type === 'system' ? 'selected' : ''}>System</option>
                        </select>
                    </div>
                    
                    <div class="memory-detail-section">
                        <div class="memory-detail-label">Content</div>
                        <textarea class="memory-detail-input large" id="editMemoryContent">${memory.content}</textarea>
                    </div>
                    
                    <div class="memory-detail-section">
                        <div class="memory-detail-label">Priority (1-5)</div>
                        <select class="memory-detail-select" id="editMemoryPriority">
                            <option value="1" ${memory.additionalData.priority == '1' ? 'selected' : ''}>1 - Low</option>
                            <option value="2" ${memory.additionalData.priority == '2' ? 'selected' : ''}>2 - Low-Medium</option>
                            <option value="3" ${memory.additionalData.priority == '3' ? 'selected' : ''}>3 - Medium</option>
                            <option value="4" ${memory.additionalData.priority == '4' ? 'selected' : ''}>4 - High</option>
                            <option value="5" ${memory.additionalData.priority == '5' ? 'selected' : ''}>5 - Critical</option>
                        </select>
                    </div>
                    
                    <div class="memory-detail-section">
                        <div class="memory-detail-label">Notes (Optional)</div>
                        <textarea class="memory-detail-input" id="editMemoryNotes">${memory.additionalData.notes || ''}</textarea>
                    </div>
                </div>
                
                <div class="memory-confirmation-actions">
                    <button class="modal-btn secondary" onclick="Memory.cancelEdit()">Cancel</button>
                    <button class="modal-btn success" onclick="Memory.saveEditedMemory(${index})">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        window.cancelEdit = () => {
            document.body.removeChild(dialog);
            // Show original confirmation dialog again
            this.showMemoryConfirmation(MindOS.pendingMemories, onConfirm, onDismiss);
            this.cleanup();
        };
        
        window.saveEditedMemory = (index) => {
            // Update the memory with edited values
            MindOS.pendingMemories[index].type = document.getElementById('editMemoryType').value;
            MindOS.pendingMemories[index].content = document.getElementById('editMemoryContent').value;
            MindOS.pendingMemories[index].additionalData.priority = document.getElementById('editMemoryPriority').value;
            MindOS.pendingMemories[index].additionalData.notes = document.getElementById('editMemoryNotes').value;
            
            document.body.removeChild(dialog);
            // Show updated confirmation dialog
            this.showMemoryConfirmation(MindOS.pendingMemories, onConfirm, onDismiss);
            this.cleanup();
        };
    },
    
    // Store pending memories
    async storePendingMemories() {
        for (const memory of MindOS.pendingMemories) {
            await this.storeMemory(MindOS.user.userId, memory.type, memory.content, memory.additionalData);
        }
        
        // Refresh memories and show indicator
        await this.loadMemories();
        Chat.addMemoryIndicator(MindOS.pendingMemories.length, 'stored');
        
        MindOS.pendingMemories = [];
    },
    
    // Reset memory state
    reset() {
        this.selectedMemory = null;
        this.changes = {};
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Memory.init();
});
