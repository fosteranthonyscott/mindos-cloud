// ENHANCED Chat Module - Complete with chunked responses and existing functionality
const Chat = {
    // Enhanced properties for chunking
    isWaitingForChunk: false,
    chunkTimeout: null,
    
    // Enhanced addMessage with chunk support and memory indicators
    addMessage(type, content, options = {}) {
        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Format content with basic markdown support
        const formattedContent = this.formatMessageContent(content);
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}
            </div>
            <div>
                <div class="message-content">${formattedContent}</div>
                <div class="message-time">${timeString}</div>
                ${options.showIndicator ? this.createMemoryIndicator(options.showIndicator) : ''}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageDiv;
    },

    // NEW: Create memory operation indicator
    createMemoryIndicator(operationInfo) {
        if (!operationInfo || operationInfo.count === 0) return '';
        
        const iconMap = {
            'stored': 'fas fa-brain',
            'updated': 'fas fa-sync-alt',
            'processed': 'fas fa-cog',
            'deleted': 'fas fa-trash'
        };
        
        const icon = iconMap[operationInfo.type] || 'fas fa-brain';
        const text = operationInfo.type === 'updated' ? 'updated' : 
                    operationInfo.type === 'deleted' ? 'deleted' :
                    operationInfo.type === 'processed' ? 'processed' : 'stored';
        
        return `<div class="memory-operation-indicator ${operationInfo.type}">
            <i class="${icon}"></i> ${operationInfo.count} memory operation${operationInfo.count > 1 ? 's' : ''} ${text}
        </div>`;
    },
    
    // ENHANCED Send message with memory operations and chunking support
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || MindOS.isLoading) return;
        
        // Handle user interruption of chunked responses
        this.handleUserInterrupt();
        
        this.addMessage('user', message);
        input.value = '';
        this.autoResize(input);
        
        UI.setLoading(true);
        
        try {
            const response = await API.post('/api/claude', {
                messages: [{
                    role: 'user', 
                    content: message
                }],
                request_chunks: true // Request chunked responses if server supports it
            });
            
            const assistantMessage = response.content[0].text;
            const toolUses = response.content.filter(content => 
                content.type === 'tool_use' && content.name === 'storeMemory'
            );
            
            if (toolUses.length > 0) {
                MindOS.pendingMemories = toolUses.map(tool => ({
                    type: tool.input.type,
                    content: tool.input.content,
                    additionalData: { ...tool.input },
                    id: Utils.generateId()
                }));
                
                // Handle based on user's memory preference
                const memoryMode = MemoryConfig.getMode();
                
                switch (memoryMode) {
                    case MemoryConfig.MODES.AUTO:
                        await Memory.storePendingMemories();
                        this.addMessage('assistant', assistantMessage, {
                            showIndicator: { type: 'stored', count: toolUses.length }
                        });
                        break;
                        
                    case MemoryConfig.MODES.CONFIRM:
                        Memory.showMemoryConfirmationWithContinuation(
                            MindOS.pendingMemories, 
                            assistantMessage,
                            () => {}, 
                            () => {}
                        );
                        break;
                        
                    case MemoryConfig.MODES.MANUAL:
                    default:
                        Memory.showMemoryConfirmation(MindOS.pendingMemories, () => {
                            Memory.storePendingMemories();
                            this.addMessage('assistant', assistantMessage);
                        }, () => {
                            this.addMessage('assistant', assistantMessage);
                        });
                        break;
                }
            } else {
                // Handle enhanced response with potential chunking
                await this.handleEnhancedResponse(response, assistantMessage);
            }
            
            MindOS.sessionInfo.messageCount = (MindOS.sessionInfo.messageCount || 0) + 2;
            UI.updateSessionDisplay();
            
        } catch (error) {
            Utils.showAlert('Failed to send message: ' + error.message, 'error');
        } finally {
            UI.setLoading(false);
        }
    },

    // NEW: Handle enhanced response with chunking and memory operations
    async handleEnhancedResponse(response, assistantMessage) {
        try {
            // Show memory operation indicator if any operations were processed
            const memoryIndicator = response.memory_operations > 0 ? {
                type: 'processed',
                count: response.memory_operations
            } : null;
            
            // Add the message
            this.addMessage('assistant', assistantMessage, {
                showIndicator: memoryIndicator
            });
            
            // Handle chunked responses if server supports it
            if (response.has_more_chunks) {
                this.scheduleNextChunk();
            }
            
            // Add quick responses if provided
            if (response.quick_responses && response.quick_responses.length > 0) {
                this.addQuickResponses(response.quick_responses);
            }
            
        } catch (error) {
            console.error('Error handling enhanced response:', error);
            this.addMessage('assistant', 'I had trouble processing that. Could you try again?');
        }
    },

    // NEW: Schedule next chunk with natural delay
    scheduleNextChunk() {
        if (this.isWaitingForChunk) return;
        
        this.isWaitingForChunk = true;
        
        // Show typing indicator after a brief delay
        this.chunkTimeout = setTimeout(() => {
            this.showTypingIndicator();
            
            // Request next chunk after typing indicator
            setTimeout(() => {
                this.requestNextChunk();
            }, 1000);
        }, 1500); // 1.5 second delay for natural feel
    },

    // NEW: Request next chunk from server
    async requestNextChunk() {
        try {
            const response = await API.get('/api/claude/next-chunk');
            
            this.hideTypingIndicator();
            
            if (response.content && response.content[0]) {
                // Add the next chunk
                this.addMessage('assistant', response.content[0].text);
                
                // Schedule next chunk if more available
                if (response.has_more_chunks) {
                    this.scheduleNextChunk();
                } else {
                    this.isWaitingForChunk = false;
                }
            } else {
                this.isWaitingForChunk = false;
            }
            
        } catch (error) {
            console.error('Error getting next chunk:', error);
            this.hideTypingIndicator();
            this.isWaitingForChunk = false;
        }
    },

    // Enhanced showTypingIndicator
    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && !typingIndicator.classList.contains('show')) {
            typingIndicator.classList.add('show');
        }
    },

    // Enhanced hideTypingIndicator
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.classList.remove('show');
        }
    },

    // Send continuation message (enhanced from existing)
    async sendContinuationMessage(message) {
        UI.setLoading(true);
        
        try {
            const response = await API.post('/api/claude', {
                messages: [{
                    role: 'user',
                    content: message
                }],
                request_chunks: true
            });
            
            const assistantMessage = response.content[0].text;
            
            // Handle any new memories from continuation
            const toolUses = response.content.filter(content => 
                content.type === 'tool_use' && content.name === 'storeMemory'
            );
            
            if (toolUses.length > 0) {
                // For continuation, auto-store any new memories to avoid another interruption
                MindOS.pendingMemories = toolUses.map(tool => ({
                    type: tool.input.type,
                    content: tool.input.content,
                    additionalData: { ...tool.input },
                    id: Utils.generateId()
                }));
                
                await Memory.storePendingMemories();
                this.addMessage('assistant', assistantMessage, {
                    showIndicator: { type: 'stored', count: toolUses.length }
                });
            } else {
                // Handle the response with chunking support
                await this.handleEnhancedResponse(response, assistantMessage);
            }
            
            // Update session info
            MindOS.sessionInfo.messageCount = (MindOS.sessionInfo.messageCount || 0) + 2;
            UI.updateSessionDisplay();
            
        } catch (error) {
            Utils.showAlert('Failed to continue conversation: ' + error.message, 'error');
        } finally {
            UI.setLoading(false);
        }
    },
    
    // Format message content with basic markdown support
    formatMessageContent(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>');
    },
    
    // Auto-resize textarea
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    },
    
    // ENHANCED Add welcome message with natural chunking
    addWelcomeMessage() {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer.children.length === 0) {
            const welcomeText = `Hello! I'm MindOS, your personal AI assistant with memory capabilities. I can remember our conversations, your goals, routines, and preferences to provide personalized assistance.

I currently have ${MindOS.userMemories.length} stored memories about you. You can view, edit, and manage any memory through the sidebar or by using "View All Memories".

**Refresh Memories** reloads your stored data from the database to ensure everything is up-to-date.

What would you like to work on today?`;
            
            // Check if chunked welcome is supported
            if (window.location.search.includes('chunked=true') || localStorage.getItem('chunked_welcome') === 'true') {
                // Chunked welcome message
                setTimeout(() => {
                    this.addMessage('assistant', `👋 Hey! I'm MindOS, your personal AI assistant.`);
                }, 500);
                
                setTimeout(() => {
                    this.addMessage('assistant', `I've got ${MindOS.userMemories.length} memories about you and can help track your progress.`);
                }, 2500);
                
                setTimeout(() => {
                    this.addMessage('assistant', `What's on your agenda today?`);
                }, 4500);
            } else {
                // Standard welcome message
                this.addMessage('assistant', welcomeText);
            }
        }
    },
    
    // Clear chat session (enhanced with chunk cleanup)
    async clearSession() {
        try {
            // Clear any pending chunks
            this.isWaitingForChunk = false;
            if (this.chunkTimeout) {
                clearTimeout(this.chunkTimeout);
                this.chunkTimeout = null;
            }
            this.hideTypingIndicator();
            
            await API.post('/api/clear-session');
            
            // Clear messages
            document.getElementById('messages').innerHTML = '';
            
            // Reset session info
            MindOS.sessionInfo = { messageCount: 0 };
            UI.updateSessionDisplay();
            
            // Add welcome message
            this.addWelcomeMessage();
            
            Utils.showAlert('Session cleared successfully', 'success');
        } catch (error) {
            Utils.showAlert('Failed to clear session: ' + error.message, 'error');
        }
        
        UI.closeSidebar();
    },
    
    // Export chat history
    exportChat() {
        const messages = Array.from(document.querySelectorAll('.message')).map(msg => {
            const isUser = msg.classList.contains('user');
            const content = msg.querySelector('.message-content').textContent;
            const time = msg.querySelector('.message-time').textContent;
            return `[${time}] ${isUser ? 'You' : 'MindOS'}: ${content}`;
        }).join('\n\n');
        
        if (!messages) {
            Utils.showAlert('No messages to export', 'warning');
            return;
        }
        
        const blob = new Blob([messages], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindos-chat-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UI.closeSidebar();
        Utils.showAlert('Chat exported successfully', 'success');
    },
    
    // Enhanced memory indicator (backward compatible)
    addMemoryIndicator(count, type = 'stored') {
        const lastMessage = document.querySelector('.message.assistant:last-child .message-content');
        if (!lastMessage) return;
        
        const indicator = document.createElement('div');
        indicator.className = `memory-${type}-indicator`;
        
        const iconMap = {
            'stored': 'fas fa-brain',
            'updated': 'fas fa-sync-alt', 
            'processed': 'fas fa-cog',
            'deleted': 'fas fa-trash'
        };
        
        const icon = iconMap[type] || 'fas fa-brain';
        
        if (type === 'stored') {
            indicator.innerHTML = `<i class="${icon}"></i> ${count} memory${count > 1 ? 'ies' : ''} stored`;
        } else if (type === 'updated') {
            indicator.innerHTML = `<i class="${icon}"></i> ${count} memory${count > 1 ? 'ies' : ''} updated`;
        } else if (type === 'processed') {
            indicator.innerHTML = `<i class="${icon}"></i> ${count} operation${count > 1 ? 's' : ''} processed`;
        } else if (type === 'deleted') {
            indicator.innerHTML = `<i class="${icon}"></i> Memory deleted`;
        }
        
        lastMessage.appendChild(indicator);
    },
    
    // Send predefined message
    sendPredefinedMessage(message) {
        const input = document.getElementById('messageInput');
        input.value = message;
        this.autoResize(input);
        this.sendMessage();
    },
    
    // Copy message content
    copyMessage(messageElement) {
        const content = messageElement.querySelector('.message-content').textContent;
        navigator.clipboard.writeText(content).then(() => {
            Utils.showAlert('Message copied to clipboard', 'success', 2000);
        }).catch(() => {
            Utils.showAlert('Failed to copy message', 'error');
        });
    },
    
    // Edit last user message (for future implementation)
    editLastMessage() {
        const messages = document.querySelectorAll('.message.user');
        if (messages.length === 0) return;
        
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage.querySelector('.message-content').textContent;
        
        // Remove last user message and assistant response
        lastMessage.remove();
        const assistantMessages = document.querySelectorAll('.message.assistant');
        if (assistantMessages.length > 0) {
            assistantMessages[assistantMessages.length - 1].remove();
        }
        
        // Put content back in input
        const input = document.getElementById('messageInput');
        input.value = content;
        this.autoResize(input);
        input.focus();
    },
    
    // Scroll to message (for future implementation)
    scrollToMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        if (message) {
            message.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },
    
    // Search messages (for future implementation)
    searchMessages(query) {
        const messages = document.querySelectorAll('.message');
        const results = [];
        
        messages.forEach((message, index) => {
            const content = message.querySelector('.message-content').textContent.toLowerCase();
            if (content.includes(query.toLowerCase())) {
                results.push({
                    index,
                    element: message,
                    content: content.substring(0, 100) + '...'
                });
            }
        });
        
        return results;
    },
    
    // Highlight search results (for future implementation)
    highlightSearchResults(query) {
        const messages = document.querySelectorAll('.message-content');
        const regex = new RegExp(`(${query})`, 'gi');
        
        messages.forEach(message => {
            const originalText = message.textContent;
            if (originalText.toLowerCase().includes(query.toLowerCase())) {
                message.innerHTML = originalText.replace(regex, '<mark>$1</mark>');
            }
        });
    },
    
    // Clear search highlights (for future implementation)
    clearHighlights() {
        const highlighted = document.querySelectorAll('.message-content mark');
        highlighted.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    },
    
    // Get message context for AI (optimized for chunked responses)
    getMessageContext(count = 8) { // Reduced from 10 for better chunking performance
        const messages = document.querySelectorAll('.message');
        const context = [];
        
        // Get last N messages
        const lastMessages = Array.from(messages).slice(-count);
        
        lastMessages.forEach(message => {
            const isUser = message.classList.contains('user');
            const content = message.querySelector('.message-content').textContent;
            context.push({
                role: isUser ? 'user' : 'assistant',
                content: content
            });
        });
        
        return context;
    },
    
    // NEW: Handle quick responses for better conversation flow
    addQuickResponses(responses) {
        const lastMessage = document.querySelector('.message.assistant:last-child');
        if (!lastMessage || !responses || responses.length === 0) return;
        
        const quickResponseDiv = document.createElement('div');
        quickResponseDiv.className = 'quick-responses';
        quickResponseDiv.innerHTML = '<div class="quick-responses-label">Quick replies:</div>';
        
        const responseContainer = document.createElement('div');
        responseContainer.className = 'quick-responses-container';
        
        responses.slice(0, 3).forEach(response => { // Limit to 3 quick responses
            const btn = document.createElement('button');
            btn.className = 'quick-response-btn';
            btn.textContent = response;
            btn.onclick = () => {
                this.sendPredefinedMessage(response);
                quickResponseDiv.remove();
            };
            responseContainer.appendChild(btn);
        });
        
        quickResponseDiv.appendChild(responseContainer);
        lastMessage.appendChild(quickResponseDiv);
        
        // Auto-remove quick responses after 30 seconds
        setTimeout(() => {
            if (quickResponseDiv.parentNode) {
                quickResponseDiv.remove();
            }
        }, 30000);
    },
    
    // NEW: Interrupt chunked response if user types
    handleUserInterrupt() {
        if (this.isWaitingForChunk) {
            console.log('🛑 User interrupted chunked response');
            this.isWaitingForChunk = false;
            if (this.chunkTimeout) {
                clearTimeout(this.chunkTimeout);
                this.chunkTimeout = null;
            }
            this.hideTypingIndicator();
        }
    },
    
    // NEW: Enable/disable chunked responses
    toggleChunkedMode(enabled) {
        localStorage.setItem('chunked_responses', enabled ? 'true' : 'false');
        localStorage.setItem('chunked_welcome', enabled ? 'true' : 'false');
        
        if (enabled) {
            Utils.showAlert('Chunked responses enabled', 'success');
        } else {
            Utils.showAlert('Chunked responses disabled', 'info');
            this.handleUserInterrupt(); // Stop any current chunking
        }
    },
    
    // NEW: Check if chunked mode is enabled
    isChunkedModeEnabled() {
        return localStorage.getItem('chunked_responses') === 'true';
    }
};

// Enhanced event listener for user interrupt
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            if (messageInput.value.trim().length > 0) {
                Chat.handleUserInterrupt();
            }
        });
        
        // Also interrupt on focus (user wants to type)
        messageInput.addEventListener('focus', () => {
            Chat.handleUserInterrupt();
        });
    }
});
