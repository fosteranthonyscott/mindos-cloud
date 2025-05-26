// Configuration Module - DEBUG VERSION
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
        
        this.populateModal(config);
        document.getElementById('configModal').classList.add('show');
        console.log('✅ Config modal opened');
    },
    
    populateModal(config) {
        console.log('📝 Populating modal with config:', config.title);
        
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
        console.log('✅ Modal populated');
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
        const requiredSteps = document.querySelectorAll('.config-step').length;
        const selectedSteps = Object.keys(this.data).filter(key => 
            key.startsWith('step_') && !key.includes('_custom')
        ).length;
        
        const proceedBtn = document.getElementById('proceedConfigBtn');
        const isComplete = selectedSteps >= requiredSteps;
        
        console.log('📊 Button update:');
        console.log('  - Required steps:', requiredSteps);
        console.log('  - Selected steps:', selectedSteps);
        console.log('  - Is complete:', isComplete);
        console.log('  - Current data:', this.data);
        
        if (proceedBtn) {
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
        } else {
            console.error('❌ Proceed button not found!');
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
            Utils.showAlert('Please select all options before proceeding', 'warning');
            return;
        }
        
        console.log('✅ Data validation passed, closing modal');
        this.closeModal();
        
        // Skip choice dialog for now - go straight to AI
        console.log('🤖 Going directly to AI assistance');
        
        try {
            const prompt = this.buildPrompt(this.currentMode, this.data);
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
            let prompt = "I want to create a new routine. Please help me design it effectively:\n\n";
            
            const routineTypes = {
                'morning': 'Morning routine to start the day with purpose',
                'evening': 'Evening routine to wind down and prepare for tomorrow',
                'work': 'Work routine for productivity during work hours',
                'exercise': 'Exercise routine for physical fitness and health',
                'custom': 'Custom routine for a specific activity or habit'
            };
            
            const frequencies = {
                'daily': 'Every day without exception',
                'weekdays': 'Monday through Friday only',
                'weekly': 'Specific days of the week',
                'flexible': 'Target frequency with flexibility'
            };
            
            if (data.step_0) {
                prompt += `**Routine Type**: ${routineTypes[data.step_0]}\n`;
            }
            
            if (data.step_1) {
                prompt += `**Frequency**: ${frequencies[data.step_1]}\n`;
            }
            
            prompt += "\nPlease help me create a sustainable routine with specific steps, timing, and success criteria. Store it as a memory when complete.";
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
}
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
