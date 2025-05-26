// COMPLETE SERVER.JS FILE - FULL VERSION (NOT TRUNCATED)
// Replace your entire server.js with this corrected version

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

// In-memory conversation storage (sessions)
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

// CORRECTED buildMemoryContext function - using EXACT column names
async function buildMemoryContext(userId) {
    try {
        const result = await db.query(
            `SELECT type, content_short, content, priority, status, stage, mood, 
                    location, energy_requirements, performance_streak, notes, due
             FROM memories 
             WHERE user_id = $1 AND status != 'archived'
             ORDER BY priority DESC, performance_streak DESC, created_at DESC 
             LIMIT 25`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return "No stored memories yet.";
        }
        
        const memoryGroups = result.rows.reduce((groups, memory) => {
            if (!groups[memory.type]) groups[memory.type] = [];
            groups[memory.type].push(memory);
            return groups;
        }, {});
        
        let contextText = "Stored memories by category:\n\n";
        
        Object.entries(memoryGroups).forEach(([type, memories]) => {
            contextText += `${type.toUpperCase()}:\n`;
            memories.forEach(memory => {
                const summary = memory.content_short || memory.content.substring(0, 100);
                const priority = memory.priority > 3 ? " (HIGH PRIORITY)" : "";
                const streak = memory.performance_streak > 0 ? ` [${memory.performance_streak} day streak]` : "";
                const mood = memory.mood ? ` (mood: ${memory.mood})` : "";
                const location = memory.location ? ` @${memory.location}` : "";
                const stage = memory.stage ? ` [${memory.stage}]` : "";
                
                contextText += `- ${summary}${priority}${streak}${mood}${location}${stage}\n`;
                
                if (memory.notes) {
                    contextText += `  Notes: ${memory.notes}\n`;
                }
            });
            contextText += "\n";
        });
        
        return contextText;
        
    } catch (error) {
        console.error('Error building memory context:', error);
        return "Error accessing stored memories.";
    }
}

// CORRECTED storeMemory function - using EXACT column names
async function storeMemory(userId, type, content, additionalData = {}) {
    try {
        const {
            content_short = content.length > 100 ? content.substring(0, 97) + "..." : content,
            priority = 1,
            performance_rate = null,
            performance_streak = 0,
            due = null,
            stage = null,
            trigger = null,
            status = 'active',
            energy_requirements = null,
            required_time = null,
            search_query = null,
            success_criteria = null,
            notes = null,
            location = null,
            weather = null,
            mood = null,
            resources = null,
            emotion = null,
            shoppingideas = null
        } = additionalData;
        
        await db.query(
            `INSERT INTO memories (
                user_id, type, content, content_short, priority, performance_rate, 
                performance_streak, due, stage, trigger, status, energy_requirements, 
                required_time, search_query, success_criteria, notes, location, 
                weather, mood, resources, emotion, shoppingideas
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
            [
                userId, type, content, content_short, priority, performance_rate,
                performance_streak, due, stage, trigger, status, energy_requirements,
                required_time, search_query, success_criteria, notes, location,
                weather, mood, resources, emotion, shoppingideas
            ]
        );
        
        console.log(`✅ Memory stored: [${type}] ${content_short} (Priority: ${priority})`);
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

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const existingUser = await db.query(
            'SELECT id FROM "user" WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
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
    try {
        const result = await db.query(
            'SELECT user_id, username, email FROM "user" WHERE user_id = $1',
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('User status error:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// CORRECTED Claude endpoint with all fixes
app.post('/api/claude', auth, async (req, res) => {
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

Enhanced Memory Storage Instructions:
When storing memories, you can include rich contextual information:
- priority: 1-5 (5 being highest)
- stage: current, planned, completed, paused
- mood: user's emotional state
- location: where this applies
- energy_requirements: low, medium, high
- required_time: estimated time needed
- success_criteria: how to measure success
- performance_streak: days of consistent progress
- due: target completion date (YYYY-MM-DD)
- shoppingideas: related shopping items or ideas

User Context:
${memoryContext}

Session started: ${session.startTime.toLocaleString()}`;
        
        const claudeRequestBody = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            system: enhancedSystemPrompt,
            messages: session.messages,
            tools: [
                {
                    name: "storeMemory",
                    description: "Store important information as a memory with rich contextual data",
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
                                description: "The full content of the memory"
                            },
                            content_short: {
                                type: "string",
                                description: "Brief summary for quick reference"
                            },
                            priority: {
                                type: "integer",
                                minimum: 1,
                                maximum: 5,
                                description: "Priority level (1-5, 5 being highest)"
                            },
                            performance_rate: {
                                type: "number",
                                minimum: 0,
                                maximum: 1,
                                description: "Success rate as decimal (0.0-1.0)"
                            },
                            performance_streak: {
                                type: "integer",
                                minimum: 0,
                                description: "Current streak count in days"
                            },
                            due: {
                                type: "string",
                                description: "Due date in YYYY-MM-DD format"
                            },
                            stage: {
                                type: "string",
                                enum: ["current", "planned", "completed", "paused"],
                                description: "Current stage of the goal/routine"
                            },
                            trigger: {
                                type: "string",
                                description: "What triggers this routine or goal"
                            },
                            status: {
                                type: "string",
                                enum: ["active", "completed", "paused", "archived"],
                                description: "Current status"
                            },
                            energy_requirements: {
                                type: "string",
                                enum: ["low", "medium", "high"],
                                description: "Energy level required"
                            },
                            required_time: {
                                type: "string",
                                description: "Estimated time needed (e.g., '30 minutes', '2 hours')"
                            },
                            search_query: {
                                type: "string",
                                description: "Search terms related to this memory"
                            },
                            success_criteria: {
                                type: "string",
                                description: "How to measure success or completion"
                            },
                            notes: {
                                type: "string",
                                description: "Additional notes or details"
                            },
                            location: {
                                type: "string",
                                description: "Location context for this memory"
                            },
                            weather: {
                                type: "string",
                                description: "Weather context when relevant"
                            },
                            mood: {
                                type: "string",
                                description: "User's mood or emotional context"
                            },
                            resources: {
                                type: "string",
                                description: "Resources needed for this goal/routine"
                            },
                            emotion: {
                                type: "string",
                                description: "Emotional context or feeling"
                            },
                            shoppingideas: {
                                type: "string",
                                description: "Shopping ideas or items related to this memory"
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
        
        res.json(data);
        
    } catch (error) {
        console.error('Claude error:', error);
        res.status(500).json({ error: 'Failed to communicate with Claude' });
    }
});

// Memory endpoints
app.get('/api/memories', auth, async (req, res) => {
    try {
        const { type, status, priority_min, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        let params = [req.user.userId];
        let paramIndex = 2;
        
        if (type) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (priority_min) {
            query += ` AND priority >= $${paramIndex}`;
            params.push(priority_min);
            paramIndex++;
        }
        
        query += ' ORDER BY priority DESC, performance_streak DESC, created_at DESC';
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
        
        const result = await db.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get memories error:', error);
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

// Session management
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

// Performance tracking
app.patch('/api/memories/:id/performance', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { performance_streak, performance_rate, stage } = req.body;
        const userId = req.user.userId;
        
        await db.query(
            `UPDATE memories 
             SET performance_streak = COALESCE($1, performance_streak),
                 performance_rate = COALESCE($2, performance_rate),
                 stage = COALESCE($3, stage),
                 modified = CURRENT_DATE
             WHERE id = $4 AND user_id = $5`,
            [performance_streak, performance_rate, stage, id, userId]
        );
        
        res.json({ message: 'Performance updated successfully' });
    } catch (error) {
        console.error('Update performance error:', error);
        res.status(500).json({ error: 'Failed to update performance' });
    }
});

// Analytics
app.get('/api/memories/analytics', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await db.query(
            `SELECT 
                type,
                COUNT(*) as total_count,
                AVG(priority) as avg_priority,
                AVG(performance_streak) as avg_streak,
                AVG(performance_rate) as avg_rate,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
             FROM memories 
             WHERE user_id = $1 
             GROUP BY type
             ORDER BY total_count DESC`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Shopping ideas
app.get('/api/memories/shopping', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await db.query(
            `SELECT id, type, content_short, shoppingideas, priority, created_at
             FROM memories 
             WHERE user_id = $1 AND shoppingideas IS NOT NULL
             ORDER BY priority DESC, created_at DESC`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Shopping ideas error:', error);
        res.status(500).json({ error: 'Failed to get shopping ideas' });
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 MindOS server running on port ${PORT}`);
    console.log('📊 Database: Connected');
    console.log('🤖 Claude: Ready with Memory Management');
    console.log('🧠 Session Storage: Active');
});
