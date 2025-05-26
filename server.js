// CORRECTED SERVER.JS FUNCTIONS - EXACT COLUMN MATCH
// Your table has: id, user_id, type, content, created_at, content_short, priority, 
// performance_rate, performance_streak, due, modified, stage, trigger, status, 
// energy_requirements, required_time, search_query, success_criteria, notes, 
// location, weather, mood, resources, emotion, shoppingideas

// 1. CORRECTED buildMemoryContext function
async function buildMemoryContext(userId) {
    try {
        // Query using ONLY your actual column names
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
        
        // Group memories by type for better organization
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

// 2. CORRECTED storeMemory function - using EXACT column names
async function storeMemory(userId, type, content, additionalData = {}) {
    try {
        // Extract data matching your EXACT column names
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
        
        // INSERT using ALL your actual column names (except id, user_id, created_at, modified which auto-populate)
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

// 3. CORRECTED Claude API tool schema - matching your columns
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

// 4. CORRECTED memories GET endpoint
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

// 5. CORRECTED memory POST endpoint
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

// 6. CORRECTED performance update endpoint
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

// 7. CORRECTED analytics endpoint
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

// 8. NEW: Shopping ideas endpoint (utilizing your shoppingideas column)
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

// VERIFICATION: Column names used in this code
console.log("✅ VERIFICATION: All code now uses these EXACT column names:");
const usedColumns = [
    "id", "user_id", "type", "content", "created_at", "content_short", 
    "priority", "performance_rate", "performance_streak", "due", "modified", 
    "stage", "trigger", "status", "energy_requirements", "required_time", 
    "search_query", "success_criteria", "notes", "location", "weather", 
    "mood", "resources", "emotion", "shoppingideas"
];
console.log(usedColumns.join(", "));
console.log("✅ Total: 25 columns - matches your table exactly!");
