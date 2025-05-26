// ENHANCED MINDOS SERVER.JS - Smart Memory Operations & Conversation Chunking
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

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

// Test database connection and get schema info
let memoriesTableColumns = [];
let isDbConnected = false;

// In-memory conversation storage
const activeConversations = new Map();
const conversationChunks = new Map(); // Store chunked responses by userId

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

// Initialize database connection
initializeDatabase();

// Health check endpoint - ADDED FIRST
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: isDbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
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

// MindOS System Prompt (keeping your existing one)
const MINDOS_SYSTEM_PROMPT = `You are MindOS, a personal AI assistant designed to help users manage their lives, routines, and goals. 

Your capabilities:
- Remember important information across conversations within this session
- Help users plan their day, set routines, and achieve goals
- Store important information as memories for future reference
- Be proactive in suggesting improvements and optimizations

Your personality:
- Helpful and proactive
- Focus on productivity and well-being
- Remember context and user preferences
- Professional but friendly

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

// Helper function to get conversation session
function getConversationSession(userId) {
    if (!activeConversations.has(userId)) {
        activeConversations.set(userId, {
            messages: [],
            sessionId: uuidv4(),
            startTime: new Date(),
            lastActivity: new Date()
        });
    }
    
    const session = activeConversations.get(userId);
    session.lastActivity = new Date();
    return session;
}

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

// NEW: Find matching memory for updates
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

// NEW: Update existing memory
async function updateExistingMemory(memoryId, type, content, additionalData) {
    try {
        // Determine what to update based on content
        const updateData = {};
        const contentLower = content.toLowerCase();
        
        // For completion/progress updates
        if (['completed', 'finished', 'done', 'did'].some(word => contentLower.includes(word))) {
            updateData.status = 'completed';
            
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
        return true;
        
    } catch (error) {
        console.error('❌ Error updating existing memory:', error);
        return false;
    }
}

// NEW: Create new memory (extracted from original storeMemory)
async function createNewMemory(userId, type, content, additionalData) {
    try {
        if (memoriesTableColumns.length === 0) {
            console.log('⚠️ No memory table columns found, skipping storage');
            return false;
        }
        
        const baseData = { user_id: userId };
        
        if (memoriesTableColumns.includes('type')) baseData.type = type;
        if (memoriesTableColumns.includes('content')) baseData.content = content;
        
        Object.entries(additionalData).forEach(([key, value]) => {
            if (memoriesTableColumns.includes(key) && value !== null && value !== undefined) {
                baseData[key] = value;
            }
        });
        
        if (memoriesTableColumns.includes('content_short') && !baseData.content_short) {
            baseData.content_short = content.length > 100 ? content.substring(0, 97) + "..." : content;
        }
        
        if (memoriesTableColumns.includes('priority') && !baseData.priority) baseData.priority = 1;
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
        
        await db.query(query, values);
        
        const summary = baseData.content_short || content.substring(0, 50);
        console.log(`✅ New memory created: [${type}] ${summary}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error creating new memory:', error);
        return false;
    }
}

// ENHANCED storeMemory function with UPDATE detection
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

// ENHANCED analyzeUserInput function for multi-memory detection
async function analyzeUserInput(userInput, userId) {
    try {
        // Get user's existing memories for context
        const existingMemories = await db.query(
            'SELECT id, type, content, content_short, routine_type, status FROM memories WHERE user_id = $1 AND status != $2 ORDER BY created_at DESC LIMIT 20',
            [userId, 'archived']
        );
        
        const analysisPrompt = `Analyze this user input for memory operations:

User Input: "${userInput}"

Existing Memories Context:
${existingMemories.rows.map(m => `ID:${m.id} [${m.type}] ${m.content_short || m.content?.substring(0, 80)} (${m.status})`).join('\n')}

Return ONLY a JSON array of memory operations in this format:
[
  {
    "operation": "update|create",
    "existing_id": number|null,
    "type": "goal|routine|preference|insight|event",
    "content": "description",
    "data": {"status": "completed|active", "other_field": "value"},
    "confidence": 0.8
  }
]

Rules:
1. If user mentions completing/doing something that matches existing memory → "update"
2. If user mentions new things → "create"
3. Look for multiple items in one message
4. Match routines by keywords like "morning", "evening", "workout"
5. Only include operations with confidence > 0.6

Examples:
- "I did my morning routine" → UPDATE existing morning routine
- "I need to call mom" → CREATE new task
- "Finished workout, need groceries" → UPDATE workout + CREATE grocery task`;

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
                messages: [{ role: 'user', content: analysisPrompt }]
            })
        });

        const data = await response.json();
        const analysisText = data.content[0].text;
        
        // Extract JSON from response
        const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const operations = JSON.parse(jsonMatch[0]);
            console.log(`🧠 Detected ${operations.length} memory operations`);
            return operations.filter(op => op.confidence > 0.6);
        }
        
        return [];
    } catch (error) {
        console.error('Error analyzing user input:', error);
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

// ENHANCED CLAUDE endpoint with multi-memory and chunking
app.post('/api/claude', auth, async (req, res) => {
    console.log('🤖 Enhanced Claude request from user:', req.user.userId);
    
    try {
        const { messages, request_chunks = false } = req.body;
        const userId = req.user.userId;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        
        const session = getConversationSession(userId);
        const userMessage = messages[messages.length - 1];
        session.messages.push(userMessage);
        
        // STEP 1: Analyze input for memory operations
        const memoryOperations = await analyzeUserInput(userMessage.content, userId);
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
        
        // STEP 3: Generate contextual response
        const memoryContext = await buildMemoryContext(userId);
        
        // Create memory-aware system prompt
        let systemPrompt = `${MINDOS_SYSTEM_PROMPT}

User Context:
${memoryContext}

Session started: ${session.startTime.toLocaleString()}

IMPORTANT INSTRUCTIONS:
1. Keep responses conversational and concise (1-3 sentences max)
2. Ask follow-up questions naturally
3. Acknowledge completed tasks positively
4. Be supportive and encouraging
5. Don't repeat memory storage information - I handle that automatically`;

        // Add memory operation context
        if (memoryResults.length > 0) {
            const updates = memoryResults.filter(r => r.type === 'update' && r.success);
            const creates = memoryResults.filter(r => r.type === 'create' && r.success);
            
            if (updates.length > 0) {
                systemPrompt += `\n\nI just updated ${updates.length} memory(ies) for completed tasks. Acknowledge this positively.`;
            }
            if (creates.length > 0) {
                systemPrompt += `\n\nI just stored ${creates.length} new memory(ies). Briefly acknowledge this.`;
            }
        }
        
        // STEP 4: Get Claude response
        const claudeRequestBody = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300, // Shorter responses
            system: systemPrompt,
            messages: session.messages.slice(-10) // Last 10 messages for context
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
        
        // STEP 5: Handle chunking
        if (request_chunks || assistantResponse.length > 200) {
            const chunks = chunkResponse(assistantResponse);
            
            if (chunks.length > 1) {
                // Store chunks for this user
                conversationChunks.set(userId, chunks.slice(1)); // Store remaining chunks
                
                // Return first chunk with indication of more
                return res.json({
                    content: [{ type: 'text', text: chunks[0] }],
                    has_more_chunks: true,
                    total_chunks: chunks.length,
                    memory_operations: memoryResults.length
                });
            }
        }
        
        // STEP 6: Standard response
        const assistantMessage = { role: 'assistant', content: assistantResponse };
        session.messages.push(assistantMessage);
        
        if (session.messages.length > 20) {
            session.messages = session.messages.slice(-20);
        }
        
        console.log(`✅ Response sent (${memoryResults.length} memory operations processed)`);
        res.json({
            content: [{ type: 'text', text: assistantResponse }],
            has_more_chunks: false,
            memory_operations: memoryResults.length
        });
        
    } catch (error) {
        console.error('❌ Enhanced Claude error:', error);
        res.status(500).json({ error: 'Failed to communicate with Claude' });
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
        
        const { type, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [req.user.userId];
        let paramIndex = 2;
        
        if (type && memoriesTableColumns.includes('type')) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
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

// UPDATE memory endpoint
app.put('/api/memories/:id', auth, async (req, res) => {
    try {
        if (!isDbConnected) {
            return res.status(500).json({ error: 'Database temporarily unavailable' });
        }
        
        const memoryId = req.params.id;
        const userId = req.user.userId;
        const updateData = req.body;
        
        // Verify memory belongs to user
        const checkResult = await db.query(
            'SELECT id FROM memories WHERE id = $1 AND user_id = $2',
            [memoryId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Memory not found or access denied' });
        }
        
        // Build update query dynamically based on provided fields and existing columns
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        Object.entries(updateData).forEach(([key, value]) => {
            if (memoriesTableColumns.includes(key) && key !== 'id' && key !== 'user_id') {
                updateFields.push(`${key} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        // Add modified timestamp if column exists
        if (memoriesTableColumns.includes('modified')) {
            updateFields.push(`modified = CURRENT_DATE`);
        }
        
        updateValues.push(memoryId, userId);
        
        const query = `
            UPDATE memories 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *
        `;
        
        const result = await db.query(query, updateValues);
        
        if (result.rowCount > 0) {
            console.log(`✏️ Memory updated: ID ${memoryId} for user ${userId}`);
            res.json(result.rows[0]);
        } else {
            res.status(500).json({ error: 'Failed to update memory' });
        }
        
    } catch (error) {
        console.error('❌ Update memory error:', error);
        res.status(500).json({ error: 'Failed to update memory' });
    }
});

// SESSION management
app.post('/api/clear-session', auth, (req, res) => {
    try {
        const userId = req.user.userId;
        activeConversations.delete(userId);
        console.log(`🧹 Session cleared for user: ${userId}`);
        res.json({ message: 'Session cleared successfully' });
    } catch (error) {
        console.error('❌ Clear session error:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

app.get('/api/session-info', auth, (req, res) => {
    try {
        const userId = req.user.userId;
        const session = activeConversations.get(userId);
        
        if (!session) {
            return res.json({ 
                hasSession: false,
                messageCount: 0
            });
        }
        
        res.json({
            hasSession: true,
            messageCount: session.messages.length,
            sessionId: session.sessionId,
            startTime: session.startTime,
            lastActivity: session.lastActivity
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
        databaseConnected: isDbConnected
    });
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
            sort_order = 'desc'
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

// Catch-all route for SPA - THIS MUST BE LAST!
app.get('*', (req, res) => {
    console.log(`📄 Serving static file for: ${req.path}`);
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
}, 60000); // Clean up every minute

// Start server
app.listen(PORT, () => {
    console.log(`🚀 MindOS server running on port ${PORT}`);
    console.log(`📊 Database: ${isDbConnected ? 'Connected' : 'Disconnected'}`);
    console.log('🤖 Claude: Ready with Smart Memory Management');
    console.log('🧠 Session Storage: Active with Conversation Chunking');
    console.log('🗑️ Memory Management: Enhanced UPDATE/CREATE detection');
    console.log(`📋 Memory table columns: ${memoriesTableColumns.length} found`);
    console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
    console.log('🌐 Health check available at /health');
    console.log('✅ Enhanced memory operations and conversation chunking loaded');
});
