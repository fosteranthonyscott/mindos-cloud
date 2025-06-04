// ENHANCED MINDOS SERVER.JS - Smart Memory Operations & Advanced Context Management with Recurring Task Manager
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// NEW: Import the recurring task management modules
const { SmartTextParsingAlgorithm, SmartTextFeedManager } = require('./smart-text-algorithm');
const { RecurringTaskManager } = require('./recurring-task-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - MOVED TO TOP
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.method === 'POST') {
        console.log('POST Body keys:', Object.keys(req.body || {}));
    }
    next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'mindos-jwt-secret-2025';

// PostgreSQL connection with better error handling
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// NEW: Initialize the smart managers
const feedManager = new SmartTextFeedManager();
const textParser = new SmartTextParsingAlgorithm();
const recurringManager = new RecurringTaskManager(db, textParser);

// Make feedManager available globally for cache clearing
global.feedManager = feedManager;

// Test database connection and get schema info
let memoriesTableColumns = [];
let isDbConnected = false;

// ENHANCED Context Management for MindOS
class ConversationContext {
    constructor(userId) {
        this.userId = userId;
        this.messages = [];
        this.sessionId = uuidv4();
        this.startTime = new Date();
        this.lastActivity = new Date();
        this.currentTopic = null;
        this.userConstraints = new Map(); // Store user's fixed constraints
        this.pendingOperations = [];
    }

    addMessage(message) {
        this.messages.push({
            ...message,
            timestamp: new Date(),
            id: uuidv4()
        });
        this.lastActivity = new Date();
        
        // Extract constraints from user messages
        if (message.role === 'user') {
            this.extractConstraints(message.content);
        }
        
        // Maintain reasonable context window
        if (this.messages.length > 20) {
            // Keep system message, recent messages, and constraint-related messages
            const systemMessages = this.messages.filter(m => m.role === 'system');
            const constraintMessages = this.messages.filter(m => this.containsConstraints(m.content));
            const recentMessages = this.messages.slice(-15);
            
            this.messages = [...systemMessages, ...constraintMessages, ...recentMessages]
                .filter((msg, index, arr) => arr.findIndex(m => m.id === msg.id) === index)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
    }

    extractConstraints(content) {
        const timeConstraints = [
            /need to be (?:at work|there) by (\d{1,2}:?\d{0,2}\s*(?:AM|PM|am|pm))/i,
            /work starts? at (\d{1,2}:?\d{0,2}\s*(?:AM|PM|am|pm))/i,
            /have to arrive by (\d{1,2}:?\d{0,2}\s*(?:AM|PM|am|pm))/i,
            /must be there by (\d{1,2}:?\d{0,2}\s*(?:AM|PM|am|pm))/i
        ];

        timeConstraints.forEach(regex => {
            const match = content.match(regex);
            if (match) {
                this.userConstraints.set('work_arrival_time', match[1]);
                console.log(`🔒 Constraint detected: Work arrival time = ${match[1]}`);
            }
        });

        // Extract commute time
        const commuteMatch = content.match(/commute (?:takes?|is) (\d+) minutes?/i);
        if (commuteMatch) {
            this.userConstraints.set('commute_time', parseInt(commuteMatch[1]));
            console.log(`🔒 Constraint detected: Commute time = ${commuteMatch[1]} minutes`);
        }

        // Extract routine duration
        const durationMatch = content.match(/(?:routine|takes?) (\d+)\s*(?:hour|hr)s?\s*(?:and\s*)?(\d+)?\s*(?:minute|min)s?/i);
        if (durationMatch) {
            const hours = parseInt(durationMatch[1]) || 0;
            const minutes = parseInt(durationMatch[2]) || 0;
            this.userConstraints.set('routine_duration', hours * 60 + minutes);
            console.log(`🔒 Constraint detected: Routine duration = ${hours}h ${minutes}m`);
        }

        // Extract sleep requirements
        const sleepMatch = content.match(/need (\d+) hours? of sleep/i);
        if (sleepMatch) {
            this.userConstraints.set('sleep_hours', parseInt(sleepMatch[1]));
            console.log(`🔒 Constraint detected: Sleep requirement = ${sleepMatch[1]} hours`);
        }

        // Extract preparation time
        const prepMatch = content.match(/(?:get ready|prepare|prep) (?:takes?|is) (\d+) minutes?/i);
        if (prepMatch) {
            this.userConstraints.set('prep_time', parseInt(prepMatch[1]));
            console.log(`🔒 Constraint detected: Preparation time = ${prepMatch[1]} minutes`);
        }
    }

    containsConstraints(content) {
        const constraintKeywords = ['work by', 'arrive by', 'need to be', 'commute', 'takes', 'must', 'sleep', 'get ready'];
        return constraintKeywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    getConstraintSummary() {
        if (this.userConstraints.size === 0) return '';
        
        let summary = '\nIMPORTANT USER CONSTRAINTS:\n';
        for (const [key, value] of this.userConstraints) {
            summary += `- ${key.replace('_', ' ')}: ${value}\n`;
        }
        return summary;
    }

    getContextForClaude() {
        return {
            messages: this.messages.slice(-10), // Last 10 messages for immediate context
            constraints: this.getConstraintSummary(),
            currentTopic: this.currentTopic,
            sessionDuration: Math.floor((new Date() - this.startTime) / 1000 / 60) // minutes
        };
    }
}

// Enhanced conversation session management
const conversationContexts = new Map();
const conversationChunks = new Map(); // Store chunked responses by userId

function getEnhancedConversationSession(userId) {
    if (!conversationContexts.has(userId)) {
        conversationContexts.set(userId, new ConversationContext(userId));
    }
    return conversationContexts.get(userId);
}

async function initializeDatabase() {
    try {
        console.log('🔄 Attempting database connection...');
        const client = await db.connect();
        console.log('✅ Database connected successfully');
        client.release();
        isDbConnected = true;
        
        // Get the actual column structure of memories table
        try {
            const columnsResult = await db.query(`
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'memories'
                ORDER BY ordinal_position;
            `);
            
            memoriesTableColumns = columnsResult.rows.map(row => row.column_name);
            
            if (memoriesTableColumns.length > 0) {
                console.log('📊 Found memories table with columns:', memoriesTableColumns.length);
            } else {
                console.log('⚠️ Memories table not found or has no columns');
            }
        } catch (schemaError) {
            console.log('⚠️ Could not read memories table schema:', schemaError.message);
        }
        
    } catch (err) {
        console.error('❌ Database connection error:', err);
        isDbConnected = false;
        // Don't exit process, let server start anyway
    }
}

// NEW: Update database schema for recurring tasks
async function updateDatabaseSchema() {
    try {
        console.log('🔧 Checking database schema...');
        
        const schemaUpdates = [
            // Add columns for recurring task management
            `ALTER TABLE memories ADD COLUMN IF NOT EXISTS completed_date DATE;`,
            `ALTER TABLE memories ADD COLUMN IF NOT EXISTS last_recurring_update TIMESTAMP;`,
            `ALTER TABLE memories ADD COLUMN IF NOT EXISTS performance_streak INTEGER DEFAULT 0;`,
            
            // Add indexes for better performance
            `CREATE INDEX IF NOT EXISTS idx_memories_due_status ON memories(due, status);`,
            `CREATE INDEX IF NOT EXISTS idx_memories_frequency ON memories(frequency) WHERE frequency IS NOT NULL;`,
            `CREATE INDEX IF NOT EXISTS idx_memories_completed_date ON memories(completed_date);`,
            `CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status);`
        ];
        
        for (const update of schemaUpdates) {
            try {
                await db.query(update);
            } catch (error) {
                // Ignore "already exists" errors
                if (!error.message.includes('already exists')) {
                    console.warn('Schema update warning:', error.message);
                }
            }
        }
        
        console.log('✅ Database schema updated');
        
    } catch (error) {
        console.error('❌ Error updating database schema:', error);
    }
}

// NEW: Initialize background processes
async function initializeBackgroundProcesses() {
    try {
        console.log('🚀 Starting background processes...');
        
        // Start the recurring task manager
        recurringManager.start();
        
        console.log('✅ Background processes started successfully');
        
    } catch (error) {
        console.error('❌ Error starting background processes:', error);
    }
}

// Initialize database connection and background processes
initializeDatabase().then(() => {
    updateDatabaseSchema().then(() => {
        initializeBackgroundProcesses();
    });
});

// Health check endpoint - ENHANCED with recurring task status
app.get('/health', (req, res) => {
    const recurringStatus = recurringManager.getStatus();
    
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: isDbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        claude: {
            apiKeySet: !!process.env.CLAUDE_API_KEY,
            apiKeyLength: process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.length : 0
        },
        backgroundProcesses: {
            recurringTasks: recurringStatus.isRunning ? 'running' : 'stopped',
            processes: recurringStatus.processes,
            uptime: recurringStatus.uptime
        }
    });
});

// API route debugging middleware
app.use('/api/*', (req, res, next) => {
    console.log(`🔥 API Route Hit: ${req.method} ${req.path}`);
    console.log('🔥 Headers:', Object.keys(req.headers));
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('🔥 Body:', req.body);
    }
    next();
});

// MindOS System Prompt
const MINDOS_SYSTEM_PROMPT = `You are MindOS, a personal AI assistant designed to help users manage their lives, routines, and goals. 

Your capabilities:
- Remember important information across conversations within this session
- Help users plan their day, set routines, and achieve goals
- Store important information as memories for future reference
- Be proactive in suggesting improvements and optimizations
- Respect user constraints and do accurate time calculations
- Handle recurring tasks and routines automatically

Your personality:
- Helpful and proactive
- Focus on productivity and well-being
- Remember context and user preferences
- Professional but friendly
- Mathematically precise with time calculations

Memory Management Instructions:
When users share important information (goals, preferences, routines, significant events, decisions, or insights), you should store them as memories using the storeMemory function. Categories include:
- "goal" - User's objectives and targets
- "routine" - Daily/weekly habits and routines
- "preference" - User's likes, dislikes, and preferences
- "insight" - Important realizations or learnings
- "event" - Significant occurrences or milestones
- "system" - System settings or configurations

Always reference relevant stored memories when responding to provide continuity and personalized assistance.

Note: Users can view, discuss, and delete memories through the interface. If they ask about specific memories or want to modify them, provide helpful guidance and full context.`;

// ADAPTIVE buildMemoryContext function - works with any column structure
async function buildMemoryContext(userId) {
    if (!isDbConnected) {
        return "Database temporarily unavailable.";
    }
    
    try {
        // Base query with only guaranteed columns
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let orderBy = ' ORDER BY id DESC LIMIT 25'; // Use id as fallback ordering
        
        // Add better ordering if columns exist
        if (memoriesTableColumns.includes('priority')) {
            orderBy = ' ORDER BY priority DESC, id DESC LIMIT 25';
        }
        
        const result = await db.query(query + orderBy, [userId]);
        
        if (result.rows.length === 0) {
            return "No stored memories yet.";
        }
        
        // Group by type if type column exists
        if (memoriesTableColumns.includes('type')) {
            const memoryGroups = result.rows.reduce((groups, memory) => {
                const type = memory.type || 'general';
                if (!groups[type]) groups[type] = [];
                groups[type].push(memory);
                return groups;
            }, {});
            
            let contextText = "Stored memories by category:\n\n";
            
            Object.entries(memoryGroups).forEach(([type, memories]) => {
                contextText += `${type.toUpperCase()}:\n`;
                memories.forEach(memory => {
                    // Use content_short if available, otherwise truncate content
                    const summary = memory.content_short || 
                                  (memory.content ? memory.content.substring(0, 100) : 'No content');
                    
                    contextText += `- ${summary}`;
                    
                    // Add additional info if columns exist
                    if (memory.priority && memory.priority > 3) contextText += " (HIGH PRIORITY)";
                    if (memory.performance_streak && memory.performance_streak > 0) {
                        contextText += ` [${memory.performance_streak} day streak]`;
                    }
                    if (memory.mood) contextText += ` (mood: ${memory.mood})`;
                    if (memory.location) contextText += ` @${memory.location}`;
                    if (memory.stage) contextText += ` [${memory.stage}]`;
                    if (memory.frequency) contextText += ` (${memory.frequency})`;
                    
                    contextText += "\n";
                    
                    if (memory.notes) {
                        contextText += `  Notes: ${memory.notes}\n`;
                    }
                });
                contextText += "\n";
            });
            
            return contextText;
        } else {
            // Simple list if no type column
            let contextText = "Stored memories:\n\n";
            result.rows.forEach(memory => {
                const summary = memory.content_short || 
                              (memory.content ? memory.content.substring(0, 100) : 'No content');
                contextText += `- ${summary}\n`;
            });
            return contextText;
        }
        
    } catch (error) {
        console.error('Error building memory context:', error);
        return "Error accessing stored memories.";
    }
}

// NEW: ENHANCED VALUE PROCESSING FUNCTION FOR EDIT FIXES
function processValueByType(fieldName, value) {
    // Handle null/undefined/empty values
    if (value === null || value === undefined || value === '') {
        // For some fields, empty string should be null
        const nullableFields = ['due', 'completed_date', 'notes', 'location', 'frequency'];
        return nullableFields.includes(fieldName) ? null : value;
    }
    
    // Specific field type handling
    const fieldTypes = {
        // Integer fields
        'id': 'integer',
        'priority': 'integer', 
        'performance_streak': 'integer',
        'required_time_minutes': 'integer',
        
        // Date fields
        'due': 'date',
        'completed_date': 'date',
        'modified': 'date',
        'created_at': 'timestamp',
        
        // Boolean fields
        'active': 'boolean',
        'archived': 'boolean',
        
        // Text fields (default)
        'content': 'text',
        'content_short': 'text',
        'notes': 'text',
        'type': 'text',
        'status': 'text'
    };
    
    const fieldType = fieldTypes[fieldName] || 'text';
    
    try {
        switch (fieldType) {
            case 'integer':
                const intVal = parseInt(value);
                return isNaN(intVal) ? null : intVal;
                
            case 'float':
                const floatVal = parseFloat(value);
                return isNaN(floatVal) ? null : floatVal;
                
            case 'boolean':
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'true' || value === '1';
                }
                return Boolean(value);
                
            case 'date':
                if (value instanceof Date) {
                    return value.toISOString().split('T')[0];
                } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return value.split('T')[0];
                } else if (typeof value === 'string' && value.trim() !== '') {
                    const parsed = new Date(value);
                    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
                }
                return null;
                
            case 'timestamp':
                if (value instanceof Date) {
                    return value.toISOString();
                } else if (typeof value === 'string' && value.trim() !== '') {
                    const parsed = new Date(value);
                    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
                }
                return null;
                
            case 'text':
            default:
                return String(value).trim();
        }
    } catch (error) {
        console.warn(`⚠️ Error processing field ${fieldName} with value ${value}:`, error);
        return undefined; // Skip this field
    }
}

// NEW: Parse config module input directly with enhanced frequency detection
function parseConfigInput(userInput) {
    try {
        const isRoutine = userInput.includes('Routine Description:');
        const isGoal = userInput.includes('Goal Type:');
        
        if (isRoutine) {
            // Extract routine details
            const routineData = {};
            
            // Parse each field
            const fields = {
                'Routine Description:': 'content',
                'Routine Type:': 'routine_type',
                'Frequency:': 'frequency',
                'Priority:': 'priority',
                'Status:': 'status',
                'Stage:': 'stage',
                'Required Time:': 'required_time',
                'Performance Streak:': 'performance_streak',
                'Trigger:': 'trigger',
                'Success Criteria:': 'success_criteria',
                'Notes:': 'notes'
            };
            
            let content = '';
            
            Object.entries(fields).forEach(([label, field]) => {
                const regex = new RegExp(`${label}\\s*([^\\n]+)`, 'i');
                const match = userInput.match(regex);
                if (match) {
                    const value = match[1].trim();
                    if (field === 'content') {
                        content = value;
                    } else {
                        routineData[field] = value;
                    }
                }
            });
            
            if (content) {
                return {
                    operation: 'create',
                    existing_id: null,
                    type: 'routine',
                    content: content,
                    data: routineData,
                    confidence: 0.95
                };
            }
        }
        
        if (isGoal) {
            // Extract goal details
            const goalData = {};
            
            const fields = {
                'Goal Description:': 'content',
                'Goal Type:': 'goal_type',
                'Priority Level:': 'priority',
                'Status:': 'status',
                'Stage:': 'stage',
                'Due Date:': 'due',
                'Success Criteria:': 'success_criteria',
                'Notes:': 'notes'
            };
            
            let content = '';
            
            Object.entries(fields).forEach(([label, field]) => {
                const regex = new RegExp(`${label}\\s*([^\\n]+)`, 'i');
                const match = userInput.match(regex);
                if (match) {
                    const value = match[1].trim();
                    if (field === 'content') {
                        content = value;
                    } else {
                        goalData[field] = value;
                    }
                }
            });
            
            if (content) {
                return {
                    operation: 'create',
                    existing_id: null,
                    type: 'goal',
                    content: content,
                    data: goalData,
                    confidence: 0.95
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing config input:', error);
        return null;
    }
}

// NEW: Enhanced find matching memory for updates
async function findMatchingMemory(userId, type, content, additionalData) {
    try {
        const contentLower = content.toLowerCase();
        
        // Get recent memories of same type for matching
        const recentMemories = await db.query(`
            SELECT * FROM memories 
            WHERE user_id = $1 AND type = $2 AND status != 'archived'
            ORDER BY created_at DESC LIMIT 10
        `, [userId, type]);
        
        for (const memory of recentMemories.rows) {
            // ROUTINE MATCHING LOGIC
            if (type === 'routine') {
                // Check for routine completion keywords
                const completionKeywords = ['did', 'completed', 'finished', 'done'];
                const isCompletion = completionKeywords.some(keyword => contentLower.includes(keyword));
                
                if (isCompletion) {
                    // Match by routine type or content similarity
                    if (memory.routine_type && contentLower.includes(memory.routine_type)) {
                        return memory;
                    }
                    
                    // Match by content keywords
                    const memoryContent = (memory.content || '').toLowerCase();
                    const routineKeywords = ['routine', 'morning', 'evening', 'workout', 'exercise'];
                    
                    for (const keyword of routineKeywords) {
                        if (contentLower.includes(keyword) && memoryContent.includes(keyword)) {
                            return memory;
                        }
                    }
                }
            }
            
            // GOAL MATCHING LOGIC
            if (type === 'goal') {
                const progressKeywords = ['achieved', 'completed', 'progress', 'working on'];
                const isProgress = progressKeywords.some(keyword => contentLower.includes(keyword));
                
                if (isProgress) {
                    const memoryContent = (memory.content || '').toLowerCase();
                    const words = contentLower.split(' ');
                    const matchingWords = words.filter(word => 
                        word.length > 3 && memoryContent.includes(word)
                    );
                    
                    if (matchingWords.length >= 2) {
                        return memory;
                    }
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding matching memory:', error);
        return null;
    }
}

// NEW: Update existing memory with recurring support
async function updateExistingMemory(memoryId, type, content, additionalData) {
    try {
        // Determine what to update based on content
        const updateData = {};
        const contentLower = content.toLowerCase();
        
        // For completion/progress updates
        if (['completed', 'finished', 'done', 'did'].some(word => contentLower.includes(word))) {
            updateData.status = 'completed';
            
            // Add completion date
            if (memoriesTableColumns.includes('completed_date')) {
                updateData.completed_date = new Date().toISOString().split('T')[0];
            }
            
            // Update performance streak for routines
            if (type === 'routine' && memoriesTableColumns.includes('performance_streak')) {
                const currentMemory = await db.query('SELECT performance_streak FROM memories WHERE id = $1', [memoryId]);
                const currentStreak = currentMemory.rows[0]?.performance_streak || 0;
                updateData.performance_streak = currentStreak + 1;
            }
        }
        
        // Add notes about the update
        if (memoriesTableColumns.includes('notes')) {
            const timestamp = new Date().toISOString().split('T')[0];
            updateData.notes = `Updated: ${content} [${timestamp}]`;
        }
        
        // Include any additional data
        Object.entries(additionalData).forEach(([key, value]) => {
            if (memoriesTableColumns.includes(key) && value !== null && value !== undefined) {
                updateData[key] = value;
            }
        });
        
        // Build update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        Object.entries(updateData).forEach(([key, value]) => {
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(value);
            paramIndex++;
        });
        
        if (memoriesTableColumns.includes('modified')) {
            updateFields.push('modified = CURRENT_DATE');
        }
        
        updateValues.push(memoryId);
        
        const query = `
            UPDATE memories 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await db.query(query, updateValues);
        console.log(`✅ Memory updated: ${result.rows[0].content_short || content.substring(0, 50)}`);
        
        // Handle recurring tasks if the item was completed
        if (updateData.status === 'completed') {
            const updatedItem = result.rows[0];
            if (updatedItem.frequency && updatedItem.frequency.trim() !== '') {
                console.log(`🔄 Triggering recurring update for completed item ${memoryId}`);
                // This will be handled by the background process, but we can trigger it immediately
                setTimeout(() => recurringManager.triggerDueCheck(), 1000);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error updating existing memory:', error);
        return false;
    }
}

// NEW: Create new memory with smart text parsing
async function createNewMemory(userId, type, content, additionalData) {
    try {
        if (memoriesTableColumns.length === 0) {
            console.log('⚠️ No memory table columns found, skipping storage');
            return false;
        }
        
        // Use smart text parsing to enhance the data
        const parsedData = textParser.parseUserInput ? textParser.parseUserInput(content) : {};
        console.log('🧠 Smart text parsing results:', parsedData);
        
        const baseData = { user_id: userId };
        
        if (memoriesTableColumns.includes('type')) baseData.type = type || parsedData.type;
        if (memoriesTableColumns.includes('content')) baseData.content = parsedData.content || content;
        
        // Apply smart parsing results
        if (memoriesTableColumns.includes('priority') && !additionalData.priority) {
            baseData.priority = parsedData.priority || 3;
        }
        
        if (memoriesTableColumns.includes('due') && !additionalData.due && parsedData.dueDate) {
            baseData.due = parsedData.dueDate;
        }
        
        if (memoriesTableColumns.includes('frequency') && parsedData.frequency) {
            baseData.frequency = parsedData.frequency.originalText || additionalData.frequency;
        }
        
        if (memoriesTableColumns.includes('location') && parsedData.location) {
            baseData.location = parsedData.location;
        }
        
        // Merge additional data
        Object.entries(additionalData).forEach(([key, value]) => {
            if (memoriesTableColumns.includes(key) && value !== null && value !== undefined) {
                baseData[key] = value;
            }
        });
        
        if (memoriesTableColumns.includes('content_short') && !baseData.content_short) {
            const cleanContent = parsedData.content || content;
            baseData.content_short = cleanContent.length > 100 ? cleanContent.substring(0, 97) + "..." : cleanContent;
        }
        
        if (memoriesTableColumns.includes('status') && !baseData.status) baseData.status = 'active';
        if (memoriesTableColumns.includes('performance_streak') && !baseData.performance_streak) {
            baseData.performance_streak = 0;
        }
        
        const columns = Object.keys(baseData);
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const values = Object.values(baseData);
        
        const query = `
            INSERT INTO memories (${columns.join(', ')}) 
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;
        
        const result = await db.query(query, values);
        
        const summary = baseData.content_short || content.substring(0, 50);
        console.log(`✅ New memory created: [${type}] ${summary}`);
        
        // If the new item has a frequency and due date, it's a recurring item
        const newItem = result.rows[0];
        if (newItem.frequency && newItem.due) {
            console.log(`📅 Created recurring item with frequency: ${newItem.frequency}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error creating new memory:', error);
        return false;
    }
}

// ENHANCED storeMemory function with UPDATE detection and smart parsing
async function storeMemory(userId, type, content, additionalData = {}) {
    if (!isDbConnected) {
        console.log('⚠️ Database not connected, skipping memory storage');
        return false;
    }
    
    try {
        // FIRST: Check if this should UPDATE an existing memory instead of creating new one
        const existingMemory = await findMatchingMemory(userId, type, content, additionalData);
        
        if (existingMemory) {
            console.log(`🔄 Updating existing memory ID: ${existingMemory.id}`);
            return await updateExistingMemory(existingMemory.id, type, content, additionalData);
        }
        
        // SECOND: Create new memory if no match found
        console.log('✨ Creating new memory');
        return await createNewMemory(userId, type, content, additionalData);
        
    } catch (error) {
        console.error('❌ Error in smart memory storage:', error);
        return false;
    }
}

// ENHANCED analyzeUserInput function with smart text parsing
async function analyzeUserInput(userInput, userId) {
    try {
        // FIRST: Check if this is a config module generated input
        const isConfigInput = userInput.includes('Routine Description:') || 
                             userInput.includes('Goal Type:') ||
                             userInput.includes('**Priority**:') ||
                             userInput.includes('Please help me set it up and store it as a memory');

        if (isConfigInput) {
            // Parse structured config input directly
            const operation = parseConfigInput(userInput);
            if (operation) {
                console.log('🎯 Config module input detected:', operation);
                return [operation];
            }
        }

        // Use smart text parsing to enhance analysis
        const parsedData = textParser.parseUserInput ? textParser.parseUserInput(userInput) : {};
        console.log('🧠 Smart parsing results:', parsedData);

        // FIXED: Get user's existing memories for context with adaptive query
        let selectColumns = ['id'];
        if (memoriesTableColumns.includes('type')) selectColumns.push('type');
        if (memoriesTableColumns.includes('content')) selectColumns.push('content');
        if (memoriesTableColumns.includes('content_short')) selectColumns.push('content_short');
        if (memoriesTableColumns.includes('routine_type')) selectColumns.push('routine_type');
        if (memoriesTableColumns.includes('status')) selectColumns.push('status');
        if (memoriesTableColumns.includes('frequency')) selectColumns.push('frequency');

        let query = `SELECT ${selectColumns.join(', ')} FROM memories WHERE user_id = $1`;
        let params = [userId];

        // Add status filter if status column exists
        if (memoriesTableColumns.includes('status')) {
            query += ' AND status != $2';
            params.push('archived');
        }

        // Add ordering
        const orderBy = memoriesTableColumns.includes('created_at') ? ' ORDER BY created_at DESC' : ' ORDER BY id DESC';
        query += orderBy + ' LIMIT 20';

        const existingMemories = await db.query(query, params);

        const analysisPrompt = `Analyze this user input for memory operations. Focus on MATHEMATICAL ACCURACY and CONSTRAINT REASONING. Use the smart parsing results to enhance your analysis.

User Input: "${userInput}"

Smart Parsing Results:
- Type: ${parsedData.type}
- Priority: ${parsedData.priority}
- Frequency: ${parsedData.frequency ? JSON.stringify(parsedData.frequency) : 'none'}
- Due Date: ${parsedData.dueDate || 'none'}
- Content: "${parsedData.content}"
- Location: ${parsedData.location || 'none'}
- Time Estimate: ${parsedData.timeEstimate || 'none'}

CRITICAL CONSTRAINTS TO RESPECT:
- Work schedules and time requirements are FIXED - cannot be changed
- Wake-up times must work backwards from fixed constraints
- Math must be accurate (if someone needs to be at work at 7 AM, they cannot leave at 9 AM)

Existing Memories Context:
${existingMemories.rows.map(m => `ID:${m.id} [${m.type || 'unknown'}] ${m.content_short || m.content?.substring(0, 80) || 'No content'} (${m.status || 'unknown'}) ${m.frequency ? 'Freq:' + m.frequency : ''}`).join('\n')}

RULES FOR ANALYSIS:
1. If user provides detailed routine/goal information → CREATE memory operation
2. If user mentions completing existing routine/goal → UPDATE existing memory
3. Break compound statements into separate operations
4. Respect mathematical constraints and work backwards from fixed requirements
5. For time-based routines, calculate realistic timing
6. Use smart parsing results to enhance data quality

Return ONLY a JSON array:
[
  {
    "operation": "update|create",
    "existing_id": number|null,
    "type": "goal|routine|preference|insight|event",
    "content": "specific description",
    "data": {
      "status": "active",
      "priority": "3",
      "routine_type": "morning",
      "frequency": "daily",
      "due": "2025-05-27",
      "location": "home",
      "required_time": "30 minutes",
      "other_fields": "values"
    },
    "confidence": 0.9
  }
]

If this is routine creation with detailed information, confidence should be 0.95+`;

        const fetch = await import('node-fetch').then(m => m.default);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1500,
                messages: [{ role: 'user', content: analysisPrompt }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Claude API error in analyzeUserInput:', data);
            return [];
        }

        const analysisText = data.content[0].text;
        console.log('🔍 Analysis response:', analysisText);
        
        // Extract JSON from response
        const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const operations = JSON.parse(jsonMatch[0]);
            console.log(`🧠 Detected ${operations.length} memory operations:`, operations.map(op => `${op.operation}: ${op.content}`));
            return operations.filter(op => op.confidence > 0.7);
        }
        
        console.log('⚠️ No valid JSON found in analysis response');
        return [];
    } catch (error) {
        console.error('❌ Error analyzing user input:', error);
        return [];
    }
}

// ENHANCED chunked response system
function chunkResponse(text, maxChunkLength = 150) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        
        if (currentChunk.length + trimmed.length + 1 <= maxChunkLength) {
            currentChunk += (currentChunk ? '. ' : '') + trimmed;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk + '.');
            }
            currentChunk = trimmed;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk + (currentChunk.endsWith('.') ? '' : '.'));
    }
    
    return chunks.length > 0 ? chunks : [text];
}

// Authentication middleware
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('❌ No authorization header');
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('❌ No token in authorization header');
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        console.log(`✅ Auth successful for user: ${decoded.userId}`);
        next();
    } catch (error) {
        console.error('❌ Auth error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
};

// ===== API ROUTES =====

// ENHANCED AI CHAT ENDPOINT with field update capabilities
app.post('/api/claude/chat', auth, async (req, res) => {
    console.log('🤖 AI Chat request for item-specific assistance');
    
    try {
        const { messages, itemId, itemContext } = req.body;
        const userId = req.user.userId;
        
        if (!messages || !Array.isArray(messages) || !itemId) {
            return res.status(400).json({ error: 'Messages array and itemId are required' });
        }
        
        // Enhance the system message to include field update instructions
        const enhancedSystemMessage = {
            role: 'system',
            content: itemContext + `

SPECIAL INSTRUCTIONS FOR FIELD UPDATES:
When the user's message implies that fields should be updated, you should:
1. Determine which fields need to be updated based on the conversation
2. Suggest appropriate values for those fields
3. Include a special JSON block in your response with the suggested updates

FORMAT FOR FIELD UPDATES:
If you determine that fields should be updated, include this in your response:
<field_updates>
{
  "suggested_updates": {
    "field_name": "new_value",
    "another_field": "another_value"
  },
  "reasoning": "Brief explanation of why these updates are suggested"
}
</field_updates>

EXAMPLE:
User: "I completed this task and it took me 45 minutes"
Your response: "Great job completing the task! I'll update the status to completed and record that it took 45 minutes.

<field_updates>
{
  "suggested_updates": {
    "status": "completed",
    "required_time_minutes": 45,
    "completed_date": "${new Date().toISOString().split('T')[0]}"
  },
  "reasoning": "User indicated task completion and provided time spent"
}
</field_updates>

The task has been marked as complete."

FIELD VALIDATION RULES:
- status: must be one of: active, completed, paused, archived
- priority: must be 1-5 (integer)
- type: must be one of: routine, goal, task, note, preference, insight, event
- dates: must be in YYYY-MM-DD format
- numbers: must be valid integers
- All text fields should be trimmed

Only suggest updates for fields that are explicitly mentioned or clearly implied by the user.`
        };
        
        // Extract system message and user messages separately
        const systemContent = enhancedSystemMessage.content;
        // Clean messages to only include role and content (remove timestamp and other fields)
        const userMessages = messages.slice(1)
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }));
        
        // Call Claude API
        console.log('🔑 API Key exists:', !!process.env.CLAUDE_API_KEY);
        console.log('📨 Sending request to Claude with', userMessages.length, 'messages');
        
        const fetch = await import('node-fetch').then(m => m.default);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 800,
                system: systemContent,
                messages: userMessages
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Claude API error in chat endpoint:', {
                status: response.status,
                statusText: response.statusText,
                data: data,
                hasApiKey: !!process.env.CLAUDE_API_KEY
            });
            return res.status(500).json({ 
                error: 'Claude API failed',
                details: data.error || data.message || 'Unknown error',
                status: response.status
            });
        }
        
        const aiResponse = data.content[0].text;
        
        // Parse field updates if present
        let fieldUpdates = null;
        const fieldUpdateMatch = aiResponse.match(/<field_updates>([\s\S]*?)<\/field_updates>/);
        
        if (fieldUpdateMatch) {
            try {
                fieldUpdates = JSON.parse(fieldUpdateMatch[1]);
                console.log('📝 AI suggested field updates:', fieldUpdates);
                
                // Validate the updates
                if (fieldUpdates.suggested_updates) {
                    const validatedUpdates = {};
                    
                    for (const [field, value] of Object.entries(fieldUpdates.suggested_updates)) {
                        // Check if field exists in our schema
                        if (memoriesTableColumns.includes(field)) {
                            // Apply field-specific validation
                            const processedValue = processValueByType(field, value);
                            if (processedValue !== undefined) {
                                validatedUpdates[field] = processedValue;
                            }
                        }
                    }
                    
                    fieldUpdates.validated_updates = validatedUpdates;
                }
            } catch (error) {
                console.error('Error parsing field updates:', error);
                fieldUpdates = null;
            }
        }
        
        // Clean the response by removing the field_updates block from display
        const cleanResponse = aiResponse.replace(/<field_updates>[\s\S]*?<\/field_updates>/g, '').trim();
        
        res.json({
            content: [{ type: 'text', text: cleanResponse }],
            field_updates: fieldUpdates,
            has_updates: !!fieldUpdates
        });
        
    } catch (error) {
        console.error('❌ AI Chat error:', error);
        res.status(500).json({ error: 'Failed to process AI chat request' });
    }
});

// REGISTER endpoint with enhanced error handling
app.post('/api/register', async (req, res) => {
    console.log('📝 Register attempt:', { body: Object.keys(req.body) });
    
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (!isDbConnected) {
            console.log('❌ Database not connected');
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const existingUser = await db.query(
            'SELECT id FROM "user" WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            console.log('❌ User already exists');
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        
        const result = await db.query(
            'INSERT INTO "user" (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, username, email, passwordHash]
        );
        
        const token = jwt.sign({ userId, username, email }, JWT_SECRET);
        
        console.log('✅ Registration successful for:', username);
        res.status(201).json({
            token,
            user: { userId, username, email }
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// LOGIN endpoint with enhanced error handling
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login attempt:', { body: Object.keys(req.body) });
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        if (!isDbConnected) {
            console.log('❌ Database not connected for login');
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const result = await db.query(
            'SELECT * FROM "user" WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ 
            userId: user.user_id, 
            username: user.username, 
            email: user.email 
        }, JWT_SECRET);
        
        console.log('✅ Login successful for:', user.username);
        res.json({
            token,
            user: { 
                userId: user.user_id, 
                username: user.username, 
                email: user.email 
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// USER STATUS endpoint
app.get('/api/user-status', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const result = await db.query(
            'SELECT user_id, username, email FROM "user" WHERE user_id = $1',
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ User status error:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// ENHANCED CLAUDE endpoint with advanced context management
app.post('/api/claude', auth, async (req, res) => {
    console.log('🤖 Enhanced Claude request from user:', req.user.userId);
    
    try {
        const { messages, request_chunks = false } = req.body;
        const userId = req.user.userId;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        
        // Get enhanced conversation context
        const context = getEnhancedConversationSession(userId);
        const userMessage = messages[messages.length - 1];
        context.addMessage(userMessage);
        
        // STEP 1: Analyze input for memory operations (with enhanced detection and error handling)
        let memoryOperations = [];
        try {
            memoryOperations = await analyzeUserInput(userMessage.content, userId);
        } catch (error) {
            console.error('❌ Memory analysis failed, continuing without:', error.message);
            // Continue with empty operations array
        }
        
        let memoryResults = [];
        
        // STEP 2: Execute memory operations
        if (memoryOperations.length > 0) {
            console.log(`📝 Processing ${memoryOperations.length} memory operations`);
            
            for (const operation of memoryOperations) {
                if (operation.operation === 'update' && operation.existing_id) {
                    const success = await updateExistingMemory(
                        operation.existing_id, 
                        operation.type, 
                        operation.content, 
                        operation.data || {}
                    );
                    memoryResults.push({ 
                        type: 'update', 
                        success, 
                        content: operation.content 
                    });
                } else if (operation.operation === 'create') {
                    const success = await storeMemory(
                        userId, 
                        operation.type, 
                        operation.content, 
                        operation.data || {}
                    );
                    memoryResults.push({ 
                        type: 'create', 
                        success, 
                        content: operation.content 
                    });
                }
            }
        }
        
        // STEP 3: Build enhanced context
        const memoryContext = await buildMemoryContext(userId);
        const contextInfo = context.getContextForClaude();
        
        // Create memory-aware system prompt with constraints
        let systemPrompt = `${MINDOS_SYSTEM_PROMPT}

User Context:
${memoryContext}

${contextInfo.constraints}

Session Context:
- Session duration: ${contextInfo.sessionDuration} minutes
- Current topic: ${contextInfo.currentTopic || 'General conversation'}

IMPORTANT INSTRUCTIONS:
1. **RESPECT ALL USER CONSTRAINTS** - Never suggest times that violate fixed requirements
2. **VERIFY MATH** - Double-check all time calculations before responding
3. **MAINTAIN CONTEXT** - Reference previous messages and constraints consistently
4. **AVOID REPETITION** - Don't ask the same questions multiple times
5. **BE DECISIVE** - Once constraints are clear, provide definitive solutions
6. **RECURRING TASKS** - Understand that items with frequencies will automatically reschedule when completed

Memory Operations Status:
${memoryResults.length > 0 ? `Processed ${memoryResults.length} memory operations - acknowledge briefly but focus on helping the user.` : 'No memory operations this message.'}`;

        // STEP 4: Get Claude response with enhanced context
        // Clean messages to remove extra fields that Claude API doesn't accept
        const cleanMessages = contextInfo.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const claudeRequestBody = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 400,
            system: systemPrompt,
            messages: cleanMessages
        };
        
        const fetch = await import('node-fetch').then(m => m.default);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Claude API error:', data);
            return res.status(500).json({ error: 'Claude API failed' });
        }
        
        let assistantResponse = data.content[0].text;
        
        // Add assistant message to context
        const assistantMessage = { role: 'assistant', content: assistantResponse };
        context.addMessage(assistantMessage);
        
        console.log(`✅ Enhanced response sent (${memoryResults.length} memory operations processed)`);
        res.json({
            content: [{ type: 'text', text: assistantResponse }],
            has_more_chunks: false,
            memory_operations: memoryResults.length,
            session_info: {
                constraints_detected: context.userConstraints.size,
                messages_in_context: context.messages.length
            }
        });
        
    } catch (error) {
        console.error('❌ Enhanced Claude error:', error);
        res.status(500).json({ error: 'Failed to communicate with Claude' });
    }
});

// NEW: Enhanced completion endpoint that handles recurring tasks
app.post('/api/memories/:id/complete', auth, async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.user.userId;
        const { completion_date } = req.body;
        
        console.log(`🎯 Completing item ${itemId} for user ${userId}`);
        
        // Verify item belongs to user
        const checkResult = await db.query(
            'SELECT * FROM memories WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found or access denied' });
        }
        
        // Handle completion with recurring logic
        const completedItem = await recurringManager.handleItemCompletion(
            itemId, 
            userId, 
            completion_date ? new Date(completion_date) : new Date()
        );
        
        res.json({
            message: 'Item completed successfully',
            item: completedItem,
            isRecurring: !!(completedItem.frequency && completedItem.frequency.trim()),
            nextDue: completedItem.due
        });
        
    } catch (error) {
        console.error('❌ Completion error:', error);
        res.status(500).json({ error: 'Failed to complete item' });
    }
});

// NEW: Get next conversation chunk
app.get('/api/claude/next-chunk', auth, (req, res) => {
    try {
        const userId = req.user.userId;
        const chunks = conversationChunks.get(userId);
        
        if (!chunks || chunks.length === 0) {
            return res.json({
                content: null,
                has_more_chunks: false
            });
        }
        
        const nextChunk = chunks.shift();
        conversationChunks.set(userId, chunks);
        
        res.json({
            content: [{ type: 'text', text: nextChunk }],
            has_more_chunks: chunks.length > 0
        });
        
    } catch (error) {
        console.error('Error getting next chunk:', error);
        res.status(500).json({ error: 'Failed to get next chunk' });
    }
});

// MEMORY endpoints
app.get('/api/memories', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const { type, limit = 50, include_completed = 'false' } = req.query;
        
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [req.user.userId];
        let paramIndex = 2;
        
        if (type && memoriesTableColumns.includes('type')) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        // By default, exclude completed items unless specifically requested
        if (include_completed !== 'true' && memoriesTableColumns.includes('status')) {
            query += ` AND (status != 'completed' OR status IS NULL)`;
        }
        
        // Order by available columns
        if (memoriesTableColumns.includes('priority')) {
            query += ' ORDER BY priority DESC, id DESC';
        } else {
            query += ' ORDER BY id DESC';
        }
        
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
        
        const result = await db.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Get memories error:', error);
        res.status(500).json({ error: 'Failed to get memories' });
    }
});

// NEW: Get today's priority cards
app.get('/api/memories/today', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        let query = `
            SELECT * FROM memories 
            WHERE user_id = $1 
            AND (
                due <= $2 
                OR priority >= 4 
                OR status = 'active'
                OR (type = 'routine' AND status != 'completed')
            )
            ORDER BY priority DESC, due ASC
            LIMIT 50
        `;
        
        // Adapt query based on available columns
        if (!memoriesTableColumns.includes('due')) {
            query = `
                SELECT * FROM memories 
                WHERE user_id = $1 
                AND (
                    priority >= 4 
                    OR status = 'active'
                    OR (type = 'routine' AND status != 'completed')
                )
                ORDER BY priority DESC, id DESC
                LIMIT 50
            `;
        }
        
        const params = memoriesTableColumns.includes('due') ? [req.user.userId, today] : [req.user.userId];
        const result = await db.query(query, params);
        
        console.log(`✅ Found ${result.rows.length} items for today`);
        res.json(result.rows);
        
    } catch (error) {
        console.error('❌ Get today memories error:', error);
        res.status(500).json({ error: 'Failed to get today\'s items' });
    }
});

app.post('/api/memories', auth, async (req, res) => {
    try {
        const { type, content, ...additionalData } = req.body;
        const userId = req.user.userId;
        
        if (!type || !content) {
            return res.status(400).json({ error: 'Type and content are required' });
        }
        
        const success = await storeMemory(userId, type, content, additionalData);
        
        if (success) {
            res.status(201).json({ message: 'Memory stored successfully' });
        } else {
            res.status(500).json({ error: 'Failed to store memory' });
        }
    } catch (error) {
        console.error('❌ Store memory error:', error);
        res.status(500).json({ error: 'Failed to store memory' });
    }
});

// DELETE memory endpoint
app.delete('/api/memories/:id', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const memoryId = req.params.id;
        const userId = req.user.userId;
        
        // Verify memory belongs to user before deleting
        const checkResult = await db.query(
            'SELECT id FROM memories WHERE id = $1 AND user_id = $2',
            [memoryId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Memory not found or access denied' });
        }
        
        // Delete the memory
        const deleteResult = await db.query(
            'DELETE FROM memories WHERE id = $1 AND user_id = $2',
            [memoryId, userId]
        );
        
        if (deleteResult.rowCount > 0) {
            console.log(`🗑️ Memory deleted: ID ${memoryId} for user ${userId}`);
            res.json({ message: 'Memory deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete memory' });
        }
        
    } catch (error) {
        console.error('❌ Delete memory error:', error);
        res.status(500).json({ error: 'Failed to delete memory' });
    }
});

// GET specific memory details
app.get('/api/memories/:id', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const memoryId = req.params.id;
        const userId = req.user.userId;
        
        const result = await db.query(
            'SELECT * FROM memories WHERE id = $1 AND user_id = $2',
            [memoryId, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Memory not found' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('❌ Get memory error:', error);
        res.status(500).json({ error: 'Failed to get memory' });
    }
});

// ENHANCED UPDATE MEMORY ENDPOINT WITH FIXED ID HANDLING AND DATA TYPE PROCESSING
app.put('/api/memories/:id', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        // FIXED: Convert ID to integer to ensure proper type matching
        const memoryId = parseInt(req.params.id);
        if (isNaN(memoryId)) {
            return res.status(400).json({ error: 'Invalid item ID format' });
        }
        
        const userId = req.user.userId;
        const updateData = req.body;
        
        console.log(`🔄 UPDATE REQUEST - ID: ${memoryId}, User: ${userId}`);
        console.log('📝 Update data received:', updateData);
        console.log('📋 Available columns:', memoriesTableColumns);
        
        // Verify memory belongs to user before updating
        const checkResult = await db.query(
            'SELECT * FROM memories WHERE id = $1 AND user_id = $2',
            [memoryId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            console.log('❌ Memory not found or access denied');
            return res.status(404).json({ error: 'Memory not found or access denied' });
        }
        
        const currentItem = checkResult.rows[0];
        console.log('✅ Current item found:', currentItem.content_short || 'No title');
        
        // ENHANCED: Data type conversion and validation
        const processedData = {};
        let validFieldCount = 0;
        
        Object.entries(updateData).forEach(([key, value]) => {
            // Skip system fields
            if (['id', 'user_id', 'created_at'].includes(key)) {
                console.log(`⏭️ Skipping system field: ${key}`);
                return;
            }
            
            // Check if field exists in table
            if (!memoriesTableColumns.includes(key)) {
                console.log(`⚠️ Field ${key} not in table columns, skipping`);
                return;
            }
            
            // Process the value based on field type
            let processedValue = processValueByType(key, value);
            
            if (processedValue !== undefined) {
                processedData[key] = processedValue;
                validFieldCount++;
                console.log(`✅ Processed ${key}: ${processedValue} (type: ${typeof processedValue})`);
            } else {
                console.log(`⚠️ Skipped ${key}: invalid value ${value}`);
            }
        });
        
        console.log(`📊 Processed ${validFieldCount} valid fields out of ${Object.keys(updateData).length} provided`);
        
        if (validFieldCount === 0) {
            return res.status(400).json({ 
                error: 'No valid fields to update',
                availableFields: memoriesTableColumns.filter(col => !['id', 'user_id', 'created_at'].includes(col))
            });
        }
        
        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        Object.entries(processedData).forEach(([key, value]) => {
            // Skip modified field here if it exists - we'll handle it separately
            if (key === 'modified' && memoriesTableColumns.includes('modified')) {
                return; // Skip this iteration
            }
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(value);
            paramIndex++;
        });
        
        // Add modified timestamp if column exists (always use CURRENT_DATE)
        if (memoriesTableColumns.includes('modified')) {
            updateFields.push(`modified = CURRENT_DATE`);
        }
        
        // Add WHERE clause parameters
        updateValues.push(memoryId, userId);
        
        const query = `
            UPDATE memories 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *
        `;
        
        console.log('🔧 Update query:', query);
        console.log('📝 Update values:', updateValues);
        
        const result = await db.query(query, updateValues);
        
        if (result.rowCount > 0) {
            const updatedItem = result.rows[0];
            console.log(`✅ Memory updated successfully: ID ${memoryId}`);
            console.log('📋 Updated item:', updatedItem.content_short || 'No title');
            
            // Handle recurring tasks if the item was completed
            if (processedData.status === 'completed' && updatedItem.frequency && updatedItem.frequency.trim() !== '') {
                console.log(`🔄 Triggering recurring update for completed item ${memoryId}`);
                setTimeout(() => recurringManager.triggerDueCheck(), 1000);
            }
            
            res.json(updatedItem);
        } else {
            console.log('❌ Update failed - no rows affected');
            res.status(500).json({ error: 'Failed to update memory - no changes made' });
        }
        
    } catch (error) {
        console.error('❌ Update memory error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            memoryId: req.params.id,
            userId: req.user?.userId
        });
        res.status(500).json({ 
            error: 'Failed to update memory',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// NEW: Recurring task management endpoints

// Get recurring task manager status
app.get('/api/system/recurring-status', auth, async (req, res) => {
    try {
        const status = recurringManager.getStatus();
        const statistics = await recurringManager.getStatistics();
        
        res.json({
            system: status,
            statistics: statistics,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting recurring status:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Manual trigger endpoints (for testing/debugging)
app.post('/api/system/trigger-due-check', auth, async (req, res) => {
    try {
        await recurringManager.triggerDueCheck();
        res.json({ message: 'Due date check triggered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger due check' });
    }
});

app.post('/api/system/trigger-maintenance', auth, async (req, res) => {
    try {
        await recurringManager.triggerMaintenance();
        res.json({ message: 'Maintenance triggered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger maintenance' });
    }
});

app.post('/api/system/trigger-cleanup', auth, async (req, res) => {
    try {
        await recurringManager.triggerCleanup();
        res.json({ message: 'Cleanup triggered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger cleanup' });
    }
});

// NEW: Recurring items dashboard endpoint
app.get('/api/memories/recurring-dashboard', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get all recurring items with their status
        const recurringQuery = `
            SELECT 
                id,
                content_short,
                content,
                type,
                frequency,
                due,
                status,
                performance_streak,
                completed_date,
                last_recurring_update,
                priority
            FROM memories 
            WHERE user_id = $1 
            AND frequency IS NOT NULL 
            AND frequency != ''
            AND status != 'archived'
            ORDER BY 
                CASE WHEN due < CURRENT_DATE THEN 0 ELSE 1 END,
                due ASC,
                priority DESC
        `;
        
        const result = await db.query(recurringQuery, [userId]);
        
        // Parse and categorize the items
        const categorized = {
            overdue: [],
            dueToday: [],
            dueThisWeek: [],
            upcoming: [],
            completed: []
        };
        
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        result.rows.forEach(item => {
            const dueDate = item.due ? new Date(item.due) : null;
            
            if (item.status === 'completed') {
                categorized.completed.push(item);
            } else if (dueDate) {
                if (dueDate < today) {
                    categorized.overdue.push(item);
                } else if (dueDate.toDateString() === today.toDateString()) {
                    categorized.dueToday.push(item);
                } else if (dueDate <= weekFromNow) {
                    categorized.dueThisWeek.push(item);
                } else {
                    categorized.upcoming.push(item);
                }
            } else {
                categorized.upcoming.push(item);
            }
        });
        
        res.json({
            categories: categorized,
            summary: {
                total: result.rows.length,
                overdue: categorized.overdue.length,
                dueToday: categorized.dueToday.length,
                dueThisWeek: categorized.dueThisWeek.length,
                avgStreak: result.rows.reduce((sum, item) => sum + (item.performance_streak || 0), 0) / result.rows.length
            }
        });
        
    } catch (error) {
        console.error('❌ Recurring dashboard error:', error);
        res.status(500).json({ error: 'Failed to get recurring dashboard' });
    }
});

// SESSION management
app.post('/api/clear-session', auth, (req, res) => {
    try {
        const userId = req.user.userId;
        conversationContexts.delete(userId); // Use enhanced contexts
        conversationChunks.delete(userId); // Clear conversation chunks too
        console.log(`🧹 Enhanced session cleared for user: ${userId}`);
        res.json({ message: 'Session cleared successfully' });
    } catch (error) {
        console.error('❌ Clear session error:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

app.get('/api/session-info', auth, (req, res) => {
    try {
        const userId = req.user.userId;
        const context = conversationContexts.get(userId);
        
        if (!context) {
            return res.json({ 
                hasSession: false,
                messageCount: 0
            });
        }
        
        res.json({
            hasSession: true,
            messageCount: context.messages.length,
            sessionId: context.sessionId,
            startTime: context.startTime,
            lastActivity: context.lastActivity,
            constraintsDetected: context.userConstraints.size,
            currentTopic: context.currentTopic
        });
    } catch (error) {
        console.error('❌ Session info error:', error);
        res.status(500).json({ error: 'Failed to get session info' });
    }
});

// Debug endpoint
app.get('/api/debug/schema', (req, res) => {
    res.json({
        memoriesTableColumns,
        totalColumns: memoriesTableColumns.length,
        hasTypeColumn: memoriesTableColumns.includes('type'),
        hasContentColumn: memoriesTableColumns.includes('content'),
        hasPriorityColumn: memoriesTableColumns.includes('priority'),
        hasFrequencyColumn: memoriesTableColumns.includes('frequency'),
        hasCompletedDateColumn: memoriesTableColumns.includes('completed_date'),
        hasPerformanceStreakColumn: memoriesTableColumns.includes('performance_streak'),
        databaseConnected: isDbConnected,
        recurringManagerStatus: recurringManager.getStatus()
    });
});

// ENHANCED: Debug endpoint for troubleshooting edits
app.get('/api/debug/memory/:id', auth, async (req, res) => {
    try {
        const memoryId = parseInt(req.params.id);
        const userId = req.user.userId;
        
        const result = await db.query(
            'SELECT * FROM memories WHERE id = $1 AND user_id = $2',
            [memoryId, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Memory not found' });
        }
        
        const memory = result.rows[0];
        
        res.json({
            memory: memory,
            schema: {
                availableColumns: memoriesTableColumns,
                totalColumns: memoriesTableColumns.length
            },
            analysis: {
                hasContent: !!memory.content,
                hasType: !!memory.type,
                hasPriority: memory.priority !== null,
                hasStatus: !!memory.status,
                memoryId: memoryId,
                memoryIdType: typeof memoryId,
                userId: userId
            }
        });
        
    } catch (error) {
        console.error('Debug memory error:', error);
        res.status(500).json({ error: 'Debug failed', details: error.message });
    }
});

// Enhanced API Features for Planning
app.get('/api/memories/planning/:timeframe', auth, async (req, res) => {
    try {
        const { timeframe } = req.params;
        const { focus, priority_min } = req.query;
        const userId = req.user.userId;
        
        console.log('🔍 Planning query:', { timeframe, focus, priority_min, userId });
        
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [userId];
        let paramIndex = 2;
        
        // Time-based filtering
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
        
        if (timeframe === 'today') {
            if (memoriesTableColumns.includes('due')) {
                query += ` AND (due = $${paramIndex} OR due < $${paramIndex})`;
                params.push(today);
                paramIndex++;
            }
        } else if (timeframe === 'tomorrow') {
            if (memoriesTableColumns.includes('due')) {
                query += ` AND due = $${paramIndex}`;
                params.push(tomorrow);
                paramIndex++;
            }
        }
        
        // Focus-based filtering
        if (focus === 'routines' && memoriesTableColumns.includes('type')) {
            query += ` AND type = $${paramIndex}`;
            params.push('routine');
            paramIndex++;
        } else if (focus === 'priorities' && memoriesTableColumns.includes('priority')) {
            const minPriority = priority_min || '4';
            query += ` AND priority >= $${paramIndex}`;
            params.push(minPriority);
            paramIndex++;
        }
        
        // Filter for active items
        if (memoriesTableColumns.includes('status')) {
            query += ` AND (status = 'active' OR status IS NULL)`;
        }
        
        // Order by relevance
        if (memoriesTableColumns.includes('priority')) {
            query += ' ORDER BY priority DESC, id DESC';
        } else {
            query += ' ORDER BY id DESC';
        }
        
        query += ' LIMIT 50'; // Reasonable limit for planning
        
        const result = await db.query(query, params);
        
        console.log(`✅ Found ${result.rows.length} memories for planning`);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get planning memories error:', error);
        res.status(500).json({ error: 'Failed to get planning memories' });
    }
});

// Enhanced memories endpoint with better filtering
app.get('/api/memories/enhanced', auth, async (req, res) => {
    try {
        const { 
            type, 
            status, 
            priority_min, 
            has_due_date, 
            search, 
            limit = 50,
            offset = 0,
            sort_by = 'priority',
            sort_order = 'desc',
            exclude_completed = 'false'
        } = req.query;
        
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [req.user.userId];
        let paramIndex = 2;
        
        // Type filter
        if (type && memoriesTableColumns.includes('type')) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        // Status filter
        if (status && memoriesTableColumns.includes('status')) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        } else if (exclude_completed === 'true' && memoriesTableColumns.includes('status')) {
            // Exclude completed items by default for the main feed
            query += ` AND (status != 'completed' OR status IS NULL)`;
        }
        
        // Priority filter
        if (priority_min && memoriesTableColumns.includes('priority')) {
            query += ` AND priority >= $${paramIndex}`;
            params.push(priority_min);
            paramIndex++;
        }
        
        // Due date filter
        if (has_due_date === 'true' && memoriesTableColumns.includes('due')) {
            query += ` AND due IS NOT NULL`;
        } else if (has_due_date === 'false' && memoriesTableColumns.includes('due')) {
            query += ` AND due IS NULL`;
        }
        
        // Search filter
        if (search) {
            const searchConditions = [];
            if (memoriesTableColumns.includes('content')) {
                searchConditions.push(`content ILIKE $${paramIndex}`);
            }
            if (memoriesTableColumns.includes('content_short')) {
                searchConditions.push(`content_short ILIKE $${paramIndex}`);
            }
            if (memoriesTableColumns.includes('notes')) {
                searchConditions.push(`notes ILIKE $${paramIndex}`);
            }
            
            if (searchConditions.length > 0) {
                query += ` AND (${searchConditions.join(' OR ')})`;
                params.push(`%${search}%`);
                paramIndex++;
            }
        }
        
        // Sorting
        const validSortColumns = ['priority', 'created_at', 'modified', 'due', 'id'];
        const sortColumn = validSortColumns.includes(sort_by) && memoriesTableColumns.includes(sort_by) 
                          ? sort_by : 'id';
        const sortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
        
        // Pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM memories WHERE user_id = $1';
        let countParams = [req.user.userId];
        
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            memories: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });
        
    } catch (error) {
        console.error('Enhanced memories query error:', error);
        res.status(500).json({ error: 'Failed to get enhanced memories' });
    }
});

// ===== STATIC FILES SERVING =====

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve test files in development
if (process.env.NODE_ENV !== 'production') {
    app.use('/test', express.static(__dirname));
}

// ✅ SMART CATCH-ALL ROUTE:
app.get('*', (req, res, next) => {
    // Don't intercept requests for static assets (files with extensions)
    if (req.path.includes('.')) {
        // Let express.static handle it, or return 404 if not found
        return res.status(404).json({ 
            error: 'File not found',
            path: req.path,
            message: 'Static asset not found in public directory'
        });
    }
    
    // Only serve SPA for routes without file extensions
    console.log(`📄 Serving SPA for route: ${req.path}`);
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Clean up conversation chunks periodically
setInterval(() => {
    for (const [userId, chunks] of conversationChunks.entries()) {
        if (chunks.length === 0) {
            conversationChunks.delete(userId);
        }
    }
    
    // Clean up expired feed caches
    if (feedManager.clearExpiredCaches) {
        feedManager.clearExpiredCaches();
    }
}, 60000); // Clean up every minute

// NEW: Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, stopping background processes...');
    recurringManager.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, stopping background processes...');
    recurringManager.stop();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 MindOS server running on port ${PORT}`);
    console.log(`📊 Database: ${isDbConnected ? 'Connected' : 'Disconnected'}`);
    console.log('🤖 Claude: Ready with Enhanced Multi-Memory Detection');
    
    // Check Claude API Key
    console.log(`🔑 CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
    if (process.env.CLAUDE_API_KEY) {
        console.log(`🔑 API Key length: ${process.env.CLAUDE_API_KEY.length} characters`);
        console.log(`🔑 API Key preview: ${process.env.CLAUDE_API_KEY.substring(0, 20)}...`);
    }
    
    console.log('🧠 Session Storage: Enhanced Context Management Active');
    console.log('🔒 Constraint Tracking: User constraints detected and preserved');
    console.log('🗑️ Memory Management: Enhanced UPDATE/CREATE detection');
    console.log(`📋 Memory table columns: ${memoriesTableColumns.length} found`);
    console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
    console.log('🌐 Health check available at /health');
    console.log('✅ Multi-memory operation parsing enabled');
    console.log('🎯 Config module input parsing enabled');
    console.log('⚡ Mathematical constraint reasoning active');
    console.log('🔍 Enhanced conversation context with constraint extraction');
    console.log('🔧 FIXED: Message cleaning for Claude API compatibility');
    console.log('📱 Card interface endpoint: /api/memories/today active');
    console.log('🔄 NEW: Recurring Task Manager with Smart Text Parsing');
    console.log('📅 NEW: Automatic due date management and routine scheduling');
    console.log('🧹 NEW: Automated database maintenance and cleanup');
    console.log('📊 NEW: Enhanced analytics and recurring task dashboard');
    console.log('⚙️ NEW: Background processes running for recurring task management');
    console.log('🔧 FIXED: Edit functionality with proper ID type conversion and data processing');
    
    // Log recurring manager status
    const recurringStatus = recurringManager.getStatus();
    console.log(`🔄 Recurring Manager: ${recurringStatus.isRunning ? 'RUNNING' : 'STOPPED'}`);
    console.log(`📝 Active Processes: ${recurringStatus.processes.join(', ')}`);
});
