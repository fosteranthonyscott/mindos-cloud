// FIXED SERVER.JS - Enhanced with better error handling and routing
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

// In-memory conversation storage
const activeConversations = new Map();

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

// ADAPTIVE storeMemory function - only uses existing columns
async function storeMemory(userId, type, content, additionalData = {}) {
    if (!isDbConnected) {
        console.log('⚠️ Database not connected, skipping memory storage');
        return false;
    }
    
    try {
        if (memoriesTableColumns.length === 0) {
            console.log('⚠️ No memory table columns found, skipping storage');
            return false;
        }
        
        // Build query dynamically based on available columns
        const baseData = { user_id: userId };
        
        // Add data for columns that exist
        if (memoriesTableColumns.includes('type')) baseData.type = type;
        if (memoriesTableColumns.includes('content')) baseData.content = content;
        
        // Add additional data only for existing columns
        Object.entries(additionalData).forEach(([key, value]) => {
            if (memoriesTableColumns.includes(key) && value !== null && value !== undefined) {
                baseData[key] = value;
            }
        });
        
        // Generate short content if column exists but not provided
        if (memoriesTableColumns.includes('content_short') && !baseData.content_short) {
            baseData.content_short = content.length > 100 ? content.substring(0, 97) + "..." : content;
        }
        
        // Set default values for common columns
        if (memoriesTableColumns.includes('priority') && !baseData.priority) baseData.priority = 1;
        if (memoriesTableColumns.includes('status') && !baseData.status) baseData.status = 'active';
        if (memoriesTableColumns.includes('performance_streak') && !baseData.performance_streak) {
            baseData.performance_streak = 0;
        }
        
        // Build the INSERT query
        const columns = Object.keys(baseData);
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const values = Object.values(baseData);
        
        const query = `
            INSERT INTO memories (${columns.join(', ')}) 
            VALUES (${placeholders.join(', ')})
        `;
        
        await db.query(query, values);
        
        const summary = baseData.content_short || content.substring(0, 50);
        console.log(`✅ Memory stored: [${type}] ${summary}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error storing memory:', error);
        return false;
    }
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

// CLAUDE endpoint - adaptive to existing schema
app.post('/api/claude', auth, async (req, res) => {
    console.log('🤖 Claude request from user:', req.user.userId);
    
    try {
        const { messages } = req.body;
        const userId = req.user.userId;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        
        const session = getConversationSession(userId);
        const userMessage = messages[messages.length - 1];
        session.messages.push(userMessage);
        
        const memoryContext = await buildMemoryContext(userId);
        
        const enhancedSystemPrompt = `${MINDOS_SYSTEM_PROMPT}

User Context:
${memoryContext}

Session started: ${session.startTime.toLocaleString()}`;
        
        // Create adaptive tool schema based on available columns
        const toolProperties = {
            type: {
                type: "string",
                enum: ["goal", "routine", "preference", "insight", "event", "system"],
                description: "The category of memory to store"
            },
            content: {
                type: "string",
                description: "The full content of the memory"
            }
        };
        
        // Add properties for columns that exist
        const optionalFields = [
            'content_short', 'priority', 'performance_rate', 'performance_streak',
            'due', 'stage', 'trigger', 'status', 'energy_requirements', 'required_time',
            'search_query', 'success_criteria', 'notes', 'location', 'weather',
            'mood', 'resources', 'emotion', 'shoppingideas'
        ];
        
        optionalFields.forEach(field => {
            if (memoriesTableColumns.includes(field)) {
                switch (field) {
                    case 'priority':
                        toolProperties[field] = {
                            type: "integer", minimum: 1, maximum: 5,
                            description: "Priority level (1-5, 5 being highest)"
                        };
                        break;
                    case 'performance_rate':
                        toolProperties[field] = {
                            type: "number", minimum: 0, maximum: 1,
                            description: "Success rate as decimal (0.0-1.0)"
                        };
                        break;
                    case 'performance_streak':
                        toolProperties[field] = {
                            type: "integer", minimum: 0,
                            description: "Current streak count in days"
                        };
                        break;
                    default:
                        toolProperties[field] = {
                            type: "string",
                            description: `${field.replace(/_/g, ' ')}`
                        };
                }
            }
        });
        
        const claudeRequestBody = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            system: enhancedSystemPrompt,
            messages: session.messages,
            tools: [
                {
                    name: "storeMemory",
                    description: "Store important information as a memory",
                    input_schema: {
                        type: "object",
                        properties: toolProperties,
                        required: ["type", "content"]
                    }
                }
            ]
        };
        
        if (!process.env.CLAUDE_API_KEY) {
            throw new Error('Claude API key not configured');
        }
        
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
        
        if (data.content) {
            for (const content of data.content) {
                if (content.type === 'tool_use' && content.name === 'storeMemory') {
                    const { type, content: memoryContent, ...additionalData } = content.input;
                    await storeMemory(userId, type, memoryContent, additionalData);
                }
            }
        }
        
        const assistantMessage = { role: 'assistant', content: data.content[0].text };
        session.messages.push(assistantMessage);
        
        if (session.messages.length > 20) {
            session.messages = session.messages.slice(-20);
        }
        
        console.log('✅ Claude response sent successfully');
        res.json(data);
        
    } catch (error) {
        console.error('❌ Claude error:', error);
        res.status(500).json({ error: 'Failed to communicate with Claude' });
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

// ===== STATIC FILES SERVING - MOVED TO END =====

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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 MindOS server running on port ${PORT}`);
    console.log(`📊 Database: ${isDbConnected ? 'Connected' : 'Disconnected'}`);
    console.log('🤖 Claude: Ready with Adaptive Memory Management');
    console.log('🧠 Session Storage: Active');
    console.log('🗑️ Memory Management: DELETE/UPDATE endpoints active');
    console.log(`📋 Memory table columns: ${memoriesTableColumns.length} found`);
    console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
    console.log('🌐 Health check available at /health');
});

// Enhanced API Features for Planning - Add these to your server.js

// NEW: Get memories filtered by planning criteria
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

// NEW: Tag memories for planning
app.post('/api/memories/tag-for-planning', auth, async (req, res) => {
    try {
        const { memoryIds, timeframe, planDate } = req.body;
        const userId = req.user.userId;
        
        if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
            return res.status(400).json({ error: 'Memory IDs array is required' });
        }
        
        if (!timeframe || !planDate) {
            return res.status(400).json({ error: 'Timeframe and plan date are required' });
        }
        
        console.log('🏷️ Tagging memories for planning:', { 
            memoryIds: memoryIds.length, 
            timeframe, 
            planDate,
            userId 
        });
        
        const planTag = timeframe === 'today' ? "today's plan" : "tomorrow's plan";
        const updatedMemories = [];
        
        // Update each memory with planning information
        for (const memoryId of memoryIds) {
            // Verify memory belongs to user
            const checkResult = await db.query(
                'SELECT id, notes FROM memories WHERE id = $1 AND user_id = $2',
                [memoryId, userId]
            );
            
            if (checkResult.rows.length === 0) {
                console.warn(`⚠️ Memory ${memoryId} not found or access denied for user ${userId}`);
                continue;
            }
            
            const currentNotes = checkResult.rows[0].notes || '';
            const planningNote = `\n[Added to ${planTag} on ${planDate}]`;
            
            // Avoid duplicate tags
            if (!currentNotes.includes(planTag)) {
                const updatedNotes = currentNotes + planningNote;
                
                // Build update query dynamically based on available columns
                const updateFields = ['notes = $2'];
                const updateValues = [memoryId, updatedNotes];
                let paramIndex = 3;
                
                if (memoriesTableColumns.includes('planning_tag')) {
                    updateFields.push(`planning_tag = $${paramIndex}`);
                    updateValues.push(planTag);
                    paramIndex++;
                }
                
                if (memoriesTableColumns.includes('planned_date')) {
                    updateFields.push(`planned_date = $${paramIndex}`);
                    updateValues.push(planDate);
                    paramIndex++;
                }
                
                if (memoriesTableColumns.includes('modified')) {
                    updateFields.push('modified = CURRENT_DATE');
                }
                
                const updateQuery = `
                    UPDATE memories 
                    SET ${updateFields.join(', ')} 
                    WHERE id = $1 AND user_id = $${paramIndex}
                    RETURNING *
                `;
                updateValues.push(userId);
                
                const updateResult = await db.query(updateQuery, updateValues);
                
                if (updateResult.rows.length > 0) {
                    updatedMemories.push(updateResult.rows[0]);
                    console.log(`✅ Tagged memory ${memoryId} for ${planTag}`);
                }
            } else {
                console.log(`ℹ️ Memory ${memoryId} already tagged for ${planTag}`);
            }
        }
        
        res.json({
            message: `Successfully tagged ${updatedMemories.length} memories for ${planTag}`,
            updatedCount: updatedMemories.length,
            skippedCount: memoryIds.length - updatedMemories.length,
            updatedMemories: updatedMemories
        });
        
    } catch (error) {
        console.error('Tag memories for planning error:', error);
        res.status(500).json({ error: 'Failed to tag memories for planning' });
    }
});

// NEW: Get memories by planning tags
app.get('/api/memories/by-plan/:timeframe', auth, async (req, res) => {
    try {
        const { timeframe } = req.params;
        const userId = req.user.userId;
        
        const planTag = timeframe === 'today' ? "today's plan" : "tomorrow's plan";
        
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [userId];
        
        // Filter by planning tag if the column exists
        if (memoriesTableColumns.includes('planning_tag')) {
            query += ' AND planning_tag = $2';
            params.push(planTag);
        } else if (memoriesTableColumns.includes('notes')) {
            // Fallback to searching in notes
            query += ' AND notes LIKE $2';
            params.push(`%${planTag}%`);
        } else {
            // If no suitable columns, return empty result
            return res.json([]);
        }
        
        // Order by priority if available
        if (memoriesTableColumns.includes('priority')) {
            query += ' ORDER BY priority DESC, id DESC';
        } else {
            query += ' ORDER BY id DESC';
        }
        
        const result = await db.query(query, params);
        
        console.log(`📋 Found ${result.rows.length} memories for ${planTag}`);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get memories by plan error:', error);
        res.status(500).json({ error: 'Failed to get memories by plan' });
    }
});

// NEW: Remove planning tags from memories
app.delete('/api/memories/planning-tags/:timeframe', auth, async (req, res) => {
    try {
        const { timeframe } = req.params;
        const { memoryIds } = req.body;
        const userId = req.user.userId;
        
        if (!memoryIds || !Array.isArray(memoryIds)) {
            return res.status(400).json({ error: 'Memory IDs array is required' });
        }
        
        const planTag = timeframe === 'today' ? "today's plan" : "tomorrow's plan";
        const updatedMemories = [];
        
        for (const memoryId of memoryIds) {
            // Verify memory belongs to user and get current notes
            const checkResult = await db.query(
                'SELECT id, notes FROM memories WHERE id = $1 AND user_id = $2',
                [memoryId, userId]
            );
            
            if (checkResult.rows.length === 0) continue;
            
            const currentNotes = checkResult.rows[0].notes || '';
            
            // Remove planning tag from notes
            const planTagPattern = new RegExp(`\\n?\\[Added to ${planTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} on [^\\]]+\\]`, 'g');
            const updatedNotes = currentNotes.replace(planTagPattern, '').trim();
            
            // Build update query
            const updateFields = ['notes = $2'];
            const updateValues = [memoryId, updatedNotes];
            let paramIndex = 3;
            
            if (memoriesTableColumns.includes('planning_tag')) {
                updateFields.push(`planning_tag = NULL`);
            }
            
            if (memoriesTableColumns.includes('planned_date')) {
                updateFields.push(`planned_date = NULL`);
            }
            
            if (memoriesTableColumns.includes('modified')) {
                updateFields.push('modified = CURRENT_DATE');
            }
            
            const updateQuery = `
                UPDATE memories 
                SET ${updateFields.join(', ')} 
                WHERE id = $1 AND user_id = $${paramIndex}
                RETURNING *
            `;
            updateValues.push(userId);
            
            const updateResult = await db.query(updateQuery, updateValues);
            
            if (updateResult.rows.length > 0) {
                updatedMemories.push(updateResult.rows[0]);
            }
        }
        
        res.json({
            message: `Removed planning tags from ${updatedMemories.length} memories`,
            updatedCount: updatedMemories.length,
            updatedMemories: updatedMemories
        });
        
    } catch (error) {
        console.error('Remove planning tags error:', error);
        res.status(500).json({ error: 'Failed to remove planning tags' });
    }
});

// NEW: Get planning analytics
app.get('/api/analytics/planning', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { days = 7 } = req.query;
        
        // Get planning statistics for the last N days
        const analytics = {
            totalPlannedItems: 0,
            completedItems: 0,
            activeRoutines: 0,
            highPriorityItems: 0,
            planningFrequency: {},
            typeDistribution: {},
            completionRate: 0
        };
        
        // Base query for memories with planning information
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [userId];
        
        // Add date filter if we have the planned_date column
        if (memoriesTableColumns.includes('planned_date')) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
            query += ' AND planned_date >= $2';
            params.push(startDate.toISOString().split('T')[0]);
        } else if (memoriesTableColumns.includes('notes')) {
            // Fallback to searching notes for planning information
            query += ' AND (notes LIKE $2 OR notes LIKE $3)';
            params.push("%today's plan%", "%tomorrow's plan%");
        }
        
        const result = await db.query(query, params);
        const memories = result.rows;
        
        analytics.totalPlannedItems = memories.length;
        
        memories.forEach(memory => {
            // Count by type
            const type = memory.type || 'other';
            analytics.typeDistribution[type] = (analytics.typeDistribution[type] || 0) + 1;
            
            // Count high priority items
            if (memory.priority && parseInt(memory.priority) >= 4) {
                analytics.highPriorityItems++;
            }
            
            // Count completed items
            if (memory.status === 'completed') {
                analytics.completedItems++;
            }
            
            // Count active routines
            if (memory.type === 'routine' && memory.status === 'active') {
                analytics.activeRoutines++;
            }
            
            // Track planning frequency by date
            if (memory.planned_date) {
                const date = memory.planned_date;
                analytics.planningFrequency[date] = (analytics.planningFrequency[date] || 0) + 1;
            }
        });
        
        // Calculate completion rate
        if (analytics.totalPlannedItems > 0) {
            analytics.completionRate = (analytics.completedItems / analytics.totalPlannedItems).toFixed(2);
        }
        
        console.log('📊 Planning analytics generated:', analytics);
        res.json(analytics);
        
    } catch (error) {
        console.error('Get planning analytics error:', error);
        res.status(500).json({ error: 'Failed to get planning analytics' });
    }
});

// ENHANCED: Enhanced memories endpoint with better filtering
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
        // Add the same filters to count query (simplified version)
        // ... (implement same filters for count if needed)
        
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

console.log('✅ Enhanced Planning API endpoints loaded');
