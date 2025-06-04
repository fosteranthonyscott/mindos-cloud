// ===== AI COMMENT BUBBLE INTERFACE =====
// This is the new bubble interface implementation to replace the old full-screen chat

// Toggle AI bubble for specific item
function toggleAIBubble(itemId) {
    const existingBubble = document.querySelector(`.ai-comment-bubble[data-item-id="${itemId}"]`);
    if (existingBubble) {
        closeAIBubble(itemId);
    } else {
        openAIBubble(itemId);
    }
}

// Open AI bubble for specific item
async function openAIBubble(itemId) {
    const item = feedItems.find(i => i.id === itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    currentAIItem = item;
    
    // Load chat history
    if (item.ai_chat_history) {
        try {
            aiChatHistory = JSON.parse(item.ai_chat_history);
        } catch (e) {
            aiChatHistory = [];
        }
    } else {
        aiChatHistory = [];
    }
    
    // Create bubble HTML
    const card = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!card) return;
    
    const bubble = document.createElement('div');
    bubble.className = 'ai-comment-bubble';
    bubble.dataset.itemId = itemId;
    bubble.innerHTML = `
        <div class="bubble-header" onmousedown="startDragBubble(event, ${itemId})">
            <div class="bubble-header-title">
                <div class="brain-icon">
                    <i class="fas fa-brain"></i>
                </div>
                <span>AI Assistant</span>
            </div>
            <div class="bubble-actions">
                <button class="bubble-action-btn pin-btn" onclick="togglePinnedPanel()" title="View Pinned Insights">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <button class="bubble-action-btn" onclick="minimizeBubble(${itemId})" title="Minimize">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="bubble-action-btn" onclick="closeAIBubble(${itemId})" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="bubble-quick-actions" id="quickActions-${itemId}">
            <!-- Quick actions will be populated based on item type -->
        </div>
        <div class="bubble-messages" id="bubbleMessages-${itemId}">
            <!-- Messages will appear here -->
        </div>
        <div class="bubble-input-container">
            <div class="bubble-input-wrapper">
                <textarea class="bubble-input" id="bubbleInput-${itemId}" 
                    placeholder="Ask about this ${item.type || 'item'}..." 
                    onkeydown="handleBubbleKeydown(event, ${itemId})"
                    oninput="autoResizeBubbleInput(this)"></textarea>
                <button class="bubble-send" id="bubbleSend-${itemId}" 
                    onclick="sendBubbleMessage(${itemId})">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    // Position bubble relative to card
    card.appendChild(bubble);
    
    // Store bubble reference
    activeBubbles.set(itemId, bubble);
    
    // Populate quick actions based on item type
    populateQuickActions(itemId, item);
    
    // Load existing chat history
    if (aiChatHistory.length > 0) {
        aiChatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                addBubbleMessage(itemId, msg.role, msg.content, false);
            }
        });
    } else {
        // Add welcome message
        const welcomeMessage = `I'm here to help you with this ${item.type || 'item'}. What would you like to know or do?`;
        addBubbleMessage(itemId, 'assistant', welcomeMessage, false);
    }
    
    // Show bubble with animation
    setTimeout(() => bubble.classList.add('show'), 10);
    
    // Focus input
    setTimeout(() => {
        const input = document.getElementById(`bubbleInput-${itemId}`);
        if (input) input.focus();
    }, 300);
}

// Close AI bubble
function closeAIBubble(itemId) {
    const bubble = activeBubbles.get(itemId);
    if (bubble) {
        bubble.classList.remove('show');
        setTimeout(() => {
            bubble.remove();
            activeBubbles.delete(itemId);
        }, 300);
    }
    if (currentAIItem && currentAIItem.id === itemId) {
        currentAIItem = null;
    }
}

// Minimize/maximize bubble
function minimizeBubble(itemId) {
    const bubble = activeBubbles.get(itemId);
    if (bubble) {
        bubble.classList.toggle('minimized');
    }
}

// Populate quick actions based on item type
function populateQuickActions(itemId, item) {
    const container = document.getElementById(`quickActions-${itemId}`);
    if (!container) return;
    
    const quickActions = getQuickActionsForType(item.type, item.status);
    
    container.innerHTML = quickActions.map(action => 
        `<button class="quick-action-chip ${action.suggested ? 'suggested' : ''}" 
            onclick="sendQuickAction(${itemId}, '${action.text.replace(/'/g, "\\'")}')">
            ${action.icon ? `<i class="fas fa-${action.icon}"></i> ` : ''}${action.label}
        </button>`
    ).join('');
}

// Get appropriate quick actions based on item type
function getQuickActionsForType(type, status) {
    const baseActions = [
        { label: 'Help me start', text: 'How should I begin working on this?', icon: 'play' },
        { label: 'Break it down', text: 'Can you break this down into smaller steps?', icon: 'list' }
    ];
    
    const typeSpecificActions = {
        routine: [
            { label: 'Optimize timing', text: 'What\'s the best time to do this routine?', icon: 'clock' },
            { label: 'Track progress', text: 'Help me track my progress with this routine', icon: 'chart-line', suggested: true }
        ],
        goal: [
            { label: 'Set milestones', text: 'Help me set milestones for this goal', icon: 'flag' },
            { label: 'Success metrics', text: 'What metrics should I track for this goal?', icon: 'chart-bar', suggested: true }
        ],
        task: [
            { label: 'Time estimate', text: 'How long will this task take?', icon: 'hourglass' },
            { label: 'Prerequisites', text: 'What do I need before starting this?', icon: 'tasks' }
        ]
    };
    
    if (status === 'active') {
        baseActions.push({ label: 'Mark complete', text: 'I\'ve completed this item', icon: 'check', suggested: true });
    }
    
    return [...baseActions, ...(typeSpecificActions[type] || [])];
}

// Send quick action
function sendQuickAction(itemId, text) {
    const input = document.getElementById(`bubbleInput-${itemId}`);
    if (input) {
        input.value = text;
        sendBubbleMessage(itemId);
    }
}

// Add message to bubble
function addBubbleMessage(itemId, role, content, updateHistory = true) {
    const container = document.getElementById(`bubbleMessages-${itemId}`);
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `bubble-message ${role}`;
    
    let avatarIcon = role === 'user' ? 'fa-user' : 'fa-brain';
    
    // Format content with line breaks
    const formattedContent = content.replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `
        <div class="bubble-message-avatar">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="bubble-message-content">
            ${formattedContent}
            ${role === 'assistant' ? `
                <button class="pin-insight-btn" onclick="pinInsight('${content.replace(/'/g, "\\'").replace(/\n/g, ' ').substring(0, 200)}')"
                    style="margin-left: 8px; background: none; border: none; color: #667eea; cursor: pointer; font-size: 0.8rem; opacity: 0.7; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                    <i class="fas fa-thumbtack"></i>
                </button>` : ''}
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    // Update history if needed
    if (updateHistory && role !== 'system') {
        const message = { role, content, timestamp: new Date().toISOString() };
        aiChatHistory.push(message);
    }
}

// Handle bubble input keydown
function handleBubbleKeydown(event, itemId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendBubbleMessage(itemId);
    }
}

// Auto-resize bubble input
function autoResizeBubbleInput(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
}

// Send message in bubble
async function sendBubbleMessage(itemId) {
    const input = document.getElementById(`bubbleInput-${itemId}`);
    const sendBtn = document.getElementById(`bubbleSend-${itemId}`);
    const message = input.value.trim();
    
    if (!message) return;
    
    const item = feedItems.find(i => i.id === itemId);
    if (!item) return;
    
    currentAIItem = item;
    
    // Add user message
    addBubbleMessage(itemId, 'user', message);
    input.value = '';
    
    // Reset input height
    input.style.height = 'auto';
    
    // Show loading
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const itemContext = buildItemContext(item);
        
        const response = await fetch('/api/claude/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                itemId: item.id,
                itemContext: itemContext,
                messages: aiChatHistory
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const aiResponse = data.content[0].text;
            
            addBubbleMessage(itemId, 'assistant', aiResponse);
            
            // Handle field updates if suggested
            if (data.has_updates && data.field_updates) {
                await handleAIFieldUpdates(data.field_updates);
            }
            
            // Save chat history
            await saveChatHistory();
            
        } else {
            const errorData = await response.json();
            addBubbleMessage(itemId, 'assistant', 'Sorry, I encountered an error. Please try again.');
        }
        
    } catch (error) {
        console.error('Bubble chat error:', error);
        addBubbleMessage(itemId, 'assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

// Bubble dragging functionality
let draggedBubble = null;
let dragOffset = { x: 0, y: 0 };

function startDragBubble(event, itemId) {
    const bubble = activeBubbles.get(itemId);
    if (!bubble) return;
    
    draggedBubble = bubble;
    const rect = bubble.getBoundingClientRect();
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;
    
    document.addEventListener('mousemove', dragBubble);
    document.addEventListener('mouseup', stopDragBubble);
}

function dragBubble(event) {
    if (!draggedBubble) return;
    
    const x = event.clientX - dragOffset.x;
    const y = event.clientY - dragOffset.y;
    
    draggedBubble.style.left = `${x}px`;
    draggedBubble.style.top = `${y}px`;
    draggedBubble.style.right = 'auto';
    draggedBubble.style.bottom = 'auto';
    draggedBubble.style.position = 'fixed';
}

function stopDragBubble() {
    draggedBubble = null;
    document.removeEventListener('mousemove', dragBubble);
    document.removeEventListener('mouseup', stopDragBubble);
}

// Pin insight functionality
function pinInsight(text) {
    if (!text || pinnedInsights.some(i => i.text === text)) return;
    
    pinnedInsights.push({
        id: Date.now(),
        text: text,
        timestamp: new Date().toISOString(),
        itemId: currentAIItem?.id
    });
    
    showToast('Insight pinned!', 'success');
    updatePinnedPanel();
}

// Toggle pinned insights panel
function togglePinnedPanel() {
    let panel = document.getElementById('pinnedInsightsPanel');
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'pinnedInsightsPanel';
        panel.className = 'pinned-insights-panel';
        panel.innerHTML = `
            <div class="pinned-insights-header">
                <h3><i class="fas fa-thumbtack"></i> Pinned Insights</h3>
                <button class="bubble-action-btn" onclick="closePinnedPanel()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="pinned-insights-list" id="pinnedInsightsList">
                <!-- Pinned insights will appear here -->
            </div>
        `;
        document.body.appendChild(panel);
    }
    
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) {
        updatePinnedPanel();
    }
}

function closePinnedPanel() {
    const panel = document.getElementById('pinnedInsightsPanel');
    if (panel) {
        panel.classList.remove('show');
    }
}

function updatePinnedPanel() {
    const list = document.getElementById('pinnedInsightsList');
    if (!list) return;
    
    if (pinnedInsights.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem;">No pinned insights yet</p>';
    } else {
        list.innerHTML = pinnedInsights.map(insight => `
            <div class="pinned-insight">
                <button class="pinned-insight-remove" onclick="removePinnedInsight(${insight.id})">
                    <i class="fas fa-times"></i>
                </button>
                <div style="font-size: 0.75rem; color: #888; margin-bottom: 0.3rem;">
                    ${new Date(insight.timestamp).toLocaleString()}
                </div>
                ${insight.text}
            </div>
        `).join('');
    }
}

function removePinnedInsight(id) {
    pinnedInsights = pinnedInsights.filter(i => i.id !== id);
    updatePinnedPanel();
}

// Keep compatibility with old interface
function openAIChat(itemId) {
    console.warn('openAIChat is deprecated, using bubble interface');
    openAIBubble(itemId);
}

function closeAIChat() {
    // Close all bubbles
    activeBubbles.forEach((bubble, itemId) => {
        closeAIBubble(itemId);
    });
}