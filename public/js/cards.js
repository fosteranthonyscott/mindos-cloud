// Enhanced createScrollCardHTML method with more details
createScrollCardHTML(memory) {
    const type = memory.type || 'memory';
    const priority = memory.priority || 1;
    const title = memory.content_short || memory.content?.substring(0, 80) || 'Untitled';
    const description = memory.notes || memory.content?.substring(80, 200) || '';
    
    // Enhanced due date calculation
    let dueMeta = '';
    let dueStatus = '';
    if (memory.due) {
        const dueDate = new Date(memory.due);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            dueMeta = `<div class="meta-item due-today"><i class="fas fa-exclamation-triangle"></i> ${Math.abs(diffDays)} days overdue</div>`;
            dueStatus = 'overdue';
        } else if (diffDays === 0) {
            dueMeta = `<div class="meta-item due-today"><i class="fas fa-calendar-day"></i> Due Today</div>`;
            dueStatus = 'today';
        } else if (diffDays === 1) {
            dueMeta = `<div class="meta-item due-soon"><i class="fas fa-calendar-alt"></i> Due Tomorrow</div>`;
            dueStatus = 'tomorrow';
        } else if (diffDays <= 7) {
            dueMeta = `<div class="meta-item due-soon"><i class="fas fa-calendar-alt"></i> Due in ${diffDays} days</div>`;
            dueStatus = 'week';
        } else {
            dueMeta = `<div class="meta-item"><i class="fas fa-calendar-alt"></i> Due ${Utils.formatDate(memory.due)}</div>`;
        }
    }
    
    // Priority indicator with stars
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
    
    // Enhanced streak display
    let streakHTML = '';
    if (memory.performance_streak && memory.performance_streak > 0) {
        streakHTML = `<div class="streak-indicator">
            <i class="fas fa-fire"></i>
            <span class="streak-number">${memory.performance_streak}</span>
            <span>day streak</span>
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
                <div class="progress-text">Progress: ${progress}%</div>
            </div>
        `;
    }
    
    // Enhanced details section
    const detailsHTML = this.generateCardDetails(memory);
    
    // Notes section
    let notesHTML = '';
    if (description && description.length > 0) {
        notesHTML = `
            <div class="card-notes">
                <div class="notes-label">
                    <i class="fas fa-sticky-note"></i>
                    Notes
                </div>
                ${description}
            </div>
        `;
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
                        ${memory.energy_requirements ? `<div class="meta-item"><i class="fas fa-battery-three-quarters"></i> ${memory.energy_requirements} energy</div>` : ''}
                        ${priority >= 4 ? `<div class="meta-item high-priority"><i class="fas fa-star"></i> High Priority</div>` : ''}
                    </div>
                    
                    ${detailsHTML}
                    ${streakHTML}
                    ${progressHTML}
                    ${notesHTML}
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

// Generate enhanced card details
generateCardDetails(memory) {
    const details = [];
    
    // Type-specific details
    if (memory.type === 'routine') {
        if (memory.routine_type) {
            details.push({
                icon: 'fas fa-list',
                label: 'Type',
                value: memory.routine_type.charAt(0).toUpperCase() + memory.routine_type.slice(1)
            });
        }
        if (memory.frequency) {
            details.push({
                icon: 'fas fa-calendar-alt',
                label: 'Frequency',
                value: memory.frequency.charAt(0).toUpperCase() + memory.frequency.slice(1)
            });
        }
        if (memory.trigger) {
            details.push({
                icon: 'fas fa-play',
                label: 'Trigger',
                value: memory.trigger
            });
        }
    }
    
    if (memory.type === 'goal') {
        if (memory.goal_type) {
            details.push({
                icon: 'fas fa-bullseye',
                label: 'Goal Type',
                value: memory.goal_type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
            });
        }
        if (memory.success_criteria) {
            details.push({
                icon: 'fas fa-check-circle',
                label: 'Success Criteria',
                value: memory.success_criteria
            });
        }
    }
    
    if (memory.type === 'task') {
        if (memory.difficulty) {
            details.push({
                icon: 'fas fa-chart-line',
                label: 'Difficulty',
                value: memory.difficulty.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
            });
        }
    }
    
    // Common details
    if (memory.stage && memory.stage !== 'active') {
        details.push({
            icon: 'fas fa-layer-group',
            label: 'Stage',
            value: memory.stage.charAt(0).toUpperCase() + memory.stage.slice(1)
        });
    }
    
    if (memory.mood) {
        details.push({
            icon: 'fas fa-smile',
            label: 'Mood',
            value: memory.mood
        });
    }
    
    if (memory.weather) {
        details.push({
            icon: 'fas fa-cloud-sun',
            label: 'Weather',
            value: memory.weather
        });
    }
    
    if (memory.resources) {
        details.push({
            icon: 'fas fa-tools',
            label: 'Resources',
            value: memory.resources
        });
    }
    
    if (memory.duration_target) {
        details.push({
            icon: 'fas fa-stopwatch',
            label: 'Target Duration',
            value: memory.duration_target
        });
    }
    
    if (memory.performance_rate && memory.performance_rate > 0) {
        const rate = Math.round(memory.performance_rate * 100);
        details.push({
            icon: 'fas fa-percentage',
            label: 'Success Rate',
            value: `${rate}%`
        });
    }
    
    // Last modified/created info
    if (memory.modified || memory.created_at) {
        const date = memory.modified || memory.created_at;
        details.push({
            icon: 'fas fa-clock',
            label: 'Last Updated',
            value: this.formatRelativeDate(date)
        });
    }
    
    if (details.length === 0) return '';
    
    return `
        <div class="card-details">
            ${details.map(detail => `
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="${detail.icon}"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-label">${detail.label}</div>
                        <div class="detail-value">${detail.value}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
},

// Get status icon
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

// Format relative date
formatRelativeDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) {
        return 'Just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return Utils.formatDate(dateString);
    }
}
