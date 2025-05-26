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

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'connected',
        claude: !!process.env.CLAUDE_API_KEY 
    });
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM user WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 12);
        const userId = uuidv4();
        
        // Create user
        await db.query(
            `INSERT INTO user (user_id, username, email, password_hash, created_at, updated_at, is_active, onboarding_completed) 
             VALUES ($1, $2, $3, $4, NOW(), NOW(), true, false)`,
            [userId, username, email, password_hash]
        );
        
        // Generate token
        const token = jwt.sign({ userId, username, email }, JWT_SECRET, { expiresIn: '30d' });
        
        res.json({
            token,
            user: { id: userId, username, email, isNewUser: true }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const userResult = await db.query(
            'SELECT user_id, username, email, password_hash, onboarding_completed FROM user WHERE email = $1 AND is_active = true',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = userResult.rows[0];
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await db.query(
            'UPDATE user SET last_login = NOW(), updated_at = NOW() WHERE user_id = $1',
            [user.user_id]
        );
        
        // Generate token
        const token = jwt.sign(
            { userId: user.user_id, username: user.username, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '30d' }
        );
        
        res.json({
            token,
            user: { 
                id: user.user_id, 
                username: user.username, 
                email: user.email, 
                isNewUser: !user.onboarding_completed 
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Memory storage functions
async function storeMemory(userId, type, content) {
    try {
        const query = `
            INSERT INTO memories (user_id, type, content, created_at) 
            VALUES ($1, $2, $3, NOW())
        `;
        await db.query(query, [userId, type, content]);
        console.log(`Memory stored for user ${userId}: [${type}] ${content.substring(0, 50)}...`);
    } catch (error) {
        console.error('Error storing memory:', error);
    }
}

async function getMemories(userId, limit = 20) {
    try {
        const query = `
            SELECT type, content, created_at 
            FROM memories 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        const result = await db.query(query, [userId, limit]);
        return result.rows;
    } catch (error) {
        console.error('Error getting memories:', error);
        return [];
    }
}

// Claude chat endpoint
app.post('/api/claude', auth, async (req, res) => {
    console.log(`Claude endpoint - User: ${req.user.username}`);
    
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return res.status(500).json({ error: 'Claude API not configured' });
        }

        const { messages } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        
        const userMessage = messages[0].content;
        const userId = req.user.userId;
        
        // Get or create session conversation
        if (!activeConversations.has(userId)) {
            activeConversations.set(userId, []);
        }
        const conversation = activeConversations.get(userId);
        
        // Add user message to session
        conversation.push({ role: 'user', content: userMessage });
        
        // Keep conversation manageable (last 20 messages)
        if (conversation.length > 20) {
            conversation.splice(0, conversation.length - 20);
        }
        
        // Get long-term memories
        const memories = await getMemories(userId, 15);
        const memoryContext = memories.length > 0 
            ? memories.map(m => `[${m.type}] ${m.content}`).join('\n')
            : 'No previous memories stored.';
        
        // Build context for Claude
        const systemPrompt = `You are MindOS v5.3, an adaptive AI assistant helping ${req.user.username}. 

PERSONALITY: Be helpful, concise, and proactive. Focus on practical life management.

LONG-TERM MEMORIES:
${memoryContext}

RECENT CONVERSATION:
${conversation.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Provide helpful responses based on both memories and current context. If you learn important information about the user (habits, preferences, goals, schedules), suggest they save it as a memory.`;
        
        const conversationWithContext = [
            { role: 'user', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];
        
        const fetch = (await import('node-fetch')).default;
        
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
                messages: conversationWithContext
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Claude API error:', error);
            return res.status(response.status).json({ error: 'Claude API error' });
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;
        
        // Add Claude response to session
        conversation.push({ role: 'assistant', content: assistantMessage });
        
        // Auto-save important information as memories (simple pattern matching)
        if (userMessage.match(/(my name is|i am|i work|i live|my birthday|my goal|i want to|schedule|routine)/i)) {
            await storeMemory(userId, 'user_info', userMessage);
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('Claude endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save memory manually
app.post('/api/save-memory', auth, async (req, res) => {
    try {
        const { content, type = 'user_info' } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        await storeMemory(req.user.userId, type, content);
        res.json({ success: true });
    } catch (error) {
        console.error('Save memory error:', error);
        res.status(500).json({ error: 'Failed to save memory' });
    }
});

// Get user memories
app.get('/api/memories', auth, async (req, res) => {
    try {
        const memories = await getMemories(req.user.userId);
        res.json(memories);
    } catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({ error: 'Failed to retrieve memories' });
    }
});

// Clear session conversation
app.post('/api/clear-session', auth, (req, res) => {
    try {
        activeConversations.delete(req.user.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Clear session error:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

// User status
app.get('/api/user-status', auth, async (req, res) => {
    try {
        const userResult = await db.query(
            'SELECT onboarding_completed, last_login FROM user WHERE user_id = $1',
            [req.user.userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        res.json({
            hasCompletedOnboarding: user.onboarding_completed,
            isNewUser: !user.onboarding_completed,
            lastActive: user.last_login || new Date().toISOString()
        });
    } catch (error) {
        console.error('User status error:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// Complete onboarding
app.post('/api/complete-onboarding', auth, async (req, res) => {
    try {
        await db.query(
            'UPDATE user SET onboarding_completed = true, updated_at = NOW() WHERE user_id = $1',
            [req.user.userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});

// Serve static files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    db.end(() => {
        console.log('Database connections closed');
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 MindOS server running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🤖 Claude: ${process.env.CLAUDE_API_KEY ? 'Ready' : 'Not configured'}`);
});
