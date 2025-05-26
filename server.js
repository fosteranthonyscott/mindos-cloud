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

// API Routes
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
    console.log('🔍 Token data:', req.user);
    try {
        const result = await db.query(
            'SELECT user_id, username, email FROM "user" WHERE user_id = $1',
            [req.user.userId]
        );
        
        console.log('🔍 Database result rows:', result.rows.length);
        console.log('🔍 Database result:', result.rows);
        
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

app.post('/api/claude', auth, async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }
        
        const fetch = await import('node-fetch').then(m => m.default);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: messages
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Claude API error:', data);
            return res.status(500).json({ error: 'Claude API failed' });
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('Claude error:', error);
        res.status(500).json({ error: 'Failed to communicate with Claude' });
    }
});

app.get('/api/memories', auth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({ error: 'Failed to get memories' });
    }
});

app.post('/api/clear-session', auth, (req, res) => {
    try {
        activeConversations.delete(req.user.userId);
        res.json({ message: 'Session cleared' });
    } catch (error) {
        console.error('Clear session error:', error);
        res.status(500).json({ error: 'Failed to clear session' });
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
            currentDir: __dirname
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
    console.log('🤖 Claude: Ready');
});
