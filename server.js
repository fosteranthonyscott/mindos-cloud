const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'mindos-jwt-secret-2025';

// PostgreSQL connection with proper configuration
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
db.connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => console.error('❌ Database connection error:', err));

// In-memory conversation storage (sessions) - Enhanced structure
const activeConversations = new Map();

// MindOS System Prompt
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

Always reference relevant stored memories when responding to provide continuity and personalized assistance.`;

// Helper function to get or create conversation session
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

// Helper function to build context from stored memories
async function buildMemoryContext(userId) {
    try {
        const result = await db.query(
            'SELECT type, content_short, notes FROM memories WHERE user_id = $1 ORDER BY date_completed DESC, priority DESC LIMIT 20',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return "No stored memories yet.";
        }
        
        const memoryContext = result.rows.map(memory => 
            `[${memory.type}] ${memory.content_short}${memory.notes ? ` - ${memory.notes}` : ''}`
        ).join('\n');
        
        return `Stored memories:\n${memoryContext}`;
    } catch (error) {
        console.error('Error building memory context:', error);
        return "Error accessing stored memories.";
    }
}

// Function to handle memory storage from Claude
async function storeMemory(userId, type, content, notes = null, priority = 1) {
    try {
        await db.query(
            `INSERT INTO memories (user_id, type, content_short, notes, priority, date_completed, status) 
             VALUES ($1, $2, $3, $4, $5, NOW(), 'active')`,
            [userId, type, content, notes, priority]
        );
        console.log(`✅ Memory stored: [${type}] ${content}`);
        return true;
    } catch (error) {
        console.error('❌ Error storing memory:', error);
        return false;
    }
}

// Authentication middleware
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
};

// API Routes (keeping existing auth routes)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM "user" WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        
        const result = await db.query(
            'INSERT INTO "user" (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, username, email, passwordHash]
        );
        
        const token = jwt.sign({ userId, username, email }, JWT_SECRET);
        
        res.status(201).json({
            token,
            user: { userId, username, email }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const result = await db.query(
            'SELECT * FROM "user" WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await db.query(
            'UPDATE "user" SET last_login = NOW() WHERE user_id = $1',
            [user.user_id]
        );
        
        const token = jwt.sign({ 
            userId: user.user_id, 
            username: user.username, 
            email: user.email 
        }, JWT_SECRET);
        
        res.json({
            token,
            user: { 
                userId: user.user_id, 
                username: user.username, 
                email: user.email 
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/user-status', auth, async (req, res) => {
    console.log('🔍 User status request for:', req.user.userId);
    try {
        const result = await db.query(
            'SELECT user_id, username, email FROM "user" WHERE user_id = $1',
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ User not found in database');
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('✅ User status success');
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ User status error:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// Enhanced Claude endpoint with memory and context management
app.post('/api/claude', auth, async (req, res) => {
    try {
        const { messages } = req.body;
        const userId = req.user.userId;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        
        // Get user's conversation session
        const session = getConversationSession(userId);
        
        // Add user's message to session
        const userMessage = messages[messages.length - 1];
        session.messages.push(userMessage);
        
        // Build memory context
        const memoryContext = await buildMemoryContext(userId);
        
        // Prepare messages for Claude with full context
        const contextualMessages = [
            { 
                role: 'system', 
                content: `${MINDOS_SYSTEM_PROMPT}\n\nUser Context:\n${memoryContext}\n\nSession started: ${session.startTime.toLocaleString()}` 
            },
            ...session.messages
        ];
        
        // Add function calling for memory storage
        const claudeRequestBody = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: contextualMessages,
            tools: [
                {
                    name: "storeMemory",
                    description: "Store important information as a memory for future reference",
                    input_schema: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["goal", "routine", "preference", "insight", "event", "system"],
                                description: "The category of memory to store"
                            },
                            content: {
                                type: "string",
                                description: "The main content/summary of the memory"
                            },
                            notes: {
                                type: "string",
                                description: "Additional notes or details about the memory"
                            },
                            priority: {
                                type: "integer",
                                minimum: 1,
                                maximum: 5,
                                description: "Priority level (1-5, 5 being highest priority)"
                            }
                        },
                        required: ["type", "content"]
                    }
                }
            ]
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
            console.error('Claude API error:', data);
            return res.status(500).json({ error: 'Claude API failed' });
        }
        
        // Process tool calls if any (memory storage)
        if (data.content) {
            for (const content of data.content) {
                if (content.type === 'tool_use' && content.name === 'storeMemory') {
                    const { type, content: memoryContent, notes = null, priority = 1 } = content.input;
                    await storeMemory(userId, type, memoryContent, notes, priority);
                }
            }
        }
        
        // Add Claude's response to session
        const assistantMessage = { role: 'assistant', content: data.content[0].text };
        session.messages.push(assistantMessage);
        
        // Keep session messages manageable (last 20 messages)
        if (session.messages.length > 20) {
            session.messages = session.messages.slice(-20);
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('Claude error:', error);
        res.status(500).json({ error: 'Failed to communicate with Claude' });
    }
});

// Enhanced memory endpoints
app.get('/api/memories', auth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM memories WHERE user_id = $1 ORDER BY priority DESC, date_completed DESC',
            [req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({ error: 'Failed to get memories' });
    }
});

app.post('/api/memories', auth, async (req, res) => {
    try {
        const { type, content, notes, priority = 1 } = req.body;
        const userId = req.user.userId;
        
        if (!type || !content) {
            return res.status(400).json({ error: 'Type and content are required' });
        }
        
        const success = await storeMemory(userId, type, content, notes, priority);
        
        if (success) {
            res.status(201).json({ message: 'Memory stored successfully' });
        } else {
            res.status(500).json({ error: 'Failed to store memory' });
        }
    } catch (error) {
        console.error('Store memory error:', error);
        res.status(500).json({ error: 'Failed to store memory' });
    }
});

app.delete('/api/memories/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        await db.query(
            'DELETE FROM memories WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        
        res.json({ message: 'Memory deleted successfully' });
    } catch (error) {
        console.error('Delete memory error:', error);
        res.status(500).json({ error: 'Failed to delete memory' });
    }
});

// Clear session endpoint - enhanced
app.post('/api/clear-session', auth, (req, res) => {
    try {
        const userId = req.user.userId;
        activeConversations.delete(userId);
        console.log(`🧹 Session cleared for user: ${userId}`);
        res.json({ message: 'Session cleared successfully' });
    } catch (error) {
        console.error('Clear session error:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

// Get session info
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
        console.error('Session info error:', error);
        res.status(500).json({ error: 'Failed to get session info' });
    }
});

// Debug route
app.get('/debug', (req, res) => {
    const fs = require('fs');
    try {
        res.json({
            files: fs.readdirSync(__dirname),
            publicExists: fs.existsSync('./public'),
            indexExists: fs.existsSync('./public/index.html'),
            currentDir: __dirname,
            activeSessions: activeConversations.size
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 MindOS server running on port ${PORT}`);
    console.log('📊 Database: Connected');
    console.log('🤖 Claude: Ready with Memory Management');
    console.log('🧠 Session Storage: Active');
});
