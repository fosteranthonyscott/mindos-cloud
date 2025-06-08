// Entity adapter to provide compatibility between old memories table and new schema
const { v4: uuidv4 } = require('uuid');

class EntityAdapter {
    constructor(db, useNewSchema) {
        this.db = db;
        this.useNewSchema = useNewSchema;
    }

    // Convert memory record to entity format
    convertMemoryToEntity(memory) {
        return {
            id: memory.id,
            user_id: memory.user_id,
            type: memory.type,
            name: memory.content_short || memory.content?.substring(0, 255),
            content: memory.content,
            content_short: memory.content_short,
            priority: memory.priority || 5,
            status: memory.status || 'active',
            due: memory.due,
            due_date: memory.due,
            completed_date: memory.completed_date,
            frequency: memory.frequency,
            recurrence_pattern: this.mapFrequencyToPattern(memory.frequency),
            performance_streak: memory.performance_streak || 0,
            last_recurring_update: memory.last_recurring_update,
            location: memory.location,
            tags: memory.tags,
            notes: memory.notes,
            created_at: memory.created_at,
            modified: memory.modified,
            metadata: {
                active: memory.active,
                archived: memory.archived,
                stage: memory.stage,
                mood: memory.mood,
                routine_type: memory.routine_type,
                required_time_minutes: memory.required_time_minutes,
                trigger: memory.trigger,
                success_criteria: memory.success_criteria
            }
        };
    }

    // Convert entity to memory format for legacy compatibility
    convertEntityToMemory(entity, type) {
        const memory = {
            id: entity.id,
            user_id: entity.user_id,
            type: type,
            content: entity.description || entity.content || entity.name,
            content_short: entity.name || entity.content_short,
            priority: parseInt(entity.priority) || 5,
            status: entity.status,
            due: entity.due_date || entity.event_date || entity.target_date,
            completed_date: entity.completed_date,
            frequency: this.mapPatternToFrequency(entity.recurrence_pattern, entity.recurrence_interval),
            performance_streak: entity.performance_streak || 0,
            last_recurring_update: entity.last_completed || entity.last_recurring_update,
            location: entity.location,
            tags: Array.isArray(entity.tags) ? entity.tags.join(',') : entity.tags,
            notes: entity.notes || '',
            created_at: entity.created_at,
            modified: entity.updated_at || entity.modified,
            active: entity.status !== 'archived' && entity.status !== 'deleted',
            archived: entity.status === 'archived'
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
        if (this.useNewSchema) {
            return await this.getEntities(userId, filters);
        } else {
            return await this.getLegacyMemories(userId, filters);
        }
    }

    async getLegacyMemories(userId, filters) {
        let query = 'SELECT * FROM memories WHERE user_id = $1';
        const params = [userId];
        let paramIndex = 2;

        if (filters.type) {
            query += ` AND type = $${paramIndex}`;
            params.push(filters.type);
            paramIndex++;
        }

        if (filters.status) {
            query += ` AND status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.active !== undefined) {
            query += ` AND (active IS NULL OR active = $${paramIndex})`;
            params.push(filters.active);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filters.limit);
            paramIndex++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(filters.offset);
        }

        const result = await this.db.query(query, params);
        return result.rows.map(row => this.convertMemoryToEntity(row));
    }

    async getEntities(userId, filters) {
        const entities = [];
        
        // Query each entity type
        const entityTypes = filters.type ? [filters.type] : ['goal', 'routine', 'task', 'event', 'note'];
        
        for (const type of entityTypes) {
            const table = `${type}s`; // pluralize
            let query = `SELECT * FROM ${table} WHERE user_id = $1`;
            const params = [userId];
            let paramIndex = 2;

            if (filters.status) {
                query += ` AND status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.active !== undefined) {
                query += ` AND status ${filters.active ? '!=' : '='} 'archived'`;
            }

            query += ' AND deleted_at IS NULL ORDER BY created_at DESC';

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
                const result = await this.db.query(query, params);
                const typedEntities = result.rows.map(row => ({
                    ...row,
                    type: type
                }));
                entities.push(...typedEntities.map(e => this.convertEntityToMemory(e, type)));
            } catch (error) {
                console.error(`Error querying ${table}:`, error);
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
            console.log('Creating memory:', { userId, type: memoryData.type, useNewSchema: this.useNewSchema });
            
            if (this.useNewSchema) {
                return await this.createEntity(userId, memoryData);
            } else {
                return await this.createLegacyMemory(userId, memoryData);
            }
        } catch (error) {
            console.error('Error in createMemory:', error);
            throw error;
        }
    }

    async createLegacyMemory(userId, data) {
        try {
            const id = data.id || uuidv4();
            const columns = ['id', 'user_id'];
            const values = [id, userId];
            const placeholders = ['$1', '$2'];
            let paramIndex = 3;

            // Map of fields to include
            const fieldMap = {
                type: data.type,
                content: data.content,
                content_short: data.content_short,
                priority: parseInt(data.priority) || 3,
                status: data.status || 'active',
                due: data.due,
                frequency: data.frequency,
                location: data.location,
                tags: data.tags,
                notes: data.notes,
                active: data.active !== false,
                archived: data.archived || false,
                created_at: new Date(),
                modified: new Date()
            };

            for (const [field, value] of Object.entries(fieldMap)) {
                if (value !== undefined) {
                    columns.push(field);
                    values.push(value);
                    placeholders.push(`$${paramIndex}`);
                    paramIndex++;
                }
            }

            const query = `INSERT INTO memories (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
            console.log('Legacy memory query:', { columns: columns.length, values: values.length });
            
            const result = await this.db.query(query, values);
            return this.convertMemoryToEntity(result.rows[0]);
        } catch (error) {
            console.error('Error creating legacy memory:', error);
            throw new Error(`Failed to create legacy memory: ${error.message}`);
        }
    }

    async createEntity(userId, data) {
        const type = data.type;
        if (!type) throw new Error('Entity type is required');

        const id = data.id || uuidv4();
        let tenantId = data.tenantId;
        
        try {
            if (!tenantId) {
                tenantId = await this.getUserTenantId(userId);
                if (!tenantId) {
                    console.warn('No tenant_id found for user, generating new one');
                    tenantId = uuidv4();
                }
            }

            switch (type) {
                case 'project':
                    return await this.createProject(userId, id, data);
                case 'goal':
                    return await this.createGoal(userId, id, tenantId, data);
                case 'routine':
                    return await this.createRoutine(userId, id, data);
                case 'task':
                    return await this.createTask(userId, id, tenantId, data);
                case 'event':
                    return await this.createEvent(userId, id, data);
                case 'note':
                    return await this.createNote(userId, id, data);
                default:
                    throw new Error(`Unknown entity type: ${type}`);
            }
        } catch (error) {
            console.error(`Error creating ${type} entity:`, error);
            throw error;
        }
    }

    // tenant_id not used in new schema
    async getUserTenantId(userId) {
        return null; // No tenant_id in new schema
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

    async createGoal(userId, id, tenantId, data) {
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
                    recurrence, recurrence_interval, tags, metadata
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
                data.recurrence || this.mapFrequencyToPattern(data.frequency) || 'daily',
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

    async createTask(userId, id, tenantId, data) {
        try {
            const query = `
                INSERT INTO tasks (
                    id, user_id, name, description, priority,
                    due_date, estimated_minutes, tags, metadata
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
                    start_datetime, location, tags, metadata
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
                data.title || data.content_short || data.content?.substring(0, 255) || 'Untitled Event',
                data.content || data.description || '',
                priority,
                data.start_datetime || new Date().toISOString(),
                data.location || null,
                tags,
                { notes: data.notes || null, end_datetime: data.end_datetime || null }
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
        if (this.useNewSchema) {
            return await this.updateEntity(id, userId, updates);
        } else {
            return await this.updateLegacyMemory(id, userId, updates);
        }
    }

    async updateLegacyMemory(id, userId, updates) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        for (const [field, value] of Object.entries(updates)) {
            if (field !== 'id' && field !== 'user_id') {
                setClauses.push(`${field} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        setClauses.push(`modified = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;

        values.push(id, userId);
        
        const query = `
            UPDATE memories 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *
        `;
        
        const result = await this.db.query(query, values);
        return result.rows.length > 0 ? this.convertMemoryToEntity(result.rows[0]) : null;
    }

    async updateEntity(id, userId, updates) {
        // First, find the entity type
        const entityInfo = await this.findEntityType(id, userId);
        if (!entityInfo) return null;

        const { type, table } = entityInfo;
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        // Map common fields
        const fieldMap = {
            content: 'description',
            content_short: 'name',
            due: type === 'event' ? 'event_date' : type === 'goal' ? 'target_date' : 'due_date'
        };

        for (const [field, value] of Object.entries(updates)) {
            const mappedField = fieldMap[field] || field;
            if (field !== 'id' && field !== 'user_id' && field !== 'type') {
                setClauses.push(`${mappedField} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        values.push(id, userId);
        
        const query = `
            UPDATE ${table}
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *
        `;
        
        const result = await this.db.query(query, values);
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
        if (this.useNewSchema) {
            return await this.deleteEntity(id, userId);
        } else {
            return await this.deleteLegacyMemory(id, userId);
        }
    }

    async deleteLegacyMemory(id, userId) {
        const result = await this.db.query(
            'DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rows.length > 0;
    }

    async deleteEntity(id, userId) {
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
        if (this.useNewSchema) {
            const result = await this.db.query(
                `SELECT * FROM today_items WHERE user_id = $1 ORDER BY computed_priority DESC, due_date ASC`,
                [userId]
            );
            return result.rows.map(row => this.convertEntityToMemory(row, row.item_type));
        } else {
            return await this.getTodayLegacyItems(userId);
        }
    }

    async getTodayLegacyItems(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const result = await this.db.query(`
            SELECT * FROM memories 
            WHERE user_id = $1 
                AND (active IS NULL OR active = true)
                AND (archived IS NULL OR archived = false)
                AND (
                    (due <= $2) OR 
                    (frequency IS NOT NULL AND status = 'active')
                )
            ORDER BY priority DESC, due ASC
        `, [userId, today]);
        
        return result.rows.map(row => this.convertMemoryToEntity(row));
    }
}

module.exports = EntityAdapter;