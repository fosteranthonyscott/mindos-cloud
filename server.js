const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create memories table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) REFERENCES users(id),
                type VARCHAR(100),
                desc TEXT,
                stage VARCHAR(100),
                trigger VARCHAR(255),
                status VARCHAR(100),
                pri DECIMAL,
                due DATE,
                date DATE,
                time TIME,
                freq INTEGER,
                last DATE,
                energy VARCHAR(50),
                mins INTEGER,
                strategy TEXT,
                search_query TEXT,
                success_criteria TEXT,
                notes TEXT,
                streak DECIMAL,
                rate DECIMAL,
                deps VARCHAR(255),
                loc VARCHAR(255),
                weather VARCHAR(100),
                mood VARCHAR(100),
                src VARCHAR(255),
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database tables initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'mindos-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await pool.query(
            'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
            [userId, username, email, password_hash, new Date().toISOString()]
        );
        
        const token = jwt.sign({ userId, username }, JWT_SECRET);
        
        res.json({ token, user: { id: userId, username, email } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { userId: user.rows[0].id, username: user.rows[0].username },
            JWT_SECRET
        );
        
        res.json({
            token,
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                email: user.rows[0].email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get memories
app.get('/api/memories', authenticateToken, async (req, res) => {
    try {
        const memories = await pool.query(
            'SELECT * FROM memories WHERE user_id = $1 ORDER BY created',
            [req.user.userId]
        );
        res.json(memories.rows);
    } catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

// Claude API proxy - FIXED
app.post('/api/claude', authenticateToken, async (req, res) => {
    try {
        console.log('Claude API request received');
        
        if (!process.env.CLAUDE_API_KEY) {
            console.error('CLAUDE_API_KEY not set');
            return res.status(500).json({ error: 'Claude API key not configured' });
        }
        
        const { messages, max_tokens = 1000 } = req.body;
        
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens,
                messages
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Claude API error:', error);
            return res.status(response.status).json({ error });
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Claude API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add memory
app.post('/api/memories', authenticateToken, async (req, res) => {
    try {
        const memory = req.body;
        
        await pool.query(`
            INSERT INTO memories (
                "id", "type", "desc", "stage", "trigger", "status", "pri", "due", "date", "time",
                "freq", "last", "energy", "mins", "strategy", "search_query", "success_criteria",
                "notes", "streak", "rate", "deps", "loc", "weather", "mood", "src", "created", "modified", "user_id"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        `, [
            memory.id, memory.type, memory.desc, memory.stage, memory.trigger,
            memory.status, memory.pri, memory.due, memory.date, memory.time,
            memory.freq, memory.last, memory.energy, memory.mins, memory.strategy,
            memory.search_query, memory.success_criteria, memory.notes, memory.streak,
            memory.rate, memory.deps, memory.loc, memory.weather, memory.mood,
            memory.src, memory.created, memory.modified, req.user.userId
        ]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Add memory error:', error);
        res.status(500).json({ error: 'Failed to add memory' });
    }
});

// Import CSV
app.post('/api/import-csv', authenticateToken, async (req, res) => {
    try {
        const { csvData } = req.body;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        
        // Clear existing memories for user
        await pool.query('DELETE FROM memories WHERE user_id = $1', [req.user.userId]);
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const memory = {};
                headers.forEach((header, index) => {
                    memory[header.trim()] = values[index]?.trim() || '';
                });
                
                await pool.query(`
                    INSERT INTO memories (
                        "id", "type", "desc", "stage", "trigger", "status", "pri", "due", "date", "time",
                        "freq", "last", "energy", "mins", "strategy", "search_query", "success_criteria",
                        "notes", "streak", "rate", "deps", "loc", "weather", "mood", "src", "created", "modified", "user_id"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
                `, [
                    memory.id, memory.type, memory.desc, memory.stage, memory.trigger,
                    memory.status, memory.pri, memory.due, memory.date, memory.time,
                    memory.freq, memory.last, memory.energy, memory.mins, memory.strategy,
                    memory.search_query, memory.success_criteria, memory.notes, memory.streak,
                    memory.rate, memory.deps, memory.loc, memory.weather, memory.mood,
                    memory.src, memory.created, memory.modified, req.user.userId
                ]);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Import CSV error:', error);
        res.status(500).json({ error: 'Failed to import CSV' });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API working', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'MindOS Cloud Running', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server and initialize database
async function startServer() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`MindOS Cloud running on port ${PORT}`);
    });
}

startServer().catch(console.error);
