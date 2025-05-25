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

// Smart onboarding system
app.post('/api/start-onboarding', auth, async (req, res) => {
    try {
        const { knowledgeGaps } = req.body || {};
        
        let onboardingType = 'initial';
        let focusAreas = 'all life areas';
        
        if (knowledgeGaps && knowledgeGaps.length > 0) {
            onboardingType = 'targeted';
            focusAreas = knowledgeGaps.join(', ');
        }
        
        const onboardingPrompt = {
            messages: [{
                role: 'user',
                content: `You are MindOS v5.3 conducting a ${onboardingType} interview for ${req.user.username}.

${onboardingType === 'initial' ? 
`INITIAL SETUP: Build complete life management system through intelligent questioning.

Key areas to explore comprehensively:
- Core values and life priorities
- Daily routines and habits (morning, work, evening)
- Work schedule and professional commitments
- Health and wellness practices
- Financial habits and goals
- Relationships and family dynamics
- Personal development aspirations
- Stress management and coping strategies
- Home organization and maintenance needs
- Long-term life vision

Start with warm welcome and begin systematic exploration.` :

`KNOWLEDGE GAP INTERVIEW: Focus on incomplete areas: ${focusAreas}

Based on previous interactions, these areas need deeper understanding:
${knowledgeGaps.map(area => `- ${area.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join('\n')}

Ask targeted, specific questions to fill knowledge gaps. Be conversational but thorough.`}

Remember: You're building an intelligent system that adapts to their life. Every answer helps create better automation and assistance.

Begin the interview now.`
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

// Dynamic user assessment - handle no auth gracefully
app.get('/api/user-status', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.json({ hasCompletedOnboarding: false, isNewUser: true });
        }
        
        const user = jwt.verify(token, JWT_SECRET);
        
        // Mock knowledge areas - will be dynamic from conversation history
        const knowledgeAreas = {
            coreValues: 0,      // 0-100% completeness
            dailyRoutines: 0,
            workSchedule: 0,
            healthHabits: 0,
            financialGoals: 0,
            relationships: 0,
            stressManagement: 0,
            homeOrganization: 0
        };
        
        const totalCompleteness = Object.values(knowledgeAreas).reduce((a, b) => a + b, 0) / Object.keys(knowledgeAreas).length;
        
        res.json({
            hasCompletedOnboarding: totalCompleteness >= 75,
            knowledgeAreas,
            totalCompleteness,
            needsDeepDive: Object.entries(knowledgeAreas).filter(([area, score]) => score < 50),
            lastActive: new Date().toISOString()
        });
    } catch (error) {
        res.json({ hasCompletedOnboarding: false, isNewUser: true });
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
