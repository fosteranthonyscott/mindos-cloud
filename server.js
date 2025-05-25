const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

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

app.get('/api/test', (req, res) => {
    res.json({ message: 'API test working' });
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

// Claude endpoint
app.post('/api/claude', auth, async (req, res) => {
    console.log('Claude endpoint hit by user:', req.user?.username);
    
    try {
        if (!process.env.CLAUDE_API_KEY) {
            console.log('Claude API key missing');
            return res.status(500).json({ error: 'Claude API not configured' });
        }

        const { messages, max_tokens = 1000 } = req.body;
        
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
                max_tokens,
                messages
            })
        });

        console.log('Claude API response status:', response.status);

        if (!response.ok) {
            const error = await response.text();
            console.log('Claude API error:', error);
            return res.status(response.status).json({ error });
        }

        const data = await response.json();
        console.log('Claude API success');
        res.json(data);
    } catch (error) {
        console.error('Claude endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Onboarding system
app.post('/api/start-onboarding', auth, async (req, res) => {
    try {
        const onboardingPrompt = {
            messages: [{
                role: 'user',
                content: `You are MindOS v5.3 conducting a comprehensive life setup interview for ${req.user.username}. 

Your goal: Build a complete personal life management system through intelligent questioning.

Key areas to explore:
- Core values and priorities
- Daily routines and habits
- Work schedule and commitments  
- Health and wellness practices
- Financial habits and goals
- Relationships and family
- Personal development goals
- Stress management and coping mechanisms
- Home organization and maintenance
- Long-term aspirations

Start with a warm welcome and begin the interview process. Ask thoughtful, specific questions that will help you understand their complete lifestyle. Don't ask everything at once - be conversational and build naturally.

Begin the onboarding interview now.`
            }],
            max_tokens: 1000
        };
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(onboardingPrompt)
        });

        if (!response.ok) {
            throw new Error('Claude API error');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's system status
app.get('/api/user-status', auth, (req, res) => {
    // For now, return mock status - will integrate with database later
    res.json({
        hasCompletedOnboarding: false,
        totalMemories: 0,
        lastActive: new Date().toISOString()
    });
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
