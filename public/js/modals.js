// Modal Management Module
const Modals = {
    // Current state
    pendingAction: null,
    
    // Initialize modal module
    init() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    },
    
    // Setup event listeners - FIXED to check element existence
    setupEventListeners() {
        // Add fields modal - check if elements exist
        const cancelAddFieldsBtn = document.getElementById('cancelAddFieldsBtn');
        const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        
        if (cancelAddFieldsBtn) {
            cancelAddFieldsBtn.addEventListener('click', this.closeAddFieldsModal.bind(this));
        }
        
        if (cancelConfirmBtn) {
            cancelConfirmBtn.addEventListener('click', this.closeConfirmDialog.bind(this));
        }
        
        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', this.executeConfirmedAction.bind(this));
        }
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || 
                e.target.classList.contains('all-memories-modal') ||
                e.target.classList.contains('memory-modal') ||
                e.target.classList.contains('add-fields-modal') ||
                e.target.classList.contains('config-modal') ||
                e.target.classList.contains('confirm-dialog')) {
                this.closeAllModals();
            }
        });
    },
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },
    
    // Close all modals
    closeAllModals() {
        this.closeMemoryModal();
        this.closeAllMemoriesModal();
        this.closeAddFieldsModal();
        this.closeConfirmDialog();
        if (typeof Config !== 'undefined' && Config.closeModal) {
            Config.closeModal();
        }
    },
    
    // Memory Modal Functions
    closeMemoryModal() {
        const memoryModal = document.getElementById('memoryModal');
        if (!memoryModal) return;
        
        // Check for unsaved changes if Memory module exists
        if (typeof Memory !== 'undefined' && Object.keys(Memory.changes || {}).length > 0) {
            this.showConfirmDialog(
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to close without saving?',
                () => {
                    memoryModal.classList.remove('show');
                    if (typeof Memory !== 'undefined') {
                        Memory.selectedMemory = null;
                        Memory.changes = {};
                    }
                }
            );
            return;
        }

        memoryModal.classList.remove('show');
        if (typeof Memory !== 'undefined') {
            Memory.selectedMemory = null;
            Memory.changes = {};
        }
    },
    
    // All Memories Modal Functions
    closeAllMemoriesModal() {
        const allMemoriesModal = document.getElementById('allMemoriesModal');
        if (allMemoriesModal) {
            allMemoriesModal.classList.remove('show');
        }
    },
    
    // Add Fields Modal Functions
    openAddFieldsModal() {
        this.populateAddFieldsModal();
        const addFieldsModal = document.getElementById('addFieldsModal');
        if (addFieldsModal) {
            addFieldsModal.classList.add('show');
        }
    },
    
    closeAddFieldsModal() {
        const addFieldsModal = document.getElementById('addFieldsModal');
        if (addFieldsModal) {
            addFieldsModal.classList.remove('show');
        }
    },
    
    populateAddFieldsModal() {
        const fieldsGrid = document.getElementById('fieldsGrid');
        if (!fieldsGrid) return;
        
        fieldsGrid.innerHTML = '';

        // Get fields that are currently displayed in the modal if Memory module exists
        let currentFields = [];
        if (typeof Memory !== 'undefined') {
            currentFields = Array.from(document.querySelectorAll('[data-field]')).map(el => 
                el.getAttribute('data-field')
            );
        }
        
        // Check if memoryFieldDefinitions exists
        if (typeof memoryFieldDefinitions === 'undefined') {
            fieldsGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #888;">Field definitions not available</div>';
            return;
        }
        
        Object.entries(memoryFieldDefinitions).forEach(([fieldKey, fieldDef]) => {
            // Skip if field is already displayed OR if it's a required field
            if (currentFields.includes(fieldKey) || fieldDef.required) return;

            const fieldOption = document.createElement('div');
            fieldOption.className = 'field-option';
            fieldOption.onclick = () => this.addField(fieldKey, fieldDef);

            fieldOption.innerHTML = `
                <div class="field-option-icon">
                    <i class="${fieldDef.icon}"></i>
                </div>
                <div class="field-option-name">${fieldDef.label}</div>
                <div class="field-option-desc">Add ${fieldDef.label.toLowerCase()} information</div>
            `;

            fieldsGrid.appendChild(fieldOption);
        });

        if (fieldsGrid.children.length === 0) {
            fieldsGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #888;">All available fields are already added</div>';
        }
    },
    
    addField(fieldKey, fieldDef) {
        if (typeof Memory !== 'undefined' && Memory.addField) {
            Memory.addField(fieldKey, fieldDef);
        }
        this.closeAddFieldsModal();
    },
    
    // Confirmation Dialog Functions
    showConfirmDialog(title, message, onConfirm) {
        const confirmDialog = document.getElementById('confirmDialog');
        if (!confirmDialog) {
            console.warn('Confirm dialog element not found');
            return;
        }
        
        const titleElement = document.querySelector('.confirm-dialog-title');
        const messageElement = document.getElementById('confirmMessage');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        this.pendingAction = onConfirm;
        confirmDialog.classList.add('show');
    },
    
    closeConfirmDialog() {
        const confirmDialog = document.getElementById('confirmDialog');
        if (confirmDialog) {
            confirmDialog.classList.remove('show');
        }
        this.pendingAction = null;
    },
    
    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
        this.closeConfirmDialog();
    },
    
    // Modal Utilities
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    },
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    toggleModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.toggle('show');
        }
    },
    
    isModalOpen(modalId) {
        const modal = document.getElementById(modalId);
        return modal ? modal.classList.contains('show') : false;
    },
    
    // Create dynamic modal
    createModal(id, title, content, actions = []) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">${title}</div>
                    <button class="modal-close" onclick="Modals.removeModal('${id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal-actions">
                        ${actions.map(action => `
                            <button class="modal-btn ${action.class || 'secondary'}" 
                                    onclick="${action.onclick || ''}">
                                ${action.icon ? `<i class="${action.icon}"></i>` : ''} 
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('show');
        
        return modal;
    },
    
    // Remove dynamic modal
    removeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    },
    
    // Loading Modal
    showLoadingModal(message = 'Loading...') {
        return this.createModal('loadingModal', 'Please Wait', `
            <div style="text-align: center; padding: 2rem;">
                <div class="spinner" style="margin: 0 auto 1rem; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p>${message}</p>
            </div>
        `);
    },
    
    hideLoadingModal() {
        this.removeModal('loadingModal');
    },
    
    // Alert Modal
    showAlertModal(title, message, type = 'info') {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };
        
        const colors = {
            info: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        
        return this.createModal('alertModal', title, `
            <div style="text-align: center; padding: 2rem;">
                <i class="${icons[type]}" style="font-size: 3rem; color: ${colors[type]}; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; line-height: 1.5;">${message}</p>
            </div>
        `, [
            {
                text: 'OK',
                class: 'primary',
                onclick: "Modals.removeModal('alertModal')"
            }
        ]);
    },
    
    // Prompt Modal
    showPromptModal(title, message, placeholder = '', onConfirm) {
        const promptId = 'promptModal_' + (typeof Utils !== 'undefined' ? Utils.generateId() : Date.now());
        
        // Store callback globally for access
        window.currentPromptCallback = onConfirm;
        
        return this.createModal(promptId, title, `
            <div style="padding: 1rem;">
                <p style="margin-bottom: 1rem;">${message}</p>
                <input type="text" id="${promptId}_input" 
                       placeholder="${placeholder}" 
                       style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;"
                       onkeypress="if(event.key==='Enter') Modals.executePrompt('${promptId}')">
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'secondary',
                onclick: `Modals.removeModal('${promptId}')`
            },
            {
                text: 'OK',
                class: 'primary',
                onclick: `Modals.executePrompt('${promptId}')`
            }
        ]);
    },
    
    executePrompt(promptId) {
        const input = document.getElementById(`${promptId}_input`);
        const value = input ? input.value.trim() : '';
        
        // Get the stored callback if available
        if (window.currentPromptCallback) {
            window.currentPromptCallback(value);
            delete window.currentPromptCallback;
        }
        
        this.removeModal(promptId);
    },
    
    // Image Modal
    showImageModal(imageSrc, title = '') {
        return this.createModal('imageModal', title, `
            <div style="text-align: center;">
                <img src="${imageSrc}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
            </div>
        `, [
            {
                text: 'Close',
                class: 'secondary',
                onclick: "Modals.removeModal('imageModal')"
            }
        ]);
    },
    
    // Progress Modal
    showProgressModal(title, initialMessage = '') {
        const modal = this.createModal('progressModal', title, `
            <div style="padding: 2rem;">
                <div class="progress-bar" style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; margin-bottom: 1rem;">
                    <div id="progressFill" style="height: 100%; background: #667eea; width: 0%; transition: width 0.3s;"></div>
                </div>
                <p id="progressMessage">${initialMessage}</p>
            </div>
        `);
        
        return {
            modal,
            updateProgress: (percent, message) => {
                const fill = document.getElementById('progressFill');
                const msg = document.getElementById('progressMessage');
                if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
                if (msg && message) msg.textContent = message;
            },
            close: () => this.removeModal('progressModal')
        };
    },
    
    // Modal State Management
    getOpenModals() {
        return Array.from(document.querySelectorAll('.modal-overlay.show, .all-memories-modal.show, .memory-modal.show, .add-fields-modal.show, .config-modal.show, .confirm-dialog.show'))
            .map(modal => modal.id || modal.className);
    },
    
    hasOpenModals() {
        return this.getOpenModals().length > 0;
    },
    
    // Focus Management
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
        
        // Focus first element
        if (firstElement) {
            firstElement.focus();
        }
    },
    
    // Reset modal state
    reset() {
        this.pendingAction = null;
        this.closeAllModals();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Modals.init();
});
