// Chat Module
const Chat = {
    
    // Add message to chat display
    addMessage(type, content) {
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
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    // Send message to Claude
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || MindOS.isLoading) return;
        
        this.addMessage('user', message);
        input.value = '';
        this.autoResize(input);
        
        UI.setLoading(true);
        
        try {
            const response = await API.post('/api/claude', {
                messages: [{
                    role: 'user', 
                    content: message
                }]
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
                        this.addMessage('assistant', assistantMessage);
                        this.addMemoryIndicator(toolUses.length, 'stored');
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
                this.addMessage('assistant', assistantMessage);
            }
            
            MindOS.sessionInfo.messageCount = (MindOS.sessionInfo.messageCount || 0) + 2;
            UI.updateSessionDisplay();
            
        } catch (error) {
            Utils.showAlert('Failed to send message: ' + error.message, 'error');
        } finally {
            UI.setLoading(false);
        }
    },

    // Send continuation message
    async sendContinuationMessage(message) {
        UI.setLoading(true);
        
        try {
            const response = await API.post('/api/claude', {
                messages: [{
                    role: 'user',
                    content: message
                }]
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
                this.addMessage('assistant', assistantMessage);
                this.addMemoryIndicator(toolUses.length, 'stored');
            } else {
                this.addMessage('assistant', assistantMessage);
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
    
    // Format message content with markdown support
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
    
    // Add welcome message
    addWelcomeMessage() {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer.children.length === 0) {
            const welcomeText = `Hello! I'm MindOS, your personal AI assistant with memory capabilities. I can remember our conversations, your goals, routines, and preferences to provide personalized assistance.

I currently have ${MindOS.userMemories.length} stored memories about you. You can view, edit, and manage any memory through the sidebar or by using "View All Memories".

**Refresh Memories** reloads your stored data from the database to ensure everything is up-to-date.

What would you like to work on today?`;
            
            this.addMessage('assistant', welcomeText);
        }
    },
    
    // Clear chat session
    async clearSession() {
        try {
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
    
    // Add memory indicator to last message
    addMemoryIndicator(count, type = 'stored') {
        const lastMessage = document.querySelector('.message.assistant:last-child .message-content');
        if (!lastMessage) return;
        
        const indicator = document.createElement('div');
        indicator.className = `memory-${type}-indicator`;
        
        if (type === 'stored') {
            indicator.innerHTML = `<i class="fas fa-brain"></i> ${count} memory${count > 1 ? 'ies' : ''} stored`;
        } else if (type === 'deleted') {
            indicator.innerHTML = `<i class="fas fa-trash"></i> Memory deleted`;
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
    
    // Get message context for AI (last N messages)
    getMessageContext(count = 10) {
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
    }
};
