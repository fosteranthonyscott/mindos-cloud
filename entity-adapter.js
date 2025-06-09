// Entity adapter - Uses ONLY the new schema
const { v4: uuidv4 } = require('uuid');

class EntityAdapter {
    constructor(db) {
        this.db = db;
    }

    // Convert entity to memory format for legacy API compatibility
    convertEntityToMemory(entity, type) {
        const memory = {
            id: entity.id,
            user_id: entity.user_id,
            type: type,
            content: entity.description || entity.content || entity.name,
            content_short: entity.name || entity.content_short,
            priority: parseInt(entity.priority) || 5,
            status: entity.status || (type === 'note' ? 'active' : null),
            due: entity.due_date || (entity.event_date ? `${entity.event_date}T${entity.event_time || '00:00:00'}` : null) || entity.target_date,
            completed_date: entity.completed_date,
            frequency: this.mapPatternToFrequency(entity.recurrence_pattern, entity.recurrence_interval),
            performance_streak: entity.performance_streak || 0,
            last_recurring_update: entity.last_completed || entity.last_recurring_update,
            location: entity.location,
            tags: Array.isArray(entity.tags) ? entity.tags.join(',') : entity.tags,
            notes: entity.notes || '',
            created_at: entity.created_at,
            modified: entity.updated_at || entity.modified,
            active: type === 'note' ? !entity.archived_at : (entity.status !== 'archived' && entity.status !== 'deleted'),
            archived: type === 'note' ? !!entity.archived_at : (entity.status === 'archived')
        };

        // Add type-specific fields
        if (entity.metadata) {
            Object.assign(memory, entity.metadata);
        }

        return memory;
    }

    mapFrequencyToPattern(frequency) {
        if (!frequency) return null;
        
        const mappings = {
            'daily': 'daily',
            'weekly': 'weekly',
            'monthly': 'monthly',
            'quarterly': 'quarterly',
            'yearly': 'yearly'
        };
        
        if (mappings[frequency]) return mappings[frequency];
        
        if (frequency.includes('every') && frequency.includes('days')) {
            return 'every_n_days';
        }
        if (frequency.includes('every') && frequency.includes('weeks')) {
            return 'every_n_weeks';
        }
        
        return 'custom';
    }

    mapPatternToFrequency(pattern, interval) {
        if (!pattern) return null;
        
        switch (pattern) {
            case 'daily': return 'daily';
            case 'weekly': return 'weekly';
            case 'monthly': return 'monthly';
            case 'quarterly': return 'quarterly';
            case 'yearly': return 'yearly';
            case 'every_n_days': return `every ${interval} days`;
            case 'every_n_weeks': return `every ${interval} weeks`;
            case 'every_n_months': return `every ${interval} months`;
            default: return null;
        }
    }

    // Get memories/entities for a user
    async getMemories(userId, filters = {}) {
        const entities = [];
        
        console.log(`🔍 EntityAdapter.getMemories called for user ${userId} with filters:`, filters);
        
        // Query each entity type
        const entityTypes = filters.type ? [filters.type] : ['goal', 'routine', 'task', 'event', 'note'];
        
        console.log(`📊 Querying entity types: ${entityTypes.join(', ')}`);
        
        for (const type of entityTypes) {
            const table = `${type}s`; // pluralize
            let query = `SELECT * FROM ${table} WHERE user_id = $1`;
            const params = [userId];
            let paramIndex = 2;

            // Only add status filters for tables that have a status column
            if (type !== 'note') {
                if (filters.status) {
                    query += ` AND status = $${paramIndex}`;
                    params.push(filters.status);
                    paramIndex++;
                }

                if (filters.active !== undefined) {
                    query += ` AND status ${filters.active ? '!=' : '='} 'archived'`;
                }
            }

            query += ' AND (archived_at IS NULL OR archived_at > NOW()) ORDER BY created_at DESC';

            if (filters.limit && entityTypes.length === 1) {
                query += ` LIMIT $${paramIndex}`;
                params.push(filters.limit);
                paramIndex++;
            }

            if (filters.offset && entityTypes.length === 1) {
                query += ` OFFSET $${paramIndex}`;
                params.push(filters.offset);
            }

            try {
                console.log(`🔍 Executing query for ${table}:`, query);
                console.log(`📌 With params:`, params);
                
                const result = await this.db.query(query, params);
                console.log(`✅ Found ${result.rows.length} ${type}(s)`);
                
                const typedEntities = result.rows.map(row => ({
                    ...row,
                    type: type
                }));
                entities.push(...typedEntities.map(e => this.convertEntityToMemory(e, type)));
            } catch (error) {
                console.error(`❌ Error querying ${table}:`, error);
                console.error(`Query was:`, query);
                console.error(`Params were:`, params);
            }
        }

        // Sort combined results
        entities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Apply limit/offset to combined results
        if (filters.limit) {
            const start = filters.offset || 0;
            return entities.slice(start, start + filters.limit);
        }

        return entities;
    }

    // Create a memory/entity
    async createMemory(userId, memoryData) {
        try {
            console.log('Creating memory:', { userId, type: memoryData.type });
            
            const type = memoryData.type;
            if (!type) throw new Error('Entity type is required');

            const id = memoryData.id || uuidv4();

            switch (type) {
                case 'project':
                    return await this.createProject(userId, id, memoryData);
                case 'goal':
                    return await this.createGoal(userId, id, memoryData);
                case 'routine':
                    return await this.createRoutine(userId, id, memoryData);
                case 'task':
                    return await this.createTask(userId, id, memoryData);
                case 'event':
                    return await this.createEvent(userId, id, memoryData);
                case 'note':
                    return await this.createNote(userId, id, memoryData);
                default:
                    throw new Error(`Unknown entity type: ${type}`);
            }
        } catch (error) {
            console.error('Error in createMemory:', error);
            throw error;
        }
    }

    async createProject(userId, id, data) {
        try {
            const query = `
                INSERT INTO projects (
                    id, user_id, name, description, priority,
                    status, color, tags, metadata, parent_project_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            
            let priority = String(data.priority || 5);
            if (!['1','2','3','4','5','6','7','8','9','10'].includes(priority)) {
                priority = '5';
            }
            
            let tags = [];
            if (data.tags) {
                if (Array.isArray(data.tags)) {
                    tags = data.tags;
                } else if (typeof data.tags === 'string') {
                    tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
            
            const params = [
                id, userId,
                data.title || data.content_short || 'Untitled Project',
                data.content || data.description || '',
                priority,
                data.status || 'active',
                data.color || null,
                tags,
                { notes: data.notes || null },
                data.parent_project_id || null
            ];
            
            const result = await this.db.query(query, params);
            return this.convertEntityToMemory(result.rows[0], 'project');
        } catch (error) {
            console.error('Error creating project:', error);
            throw new Error(`Failed to create project: ${error.message}`);
        }
    }

    async createGoal(userId, id, data) {
        try {
            const query = `
                INSERT INTO goals (
                    id, user_id, name, description, priority,
                    target_date, tags, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            // Validate and normalize priority
            let priority = String(data.priority || 5);
            if (!['1','2','3','4','5','6','7','8','9','10'].includes(priority)) {
                priority = '5';
            }
            
            // Handle tags properly
            let tags = [];
            if (data.tags) {
                if (Array.isArray(data.tags)) {
                    tags = data.tags;
                } else if (typeof data.tags === 'string') {
                    tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
            
            const params = [
                id, userId,
                data.title || data.content_short || data.content?.substring(0, 255) || 'Untitled Goal',
                data.content || '',
                priority,
                data.due || data.target_date || null,
                tags,
                { notes: data.notes || null }
            ];
            
            const result = await this.db.query(query, params);
            return this.convertEntityToMemory(result.rows[0], 'goal');
        } catch (error) {
            console.error('Error creating goal:', error);
            throw new Error(`Failed to create goal: ${error.message}`);
        }
    }

    async createRoutine(userId, id, data) {
        try {
            const query = `
                INSERT INTO routines (
                    id, user_id, name, description, priority,
                    recurrence_pattern, recurrence_interval, tags, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            
            // Validate and normalize priority
            let priority = String(data.priority || 5);
            if (!['1','2','3','4','5','6','7','8','9','10'].includes(priority)) {
                priority = '5';
            }
            
            // Handle tags properly
            let tags = [];
            if (data.tags) {
                if (Array.isArray(data.tags)) {
                    tags = data.tags;
                } else if (typeof data.tags === 'string') {
                    tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
            
            const params = [
                id, userId,
                data.title || data.content_short || data.content?.substring(0, 255) || 'Untitled Routine',
                data.content || data.description || '',
                priority,
                this.mapFrequencyToPattern(data.frequency) || data.recurrence_pattern || 'daily',
                data.recurrence_interval || this.extractInterval(data.frequency) || 1,
                tags,
                { 
                    notes: data.notes || null,
                    routine_type: data.routine_type || null,
                    trigger: data.trigger || null,
                    success_criteria: data.success_criteria || null,
                    time_of_day: data.time_of_day || null,
                    duration_minutes: data.duration_minutes || null
                }
            ];
            
            const result = await this.db.query(query, params);
            return this.convertEntityToMemory(result.rows[0], 'routine');
        } catch (error) {
            console.error('Error creating routine:', error);
            throw new Error(`Failed to create routine: ${error.message}`);
        }
    }

    async createTask(userId, id, data) {
        try {
            const query = `
                INSERT INTO tasks (
                    id, user_id, name, description, priority,
                    due_date, estimated_duration_minutes, tags, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            
            // Validate and normalize priority
            let priority = String(data.priority || 5);
            if (!['1','2','3','4','5','6','7','8','9','10'].includes(priority)) {
                priority = '5';
            }
            
            // Handle tags properly
            let tags = [];
            if (data.tags) {
                if (Array.isArray(data.tags)) {
                    tags = data.tags;
                } else if (typeof data.tags === 'string') {
                    tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
            
            const params = [
                id, userId,
                data.title || data.content_short || data.content?.substring(0, 255) || 'Untitled Task',
                data.content || '',
                priority,
                data.due || data.due_date || null,
                data.estimated_minutes || data.required_time_minutes || null,
                tags,
                { notes: data.notes || null }
            ];
            
            const result = await this.db.query(query, params);
            return this.convertEntityToMemory(result.rows[0], 'task');
        } catch (error) {
            console.error('Error creating task:', error);
            throw new Error(`Failed to create task: ${error.message}`);
        }
    }

    async createEvent(userId, id, data) {
        try {
            const query = `
                INSERT INTO events (
                    id, user_id, name, description, priority,
                    event_date, event_time, location, tags, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            
            // Validate and normalize priority
            let priority = String(data.priority || 5);
            if (!['1','2','3','4','5','6','7','8','9','10'].includes(priority)) {
                priority = '5';
            }
            
            // Handle tags properly
            let tags = [];
            if (data.tags) {
                if (Array.isArray(data.tags)) {
                    tags = data.tags;
                } else if (typeof data.tags === 'string') {
                    tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
            
            // Extract date and time from start_datetime if provided
            let eventDate = null;
            let eventTime = null;
            if (data.start_datetime || data.due) {
                const dateObj = new Date(data.start_datetime || data.due);
                eventDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                eventTime = dateObj.toTimeString().split(' ')[0]; // HH:MM:SS
            }
            
            const params = [
                id, userId,
                data.title || data.content_short || data.content?.substring(0, 255) || 'Untitled Event',
                data.content || data.description || '',
                priority,
                eventDate,
                eventTime,
                data.location || null,
                tags,
                { notes: data.notes || null, end_date: data.end_date || null, end_time: data.end_time || null }
            ];
            
            const result = await this.db.query(query, params);
            return this.convertEntityToMemory(result.rows[0], 'event');
        } catch (error) {
            console.error('Error creating event:', error);
            throw new Error(`Failed to create event: ${error.message}`);
        }
    }

    async createNote(userId, id, data) {
        try {
            const query = `
                INSERT INTO notes (
                    id, user_id, content, tags, metadata
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            
            // Handle tags properly
            let tags = [];
            if (data.tags) {
                if (Array.isArray(data.tags)) {
                    tags = data.tags;
                } else if (typeof data.tags === 'string') {
                    tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
                }
            }
            
            const params = [
                id, userId,
                data.content || '',
                tags,
                { original_type: data.type || null }
            ];
            
            const result = await this.db.query(query, params);
            return this.convertEntityToMemory(result.rows[0], 'note');
        } catch (error) {
            console.error('Error creating note:', error);
            throw new Error(`Failed to create note: ${error.message}`);
        }
    }

    extractInterval(frequency) {
        if (!frequency) return null;
        const match = frequency.match(/every (\d+) (?:days|weeks|months)/);
        return match ? parseInt(match[1]) : null;
    }

    // Update a memory/entity
    async updateMemory(id, userId, updates) {
        // First, find the entity type
        const entityInfo = await this.findEntityType(id, userId);
        if (!entityInfo) return null;

        const { type, table } = entityInfo;
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        // Map common fields from old schema to new schema
        const fieldMap = {
            content: type === 'note' ? 'content' : 'description',
            content_short: type === 'note' ? 'title' : 'name',
            due: type === 'event' ? 'event_date' : type === 'goal' ? 'target_date' : 'due_date',
            modified: 'updated_at',
            frequency: 'recurrence_pattern',
            notes: 'metadata'
        };
        
        // Handle special fields
        if (updates.frequency) {
            // Convert old frequency format to new recurrence pattern
            const freqMap = {
                'daily': 'daily',
                'weekly': 'weekly',
                'monthly': 'monthly',
                'every day': 'daily',
                'every week': 'weekly',
                'every month': 'monthly'
            };
            updates.frequency = freqMap[updates.frequency] || updates.frequency;
        }

        // Define valid fields for each entity type
        const validFields = {
            goal: ['name', 'description', 'priority', 'status', 'target_date', 'tags', 'metadata'],
            routine: ['name', 'description', 'priority', 'status', 'recurrence_pattern', 'recurrence_interval', 'tags', 'metadata'],
            task: ['name', 'description', 'priority', 'status', 'due_date', 'estimated_duration_minutes', 'tags', 'metadata'],
            event: ['name', 'description', 'priority', 'status', 'event_date', 'event_time', 'end_date', 'end_time', 'location', 'tags', 'metadata'],
            note: ['title', 'content', 'tags', 'metadata']
        };
        
        const allowedFields = validFields[type] || [];
        
        for (const [field, value] of Object.entries(updates)) {
            const mappedField = fieldMap[field] || field;
            if (field !== 'id' && field !== 'user_id' && field !== 'type') {
                // Only update if field is valid for this entity type
                if (allowedFields.includes(mappedField)) {
                    setClauses.push(`${mappedField} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                } else {
                    console.log(`Skipping invalid field '${mappedField}' for ${type}`);
                }
            }
        }

        // If no valid fields to update, just update timestamp
        if (setClauses.length === 0) {
            setClauses.push(`updated_at = $${paramIndex}`);
            values.push(new Date());
            paramIndex++;
        } else {
            // Always update the updated_at timestamp
            setClauses.push(`updated_at = $${paramIndex}`);
            values.push(new Date());
            paramIndex++;
        }
        
        values.push(id, userId);
        
        const query = `
            UPDATE ${table}
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *
        `;
        
        const result = await this.db.query(query, values);
        
        // Special handling for routine completion
        if (result.rows.length > 0 && type === 'routine' && updates.status === 'completed') {
            await this.rescheduleRoutine(result.rows[0]);
        }
        
        return result.rows.length > 0 ? this.convertEntityToMemory(result.rows[0], type) : null;
    }

    async findEntityType(id, userId) {
        const tables = [
            { type: 'goal', table: 'goals' },
            { type: 'routine', table: 'routines' },
            { type: 'task', table: 'tasks' },
            { type: 'event', table: 'events' },
            { type: 'note', table: 'notes' }
        ];

        for (const { type, table } of tables) {
            const result = await this.db.query(
                `SELECT id FROM ${table} WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );
            if (result.rows.length > 0) {
                return { type, table };
            }
        }

        return null;
    }

    // Delete a memory/entity
    async deleteMemory(id, userId) {
        const entityInfo = await this.findEntityType(id, userId);
        if (!entityInfo) return false;

        const { table } = entityInfo;
        
        // Soft delete by setting deleted_at
        const result = await this.db.query(
            `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [id, userId]
        );
        
        return result.rows.length > 0;
    }

    // Get today's items
    async getTodayItems(userId) {
        const result = await this.db.query(
            `SELECT * FROM today_items WHERE user_id = $1 ORDER BY computed_priority DESC, due_date ASC`,
            [userId]
        );
        return result.rows.map(row => this.convertEntityToMemory(row, row.item_type));
    }

    // Reschedule a routine after completion
    async rescheduleRoutine(routine) {
        try {
            const { id, user_id, recurrence_pattern, recurrence_interval } = routine;
            
            // Calculate next due date based on recurrence pattern
            const now = new Date();
            let nextDue = new Date(routine.next_due || now);
            
            switch (recurrence_pattern) {
                case 'daily':
                    nextDue.setDate(nextDue.getDate() + (recurrence_interval || 1));
                    break;
                case 'weekly':
                    nextDue.setDate(nextDue.getDate() + (recurrence_interval || 1) * 7);
                    break;
                case 'monthly':
                    nextDue.setMonth(nextDue.getMonth() + (recurrence_interval || 1));
                    break;
                case 'quarterly':
                    nextDue.setMonth(nextDue.getMonth() + 3);
                    break;
                case 'yearly':
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                    break;
                case 'every_n_days':
                    nextDue.setDate(nextDue.getDate() + (recurrence_interval || 1));
                    break;
                case 'every_n_weeks':
                    nextDue.setDate(nextDue.getDate() + (recurrence_interval || 1) * 7);
                    break;
                case 'every_n_months':
                    nextDue.setMonth(nextDue.getMonth() + (recurrence_interval || 1));
                    break;
                default:
                    // Default to daily if pattern not recognized
                    nextDue.setDate(nextDue.getDate() + 1);
            }
            
            // Update routine with new due date and reset status
            const updateQuery = `
                UPDATE routines 
                SET next_due = $1,
                    last_completed = CURRENT_TIMESTAMP,
                    status = 'active',
                    performance_streak = performance_streak + 1,
                    total_completions = total_completions + 1,
                    completed_steps = 0
                WHERE id = $2 AND user_id = $3
                RETURNING *
            `;
            
            const result = await this.db.query(updateQuery, [nextDue, id, user_id]);
            
            if (result.rows.length > 0) {
                console.log(`Routine ${id} rescheduled for ${nextDue.toISOString()}`);
                
                // Update longest streak if current streak is higher
                const streakQuery = `
                    UPDATE routines 
                    SET longest_streak = performance_streak
                    WHERE id = $1 AND user_id = $2 AND performance_streak > longest_streak
                `;
                await this.db.query(streakQuery, [id, user_id]);
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error rescheduling routine:', error);
            throw error;
        }
    }
}

module.exports = EntityAdapter;