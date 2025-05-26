// Configuration Module - FIXED VERSION
const Config = {
    // Current configuration state
    currentMode: null,
    data: {},
    
    // Configuration definitions (same as before...)
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
            steps: [
                {
                    title: 'Routine Type',
                    options: [
                        { id: 'morning', title: 'Morning Routine', desc: 'Start your day with purpose' },
                        { id: 'evening', title: 'Evening Routine', desc: 'Wind down and prepare for tomorrow' },
                        { id: 'work', title: 'Work Routine', desc: 'Productivity during work hours' },
                        { id: 'exercise', title: 'Exercise Routine', desc: 'Physical fitness and health' },
                        { id: 'custom', title: 'Custom Routine', desc: 'Specific activity or habit' }
                    ]
                },
                {
                    title: 'Frequency',
                    options: [
                        { id: 'daily', title: 'Daily', desc: 'Every day without exception' },
                        { id: 'weekdays', title: 'Weekdays', desc: 'Monday through Friday' },
                        { id: 'weekly', title: 'Weekly', desc: 'Specific days of the week' },
                        { id: 'flexible', title: 'Flexible', desc: 'Target frequency with flexibility' }
                    ]
                }
            ]
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
    
    // Initialize configuration module
    init() {
        this.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners() {
        document.getElementById('cancelConfigBtn').addEventListener('click', this.closeModal.bind(this));
        document.getElementById('proceedConfigBtn').addEventListener('click', this.processAndChat.bind(this));
    },
    
    // Open configuration mode
    openConfigMode(mode) {
        console.log('🔧 Opening config mode:', mode); // DEBUG
        this.currentMode = mode;
        this.data = {};
        
        UI.closeSidebar();
        
        const config = this.configurations[mode];
        if (!config) {
            Utils.showAlert('Configuration not found', 'error');
            return;
        }
        
        this.populateModal(config);
        document.getElementById('configModal').classList.add('show');
    },
    
    // Populate configuration modal
    populateModal(config) {
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
                optionDiv.onclick = () => this.selectOption(stepIndex, option.id, optionDiv);
                
                optionDiv.innerHTML = `
                    <div class="config-option-title">${option.title}</div>
                    <div class="config-option-desc">${option.desc}</div>
                `;
                
                optionsDiv.appendChild(optionDiv);
            });
            
            stepDiv.appendChild(stepTitle);
            stepDiv.appendChild(optionsDiv);
            configBody.appendChild(stepDiv);
            
            // Add custom input form if needed
            if (step.options.some(opt => opt.id === 'custom')) {
                const customForm = document.createElement('div');
                customForm.className = 'config-form hidden';
                customForm.id = `customForm_${stepIndex}`;
                
                customForm.innerHTML = `
                    <div class="config-form-group">
                        <label class="config-form-label">Specify details:</label>
                        <input type="text" class="config-form-input" placeholder="Enter your preference..." />
                    </div>
                `;
                
                stepDiv.appendChild(customForm);
            }
        });
        
        // Initially disable proceed button
        this.updateProceedButton();
    },
    
    // Select configuration option
    selectOption(stepIndex, optionId, optionElement) {
        console.log('🎯 Selected option:', stepIndex, optionId); // DEBUG
        
        // Remove selection from siblings
        optionElement.parentElement.querySelectorAll('.config-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select this option
        optionElement.classList.add('selected');
        
        // Store selection
        this.data[`step_${stepIndex}`] = optionId;
        
        // Show/hide custom form if needed
        const customForm = document.getElementById(`customForm_${stepIndex}`);
        if (customForm) {
            if (optionId === 'custom') {
                customForm.classList.remove('hidden');
                const input = customForm.querySelector('input');
                input.addEventListener('input', (e) => {
                    this.data[`step_${stepIndex}_custom`] = e.target.value;
                });
            } else {
                customForm.classList.add('hidden');
                delete this.data[`step_${stepIndex}_custom`];
            }
        }
        
        // Enable proceed button if all steps are selected
        this.updateProceedButton();
    },
    
    // Update proceed button state - FIXED VERSION
    updateProceedButton() {
        const requiredSteps = document.querySelectorAll('.config-step').length;
        const selectedSteps = Object.keys(this.data).filter(key => 
            key.startsWith('step_') && !key.includes('_custom')
        ).length;
        
        const proceedBtn = document.getElementById('proceedConfigBtn');
        const isComplete = selectedSteps >= requiredSteps;
        
        console.log('📊 Button update - Required:', requiredSteps, 'Selected:', selectedSteps, 'Complete:', isComplete); // DEBUG
        console.log('📋 Current data:', this.data); // DEBUG
        
        proceedBtn.disabled = !isComplete;
        
        // Visual feedback
        if (isComplete) {
            proceedBtn.style.opacity = '1';
            proceedBtn.style.cursor = 'pointer';
        } else {
            proceedBtn.style.opacity = '0.6';
            proceedBtn.style.cursor = 'not-allowed';
        }
    },
    
    // Process configuration and proceed to chat - ENHANCED VERSION
    processAndChat() {
        console.log('🚀 ProcessAndChat called'); // DEBUG
        console.log('📋 Current mode:', this.currentMode); // DEBUG
        console.log('📋 Current data:', this.data); // DEBUG
        
        if (!this.currentMode || Object.keys(this.data).length === 0) {
            console.log('❌ Missing mode or data'); // DEBUG
            Utils.showAlert('Please select all options before proceeding', 'warning');
            return;
        }
        
        this.closeModal();
        
        // Show choice dialog with enhanced debugging
        this.showChoiceDialog(
            'How would you like to proceed?',
            'Choose how you want to set up your ' + this.currentMode.replace('-', ' '),
            [
                {
                    id: 'manual',
                    title: 'Manual Setup',
                    desc: 'I want to specify details step by step',
                    icon: 'fas fa-hand-paper'
                },
                {
                    id: 'ai_assist',
                    title: 'AI Assistance',
                    desc: 'Let AI help me create this',
                    icon: 'fas fa-robot'
                }
            ],
            (choice) => {
                console.log('🎯 User chose:', choice); // DEBUG
                if (choice === 'manual') {
                    this.openManualConfig();
                } else {
                    // Use AI prompt system
                    const prompt = this.buildPrompt(this.currentMode, this.data);
                    console.log('📝 Generated prompt:', prompt); // DEBUG
                    
                    const messageInput = document.getElementById('messageInput');
                    messageInput.value = prompt;
                    
                    // Trigger the input event to resize textarea
                    Chat.autoResize(messageInput);
                    
                    // Send the message
                    Chat.sendMessage();
                }
            }
        );
    },
    
    // Show choice dialog - ENHANCED VERSION
    showChoiceDialog(title, message, choices, onChoice) {
        console.log('🎭 Showing choice dialog'); // DEBUG
        
        // Remove any existing choice dialogs
        const existingDialogs = document.querySelectorAll('.choice-dialog');
        existingDialogs.forEach(dialog => dialog.remove());
        
        const dialog = document.createElement('div');
        dialog.className = 'choice-dialog';
        dialog.style.zIndex = '2500'; // Ensure it's on top
        dialog.innerHTML = `
            <div class="choice-dialog-content">
                <div class="choice-dialog-header">
                    <div class="choice-dialog-title">${title}</div>
                    <div class="choice-dialog-subtitle">${message}</div>
                </div>
                <div class="choice-options">
                    ${choices.map(choice => `
                        <div class="choice-option" data-choice-id="${choice.id}">
                            <div class="choice-icon">
                                <i class="${choice.icon}"></i>
                            </div>
                            <div class="choice-content">
                                <div class="choice-title">${choice.title}</div>
                                <div class="choice-desc">${choice.desc}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners to choice options
        dialog.querySelectorAll('.choice-option').forEach(option => {
            option.addEventListener('click', () => {
                const choiceId = option.getAttribute('data-choice-id');
                console.log('🎯 Choice clicked:', choiceId); // DEBUG
                document.body.removeChild(dialog);
                onChoice(choiceId);
            });
        });
        
        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                console.log('🚪 Dialog closed by background click'); // DEBUG
                document.body.removeChild(dialog);
            }
        });
        
        console.log('✅ Choice dialog created and added to DOM'); // DEBUG
    },
    
    // Build AI prompt based on configuration - SAME AS BEFORE
    buildPrompt(mode, data) {
        console.log('🔨 Building prompt for mode:', mode, 'with data:', data); // DEBUG
        
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
                } else if (data.step_1 === 'custom' && data.step_1_custom) {
                    prompt += `**Time Frame**: ${data.step_1_custom}\n`;
                }

                prompt += "\nIMPORTANT: Please:\n";
                prompt += "1. Use my stored memories about goals, routines, and preferences\n";
                prompt += "2. Create specific time blocks or priority lists\n";
                prompt += "3. Store any new planning preferences as memories\n";
                prompt += "4. If I mention any new goals or routines, store them as appropriate memory types\n";
                
                return prompt;
            },
            'set-goals': () => {
                let prompt = "I want to set a new goal. Please help me create it properly and store it as a GOAL memory:\n\n";
                
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

                prompt += "\nIMPORTANT: Please:\n";
                prompt += "1. Help me define this goal with SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)\n";
                prompt += "2. Store the goal as a GOAL memory type with appropriate priority\n";
                prompt += "3. Set success criteria and due dates\n";
                prompt += "4. Consider my existing goals from stored memories\n";
                prompt += "5. Ask me to specify the exact goal if I haven't already\n";
                
                return prompt;
            },
            'create-routine': () => {
                let prompt = "I want to create a new routine. Please help me design it and store it as a ROUTINE memory:\n\n";
                
                const routineTypes = {
                    'morning': 'Morning routine',
                    'evening': 'Evening routine',
                    'work': 'Work/productivity routine',
                    'exercise': 'Exercise routine',
                    'custom': 'Custom routine'
                };

                if (data.step_0) {
                    prompt += `**Routine Type**: ${routineTypes[data.step_0]}`;
                    if (data.step_0 === 'custom' && data.step_0_custom) {
                        prompt += ` - ${data.step_0_custom}`;
                    }
                    prompt += "\n";
                }

                const frequencies = {
                    'daily': 'Daily (every day)',
                    'weekdays': 'Weekdays only',
                    'weekly': 'Specific days of the week',
                    'flexible': 'Flexible frequency'
                };

                if (data.step_1) {
                    prompt += `**Frequency**: ${frequencies[data.step_1]}\n`;
                }

                prompt += "\nIMPORTANT: Please:\n";
                prompt += "1. Design specific steps for this routine with timing\n";
                prompt += "2. Store the routine as a ROUTINE memory type\n";
                prompt += "3. Include trigger conditions and energy requirements\n";
                prompt += "4. Set up success tracking methods\n";
                prompt += "5. Consider my existing routines from stored memories\n";
                prompt += "6. Ask me to specify routine details if needed\n";
                
                return prompt;
            },
            'create-task': () => {
                let prompt = "I want to create a new task. Please help me define it and store it as a GOAL memory:\n\n";
                
                if (data.step_0) {
                    const priorities = {'5': 'Urgent', '4': 'High Priority', '3': 'Medium Priority', '2': 'Low Priority'};
                    prompt += `**Priority**: ${priorities[data.step_0]}\n`;
                }

                if (data.step_1) {
                    if (data.step_1 === 'today') {
                        prompt += `**Due Date**: Today\n`;
                    } else if (data.step_1 === 'tomorrow') {
                        prompt += `**Due Date**: Tomorrow\n`;
                    } else if (data.step_1 === 'this_week') {
                        prompt += `**Due Date**: Within this week\n`;
                    } else if (data.step_1 === 'custom' && data.step_1_custom) {
                        prompt += `**Due Date**: ${data.step_1_custom}\n`;
                    }
                }

                prompt += "\nIMPORTANT: Please:\n";
                prompt += "1. Help me create a specific, actionable task\n";
                prompt += "2. Store it as a GOAL memory type with the specified priority\n";
                prompt += "3. Set clear success criteria and due date\n";
                prompt += "4. Include time estimates and resource requirements\n";
                prompt += "5. Ask me to specify the task details if I haven't already\n";
                
                return prompt;
            },
            'daily-review': () => {
                let prompt = "I want to do my daily review. Please guide me through this process:\n\n";
                
                const focuses = {
                    'goals': 'Goals progress review',
                    'routines': 'Routines completion check',
                    'overall': 'Overall day reflection',
                    'planning': 'Tomorrow planning focus'
                };

                if (data.step_0) {
                    prompt += `**Review Focus**: ${focuses[data.step_0]}\n`;
                }

                const depths = {
                    'quick': 'Quick check (5-10 minutes)',
                    'standard': 'Standard review (15-20 minutes)',
                    'detailed': 'Detailed analysis (30+ minutes)'
                };

                if (data.step_1) {
                    prompt += `**Review Depth**: ${depths[data.step_1]}\n`;
                }

                prompt += "\nIMPORTANT: Please:\n";
                prompt += "1. Use my stored memories about goals, routines, and recent activities\n";
                prompt += "2. Ask specific questions about my progress today\n";
                prompt += "3. Store any insights or learnings as INSIGHT memories\n";
                prompt += "4. Store any new goals or routine adjustments appropriately\n";
                prompt += "5. Help me plan improvements for tomorrow\n";
                
                return prompt;
            }
        };

        const generatedPrompt = prompts[mode] ? prompts[mode]() : `Help me with ${mode} and store relevant memories with correct types based on my stored memories and preferences.`;
        console.log('✅ Generated prompt:', generatedPrompt); // DEBUG
        return generatedPrompt;
    },
    
    // Open manual configuration (for future implementation)
    openManualConfig() {
        Utils.showAlert('Manual configuration coming soon', 'info');
    },
    
    // Close configuration modal
    closeModal() {
        document.getElementById('configModal').classList.remove('show');
        this.currentMode = null;
        this.data = {};
    },
    
    // Reset configuration
    reset() {
        this.currentMode = null;
        this.data = {};
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Config.init();
});
