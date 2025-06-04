// SMART TEXT-PARSING FULL BRAIN ALGORITHM
// Handles natural language inputs like "daily", "weekly", "2x per week", etc.

class SmartTextParsingAlgorithm {
    constructor() {
        this.defaultWeights = {
            urgency: 0.35,      
            priority: 0.25,     
            momentum: 0.20,     
            context: 0.12,      
            freshness: 0.08     
        };

        // Text parsing patterns
        this.frequencyPatterns = this.initializeFrequencyPatterns();
        this.priorityPatterns = this.initializePriorityPatterns();
        this.timePatterns = this.initializeTimePatterns();
        this.dueDatePatterns = this.initializeDueDatePatterns();
    }

    // ===== INTELLIGENT TEXT PARSING FUNCTIONS =====

    initializeFrequencyPatterns() {
        return {
            // Daily patterns
            daily: ['daily', 'every day', 'each day', '1/day', 'per day', 'everyday'],
            
            // Weekly patterns  
            weekly: ['weekly', 'every week', 'each week', '1/week', 'per week', 'once a week'],
            
            // Multiple times per week
            '2x_weekly': ['twice a week', '2x week', '2/week', 'twice weekly', 'bi-weekly'],
            '3x_weekly': ['3x week', '3/week', 'three times a week', 'thrice weekly'],
            '4x_weekly': ['4x week', '4/week', 'four times a week'],
            '5x_weekly': ['5x week', '5/week', 'five times a week', 'weekdays'],
            
            // Monthly patterns
            monthly: ['monthly', 'every month', 'each month', '1/month', 'per month', 'once a month'],
            
            // Multiple times per month
            '2x_monthly': ['twice a month', '2x month', '2/month', 'bi-monthly'],
            '4x_monthly': ['weekly', '4x month', '4/month', 'four times a month'],
            
            // Every X days patterns
            every_2_days: ['every 2 days', 'every other day', 'every second day'],
            every_3_days: ['every 3 days', 'every third day'],
            every_7_days: ['every 7 days', 'every week'],
            
            // Rare patterns
            yearly: ['yearly', 'annually', 'every year', 'once a year'],
            
            // Never/rare
            never: ['never', 'rarely', 'occasionally'],
            
            // Numbers as text
            numeric: /^(\d+)(\s*\/\s*(day|week|month|year))?$/i
        };
    }

    initializePriorityPatterns() {
        return {
            critical: ['critical', 'urgent', 'asap', 'emergency', '!important', 'high priority', 'must do'],
            high: ['high', 'important', '4', 'soon', 'priority'],
            medium: ['medium', 'normal', '3', 'moderate', 'regular'],
            low: ['low', '1', '2', 'minor', 'when possible', 'someday'],
            
            // Numeric values
            numeric: /^[1-5]$/
        };
    }

    initializeTimePatterns() {
        return {
            // Duration patterns
            duration: {
                minutes: /(\d+)\s*(min|mins|minute|minutes)/i,
                hours: /(\d+(?:\.\d+)?)\s*(hr|hrs|hour|hours)/i,
                mixed: /(\d+)\s*h(?:our)?s?\s*(?:and\s*)?(\d+)\s*m(?:in)?s?/i,
                
                // Common phrases
                phrases: {
                    'quick': 5,
                    'fast': 10,
                    'short': 15,
                    'brief': 10,
                    'long': 60,
                    'extended': 90,
                    'half hour': 30,
                    'quarter hour': 15,
                    'hour': 60,
                    'couple hours': 120
                }
            }
        };
    }

    initializeDueDatePatterns() {
        return {
            relative: {
                'today': 0,
                'tomorrow': 1,
                'day after tomorrow': 2,
                'this week': 3,
                'next week': 7,
                'this weekend': this.getDaysUntilWeekend(),
                'next weekend': this.getDaysUntilWeekend() + 7,
                'this month': 15,
                'next month': 30,
                'soon': 3,
                'later': 14,
                'someday': 365
            },
            
            // "in X days/weeks" patterns
            inPattern: /in\s+(\d+)\s+(day|days|week|weeks|month|months)/i,
            
            // "next X" patterns  
            nextPattern: /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
        };
    }

    getDaysUntilWeekend() {
        const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
        return today <= 5 ? 6 - today : 1; // Days until Saturday
    }

    // ===== PARSING FUNCTIONS =====

    parseFrequency(frequencyText) {
        if (!frequencyText) return { score: 20, timesPerWeek: 1 };
        
        const text = frequencyText.toString().toLowerCase().trim();
        
        // Check for exact matches first
        for (const [pattern, keywords] of Object.entries(this.frequencyPatterns)) {
            if (pattern === 'numeric') continue;
            
            if (keywords.some(keyword => text.includes(keyword))) {
                return this.getFrequencyScore(pattern);
            }
        }
        
        // Check for numeric patterns
        const numericMatch = text.match(this.frequencyPatterns.numeric);
        if (numericMatch) {
            const number = parseInt(numericMatch[1]);
            const unit = numericMatch[3] || 'week'; // Default to per week
            
            return this.calculateFrequencyFromNumber(number, unit);
        }
        
        // Check for pure numbers (assume per week)
        const pureNumber = parseInt(text);
        if (!isNaN(pureNumber) && pureNumber > 0) {
            return this.calculateFrequencyFromNumber(pureNumber, 'week');
        }
        
        // Fallback
        console.log(`⚠️ Could not parse frequency: "${frequencyText}"`);
        return { score: 20, timesPerWeek: 1 };
    }

    getFrequencyScore(pattern) {
        const frequencies = {
            daily: { score: 100, timesPerWeek: 7 },
            '5x_weekly': { score: 90, timesPerWeek: 5 },
            '4x_weekly': { score: 80, timesPerWeek: 4 },
            '3x_weekly': { score: 70, timesPerWeek: 3 },
            '2x_weekly': { score: 60, timesPerWeek: 2 },
            weekly: { score: 50, timesPerWeek: 1 },
            '4x_monthly': { score: 50, timesPerWeek: 1 },
            '2x_monthly': { score: 30, timesPerWeek: 0.5 },
            monthly: { score: 20, timesPerWeek: 0.25 },
            every_2_days: { score: 75, timesPerWeek: 3.5 },
            every_3_days: { score: 65, timesPerWeek: 2.3 },
            every_7_days: { score: 50, timesPerWeek: 1 },
            yearly: { score: 5, timesPerWeek: 0.02 },
            never: { score: 0, timesPerWeek: 0 }
        };
        
        return frequencies[pattern] || { score: 20, timesPerWeek: 1 };
    }

    calculateFrequencyFromNumber(number, unit) {
        const conversions = {
            day: number * 7, // times per week
            week: number,
            month: number / 4,
            year: number / 52
        };
        
        const timesPerWeek = conversions[unit] || number;
        const score = Math.min(100, Math.max(0, timesPerWeek * 15));
        
        return { score, timesPerWeek };
    }

    parsePriority(priorityText) {
        if (!priorityText) return 60; // Default medium priority
        
        const text = priorityText.toString().toLowerCase().trim();
        
        // Check numeric first
        if (this.priorityPatterns.numeric.test(text)) {
            return parseInt(text) * 20; // 1=20, 2=40, 3=60, 4=80, 5=100
        }
        
        // Check text patterns
        for (const [level, keywords] of Object.entries(this.priorityPatterns)) {
            if (level === 'numeric') continue;
            
            if (keywords.some(keyword => text.includes(keyword))) {
                const priorities = {
                    critical: 100,
                    high: 80,
                    medium: 60,
                    low: 40
                };
                return priorities[level];
            }
        }
        
        // Fallback
        console.log(`⚠️ Could not parse priority: "${priorityText}"`);
        return 60;
    }

    parseTimeRequired(timeText) {
        if (!timeText) return 30; // Default 30 minutes
        
        const text = timeText.toString().toLowerCase().trim();
        
        // Check for mixed format: "1h 30m", "2 hours and 15 minutes"
        const mixedMatch = text.match(this.timePatterns.duration.mixed);
        if (mixedMatch) {
            const hours = parseInt(mixedMatch[1]) || 0;
            const minutes = parseInt(mixedMatch[2]) || 0;
            return hours * 60 + minutes;
        }
        
        // Check for hours
        const hoursMatch = text.match(this.timePatterns.duration.hours);
        if (hoursMatch) {
            return Math.round(parseFloat(hoursMatch[1]) * 60);
        }
        
        // Check for minutes
        const minutesMatch = text.match(this.timePatterns.duration.minutes);
        if (minutesMatch) {
            return parseInt(minutesMatch[1]);
        }
        
        // Check for common phrases
        for (const [phrase, minutes] of Object.entries(this.timePatterns.duration.phrases)) {
            if (text.includes(phrase)) {
                return minutes;
            }
        }
        
        // Check for pure numbers (assume minutes)
        const pureNumber = parseInt(text);
        if (!isNaN(pureNumber) && pureNumber > 0) {
            return pureNumber;
        }
        
        console.log(`⚠️ Could not parse time: "${timeText}"`);
        return 30;
    }

    parseDueDate(dueDateText) {
        if (!dueDateText) return null;
        
        const text = dueDateText.toString().toLowerCase().trim();
        const today = new Date();
        
        // Check relative dates
        for (const [phrase, daysFromNow] of Object.entries(this.dueDatePatterns.relative)) {
            if (text.includes(phrase)) {
                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + daysFromNow);
                return dueDate;
            }
        }
        
        // Check "in X days/weeks" pattern
        const inMatch = text.match(this.dueDatePatterns.inPattern);
        if (inMatch) {
            const number = parseInt(inMatch[1]);
            const unit = inMatch[2];
            const multiplier = unit.startsWith('week') ? 7 : unit.startsWith('month') ? 30 : 1;
            
            const dueDate = new Date(today);
            dueDate.setDate(today.getDate() + (number * multiplier));
            return dueDate;
        }
        
        // Check "next [day of week]" pattern
        const nextDayMatch = text.match(this.dueDatePatterns.nextPattern);
        if (nextDayMatch) {
            const targetDay = nextDayMatch[1];
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDayIndex = daysOfWeek.indexOf(targetDay);
            
            if (targetDayIndex !== -1) {
                const currentDay = today.getDay();
                let daysUntil = targetDayIndex - currentDay;
                if (daysUntil <= 0) daysUntil += 7; // Next week
                
                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + daysUntil);
                return dueDate;
            }
        }
        
        // Try to parse as regular date
        const parsed = new Date(dueDateText);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
        
        console.log(`⚠️ Could not parse due date: "${dueDateText}"`);
        return null;
    }

    // ===== ENHANCED SCORING WITH TEXT PARSING =====

    async generateSmartFeed(db, userId, options = {}) {
        const startTime = Date.now();
        console.log(`🧠 Generating smart feed with text parsing for user ${userId}`);
        
        const {
            limit = 50,
            offset = 0,
            weights = this.defaultWeights,
            filters = {}
        } = options;

        try {
            const userContext = await this.getUserContext(db, userId);
            const rawItems = await this.fetchRawItems(db, userId, filters);
            
            // Parse and score items with intelligent text processing
            const scoredItems = this.parseAndScoreItems(rawItems, userContext, weights);
            
            const finalFeed = this.applyIntelligentRanking(scoredItems, userContext);
            const paginatedFeed = finalFeed.slice(offset, offset + limit);
            
            const duration = Date.now() - startTime;
            console.log(`✅ Smart text-parsing feed generated in ${duration}ms: ${finalFeed.length} items`);
            
            return {
                items: paginatedFeed,
                metadata: {
                    totalItems: finalFeed.length,
                    algorithm: 'smart_text_parsing',
                    processingTime: duration,
                    textParsingStats: this.getParsingStats(rawItems),
                    userContext: this.sanitizeUserContext(userContext),
                    pagination: {
                        limit,
                        offset,
                        hasMore: (offset + limit) < finalFeed.length
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ Smart text parsing feed error:', error);
            throw error;
        }
    }

    async fetchRawItems(db, userId, filters) {
        let whereConditions = ['user_id = $1', "COALESCE(status, 'active') != 'archived'"];
        let params = [userId];
        let paramIndex = 2;

        if (filters.type) {
            whereConditions.push(`type = $${paramIndex}`);
            params.push(filters.type);
            paramIndex++;
        }
        if (filters.status) {
            whereConditions.push(`status = $${paramIndex}`);
            params.push(filters.status);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');
        const query = `SELECT * FROM memories WHERE ${whereClause} ORDER BY id DESC LIMIT 500`;

        const result = await db.query(query, params);
        return result.rows;
    }

    parseAndScoreItems(items, userContext, weights) {
        const scoredItems = items.map(item => {
            // Parse text fields into usable data
            const parsedData = {
                frequencyData: this.parseFrequency(item.frequency),
                priorityScore: this.parsePriority(item.priority),
                timeRequired: this.parseTimeRequired(item.required_time),
                parsedDueDate: this.parseDueDate(item.due)
            };

            // Calculate scores using parsed data
            const urgencyScore = this.calculateUrgencyScore(item, parsedData);
            const priorityScore = parsedData.priorityScore;
            const momentumScore = this.calculateMomentumScore(item, parsedData, userContext);
            const contextScore = this.calculateContextScore(item, parsedData, userContext);
            const freshnessScore = this.calculateFreshnessScore(item);

            const totalScore = 
                (urgencyScore * weights.urgency) +
                (priorityScore * weights.priority) +
                (momentumScore * weights.momentum) +
                (contextScore * weights.context) +
                (freshnessScore * weights.freshness);

            return {
                ...item,
                parsedData,
                urgency_score: urgencyScore,
                priority_score: priorityScore,
                momentum_score: momentumScore,
                context_score: contextScore,
                freshness_score: freshnessScore,
                total_score: Math.round(totalScore * 100) / 100
            };
        });

        return scoredItems.sort((a, b) => b.total_score - a.total_score);
    }

    calculateUrgencyScore(item, parsedData) {
        const dueDate = parsedData.parsedDueDate || (item.due ? new Date(item.due) : null);
        
        if (!dueDate) return 20;
        
        const now = new Date();
        const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
        
        if (daysUntilDue < 0) return 100; // Overdue
        if (daysUntilDue < 1) return 90;  // Due today
        if (daysUntilDue < 3) return 75;  // Due in 2-3 days
        if (daysUntilDue < 7) return Math.max(50, 70 - (daysUntilDue * 5));
        if (daysUntilDue < 30) return Math.max(25, 50 - daysUntilDue);
        
        return Math.max(10, 25 - (daysUntilDue * 0.3));
    }

    calculateMomentumScore(item, parsedData, userContext) {
        let score = 0;
        
        // Performance streak bonus
        const streak = parseInt(item.performance_streak) || 0;
        score += Math.min(35, streak * 6);
        
        // Frequency momentum - higher frequency = higher momentum
        score += Math.min(25, parsedData.frequencyData.score * 0.25);
        
        // Stage momentum
        const stageScores = {
            'in_progress': 35, 'review': 30, 'planning': 20,
            'on_hold': 5, 'completed': 0
        };
        score += stageScores[item.stage] || 15;
        
        // Status momentum
        const statusScores = {
            'active': 25, 'completed': -10, 'paused': 0
        };
        score += statusScores[item.status] || 10;
        
        // Recent activity boost
        if (item.modified) {
            const daysSince = (new Date() - new Date(item.modified)) / (1000 * 60 * 60 * 24);
            if (daysSince < 2) score += 15;
            else if (daysSince < 7) score += 8;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    calculateContextScore(item, parsedData, userContext) {
        let score = 30; // Base score
        const { hour, isWeekend } = userContext;
        
        // Time-based relevance for routines
        if (item.type === 'routine') {
            if (item.routine_type === 'morning' && hour >= 6 && hour <= 10) {
                score += 35;
            } else if (item.routine_type === 'evening' && hour >= 17 && hour <= 22) {
                score += 35;
            }
        }
        
        // Workout timing
        if (item.content && (item.content.toLowerCase().includes('workout') || 
                           item.content.toLowerCase().includes('exercise'))) {
            if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) {
                score += 25;
            }
        }
        
        // Work vs weekend context
        if (item.content) {
            const content = item.content.toLowerCase();
            if (content.includes('work') && !isWeekend) score += 15;
            if ((content.includes('personal') || content.includes('hobby')) && isWeekend) score += 15;
        }
        
        // Time requirement context - shorter tasks get boost during busy hours
        const timeRequired = parsedData.timeRequired;
        if (timeRequired < 15 && (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19)) {
            score += 10; // Quick tasks during rush hours
        }
        
        return Math.max(0, Math.min(100, score));
    }

    calculateFreshnessScore(item) {
        const now = new Date();
        const itemDate = new Date(item.modified || item.created_at || now);
        const daysSince = (now - itemDate) / (1000 * 60 * 60 * 24);
        
        if (daysSince < 1) return 80;
        if (daysSince < 3) return 60;
        if (daysSince < 7) return 40;
        if (daysSince < 14) return 25;
        if (daysSince < 30) return 15;
        return 8;
    }

    getParsingStats(items) {
        let successfulParses = 0;
        let failedParses = 0;
        const fieldStats = {};
        
        items.forEach(item => {
            // Track parsing success for each field type
            ['frequency', 'priority', 'required_time', 'due'].forEach(field => {
                if (item[field]) {
                    if (!fieldStats[field]) fieldStats[field] = { total: 0, parsed: 0 };
                    fieldStats[field].total++;
                    
                    try {
                        switch(field) {
                            case 'frequency':
                                this.parseFrequency(item[field]);
                                break;
                            case 'priority':
                                this.parsePriority(item[field]);
                                break;
                            case 'required_time':
                                this.parseTimeRequired(item[field]);
                                break;
                            case 'due':
                                this.parseDueDate(item[field]);
                                break;
                        }
                        fieldStats[field].parsed++;
                        successfulParses++;
                    } catch (e) {
                        failedParses++;
                    }
                }
            });
        });
        
        return {
            totalItems: items.length,
            successfulParses,
            failedParses,
            parseSuccessRate: `${Math.round((successfulParses / (successfulParses + failedParses)) * 100)}%`,
            fieldStats
        };
    }

    // Rest of the methods remain the same...
    async getUserContext(db, userId) {
        // ... same as before
        const context = {
            currentTime: new Date(),
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            isWeekend: [0, 6].includes(new Date().getDay()),
            userId: userId,
            userPatterns: {},
            activeHours: {}
        };
        return context;
    }

    applyIntelligentRanking(scoredItems, userContext) {
        return this.diversifyByType(scoredItems);
    }

    diversifyByType(items) {
        // ... same diversification logic
        return items;
    }

    sanitizeUserContext(context) {
        return {
            currentHour: context.hour,
            isWeekend: context.isWeekend,
            totalPatterns: Object.keys(context.userPatterns).length
        };
    }
}

class SmartTextFeedManager {
    constructor() {
        this.algorithm = new SmartTextParsingAlgorithm();
        this.feedCache = new Map();
        this.cacheTimeout = 3 * 60 * 1000;
    }

    async generateFeed(db, userId, options = {}) {
        const cacheKey = `${userId}_${JSON.stringify(options)}`;
        
        if (this.feedCache.has(cacheKey)) {
            const cached = this.feedCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📱 Returning cached smart text feed');
                return cached.data;
            }
        }
        
        const feed = await this.algorithm.generateSmartFeed(db, userId, options);
        
        this.feedCache.set(cacheKey, {
            data: feed,
            timestamp: Date.now()
        });
        
        return feed;
    }

    clearUserCache(userId) {
        Array.from(this.feedCache.keys())
            .filter(key => key.startsWith(userId))
            .forEach(key => this.feedCache.delete(key));
    }

    getStats() {
        return {
            cacheSize: this.feedCache.size,
            algorithm: 'smart_text_parsing_v1'
        };
    }
}

module.exports = { SmartTextParsingAlgorithm, SmartTextFeedManager };
