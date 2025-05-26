// ENHANCED Configuration Module with Interactive Plan Your Day
const Config = {
    currentMode: null,
    data: {},
    selectedMemories: [], // NEW: Track selected memories for planning
    
    configurations: {
        'plan-day': {
            title: 'Plan Your Day',
            subtitle: 'Select relevant items and set planning preferences',
            type: 'interactive_planning', // NEW: Special type for interactive planning
            steps: [
                {
                    title: 'Planning Focus',
                    options: [
                        { id: 'comprehensive', title: 'Comprehensive Planning', desc: 'Full day schedule with time blocks and priorities' },
                        { id: 'priorities', title: 'Priority Focus', desc: 'Identify top 3-5 priorities for the day' },
                        { id: 'routine', title: 'Routine Check', desc: 'Review and adjust existing routines' }
                    ]
                },
                {
                    title: 'Time Frame',
                    options: [
                        { id: 'today', title: 'Today Only', desc: 'Plan just for today' },
                        { id: 'tomorrow', title: 'Tomorrow Only', desc: 'Plan just for tomorrow' },
                        { id: 'week', title: 'This Week', desc: 'Plan for the entire week' },
                        { id: 'custom', title: 'Custom Period', desc: 'Specify custom time frame' }
                    ]
                }
            ]
        },
        // ... other configurations remain the same
        'set-goals': {
            title: 'Set Goals',
            subtitle: 'Define and structure your objectives',
            steps: [
                {
                    title: 'Goal Type',
                    options: [
                        { id: 'short-term', title: 'Short-term Goal', desc: 'Achievable within days or weeks' },
                        { id: 'long-term', title: 'Long-term Goal', desc: 'Major objective taking months or years' },
                        { id: 'habit', title: 'Habit Goal', desc: 'Building or breaking a habit' },
                        { id: 'project', title: 'Project Goal', desc: 'Specific project with milestones' }
                    ]
                },
                {
                    title: 'Priority Level',
                    options: [
                        { id: '5', title: 'Critical Priority', desc: 'Must achieve - highest importance' },
                        { id: '4', title: 'High Priority', desc: 'Very important to achieve' },
                        { id: '3', title: 'Medium Priority', desc: 'Important but flexible' },
                        { id: '2', title: 'Low Priority', desc: 'Nice to achieve when possible' }
                    ]
                }
            ]
        },
        'create-routine': {
            title: 'Create Routine',
            subtitle: 'Build sustainable daily or weekly habits',
            type: 'form',
            defaultFields: {
                type: 'routine',
                content: '',
                routine_type: 'custom',
                frequency: 'daily',
                priority: '3',
                status: 'planned',
                stage: 'planned',
                energy_requirements: 'medium',
                required_time: '15 minutes',
                performance_streak: '0',
                trigger: '',
                success_criteria: '',
                notes: ''
            },
            fieldDefinitions: {
                routine_type: {
                    label: 'Routine Type',
                    icon: 'fas fa-list',
                    type: 'select',
                    options: ['morning', 'evening', 'work', 'exercise', 'health', 'learning', 'self-care', 'custom'],
                    required: true
                },
                content: {
                    label: 'Routine Description',
                    icon: 'fas fa-align-left',
                    type: 'textarea',
                    placeholder: 'Describe your routine in detail...',
                    required: true
                },
                frequency: {
                    label: 'Frequency',
                    icon: 'fas fa-calendar-alt',
                    type: 'select',
                    options: ['daily', 'weekdays', 'weekends', 'weekly', 'bi-weekly', 'monthly', 'flexible'],
                    required: true
                },
                trigger: {
                    label: 'Trigger/Cue',
                    icon: 'fas fa-play',
                    type: 'text',
                    placeholder: 'What starts this routine? (e.g., wake up, after coffee, 6 PM alarm)'
                },
                required_time: {
                    label: 'Time Required',
                    icon: 'fas fa-clock',
                    type: 'text',
                    placeholder: 'How long does this take? (e.g., 15 minutes, 1 hour)'
                },
                energy_requirements: {
                    label: 'Energy Level Needed',
                    icon: 'fas fa-battery-three-quarters',
                    type: 'select',
                    options: ['low', 'medium', 'high']
                },
                priority: {
                    label: 'Priority',
                    icon: 'fas fa-star',
                    type: 'select',
                    options: ['1', '2', '3', '4', '5']
                },
                success_criteria: {
                    label: 'Success Criteria',
                    icon: 'fas fa-check-circle',
                    type: 'textarea',
                    placeholder: 'How will you know you completed this routine successfully?'
                },
                location: {
                    label: 'Location',
                    icon: 'fas fa-map-marker-alt',
                    type: 'text',
                    placeholder: 'Where does this routine happen?'
                },
                resources: {
                    label: 'Resources Needed',
                    icon: 'fas fa-tools',
                    type: 'textarea',
                    placeholder: 'What do you need to complete this routine?'
                },
                notes: {
                    label: 'Additional Notes',
                    icon: 'fas fa-sticky-note',
                    type: 'textarea',
                    placeholder: 'Any additional details, tips, or reminders'
                }
            }
        },
        'create-task': {
            title: 'Create Task',
            subtitle: 'Add a new task with details',
            steps: [
                {
                    title: 'Task Priority',
                    options: [
                        { id: '5', title: 'Urgent', desc: 'Must be done today' },
                        { id: '4', title: 'High Priority', desc: 'Important, due soon' },
                        { id: '3', title: 'Medium Priority', desc: 'Normal importance' },
                        { id: '2', title: 'Low Priority', desc: 'When time allows' }
                    ]
                },
                {
                    title: 'Due Date',
                    options: [
                        { id: 'today', title: 'Today', desc: 'Due today' },
                        { id: 'tomorrow', title: 'Tomorrow', desc: 'Due tomorrow' },
                        { id: 'this_week', title: 'This Week', desc: 'Due within 7 days' },
                        { id: 'custom', title: 'Custom Date', desc: 'Pick specific date' }
                    ]
                }
            ]
        },
        'daily-review': {
            title: 'Daily Review',
            subtitle: 'Reflect on your progress and plan improvements',
            steps: [
                {
                    title: 'Review Focus',
                    options: [
                        { id: 'goals', title: 'Goals Progress', desc: 'Review progress on your goals' },
                        { id: 'routines', title: 'Routines Check', desc: 'Assess routine completion and consistency' },
                        { id: 'overall', title: 'Overall Day', desc: 'General reflection on the entire day' },
                        { id: 'planning', title: 'Tomorrow Planning', desc: 'Focus on planning tomorrow' }
                    ]
                },
                {
                    title: 'Review Depth',
                    options: [
                        { id: 'quick', title: 'Quick Check', desc: '5-10 minute brief review' },
                        { id: 'standard', title: 'Standard Review', desc: '15-20 minute thorough review' },
                        { id: 'detailed', title: 'Detailed Analysis', desc: '30+ minute deep reflection' }
                    ]
                }
            ]
        }
    },
    
    init() {
        console.log('🎬 Config.init() called');
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        console.log('🎧 Setting up Config event listeners');
        
        const cancelBtn = document.getElementById('cancelConfigBtn');
        const proceedBtn = document.getElementById('proceedConfigBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        if (proceedBtn) {
            proceedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.processAndChat();
            });
        }
    },
    
    openConfigMode(mode) {
        console.log('🔧 Opening config mode:', mode);
        this.currentMode = mode;
        this.data = {};
        this.selectedMemories = []; // Reset selected memories
        
        UI.closeSidebar();
        
        const config = this.configurations[mode];
        if (!config) {
            console.error('❌ Configuration not found for mode:', mode);
            Utils.showAlert('Configuration not found', 'error');
            return;
        }
        
        // NEW: Handle interactive planning mode
        if (config.type === 'interactive_planning') {
            this.populateInteractivePlanningModal(config, mode);
        } else if (config.type === 'form') {
            this.populateFormModal(config);
        } else {
            this.populateStepModal(config);
        }
        
        document.getElementById('configModal').classList.add('show');
        console.log('✅ Config modal opened');
    },
    
    // NEW: Populate interactive planning modal
    async populateInteractivePlanningModal(config, mode) {
        console.log('📋 Populating interactive planning modal for:', mode);
        
        document.getElementById('configTitle').textContent = config.title;
        document.getElementById('configSubtitle').textContent = config.subtitle;
        
        const configBody = document.getElementById('configBody');
        configBody.innerHTML = `
            <div class="planning-interface">
                <!-- Step 1: Basic Configuration -->
                <div class="config-step" id="planningConfigStep">
                    <div class="config-step-title">1. Planning Preferences</div>
                    <div class="planning-config-grid">
                        <div class="planning-config-section">
                            <div class="planning-config-label">Planning Focus</div>
                            <div class="config-options">
                                ${config.steps[0].options.map(option => `
                                    <div class="config-option planning-focus-option" data-value="${option.id}">
                                        <div class="config-option-title">${option.title}</div>
                                        <div class="config-option-desc">${option.desc}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="planning-config-section">
                            <div class="planning-config-label">Time Frame</div>
                            <div class="config-options">
                                ${config.steps[1].options.map(option => `
                                    <div class="config-option planning-timeframe-option" data-value="${option.id}">
                                        <div class="config-option-title">${option.title}</div>
                                        <div class="config-option-desc">${option.desc}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 2: Memory Selection -->
                <div class="config-step" id="memorySelectionStep" style="display: none;">
                    <div class="config-step-title">2. Select Relevant Items</div>
                    <div class="memory-selection-header">
                        <div class="memory-selection-info">
                            <div class="selection-count">
                                <span id="selectedCount">0</span> items selected for planning
                            </div>
                            <div class="selection-actions">
                                <button class="selection-action-btn" id="selectAllBtn">
                                    <i class="fas fa-check-double"></i> Select All
                                </button>
                                <button class="selection-action-btn" id="clearSelectionBtn">
                                    <i class="fas fa-times"></i> Clear All
                                </button>
                                <button class="selection-action-btn secondary" id="addOthersBtn">
                                    <i class="fas fa-plus"></i> Add Others
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="suggested-memories" id="suggestedMemories">
                        <div class="loading-memories">
                            <div class="spinner"></div>
                            <p>Finding relevant items for your plan...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup event listeners for configuration options
        this.setupPlanningConfigListeners();
    },
    
    // NEW: Setup planning configuration listeners
    setupPlanningConfigListeners() {
        const configModal = document.getElementById('configModal');
        
        // Planning focus selection
        configModal.querySelectorAll('.planning-focus-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectPlanningOption('focus', option.dataset.value, option);
            });
        });
        
        // Time frame selection
        configModal.querySelectorAll('.planning-timeframe-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectPlanningOption('timeframe', option.dataset.value, option);
                this.checkReadyForMemorySelection();
            });
        });
        
        // Memory selection actions
        document.getElementById('selectAllBtn')?.addEventListener('click', () => this.selectAllMemories());
        document.getElementById('clearSelectionBtn')?.addEventListener('click', () => this.clearAllSelections());
        document.getElementById('addOthersBtn')?.addEventListener('click', () => this.showAddOthersModal());
    },
    
    // NEW: Select planning option
    selectPlanningOption(type, value, element) {
        const containerClass = type === 'focus' ? '.planning-focus-option' : '.planning-timeframe-option';
        
        // Clear other selections in this group
        document.querySelectorAll(containerClass).forEach(el => el.classList.remove('selected'));
        
        // Select this option
        element.classList.add('selected');
        
        // Store selection
        this.data[type] = value;
        
        console.log('📝 Planning option selected:', type, '=', value);
    },
    
    // NEW: Check if ready for memory selection
    async checkReadyForMemorySelection() {
        if (this.data.focus && this.data.timeframe) {
            console.log('✅ Ready for memory selection, loading relevant memories...');
            
            // Show memory selection step
            document.getElementById('memorySelectionStep').style.display = 'block';
            
            // Load and display relevant memories
            await this.loadRelevantMemories();
            
            // Update proceed button
            this.updateProceedButton();
        }
    },
    
    // NEW: Load relevant memories based on timeframe and focus
    async loadRelevantMemories() {
        const suggestedContainer = document.getElementById('suggestedMemories');
        
        try {
            // Get relevant memories based on selection
            const relevantMemories = await this.findRelevantMemories();
            
            if (relevantMemories.length === 0) {
                suggestedContainer.innerHTML = `
                    <div class="no-memories-found">
                        <div class="no-memories-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <div class="no-memories-title">No relevant items found</div>
                        <div class="no-memories-desc">Click "Add Others" to browse your memories by type</div>
                    </div>
                `;
                return;
            }
            
            // Group memories by category for better display
            const groupedMemories = this.groupMemoriesByRelevance(relevantMemories);
            
            suggestedContainer.innerHTML = '';
            
            Object.entries(groupedMemories).forEach(([category, memories]) => {
                const categorySection = document.createElement('div');
                categorySection.className = 'memory-category-section';
                categorySection.innerHTML = `
                    <div class="memory-category-header">
                        <div class="memory-category-title">
                            ${this.getCategoryIcon(category)} ${category}
                            <span class="memory-category-count">(${memories.length})</span>
                        </div>
                        <div class="memory-category-actions">
                            <button class="category-select-all" data-category="${category}">
                                <i class="fas fa-check"></i> Select All
                            </button>
                        </div>
                    </div>
                    <div class="memory-selection-grid">
                        ${memories.map(memory => this.createSelectableMemoryCard(memory)).join('')}
                    </div>
                `;
                suggestedContainer.appendChild(categorySection);
            });
            
            // Setup memory selection listeners
            this.setupMemorySelectionListeners();
            
        } catch (error) {
            console.error('Error loading relevant memories:', error);
            suggestedContainer.innerHTML = `
                <div class="error-loading-memories">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading memories. Please try again.</p>
                </div>
            `;
        }
    },
    
    // NEW: Find relevant memories based on planning criteria
    async findRelevantMemories() {
        const timeframe = this.data.timeframe;
        const focus = this.data.focus;
        const allMemories = MindOS.userMemories;
        
        console.log('🔍 Finding relevant memories for:', { timeframe, focus });
        
        let relevantMemories = [];
        
        // Filter by relevance based on timeframe
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        allMemories.forEach(memory => {
            let relevanceScore = 0;
            let relevanceReasons = [];
            
            // Time-based relevance
            if (timeframe === 'today' || timeframe === 'tomorrow') {
                // Check due dates
                if (memory.due) {
                    const dueDate = new Date(memory.due);
                    const targetDate = timeframe === 'today' ? today : tomorrow;
                    
                    if (this.isSameDay(dueDate, targetDate)) {
                        relevanceScore += 100;
                        relevanceReasons.push('Due ' + timeframe);
                    } else if (dueDate < targetDate) {
                        relevanceScore += 50;
                        relevanceReasons.push('Overdue');
                    }
                }
                
                // Check routines that should happen today/tomorrow
                if (memory.type === 'routine' && memory.frequency) {
                    if (this.isRoutineRelevantForDate(memory, timeframe === 'today' ? today : tomorrow)) {
                        relevanceScore += 80;
                        relevanceReasons.push(`${memory.frequency} routine`);
                    }
                }
            }
            
            // Focus-based relevance
            if (focus === 'priorities') {
                if (memory.priority && parseInt(memory.priority) >= 4) {
                    relevanceScore += 60;
                    relevanceReasons.push(`Priority ${memory.priority}`);
                }
            } else if (focus === 'routine') {
                if (memory.type === 'routine') {
                    relevanceScore += 70;
                    relevanceReasons.push('Routine item');
                }
            } else if (focus === 'comprehensive') {
                // Include active goals and important items
                if (memory.status === 'active' && memory.type === 'goal') {
                    relevanceScore += 40;
                    relevanceReasons.push('Active goal');
                }
            }
            
            // Status-based relevance
            if (memory.status === 'active' || memory.stage === 'current') {
                relevanceScore += 30;
                relevanceReasons.push('Currently active');
            }
            
            // Add memory if it has any relevance
            if (relevanceScore > 0) {
                relevantMemories.push({
                    ...memory,
                    relevanceScore,
                    relevanceReasons
                });
            }
        });
        
        // Sort by relevance score
        relevantMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        console.log(`✅ Found ${relevantMemories.length} relevant memories`);
        return relevantMemories;
    },
    
    // NEW: Check if routine is relevant for a specific date
    isRoutineRelevantForDate(memory, date) {
        const frequency = memory.frequency?.toLowerCase();
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        switch (frequency) {
            case 'daily':
                return true;
            case 'weekdays':
                return dayOfWeek >= 1 && dayOfWeek <= 5;
            case 'weekends':
                return dayOfWeek === 0 || dayOfWeek === 6;
            case 'weekly':
                // Could be enhanced to check specific days if stored
                return true;
            default:
                return false;
        }
    },
    
    // NEW: Check if two dates are the same day
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    },
    
    // NEW: Group memories by relevance category
    groupMemoriesByRelevance(memories) {
        const groups = {
            'High Priority Items': [],
            'Due Today/Tomorrow': [],
            'Active Routines': [],
            'Current Goals': [],
            'Other Relevant Items': []
        };
        
        memories.forEach(memory => {
            const reasons = memory.relevanceReasons || [];
            
            if (memory.priority && parseInt(memory.priority) >= 4) {
                groups['High Priority Items'].push(memory);
            } else if (reasons.some(r => r.includes('Due') || r.includes('Overdue'))) {
                groups['Due Today/Tomorrow'].push(memory);
            } else if (memory.type === 'routine') {
                groups['Active Routines'].push(memory);
            } else if (memory.type === 'goal' && memory.status === 'active') {
                groups['Current Goals'].push(memory);
            } else {
                groups['Other Relevant Items'].push(memory);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;
    },
    
    // NEW: Get category icon
    getCategoryIcon(category) {
        const icons = {
            'High Priority Items': '<i class="fas fa-star text-warning"></i>',
            'Due Today/Tomorrow': '<i class="fas fa-calendar-day text-danger"></i>',
            'Active Routines': '<i class="fas fa-repeat text-primary"></i>',
            'Current Goals': '<i class="fas fa-bullseye text-success"></i>',
            'Other Relevant Items': '<i class="fas fa-list text-secondary"></i>'
        };
        return icons[category] || '<i class="fas fa-circle"></i>';
    },
    
    // NEW: Create selectable memory card
    createSelectableMemoryCard(memory) {
        const relevanceReason = memory.relevanceReasons ? memory.relevanceReasons[0] : '';
        
        return `
            <div class="selectable-memory-card" data-memory-id="${memory.id}">
                <div class="memory-card-checkbox">
                    <input type="checkbox" id="memory_${memory.id}" class="memory-checkbox">
                    <label for="memory_${memory.id}" class="memory-checkbox-label"></label>
                </div>
                <div class="memory-card-content">
                    <div class="memory-card-header">
                        <div class="memory-type-badge type-${memory.type}">${memory.type}</div>
                        ${memory.priority ? `<div class="memory-priority-badge priority-${memory.priority}">P${memory.priority}</div>` : ''}
                    </div>
                    <div class="memory-card-title">${memory.content_short || memory.content?.substring(0, 60) || 'No title'}</div>
                    <div class="memory-card-relevance">
                        <i class="fas fa-info-circle"></i> ${relevanceReason}
                    </div>
                    ${memory.due ? `<div class="memory-card-due"><i class="fas fa-calendar"></i> Due: ${Utils.formatDate(memory.due)}</div>` : ''}
                    ${memory.required_time ? `<div class="memory-card-time"><i class="fas fa-clock"></i> ${memory.required_time}</div>` : ''}
                </div>
            </div>
        `;
    },
    
    // NEW: Setup memory selection listeners
    setupMemorySelectionListeners() {
        // Individual memory selection
        document.querySelectorAll('.memory-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const memoryId = parseInt(e.target.id.replace('memory_', ''));
                if (e.target.checked) {
                    this.addMemoryToSelection(memoryId);
                } else {
                    this.removeMemoryFromSelection(memoryId);
                }
                this.updateSelectionCount();
                this.updateProceedButton();
            });
        });
        
        // Category select all buttons
        document.querySelectorAll('.category-select-all').forEach(button => {
            button.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.selectAllInCategory(category);
            });
        });
    },
    
    // NEW: Add memory to selection
    addMemoryToSelection(memoryId) {
        if (!this.selectedMemories.includes(memoryId)) {
            this.selectedMemories.push(memoryId);
            console.log('➕ Added memory to selection:', memoryId);
        }
    },
    
    // NEW: Remove memory from selection
    removeMemoryFromSelection(memoryId) {
        const index = this.selectedMemories.indexOf(memoryId);
        if (index > -1) {
            this.selectedMemories.splice(index, 1);
            console.log('➖ Removed memory from selection:', memoryId);
        }
    },
    
    // NEW: Update selection count display
    updateSelectionCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedMemories.length;
        }
    },
    
    // NEW: Select all memories
    selectAllMemories() {
        document.querySelectorAll('.memory-checkbox').forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                const memoryId = parseInt(checkbox.id.replace('memory_', ''));
                this.addMemoryToSelection(memoryId);
            }
        });
        this.updateSelectionCount();
        this.updateProceedButton();
    },
    
    // NEW: Clear all selections
    clearAllSelections() {
        document.querySelectorAll('.memory-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedMemories = [];
        this.updateSelectionCount();
        this.updateProceedButton();
    },
    
    // NEW: Select all in category
    selectAllInCategory(category) {
        const categorySection = document.querySelector(`[data-category="${category}"]`).closest('.memory-category-section');
        categorySection.querySelectorAll('.memory-checkbox').forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                const memoryId = parseInt(checkbox.id.replace('memory_', ''));
                this.addMemoryToSelection(memoryId);
            }
        });
        this.updateSelectionCount();
        this.updateProceedButton();
    },
    
    // NEW: Show add others modal for browsing memories by type
    showAddOthersModal() {
        const modal = Modals.createModal('addOthersModal', 'Add Other Items', `
            <div class="add-others-interface">
                <div class="memory-type-filters">
                    <button class="filter-btn active" data-type="all">All Types</button>
                    <button class="filter-btn" data-type="goal">Goals</button>
                    <button class="filter-btn" data-type="routine">Routines</button>
                    <button class="filter-btn" data-type="preference">Preferences</button>
                    <button class="filter-btn" data-type="insight">Insights</button>
                    <button class="filter-btn" data-type="event">Events</button>
                </div>
                
                <div class="add-others-search">
                    <input type="text" id="memorySearchInput" placeholder="Search memories..." class="memory-search-input">
                </div>
                
                <div class="add-others-memories" id="addOthersMemories">
                    <div class="loading-memories">
                        <div class="spinner"></div>
                        <p>Loading memories...</p>
                    </div>
                </div>
            </div>
        `, [
            {
                text: 'Close',
                class: 'secondary',
                onclick: "Modals.removeModal('addOthersModal')"
            },
            {
                text: 'Add Selected',
                class: 'primary',
                onclick: "Config.addSelectedOthers()"
            }
        ]);
        
        // Load memories for browsing
        this.loadMemoriesForBrowsing('all');
        this.setupAddOthersListeners(modal);
    },
    
    // NEW: Load memories for browsing in add others modal
    loadMemoriesForBrowsing(typeFilter = 'all', searchQuery = '') {
        const container = document.getElementById('addOthersMemories');
        if (!container) return;
        
        let memories = MindOS.userMemories;
        
        // Filter by type
        if (typeFilter !== 'all') {
            memories = memories.filter(m => m.type === typeFilter);
        }
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            memories = memories.filter(m => 
                (m.content && m.content.toLowerCase().includes(query)) ||
                (m.content_short && m.content_short.toLowerCase().includes(query)) ||
                (m.notes && m.notes.toLowerCase().includes(query))
            );
        }
        
        // Sort by priority and recent activity
        memories.sort((a, b) => {
            const aPriority = parseInt(a.priority) || 0;
            const bPriority = parseInt(b.priority) || 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return new Date(b.modified || b.created_at) - new Date(a.modified || a.created_at);
        });
        
        if (memories.length === 0) {
            container.innerHTML = `
                <div class="no-memories-found">
                    <i class="fas fa-search"></i>
                    <p>No memories found</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="browsable-memories-grid">
                ${memories.map(memory => this.createBrowsableMemoryCard(memory)).join('')}
            </div>
        `;
        
        // Setup selection listeners
        container.querySelectorAll('.browsable-memory-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const memoryId = parseInt(e.target.dataset.memoryId);
                if (e.target.checked) {
                    this.addMemoryToSelection(memoryId);
                } else {
                    this.removeMemoryFromSelection(memoryId);
                }
            });
        });
    },
    
    // NEW: Create browsable memory card for add others modal
    createBrowsableMemoryCard(memory) {
        const isSelected = this.selectedMemories.includes(memory.id);
        
        return `
            <div class="browsable-memory-card ${isSelected ? 'already-selected' : ''}">
                <div class="memory-card-checkbox">
                    <input type="checkbox" class="browsable-memory-checkbox" 
                           data-memory-id="${memory.id}" ${isSelected ? 'checked disabled' : ''}>
                </div>
                <div class="memory-card-content">
                    <div class="memory-card-header">
                        <div class="memory-type-badge type-${memory.type}">${memory.type}</div>
                        ${memory.priority ? `<div class="memory-priority-badge priority-${memory.priority}">P${memory.priority}</div>` : ''}
                    </div>
                    <div class="memory-card-title">${memory.content_short || memory.content?.substring(0, 80) || 'No title'}</div>
                    ${memory.notes ? `<div class="memory-card-notes">${memory.notes.substring(0, 100)}${memory.notes.length > 100 ? '...' : ''}</div>` : ''}
                    <div class="memory-card-meta">
                        ${memory.status ? `<span class="status-${memory.status}">${memory.status}</span>` : ''}
                        ${memory.due ? `<span class="due-date"><i class="fas fa-calendar"></i> ${Utils.formatDate(memory.due)}</span>` : ''}
                    </div>
                    ${isSelected ? '<div class="already-selected-indicator"><i class="fas fa-check"></i> Already selected</div>' : ''}
                </div>
            </div>
        `;
    },
    
    // NEW: Setup add others modal listeners
    setupAddOthersListeners(modal) {
        // Type filter buttons
        modal.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const type = e.target.dataset.type;
                const searchQuery = document.getElementById('memorySearchInput')?.value || '';
                this.loadMemoriesForBrowsing(type, searchQuery);
            });
        });
        
        // Search input
        const searchInput = document.getElementById('memorySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                const activeType = modal.querySelector('.filter-btn.active')?.dataset.type || 'all';
                this.loadMemoriesForBrowsing(activeType, e.target.value);
            }, 300));
        }
    },
    
    // NEW: Add selected others to main selection
    addSelectedOthers() {
        // Get newly selected items from the modal
        const newlySelected = [];
        document.querySelectorAll('.browsable-memory-checkbox:checked:not([disabled])').forEach(checkbox => {
            const memoryId = parseInt(checkbox.dataset.memoryId);
            newlySelected.push(memoryId);
        });
        
        if (newlySelected.length > 0) {
            Utils.showAlert(`Added ${newlySelected.length} items to your planning selection`, 'success');
            
            // Refresh the main memory display to show new selections
            this.loadRelevantMemories();
        }
        
        Modals.removeModal('addOthersModal');
    },
    
    // EXISTING: Populate form modal for routines (unchanged)
    populateFormModal(config) {
        console.log('📝 Populating form modal with config:', config.title);
        
        document.getElementById('configTitle').textContent = config.title;
        document.getElementById('configSubtitle').textContent = config.subtitle;
        
        const configBody = document.getElementById('configBody');
        configBody.innerHTML = '';
        
        this.data = { ...config.defaultFields };
        
        const formContainer = document.createElement('div');
        formContainer.className = 'config-form-container';
        formContainer.innerHTML = `
            <div class="config-form-fields" id="configFormFields"></div>
            <div class="config-form-actions">
                <button class="config-add-field-btn" id="configAddFieldBtn">
                    <i class="fas fa-plus"></i> Add Field
                </button>
            </div>
        `;
        
        configBody.appendChild(formContainer);
        this.populateFormFields(config);
        
        document.getElementById('configAddFieldBtn').addEventListener('click', () => {
            this.showAddFieldsForConfig(config);
        });
        
        this.updateProceedButton();
    },
    
    // EXISTING: Populate form fields (unchanged)
    populateFormFields(config) {
        const fieldsContainer = document.getElementById('configFormFields');
        fieldsContainer.innerHTML = '';
        
        const requiredFields = ['content', 'routine_type', 'frequency'];
        requiredFields.forEach(fieldKey => {
            if (config.fieldDefinitions[fieldKey]) {
                const field = this.createFormField(fieldKey, this.data[fieldKey] || '', config.fieldDefinitions[fieldKey], true);
                fieldsContainer.appendChild(field);
            }
        });
        
        const commonFields = ['trigger', 'required_time', 'energy_requirements', 'priority', 'success_criteria', 'notes'];
        commonFields.forEach(fieldKey => {
            if (config.fieldDefinitions[fieldKey] && !requiredFields.includes(fieldKey)) {
                const field = this.createFormField(fieldKey, this.data[fieldKey] || '', config.fieldDefinitions[fieldKey], false);
                fieldsContainer.appendChild(field);
            }
        });
    },
    
    // EXISTING: Create form field (unchanged)
    createFormField(fieldKey, value, fieldDef, isRequired) {
        const section = document.createElement('div');
        section.className = 'config-form-section';
        section.setAttribute('data-field', fieldKey);
        
        const label = document.createElement('div');
        label.className = 'config-form-label';
        label.innerHTML = `
            <i class="${fieldDef.icon}"></i>
            ${fieldDef.label} ${isRequired ? '<span style="color: red;">*</span>' : ''}
            ${!isRequired ? `<button class="config-field-remove-btn" data-remove-field="${fieldKey}" title="Remove field">
                <i class="fas fa-times"></i>
            </button>` : ''}
        `;
        
        let input;
        if (fieldDef.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'config-form-input config-form-textarea';
            input.rows = 3;
            input.placeholder = fieldDef.placeholder || '';
        } else if (fieldDef.type === 'select') {
            input = document.createElement('select');
            input.className = 'config-form-select';
            
            if (!isRequired) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = '-- Select --';
                input.appendChild(emptyOption);
            }
            
            fieldDef.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option;
                optionEl.textContent = option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ');
                if (option == value) optionEl.selected = true;
                input.appendChild(optionEl);
            });
        } else {
            input = document.createElement('input');
            input.className = 'config-form-input';
            input.type = fieldDef.type || 'text';
            input.placeholder = fieldDef.placeholder || '';
            if (fieldDef.step) input.step = fieldDef.step;
            if (fieldDef.min) input.min = fieldDef.min;
            if (fieldDef.max) input.max = fieldDef.max;
        }
        
        input.value = value || '';
        input.setAttribute('data-field-key', fieldKey);
        
        input.addEventListener('input', () => {
            this.handleFormFieldChange(fieldKey, input.value);
        });
        
        section.appendChild(label);
        section.appendChild(input);
        
        const removeBtn = label.querySelector('.config-field-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                delete this.data[fieldKey];
                section.remove();
                this.updateProceedButton();
            });
        }
        
        return section;
    },
    
    // EXISTING: Handle form field changes (unchanged)
    handleFormFieldChange(fieldKey, value) {
        this.data[fieldKey] = value;
        this.updateProceedButton();
    },
    
    // EXISTING: Show add fields for config (unchanged)
    showAddFieldsForConfig(config) {
        const currentFields = Object.keys(this.data);
        const availableFields = Object.keys(config.fieldDefinitions).filter(fieldKey => 
            !currentFields.includes(fieldKey)
        );
        
        if (availableFields.length === 0) {
            Utils.showAlert('All available fields are already added', 'info');
            return;
        }
        
        const fieldsDialog = document.createElement('div');
        fieldsDialog.className = 'memory-confirmation-dialog';
        fieldsDialog.style.zIndex = '2600';
        
        const fieldsId = 'configAddFields_' + Date.now();
        
        fieldsDialog.innerHTML = `
            <div class="add-fields-content">
                <div class="add-fields-header">
                    <div class="add-fields-title">Add Routine Fields</div>
                    <div class="add-fields-subtitle">Select additional fields for your routine</div>
                </div>
                
                <div class="fields-grid" id="${fieldsId}_grid"></div>
                
                <div class="add-fields-actions">
                    <button class="modal-btn secondary" id="${fieldsId}_cancel">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(fieldsDialog);
        
        const fieldsGrid = document.getElementById(fieldsId + '_grid');
        availableFields.forEach(fieldKey => {
            const fieldDef = config.fieldDefinitions[fieldKey];
            const fieldOption = document.createElement('div');
            fieldOption.className = 'field-option';
            fieldOption.innerHTML = `
                <div class="field-option-icon">
                    <i class="${fieldDef.icon}"></i>
                </div>
                <div class="field-option-name">${fieldDef.label}</div>
                <div class="field-option-desc">${fieldDef.placeholder || `Add ${fieldDef.label.toLowerCase()} information`}</div>
            `;
            
            fieldOption.addEventListener('click', () => {
                this.data[fieldKey] = '';
                const fieldsContainer = document.getElementById('configFormFields');
                const newField = this.createFormField(fieldKey, '', fieldDef, false);
                fieldsContainer.appendChild(newField);
                
                const input = newField.querySelector('.config-form-input, .config-form-select, .config-form-textarea');
                if (input) input.focus();
                
                document.body.removeChild(fieldsDialog);
                this.updateProceedButton();
            });
            
            fieldsGrid.appendChild(fieldOption);
        });
        
        document.getElementById(fieldsId + '_cancel').addEventListener('click', () => {
            document.body.removeChild(fieldsDialog);
        });
    },
    
    // EXISTING: Populate step modal (unchanged)
    populateStepModal(config) {
        console.log('📝 Populating step modal with config:', config.title);
        
        document.getElementById('configTitle').textContent = config.title;
        document.getElementById('configSubtitle').textContent = config.subtitle;
        
        const configBody = document.getElementById('configBody');
        configBody.innerHTML = '';
        
        config.steps.forEach((step, stepIndex) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'config-step';
            
            const stepTitle = document.createElement('div');
            stepTitle.className = 'config-step-title';
            stepTitle.textContent = `${stepIndex + 1}. ${step.title}`;
            
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'config-options';
            
            step.options.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'config-option';
                optionDiv.onclick = () => {
                    this.selectOption(stepIndex, option.id, optionDiv);
                };
                
                optionDiv.innerHTML = `
                    <div class="config-option-title">${option.title}</div>
                    <div class="config-option-desc">${option.desc}</div>
                `;
                
                optionsDiv.appendChild(optionDiv);
            });
            
            stepDiv.appendChild(stepTitle);
            stepDiv.appendChild(optionsDiv);
            configBody.appendChild(stepDiv);
        });
        
        this.updateProceedButton();
    },
    
    // EXISTING: Select option for step-based configs (unchanged)
    selectOption(stepIndex, optionId, optionElement) {
        optionElement.parentElement.querySelectorAll('.config-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        optionElement.classList.add('selected');
        this.data[`step_${stepIndex}`] = optionId;
        this.updateProceedButton();
    },
    
    // ENHANCED: Update proceed button to handle interactive planning
    updateProceedButton() {
        const proceedBtn = document.getElementById('proceedConfigBtn');
        if (!proceedBtn) return;
        
        const config = this.configurations[this.currentMode];
        let isComplete = false;
        
        if (config?.type === 'interactive_planning') {
            // For interactive planning, check if preferences are set and memories are selected
            const hasPreferences = this.data.focus && this.data.timeframe;
            const hasSelections = this.selectedMemories.length > 0;
            isComplete = hasPreferences && hasSelections;
        } else if (config?.type === 'form') {
            // For forms, check required fields
            const requiredFields = ['content'];
            isComplete = requiredFields.every(field => 
                this.data[field] && this.data[field].trim() !== ''
            );
        } else {
            // For step-based configs
            const requiredSteps = document.querySelectorAll('.config-step').length;
            const selectedSteps = Object.keys(this.data).filter(key => 
                key.startsWith('step_')
            ).length;
            isComplete = selectedSteps >= requiredSteps;
        }
        
        proceedBtn.disabled = !isComplete;
        proceedBtn.style.opacity = isComplete ? '1' : '0.6';
        proceedBtn.style.cursor = isComplete ? 'pointer' : 'not-allowed';
    },
    
    // ENHANCED: Process and chat to handle selected memories
    async processAndChat() {
        if (!this.currentMode) {
            Utils.showAlert('Configuration mode not set', 'error');
            return;
        }
        
        const savedMode = this.currentMode;
        const savedData = { ...this.data };
        const savedMemories = [...this.selectedMemories];
        
        this.closeModal();
        
        try {
            let prompt;
            
            // For interactive planning, include selected memories
            if (savedMode === 'plan-day' && savedMemories.length > 0) {
                prompt = await this.buildPlanningPromptWithMemories(savedData, savedMemories);
                
                // Tag selected memories as part of today's/tomorrow's plan
                await this.tagMemoriesForPlanning(savedMemories, savedData.timeframe);
            } else {
                prompt = this.buildPrompt(savedMode, savedData);
            }
            
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = prompt;
                
                if (typeof Chat !== 'undefined' && Chat.autoResize) {
                    Chat.autoResize(messageInput);
                }
                
                if (typeof Chat !== 'undefined' && Chat.sendMessage) {
                    Chat.sendMessage();
                }
            }
        } catch (error) {
            console.error('Error in processAndChat:', error);
            Utils.showAlert('Error processing configuration: ' + error.message, 'error');
        }
    },
    
    // NEW: Build planning prompt with selected memories
    async buildPlanningPromptWithMemories(data, selectedMemoryIds) {
        const selectedMemories = MindOS.userMemories.filter(m => selectedMemoryIds.includes(m.id));
        const timeframe = data.timeframe === 'today' ? 'today' : 'tomorrow';
        
        let prompt = `I want to plan my ${data.timeframe}. Please help me create a comprehensive plan using the items I've selected. Here are my preferences:\n\n`;
        
        // Add configuration preferences
        if (data.focus === 'comprehensive') {
            prompt += "**Planning Style**: Create a comprehensive schedule with time blocks and priorities\n";
        } else if (data.focus === 'priorities') {
            prompt += "**Planning Style**: Focus on identifying priorities and organizing by importance\n";
        } else if (data.focus === 'routine') {
            prompt += "**Planning Style**: Review and optimize my routines for consistency\n";
        }
        
        prompt += `**Time Frame**: ${data.timeframe}\n\n`;
        
        // Group selected memories by type for better organization
        const groupedMemories = selectedMemories.reduce((groups, memory) => {
            const type = memory.type || 'other';
            if (!groups[type]) groups[type] = [];
            groups[type].push(memory);
            return groups;
        }, {});
        
        prompt += `## Selected Items for ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} (${selectedMemories.length} total):\n\n`;
        
        Object.entries(groupedMemories).forEach(([type, memories]) => {
            prompt += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Items:\n`;
            memories.forEach(memory => {
                prompt += `- **${memory.content_short || memory.content?.substring(0, 80) || 'Untitled'}**\n`;
                if (memory.priority) prompt += `  - Priority: ${memory.priority}/5\n`;
                if (memory.required_time) prompt += `  - Time needed: ${memory.required_time}\n`;
                if (memory.due) prompt += `  - Due: ${Utils.formatDate(memory.due)}\n`;
                if (memory.energy_requirements) prompt += `  - Energy level: ${memory.energy_requirements}\n`;
                if (memory.notes) prompt += `  - Notes: ${memory.notes.substring(0, 100)}${memory.notes.length > 100 ? '...' : ''}\n`;
                prompt += '\n';
            });
        });
        
        prompt += `\nPlease create a detailed plan for ${timeframe} that:\n`;
        prompt += `1. Organizes these items by priority and time requirements\n`;
        prompt += `2. Suggests optimal timing based on energy levels and dependencies\n`;
        prompt += `3. Identifies any potential conflicts or resource constraints\n`;
        prompt += `4. Provides time blocks and realistic scheduling\n`;
        prompt += `5. Includes buffer time and breaks as needed\n\n`;
        prompt += `Use my stored memories and preferences to personalize the recommendations. Store any new insights or planning preferences as memories for future reference.`;
        
        return prompt;
    },
    
    // NEW: Tag memories as part of today's/tomorrow's plan
    async tagMemoriesForPlanning(memoryIds, timeframe) {
        const planTag = timeframe === 'today' ? "today's plan" : "tomorrow's plan";
        const planDate = timeframe === 'today' ? new Date().toISOString().split('T')[0] : 
                         new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
        
        try {
            // Update memories with planning tags
            for (const memoryId of memoryIds) {
                const memory = MindOS.userMemories.find(m => m.id === memoryId);
                if (memory) {
                    const currentNotes = memory.notes || '';
                    const planningNote = `\n[Added to ${planTag} on ${planDate}]`;
                    
                    // Avoid duplicate tags
                    if (!currentNotes.includes(planTag)) {
                        const updatedNotes = currentNotes + planningNote;
                        
                        await API.put(`/api/memories/${memoryId}`, {
                            notes: updatedNotes,
                            planning_tag: planTag,
                            planned_date: planDate
                        });
                        
                        // Update local memory object
                        const localMemory = MindOS.userMemories.find(m => m.id === memoryId);
                        if (localMemory) {
                            localMemory.notes = updatedNotes;
                            localMemory.planning_tag = planTag;
                            localMemory.planned_date = planDate;
                        }
                    }
                }
            }
            
            console.log(`✅ Tagged ${memoryIds.length} memories for ${planTag}`);
            
        } catch (error) {
            console.error('Error tagging memories for planning:', error);
            // Don't block the planning flow if tagging fails
        }
    },
    
    // EXISTING: Build prompt for other configurations (unchanged)
    buildPrompt(mode, data) {
        const prompts = {
            'set-goals': () => {
                let prompt = "I want to set a new goal. Please help me create it properly:\n\n";
                
                const goalTypes = {
                    'short-term': 'Short-term goal (achievable within days/weeks)',
                    'long-term': 'Long-term goal (taking months/years)',
                    'habit': 'Habit-building goal',
                    'project': 'Project-based goal with milestones'
                };
                
                if (data.step_0) {
                    prompt += `**Goal Type**: ${goalTypes[data.step_0]}\n`;
                }

                if (data.step_1) {
                    prompt += `**Priority Level**: ${data.step_1}/5 priority\n`;
                }

                prompt += "\nPlease help me define this goal with SMART criteria and store it as a memory.";
                return prompt;
            },
            
            'create-routine': () => {
                let prompt = "I want to create a new routine. Please help me set it up and store it as a memory. Here are the details I've provided:\n\n";
                
                if (data.content) {
                    prompt += `**Routine Description**: ${data.content}\n`;
                }
                
                if (data.routine_type) {
                    const typeLabels = {
                        'morning': 'Morning routine to start the day with purpose',
                        'evening': 'Evening routine to wind down and prepare for tomorrow',
                        'work': 'Work routine for productivity during work hours',
                        'exercise': 'Exercise routine for physical fitness and health',
                        'health': 'Health and wellness routine',
                        'learning': 'Learning and skill development routine',
                        'self-care': 'Self-care and mental wellness routine',
                        'custom': 'Custom routine'
                    };
                    prompt += `**Routine Type**: ${typeLabels[data.routine_type] || data.routine_type}\n`;
                }
                
                if (data.frequency) {
                    const frequencyLabels = {
                        'daily': 'Every day',
                        'weekdays': 'Monday through Friday only',
                        'weekends': 'Weekends only',
                        'weekly': 'Specific days of the week',
                        'bi-weekly': 'Every two weeks',
                        'monthly': 'Once per month',
                        'flexible': 'Flexible timing based on circumstances'
                    };
                    prompt += `**Frequency**: ${frequencyLabels[data.frequency] || data.frequency}\n`;
                }
                
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== 'content' && key !== 'routine_type' && key !== 'frequency' && value && value.trim() !== '') {
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        prompt += `**${label}**: ${value}\n`;
                    }
                });
                
                prompt += "\nPlease help me refine this routine, provide implementation strategies, and store it as a comprehensive memory. Focus on making it sustainable and trackable.";
                return prompt;
            },
            
            'create-task': () => {
                let prompt = "I need to create a new task. Please help me structure it properly:\n\n";
                
                const priorities = {
                    '5': 'Urgent - must be done today',
                    '4': 'High priority - important and due soon',
                    '3': 'Medium priority - normal importance',
                    '2': 'Low priority - when time allows'
                };
                
                const dueDates = {
                    'today': 'Due today',
                    'tomorrow': 'Due tomorrow',
                    'this_week': 'Due within 7 days',
                    'custom': 'Custom specific date'
                };
                
                if (data.step_0) {
                    prompt += `**Priority**: ${priorities[data.step_0]}\n`;
                }
                
                if (data.step_1) {
                    prompt += `**Due Date**: ${dueDates[data.step_1]}\n`;
                }
                
                prompt += "\nPlease help me define this task with clear objectives, time estimates, and resources needed. Store it as a memory when complete.";
                return prompt;
            },
            
            'daily-review': () => {
                let prompt = "I want to do my daily review. Please guide me through reflection and planning:\n\n";
                
                const focuses = {
                    'goals': 'Review progress on my goals',
                    'routines': 'Assess routine completion and consistency',
                    'overall': 'General reflection on the entire day',
                    'planning': 'Focus on planning tomorrow'
                };
                
                const depths = {
                    'quick': '5-10 minute brief review',
                    'standard': '15-20 minute thorough review',
                    'detailed': '30+ minute deep reflection'
                };
                
                if (data.step_0) {
                    prompt += `**Review Focus**: ${focuses[data.step_0]}\n`;
                }
                
                if (data.step_1) {
                    prompt += `**Review Depth**: ${depths[data.step_1]}\n`;
                }
                
                prompt += "\nPlease use my stored memories to guide this review and help me identify patterns, celebrate wins, and plan improvements.";
                return prompt;
            }
        };

        return prompts[mode] ? prompts[mode]() : `Help me with ${mode}. Please use my stored memories to provide personalized assistance based on my preferences and history.`;
    },
    
    // EXISTING: Close modal (unchanged)
    closeModal() {
        document.getElementById('configModal').classList.remove('show');
        this.currentMode = null;
        this.data = {};
        this.selectedMemories = [];
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Config.init();
});
