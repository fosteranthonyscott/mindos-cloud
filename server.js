const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'mindos-jwt-secret-2025';

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
    const token = jwt.sign({ userId, username }, JWT_SECRET);
    res.json({ token, user: { id: userId, username, email } });
});

app.post('/api/login', (req, res) => {
    const { email } = req.body;
    const userId = `user_${Date.now()}`;
    const username = email.split('@')[0];
    const token = jwt.sign({ userId, username }, JWT_SECRET);
    res.json({ token, user: { id: userId, username, email } });
});

app.post('/api/claude', auth, async (req, res) => {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return res.status(500).json({ error: 'Claude API not configured' });
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
            return res.status(response.status).json({ error });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/memories', auth, (req, res) => {
    res.json([]);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
