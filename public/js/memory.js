// Memory Management Module - FIXED for Card Interface
const Memory = {
    // Current state
    selectedMemory: null,
    changes: {},
    autoSaveTimeout: null,
    
    // Initialize memory module
    init() {
        this.setupEventListeners();
    },
    
    // Setup event listeners - FIXED to check for element existence
    setupEventListeners() {
        // Memory modal buttons - check if elements exist first
        const saveCloseBtn = document.getElementById('saveCloseBtn');
        const addFieldsBtn = document.getElementById('addFieldsBtn');
        const discussMemoryBtn = document.getElementById('discussMemoryBtn');
        const deleteMemoryBtn = document.getElementById('deleteMemoryBtn');
        const closeMemoryBtn = document.getElementById('closeMemoryBtn');
        const memoryModalCloseBtn = document.getElementById('memoryModalCloseBtn');
        const allMemoriesCloseBtn = document.getElementById('allMemoriesCloseBtn');

        // Only add listeners if elements exist
        if (saveCloseBtn) saveCloseBtn.addEventListener('click', () => this.saveChanges(true, true));
        if (addFieldsBtn) addFieldsBtn.addEventListener('click', () => Modals.openAddFieldsModal());
        if (discussMemoryBtn) discussMemoryBtn.addEventListener('click', this.openMemoryChat.bind(this));
        if (deleteMemoryBtn) deleteMemoryBtn.addEventListener('click', this.confirmDelete.bind(this));
        if (closeMemoryBtn) closeMemoryBtn.addEventListener('click', () => Modals.closeMemoryModal());
        if (memoryModalCloseBtn) memoryModalCloseBtn.addEventListener('click', () => Modals.closeMemoryModal());
        if (allMemoriesCloseBtn) allMemoriesCloseBtn.addEventListener('click', () => Modals.closeAllMemoriesModal());
    },
    
    // Show memory confirmation dialog - FIXED VERSION with proper event handlers
    showMemoryConfirmation(memories, onConfirm, onDismiss) {
        const dialog = document.createElement('div');
        dialog.className = 'memory-confirmation-dialog';
        
        // Create unique IDs for this dialog
        const dialogId = 'memoryConfirm_' + Date.now();
        const dismissBtnId = dialogId + '_dismiss';
        const confirmBtnId = dialogId + '_confirm';
        
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
                        <div class="memory-preview-item" data-memory-index="${index}">
                            <div class="memory-preview-header">
                                <span class="memory-preview-type">${memory.type}</span>
                                <button class="memory-preview-edit" data-edit-index="${index}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="memory-preview-content">${memory.content}</div>
                            ${memory.additionalData.priority ? `<div class="memory-preview-meta">Priority: ${memory.additionalData.priority}</div>` : ''}
                            ${memory.additionalData.notes ? `<div class="memory-preview-meta">Notes: ${memory.additionalData.notes}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="memory-confirmation-actions">
                    <button class="modal-btn secondary" id="${dismissBtnId}">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                    <button class="modal-btn success" id="${confirmBtnId}">
                        <i class="fas fa-brain"></i> Remember All
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add proper event listeners instead of onclick
        document.getElementById(dismissBtnId).addEventListener('click', () => {
            this.dismissMemories(dialog, onDismiss);
        });
        
        document.getElementById(confirmBtnId).addEventListener('click', () => {
            this.confirmMemories(dialog, onConfirm);
        });
        
        // Add edit button listeners
        dialog.querySelectorAll('.memory-preview-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.editIndex);
                this.openEnhancedMemoryEditor(index, dialog, onConfirm, onDismiss);
            });
        });
        
        // Store current dialog reference
        this.currentDialog = dialog;
    },

    // Enhanced memory confirmation with continuation support
    showMemoryConfirmationWithContinuation(memories, assistantMessage, onConfirm, onDismiss) {
        const dialog = document.createElement('div');
        dialog.className = 'memory-confirmation-dialog';
        
        const dialogId = 'memoryConfirm_' + Date.now();
        const dismissBtnId = dialogId + '_dismiss';
        const confirmBtnId = dialogId + '_confirm';
        const confirmContinueBtnId = dialogId + '_confirmContinue';
        
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
                        <div class="memory-preview-item" data-memory-index="${index}">
                            <div class="memory-preview-header">
                                <span class="memory-preview-type">${memory.type}</span>
                                <button class="memory-preview-edit" data-edit-index="${index}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="memory-preview-content">${memory.content}</div>
                            ${memory.additionalData.priority ? `<div class="memory-preview-meta">Priority: ${memory.additionalData.priority}</div>` : ''}
                            ${memory.additionalData.notes ? `<div class="memory-preview-meta">Notes: ${memory.additionalData.notes}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="continuation-notice" style="background: #f0f8ff; border: 1px solid #667eea; border-radius: 8px; padding: 1rem; margin: 1rem 0; font-size: 0.9rem;">
                    <i class="fas fa-info-circle" style="color: #667eea; margin-right: 0.5rem;"></i>
                    <strong>Conversation Continuation:</strong> I have more to share about your planning. Choose how to proceed.
                </div>
                
                <div class="memory-confirmation-actions">
                    <button class="modal-btn secondary" id="${dismissBtnId}">
                        <i class="fas fa-times"></i> Dismiss & Continue
                    </button>
                    <button class="modal-btn primary" id="${confirmBtnId}">
                        <i class="fas fa-brain"></i> Remember Only
                    </button>
                    <button class="modal-btn success" id="${confirmContinueBtnId}">
                        <i class="fas fa-brain"></i> Remember & Continue
                    </button>
                </div>
                
                <div class="memory-config-hint" style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #666;">
                    <i class="fas fa-cog"></i> Change this behavior in Settings
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event listeners
        document.getElementById(dismissBtnId).addEventListener('click', () => {
            this.handleMemoryAction(dialog, 'dismiss', assistantMessage, memories, onDismiss);
        });
        
        document.getElementById(confirmBtnId).addEventListener('click', () => {
            this.handleMemoryAction(dialog, 'confirm', assistantMessage, memories, onConfirm);
        });
        
        document.getElementById(confirmContinueBtnId).addEventListener('click', () => {
            this.handleMemoryAction(dialog, 'confirmContinue', assistantMessage, memories, onConfirm);
        });
        
        // Edit button listeners
        dialog.querySelectorAll('.memory-preview-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.editIndex);
                this.openEnhancedMemoryEditor(index, dialog, onConfirm, onDismiss);
            });
        });
        
        this.currentDialog = dialog;
    },

    // Handle memory action with continuation support
    async handleMemoryAction(dialog, action, assistantMessage, memories, callback) {
        // Remove dialog
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
        
        let shouldContinue = false;
        
        switch (action) {
            case 'dismiss':
                // Just show message in chat if available, don't store memories
                if (typeof Chat !== 'undefined') {
                    Chat.addMessage('assistant', assistantMessage);
                }
                shouldContinue = true;
                break;
                
            case 'confirm':
                // Store memories and show message, no continuation
                await this.storePendingMemories();
                if (typeof Chat !== 'undefined') {
                    Chat.addMessage('assistant', assistantMessage);
                    Chat.addMemoryIndicator(memories.length, 'stored');
                }
                break;
                
            case 'confirmContinue':
                // Store memories, show message, and continue conversation
                await this.storePendingMemories();
                if (typeof Chat !== 'undefined') {
                    Chat.addMessage('assistant', assistantMessage);
                    Chat.addMemoryIndicator(memories.length, 'stored');
                }
                shouldContinue = true;
                break;
        }
        
        // Continue conversation if requested and Chat module exists
        if (shouldContinue && typeof Chat !== 'undefined') {
            setTimeout(() => {
                this.continueConversation();
            }, 1500);
        }
        
        // Clear state
        this.currentDialog = null;
        MindOS.pendingMemories = [];
        
        if (callback) callback();
    },

    // Continue conversation function
    continueConversation() {
        console.log('🔄 Continuing conversation...');
        
        if (typeof Chat !== 'undefined') {
            const continuationPrompt = "Please continue with your previous response. You were in the middle of helping me and I'd like you to pick up where you left off.";
            
            Chat.addMessage('user', continuationPrompt);
            Chat.sendContinuationMessage(continuationPrompt);
        }
    },
    
    // FIXED: Confirm memories with proper cleanup
    confirmMemories(dialog, onConfirm) {
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
        if (onConfirm) {
            onConfirm();
        }
        this.currentDialog = null;
    },
    
    // FIXED: Dismiss memories with proper cleanup
    dismissMemories(dialog, onDismiss) {
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
        if (onDismiss) {
            onDismiss();
        }
        this.currentDialog = null;
    },
    
    // ENHANCED: Open enhanced memory editor with add fields functionality
    openEnhancedMemoryEditor(index, parentDialog, onConfirm, onDismiss) {
        const memory = MindOS.pendingMemories[index];
        if (!memory) return;
        
        // Remove parent dialog
        if (parentDialog && parentDialog.parentNode) {
            document.body.removeChild(parentDialog);
        }
        
        const editorDialog = document.createElement('div');
        editorDialog.className = 'memory-confirmation-dialog';
        
        const editorId = 'memoryEditor_' + Date.now();
        const saveId = editorId + '_save';
        const cancelId = editorId + '_cancel';
        const addFieldId = editorId + '_addField';
        
        editorDialog.innerHTML = `
            <div class="memory-confirmation-content" style="max-width: 700px;">
                <div class="memory-confirmation-header">
                    <div class="memory-confirmation-title">
                        <i class="fas fa-edit"></i> Edit Memory
                    </div>
                    <div class="memory-confirmation-subtitle">
                        Modify this memory before storing
                    </div>
                </div>
                
                <div class="memory-modal-body" id="${editorId}_body" style="max-height: 400px; overflow-y: auto;">
                    <!-- Memory fields will be populated here -->
                </div>
                
                <div class="memory-confirmation-actions">
                    <button class="modal-btn secondary" id="${addFieldId}">
                        <i class="fas fa-plus"></i> Add Field
                    </button>
                    <button class="modal-btn secondary" id="${cancelId}">Cancel</button>
                    <button class="modal-btn success" id="${saveId}">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(editorDialog);
        
        // Populate fields
        this.populateMemoryEditor(editorId + '_body', memory);
        
        // Add event listeners
        document.getElementById(cancelId).addEventListener('click', () => {
            this.cancelMemoryEdit(editorDialog, onConfirm, onDismiss);
        });
        
        document.getElementById(saveId).addEventListener('click', () => {
            this.saveMemoryEdit(index, editorDialog, onConfirm, onDismiss);
        });
        
        document.getElementById(addFieldId).addEventListener('click', () => {
            this.showAddFieldsForEditor(editorId + '_body', memory);
        });
        
        this.currentDialog = editorDialog;
        this.currentEditIndex = index;
        this.currentCallbacks = { onConfirm, onDismiss };
    },
    
    // Populate memory editor with all current fields
    populateMemoryEditor(containerId, memory) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Required fields first
        const requiredFields = ['type', 'content'];
        requiredFields.forEach(fieldKey => {
            if (fieldKey === 'type') {
                container.appendChild(this.createEditorField(fieldKey, memory.type, memoryFieldDefinitions[fieldKey], true));
            } else if (fieldKey === 'content') {
                container.appendChild(this.createEditorField(fieldKey, memory.content, memoryFieldDefinitions[fieldKey], true));
            }
        });
        
        // Optional fields that have values
        Object.entries(memory.additionalData).forEach(([fieldKey, value]) => {
            if (!requiredFields.includes(fieldKey) && value !== null && value !== undefined && value !== '') {
                const fieldDef = memoryFieldDefinitions[fieldKey];
                if (fieldDef) {
                    container.appendChild(this.createEditorField(fieldKey, value, fieldDef, false));
                }
            }
        });
    },
    
    // Create editor field element
    createEditorField(fieldKey, value, fieldDef, isRequired) {
        const section = document.createElement('div');
        section.className = 'memory-detail-section';
        section.setAttribute('data-field', fieldKey);
        
        const label = document.createElement('div');
        label.className = 'memory-detail-label';
        label.innerHTML = `
            ${fieldDef.label} ${isRequired ? '<span style="color: red;">*</span>' : ''}
            ${!isRequired ? `<button class="field-remove-btn" data-remove-field="${fieldKey}" title="Remove field">
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
        input.setAttribute('data-field-key', fieldKey);
        
        section.appendChild(label);
        section.appendChild(input);
        
        // Add remove button listener
        const removeBtn = label.querySelector('.field-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                section.remove();
            });
        }
        
        return section;
    },
    
    // Show add fields dialog for editor
    showAddFieldsForEditor(containerId, memory) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const currentFields = Array.from(container.querySelectorAll('[data-field]')).map(el => 
            el.getAttribute('data-field')
        );
        
        const fieldsDialog = document.createElement('div');
        fieldsDialog.className = 'memory-confirmation-dialog';
        fieldsDialog.style.zIndex = '2600'; // Above current dialog
        
        const fieldsId = 'addFields_' + Date.now();
        
        fieldsDialog.innerHTML = `
            <div class="add-fields-content">
                <div class="add-fields-header">
                    <div class="add-fields-title">Add Memory Fields</div>
                    <div class="add-fields-subtitle">Select additional fields to add</div>
                </div>
                
                <div class="fields-grid" id="${fieldsId}_grid">
                    <!-- Available fields will be populated here -->
                </div>
                
                <div class="add-fields-actions">
                    <button class="modal-btn secondary" id="${fieldsId}_cancel">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(fieldsDialog);
        
        // Populate available fields
        const fieldsGrid = document.getElementById(fieldsId + '_grid');
        if (fieldsGrid && memoryFieldDefinitions) {
            Object.entries(memoryFieldDefinitions).forEach(([fieldKey, fieldDef]) => {
                if (!currentFields.includes(fieldKey) && !fieldDef.required) {
                    const fieldOption = document.createElement('div');
                    fieldOption.className = 'field-option';
                    fieldOption.innerHTML = `
                        <div class="field-option-icon">
                            <i class="${fieldDef.icon}"></i>
                        </div>
                        <div class="field-option-name">${fieldDef.label}</div>
                        <div class="field-option-desc">Add ${fieldDef.label.toLowerCase()} information</div>
                    `;
                    
                    fieldOption.addEventListener('click', () => {
                        // Add field to editor
                        const newField = this.createEditorField(fieldKey, '', fieldDef, false);
                        container.appendChild(newField);
                        
                        // Focus new field
                        const input = newField.querySelector('.memory-detail-input, .memory-detail-select');
                        if (input) input.focus();
                        
                        // Close add fields dialog
                        document.body.removeChild(fieldsDialog);
                    });
                    
                    fieldsGrid.appendChild(fieldOption);
                }
            });
        }
        
        // Cancel button
        const cancelBtn = document.getElementById(fieldsId + '_cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(fieldsDialog);
            });
        }
    },
    
    // Cancel memory edit and return to confirmation
    cancelMemoryEdit(dialog, onConfirm, onDismiss) {
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
        
        // Show original confirmation dialog
        this.showMemoryConfirmation(MindOS.pendingMemories, onConfirm, onDismiss);
    },
    
    // Save memory edit and return to confirmation
    saveMemoryEdit(index, dialog, onConfirm, onDismiss) {
        const container = dialog.querySelector('.memory-modal-body');
        if (!container) return;
        
        const fields = container.querySelectorAll('[data-field-key]');
        
        // Collect all field values
        const updatedData = {};
        fields.forEach(field => {
            const fieldKey = field.getAttribute('data-field-key');
            const value = field.value.trim();
            
            if (fieldKey === 'type') {
                MindOS.pendingMemories[index].type = value;
            } else if (fieldKey === 'content') {
                MindOS.pendingMemories[index].content = value;
            } else {
                updatedData[fieldKey] = value;
            }
        });
        
        // Update the memory
        MindOS.pendingMemories[index].additionalData = {
            ...MindOS.pendingMemories[index].additionalData,
            ...updatedData
        };
        
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
        
        // Show updated confirmation dialog
        this.showMemoryConfirmation(MindOS.pendingMemories, onConfirm, onDismiss);
    },
    
    // Store pending memories
    async storePendingMemories() {
        for (const memory of MindOS.pendingMemories) {
            await this.storeMemory(MindOS.user.userId, memory.type, memory.content, memory.additionalData);
        }
        
        // Refresh memories
        await this.loadMemories();
        
        // Refresh cards if available
        if (typeof Cards !== 'undefined') {
            Cards.refresh();
        }
        
        MindOS.pendingMemories = [];
    },
    
    // Load memories from server
    async loadMemories() {
        try {
            MindOS.userMemories = await API.get('/api/memories');
            this.updateDisplays();
        } catch (error) {
            console.error('Failed to load memories:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showAlert('Failed to load memories', 'error');
            }
        }
    },
    
    // Refresh memories
    async refreshMemories() {
        await this.loadMemories();
        if (typeof App !== 'undefined') {
            await App.loadSessionInfo();
        }
        if (typeof Utils !== 'undefined') {
            Utils.showAlert('Memories refreshed successfully', 'success');
        }
        if (typeof UI !== 'undefined') {
            UI.closeSidebar();
        }
    },
    
    // Update all memory displays
    updateDisplays() {
        if (typeof UI !== 'undefined') {
            UI.updateMemoryDisplay();
        }
        this.updateSidebarMemories();
    },
    
    // Update sidebar memories display (for chat interface compatibility)
    updateSidebarMemories() {
        const recentMemoriesDiv = document.getElementById('recentMemories');
        if (!recentMemoriesDiv) return; // Element doesn't exist in card interface
        
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
    
    // View memory details (creates modal dynamically since it may not exist in HTML)
    viewDetails(memoryId) {
        const memory = MindOS.userMemories.find(m => m.id === memoryId);
        if (!memory) return;
        
        this.selectedMemory = memory;
        this.changes = {}; // Reset changes
        
        // Create memory modal dynamically
        this.createMemoryModal(memory);
    },
    
    // Create memory modal dynamically
    createMemoryModal(memory) {
        // Remove existing modal if any
        const existingModal = document.getElementById('dynamicMemoryModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'dynamicMemoryModal';
        modal.className = 'memory-confirmation-dialog';
        
        modal.innerHTML = `
            <div class="memory-confirmation-content" style="max-width: 800px;">
                <div class="memory-confirmation-header">
                    <div class="memory-confirmation-title">
                        <i class="fas fa-brain"></i> Memory Details
                    </div>
                    <button class="memory-modal-close" onclick="Memory.closeDynamicModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="memory-modal-body" id="dynamicMemoryContent" style="max-height: 400px; overflow-y: auto; padding: 1.5rem;">
                    <!-- Memory fields will be populated here -->
                </div>
                
                <div class="memory-confirmation-actions">
                    <button class="modal-btn danger" onclick="Memory.confirmDelete()">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button class="modal-btn secondary" onclick="Memory.closeDynamicModal()">Close</button>
                    <button class="modal-btn success" onclick="Memory.saveChanges(true, true)">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Populate the modal
        this.populateMemoryModal(memory);
    },
    
    // Close dynamic modal
    closeDynamicModal() {
        const modal = document.getElementById('dynamicMemoryModal');
        if (modal) {
            modal.remove();
        }
        this.selectedMemory = null;
        this.changes = {};
    },
    
    // Populate memory detail modal
    populateMemoryModal(memory) {
        const modalContent = document.getElementById('dynamicMemoryContent');
        if (!modalContent) return;
        
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
        this.autoSaveTimeout = setTimeout(() => this.autoSaveChanges(), MindOS.config?.autoSaveDelay || 2000);
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
            if (showAlert && typeof Utils !== 'undefined') {
                Utils.showAlert('No changes to save', 'success');
            }
            if (closeAfter) {
                setTimeout(() => {
                    this.closeDynamicModal();
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
            
            if (showAlert && typeof Utils !== 'undefined') {
                Utils.showAlert('Memory updated successfully', 'success');
            }
            
            if (closeAfter) {
                setTimeout(() => {
                    this.closeDynamicModal();
                }, 800);
            }
            return true;
        } catch (error) {
            console.error('Save error:', error);
            this.updateSaveStatus('error');
            if (showAlert && typeof Utils !== 'undefined') {
                Utils.showAlert('Failed to save: ' + error.message, 'error');
            }
            return false;
        }
    },
    
    // Update save status indicator
    updateSaveStatus(status) {
        // Try to find status element, create if needed
        let statusEl = document.getElementById('saveStatus');
        if (!statusEl) {
            // Create status element in the modal header
            const header = document.querySelector('.memory-confirmation-header');
            if (header) {
                statusEl = document.createElement('div');
                statusEl.id = 'saveStatus';
                statusEl.className = 'save-status';
                header.appendChild(statusEl);
            }
        }
        
        if (!statusEl) return;
        
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
    
    // Confirm delete memory (direct)
    confirmDeleteDirect(memoryId) {
        const memory = MindOS.userMemories.find(m => m.id === memoryId);
        if (!memory) return;
        
        if (typeof Modals !== 'undefined') {
            Modals.showConfirmDialog(
                'Delete Memory',
                `Are you sure you want to delete this memory?\n\n"${memory.content_short || memory.content?.substring(0, 100) || 'Memory'}"`,
                () => this.deleteMemory(memoryId)
            );
        } else {
            // Fallback to native confirm
            if (confirm(`Delete "${memory.content_short || 'this memory'}"?`)) {
                this.deleteMemory(memoryId);
            }
        }
    },
    
    // Confirm delete current memory
    confirmDelete() {
        if (!this.selectedMemory) return;
        
        if (typeof Modals !== 'undefined') {
            Modals.showConfirmDialog(
                'Delete Memory',
                `Are you sure you want to delete this memory?\n\n"${this.selectedMemory.content_short || this.selectedMemory.content?.substring(0, 100) || 'Memory'}"`,
                () => {
                    this.deleteMemory(this.selectedMemory.id);
                    this.closeDynamicModal();
                }
            );
        } else {
            // Fallback to native confirm
            if (confirm(`Delete "${this.selectedMemory.content_short || 'this memory'}"?`)) {
                this.deleteMemory(this.selectedMemory.id);
                this.closeDynamicModal();
            }
        }
    },
    
    // Delete memory
    async deleteMemory(memoryId) {
        try {
            await API.delete(`/api/memories/${memoryId}`);
            
            // Remove from local array
            MindOS.userMemories = MindOS.userMemories.filter(m => m.id !== memoryId);
            this.updateDisplays();
            
            // Refresh cards if available
            if (typeof Cards !== 'undefined') {
                Cards.refresh();
            }
            
            if (typeof Utils !== 'undefined') {
                Utils.showAlert('Memory deleted successfully', 'success');
            }
            
        } catch (error) {
            console.error('Delete memory error:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showAlert('Error deleting memory: ' + error.message, 'error');
            }
        }
    },
    
    // Reset memory state
    reset() {
        this.selectedMemory = null;
        this.changes = {};
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        this.currentDialog = null;
        this.currentEditIndex = null;
        this.currentCallbacks = null;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Memory.init();
});
