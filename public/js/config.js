// Configuration Module - ENHANCED VERSION with Full Routine Form
const Config = {
    currentMode: null,
    data: {},
    
    configurations: {
        'plan-day': {
            title: 'Plan Your Day',
            subtitle: 'Set up your daily planning preferences',
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
                        { id: 'week', title: 'This Week', desc: 'Plan for the entire week' },
                        { id: 'custom', title: 'Custom Period', desc: 'Specify custom time frame' }
                    ]
                }
            ]
        },
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
            type: 'form', // NEW: Indicates this uses form mode instead of steps
            defaultFields: {
                // Required fields
                type: 'routine',
                content: '',
                
                // Routine-specific fields with defaults
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
        
        console.log('🔍 Found buttons:', { cancelBtn: !!cancelBtn, proceedBtn: !!proceedBtn });
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Cancel button clicked');
                this.closeModal();
            });
        }
        
        if (proceedBtn) {
            proceedBtn.addEventListener('click', (e) => {
                console.log('▶️ PROCEED BUTTON CLICKED!');
                console.log('🔍 Button disabled?', proceedBtn.disabled);
                console.log('📋 Current data:', this.data);
                console.log('🔧 Current mode:', this.currentMode);
                e.preventDefault();
                this.processAndChat();
            });
        }
    },
    
    openConfigMode(mode) {
        console.log('🔧 Opening config mode:', mode);
        this.currentMode = mode;
        this.data = {};
        
        UI.closeSidebar();
        
        const config = this.configurations[mode];
        if (!config) {
            console.error('❌ Configuration not found for mode:', mode);
            Utils.showAlert('Configuration not found', 'error');
            return;
        }
        
        if (config.type === 'form') {
            this.populateFormModal(config);
        } else {
            this.populateStepModal(config);
        }
        
        document.getElementById('configModal').classList.add('show');
        console.log('✅ Config modal opened');
    },
    
    // NEW: Populate form-based modal (for routines)
    populateFormModal(config) {
        console.log('📝 Populating form modal with config:', config.title);
        
        document.getElementById('configTitle').textContent = config.title;
        document.getElementById('configSubtitle').textContent = config.subtitle;
        
        const configBody = document.getElementById('configBody');
        configBody.innerHTML = '';
        
        // Initialize data with defaults
        this.data = { ...config.defaultFields };
        
        // Create form container
        const formContainer = document.createElement('div');
        formContainer.className = 'config-form-container';
        formContainer.innerHTML = `
            <div class="config-form-fields" id="configFormFields">
                <!-- Fields will be populated here -->
            </div>
            <div class="config-form-actions">
                <button class="config-add-field-btn" id="configAddFieldBtn">
                    <i class="fas fa-plus"></i> Add Field
                </button>
            </div>
        `;
        
        configBody.appendChild(formContainer);
        
        // Populate initial fields
        this.populateFormFields(config);
        
        // Setup add field button
        document.getElementById('configAddFieldBtn').addEventListener('click', () => {
            this.showAddFieldsForConfig(config);
        });
        
        this.updateProceedButton();
        console.log('✅ Form modal populated');
    },
    
    // NEW: Populate form fields
    populateFormFields(config) {
        const fieldsContainer = document.getElementById('configFormFields');
        fieldsContainer.innerHTML = '';
        
        // Required fields first
        const requiredFields = ['content', 'routine_type', 'frequency'];
        requiredFields.forEach(fieldKey => {
            if (config.fieldDefinitions[fieldKey]) {
                const field = this.createFormField(fieldKey, this.data[fieldKey] || '', config.fieldDefinitions[fieldKey], true);
                fieldsContainer.appendChild(field);
            }
        });
        
        // Optional fields that have values or are commonly used
        const commonFields = ['trigger', 'required_time', 'energy_requirements', 'priority', 'success_criteria', 'notes'];
        commonFields.forEach(fieldKey => {
            if (config.fieldDefinitions[fieldKey] && !requiredFields.includes(fieldKey)) {
                const field = this.createFormField(fieldKey, this.data[fieldKey] || '', config.fieldDefinitions[fieldKey], false);
                fieldsContainer.appendChild(field);
            }
        });
    },
    
    // NEW: Create form field
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
        
        // Add change listener
        input.addEventListener('input', () => {
            this.handleFormFieldChange(fieldKey, input.value);
        });
        
        section.appendChild(label);
        section.appendChild(input);
        
        // Add remove button listener
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
    
    // NEW: Handle form field changes
    handleFormFieldChange(fieldKey, value) {
        this.data[fieldKey] = value;
        console.log('📝 Field changed:', fieldKey, '=', value);
        console.log('📋 Current data:', this.data);
        this.updateProceedButton();
    },
    
    // NEW: Show add fields for config
    showAddFieldsForConfig(config) {
        const currentFields = Object.keys(this.data);
        const availableFields = Object.keys(config.fieldDefinitions).filter(fieldKey => 
            !currentFields.includes(fieldKey)
        );
        
        if (availableFields.length === 0) {
            Utils.showAlert('All available fields are already added', 'info');
            return;
        }
        
        // Create add fields dialog
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
                // Add field to form
                this.data[fieldKey] = '';
                const fieldsContainer = document.getElementById('configFormFields');
                const newField = this.createFormField(fieldKey, '', fieldDef, false);
                fieldsContainer.appendChild(newField);
                
                // Focus new field
                const input = newField.querySelector('.config-form-input, .config-form-select, .config-form-textarea');
                if (input) input.focus();
                
                // Close dialog
                document.body.removeChild(fieldsDialog);
                this.updateProceedButton();
            });
            
            fieldsGrid.appendChild(fieldOption);
        });
        
        // Cancel button
        document.getElementById(fieldsId + '_cancel').addEventListener('click', () => {
            document.body.removeChild(fieldsDialog);
        });
    },
    
    // EXISTING: Populate step-based modal (for other configurations)
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
                    console.log('🎯 Option clicked:', stepIndex, option.id);
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
        console.log('✅ Step modal populated');
    },
    
    selectOption(stepIndex, optionId, optionElement) {
        console.log('🎯 Selected option:', stepIndex, optionId);
        
        // Remove selection from siblings
        optionElement.parentElement.querySelectorAll('.config-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select this option
        optionElement.classList.add('selected');
        
        // Store selection
        this.data[`step_${stepIndex}`] = optionId;
        console.log('💾 Updated data:', this.data);
        
        // Update button
        this.updateProceedButton();
    },
    
    updateProceedButton() {
        const proceedBtn = document.getElementById('proceedConfigBtn');
        if (!proceedBtn) {
            console.error('❌ Proceed button not found!');
            return;
        }
        
        const config = this.configurations[this.currentMode];
        let isComplete = false;
        
        if (config && config.type === 'form') {
            // For forms, check if required fields are filled
            const requiredFields = ['content']; // At minimum, need routine description
            isComplete = requiredFields.every(field => 
                this.data[field] && this.data[field].trim() !== ''
            );
        } else {
            // For step-based, check if all steps are completed
            const requiredSteps = document.querySelectorAll('.config-step').length;
            const selectedSteps = Object.keys(this.data).filter(key => 
                key.startsWith('step_') && !key.includes('_custom')
            ).length;
            isComplete = selectedSteps >= requiredSteps;
        }
        
        console.log('📊 Button update:');
        console.log('  - Mode:', this.currentMode);
        console.log('  - Config type:', config?.type);
        console.log('  - Is complete:', isComplete);
        console.log('  - Current data:', this.data);
        
        proceedBtn.disabled = !isComplete;
        
        if (isComplete) {
            proceedBtn.style.opacity = '1';
            proceedBtn.style.cursor = 'pointer';
            console.log('✅ Button ENABLED');
        } else {
            proceedBtn.style.opacity = '0.6';
            proceedBtn.style.cursor = 'not-allowed';
            console.log('❌ Button DISABLED');
        }
    },
    
    processAndChat() {
        console.log('🚀 processAndChat() called');
        console.log('📋 Mode:', this.currentMode);
        console.log('📋 Data:', this.data);
        
        // Add safety checks
        if (!this.currentMode) {
            console.error('❌ currentMode is null or undefined');
            Utils.showAlert('Configuration mode not set', 'error');
            return;
        }
        
        if (Object.keys(this.data).length === 0) {
            console.error('❌ No configuration data');
            Utils.showAlert('Please fill in the required information before proceeding', 'warning');
            return;
        }
        
        // Save mode and data before closing modal
        const savedMode = this.currentMode;
        const savedData = { ...this.data };
        
        console.log('✅ Data validation passed, closing modal');
        this.closeModal();
        
        console.log('🤖 Going directly to AI assistance');
        
        try {
            const prompt = this.buildPrompt(savedMode, savedData);
            console.log('📝 Generated prompt:', prompt);
            
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = prompt;
                console.log('✅ Prompt set in input');
                
                // Trigger input resize
                if (typeof Chat !== 'undefined' && Chat.autoResize) {
                    Chat.autoResize(messageInput);
                }
                
                // Send message
                if (typeof Chat !== 'undefined' && Chat.sendMessage) {
                    console.log('📤 Sending message via Chat.sendMessage()');
                    Chat.sendMessage();
                } else {
                    console.error('❌ Chat module not available');
                }
            } else {
                console.error('❌ Message input not found');
            }
        } catch (error) {
            console.error('❌ Error in processAndChat:', error);
            Utils.showAlert('Error processing configuration: ' + error.message, 'error');
        }
    },
    
    buildPrompt(mode, data) {
        console.log('🔨 Building prompt for mode:', mode);
        
        const prompts = {
            'plan-day': () => {
                let prompt = "I need help planning my day. Please create a specific, actionable plan and store relevant memories. Here are my preferences:\n\n";
                
                if (data.step_0 === 'comprehensive') {
                    prompt += "**Planning Style**: Create a comprehensive schedule with time blocks and priorities\n";
                } else if (data.step_0 === 'priorities') {
                    prompt += "**Planning Style**: Focus on identifying my top 3-5 priorities for the day\n";
                } else if (data.step_0 === 'routine') {
                    prompt += "**Planning Style**: Review and adjust my existing routines\n";
                }

                if (data.step_1 === 'today') {
                    prompt += "**Time Frame**: Today only\n";
                } else if (data.step_1 === 'week') {
                    prompt += "**Time Frame**: This entire week\n";
                } else if (data.step_1 === 'custom') {
                    prompt += "**Time Frame**: Custom period (please ask for specifics)\n";
                }

                prompt += "\nPlease use my stored memories and create a specific plan.";
                return prompt;
            },
            
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
                
                // Build prompt from form data
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
                
                if (data.trigger) {
                    prompt += `**Trigger/Cue**: ${data.trigger}\n`;
                }
                
                if (data.required_time) {
                    prompt += `**Time Required**: ${data.required_time}\n`;
                }
                
                if (data.energy_requirements) {
                    prompt += `**Energy Level Needed**: ${data.energy_requirements}\n`;
                }
                
                if (data.priority) {
                    prompt += `**Priority**: ${data.priority}/5\n`;
                }
                
                if (data.success_criteria) {
                    prompt += `**Success Criteria**: ${data.success_criteria}\n`;
                }
                
                if (data.location) {
                    prompt += `**Location**: ${data.location}\n`;
                }
                
                if (data.resources) {
                    prompt += `**Resources Needed**: ${data.resources}\n`;
                }
                
                if (data.notes) {
                    prompt += `**Additional Notes**: ${data.notes}\n`;
                }
                
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

        // Add safety check for mode
        if (!mode) {
            console.error('❌ Mode is null or undefined in buildPrompt');
            return "I need help organizing my thoughts and tasks. Please review my stored memories and suggest what we should work on together.";
        }

        const result = prompts[mode] ? prompts[mode]() : `Help me with ${mode}. Please use my stored memories to provide personalized assistance based on my preferences and history.`;
        console.log('✅ Generated prompt:', result);
        return result;
    },
    
    closeModal() {
        console.log('🚪 Closing config modal');
        document.getElementById('configModal').classList.remove('show');
        this.currentMode = null;
        this.data = {};
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 DOM loaded, initializing Config');
    Config.init();
});
