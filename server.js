const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Add request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'mindos-jwt-secret-2025';

// PostgreSQL connection
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// In-memory conversation storage (clears on app restart)
const activeConversations = new Map();

const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'OK', claude: !!process.env.CLAUDE_API_KEY });
});

app.post('/api/register', (req, res) => {
    const { username, email } = req.body;
    const userId = `user_${Date.now()}`;
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ 
        token, 
        user: { id: userId, username, email, isNewUser: true } 
    });
});

app.post('/api/login', (req, res) => {
    const { email } = req.body;
    const userId = `user_${Date.now()}`;
    const username = email.split('@')[0];
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ 
        token, 
        user: { id: userId, username, email, isNewUser: false } 
    });
});

// Memory functions
async function storeMemory(userId, type, content) {
    try {
        const query = 'INSERT INTO memories (user_id, type, content, created_at) VALUES ($1, $2, $3, NOW())';
        await db.query(query, [userId, type, content]);
    } catch (error) {
        console.error('Error storing memory:', error);
    }
}

async function getMemories(userId, limit = 20) {
    try {
        const query = 'SELECT type, content, created_at FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2';
        const result = await db.query(query, [userId, limit]);
        return result.rows;
    } catch (error) {
        console.error('Error getting memories:', error);
        return [];
    }
}

// Claude endpoint with session + memory system
app.post('/api/claude', auth, async (req, res) => {
    console.log('Claude endpoint hit by user:', req.user?.username);
    
    try {
        if (!process.env.CLAUDE_API_KEY) {
            console.log('Claude API key missing');
            return res.status(500).json({ error: 'Claude API not configured' });
        }

        const { messages } = req.body;
        const userMessage = messages[0].content;
        const userId = req.user.userId;
        
        // Get or create session conversation
        if (!activeConversations.has(userId)) {
            activeConversations.set(userId, []);
        }
        const conversation = activeConversations.get(userId);
        
        // Add user message to session
        conversation.push({ role: 'user', content: userMessage });
        
        // Get long-term memories for context
        const memories = await getMemories(userId);
        const memoryContext = memories.length > 0 
            ? memories.map(m => `[${m.type}] ${m.content}`).join('\n')
            : 'No previous memories stored.';
        
        // Build conversation with system context
        const conversationWithContext = [
            {
                role: 'user',
                content: `You are MindOS v5.3, an adaptive intelligence life management system helping ${req.user.username}.

LONG-TERM MEMORIES:
${memoryContext}

CURRENT CONVERSATION CONTEXT:
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Based on both long-term memories and current conversation, provide helpful assistance. Focus on building their personalized management system through natural conversation.`
            }
        ];
        
        const fetch = (await import('node-fetch')).default;
        
        console.log('Calling Claude API...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                messages: conversationWithContext
            })
        });

        console.log('Claude API response status:', response.status);

        if (!response.ok) {
            const error = await response.text();
            console.log('Claude API error:', error);
            return res.status(response.status).json({ error });
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;
        
        // Add Claude response to session
        conversation.push({ role: 'assistant', content: assistantMessage });
        
        console.log('Claude API success');
        res.json(data);
    } catch (error) {
        console.error('Claude endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save important information as long-term memory
app.post('/api/save-memory', auth, async (req, res) => {
    try {
        const { content, type = 'user_info' } = req.body;
        await storeMemory(req.user.userId, type, content);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's memories
app.get('/api/memories', auth, async (req, res) => {
    try {
        const memories = await getMemories(req.user.userId);
        res.json(memories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear current conversation session
app.post('/api/clear-session', auth, (req, res) => {
    activeConversations.delete(req.user.userId);
    res.json({ success: true });
});

// User status endpoint
app.get('/api/user-status', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.json({ hasCompletedOnboarding: false, isNewUser: true });
        }
        
        const user = jwt.verify(token, JWT_SECRET);
        
        res.json({
            hasCompletedOnboarding: true,
            isNewUser: false,
            lastActive: new Date().toISOString()
        });
    } catch (error) {
        res.json({ hasCompletedOnboarding: false, isNewUser: true });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
