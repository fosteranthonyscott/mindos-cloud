// RECURRING TASK MANAGER - Uses NEW SCHEMA
// This file manages recurring tasks using the new entity tables

class RecurringTaskManager {
    constructor(db, textParser) {
        this.db = db;
        this.textParser = textParser;
        this.isRunning = false;
        this.processes = [];
        this.startTime = new Date();
    }

    start() {
        console.log('🔄 Starting Recurring Task Manager...');
        this.isRunning = true;
        this.processes = ['Due Date Checker', 'Maintenance', 'Cleanup'];
        console.log('✅ Recurring Task Manager started');
    }

    stop() {
        console.log('🛑 Stopping Recurring Task Manager...');
        this.isRunning = false;
        this.processes = [];
        console.log('✅ Recurring Task Manager stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            processes: this.processes,
            uptime: this.isRunning ? Math.floor((new Date() - this.startTime) / 1000) : 0
        };
    }

    async getStatistics() {
        try {
            // Get statistics from new schema tables
            const queries = [
                // Total items across all entity tables
                `SELECT 
                    (SELECT COUNT(*) FROM goals WHERE deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM routines WHERE deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL) as total_items`,
                
                // Recurring items (only routines have recurrence)
                `SELECT COUNT(*) as recurring_items 
                 FROM routines 
                 WHERE deleted_at IS NULL 
                 AND recurrence_pattern IS NOT NULL`,
                
                // Completed items
                `SELECT 
                    (SELECT COUNT(*) FROM goals WHERE status = 'completed' AND deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM routines WHERE status = 'completed' AND deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND deleted_at IS NULL) +
                    (SELECT COUNT(*) FROM events WHERE status = 'completed' AND deleted_at IS NULL) as completed_items`
            ];
            
            const results = await Promise.all(queries.map(q => this.db.query(q)));
            
            return {
                totalItems: parseInt(results[0].rows[0].total_items) || 0,
                recurringItems: parseInt(results[1].rows[0].recurring_items) || 0,
                completedItems: parseInt(results[2].rows[0].completed_items) || 0,
                lastUpdate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                totalItems: 0,
                recurringItems: 0,
                completedItems: 0,
                lastUpdate: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async triggerDueCheck() {
        console.log('🔍 Triggering due date check...');
        try {
            // Check overdue items in new schema
            const queries = [
                `SELECT COUNT(*) as count FROM goals 
                 WHERE target_date < CURRENT_DATE 
                 AND status = 'active' 
                 AND deleted_at IS NULL`,
                
                `SELECT COUNT(*) as count FROM tasks 
                 WHERE due_date < CURRENT_DATE 
                 AND status = 'active' 
                 AND deleted_at IS NULL`,
                
                `SELECT COUNT(*) as count FROM events 
                 WHERE event_date < CURRENT_DATE 
                 AND status = 'active' 
                 AND deleted_at IS NULL`
            ];
            
            const results = await Promise.all(queries.map(q => this.db.query(q)));
            const overdueCount = results.reduce((sum, r) => sum + parseInt(r.rows[0].count), 0);
            
            console.log(`📅 Found ${overdueCount} overdue items`);
            return true;
        } catch (error) {
            console.error('Error in due check:', error);
            return false;
        }
    }

    async triggerMaintenance() {
        console.log('🔧 Triggering maintenance...');
        // Basic maintenance - can be enhanced
        return true;
    }

    async triggerCleanup() {
        console.log('🧹 Triggering cleanup...');
        // Basic cleanup - can be enhanced
        return true;
    }

    async handleItemCompletion(itemId, userId, completionDate = new Date()) {
        try {
            console.log(`✅ Handling completion for item ${itemId}`);
            
            // Find which table contains this item
            const tables = [
                { name: 'goals', type: 'goal' },
                { name: 'routines', type: 'routine' },
                { name: 'tasks', type: 'task' },
                { name: 'events', type: 'event' }
            ];
            
            let item = null;
            let tableName = null;
            let itemType = null;
            
            for (const table of tables) {
                const result = await this.db.query(
                    `SELECT * FROM ${table.name} WHERE id = $1 AND user_id = $2`,
                    [itemId, userId]
                );
                
                if (result.rows.length > 0) {
                    item = result.rows[0];
                    tableName = table.name;
                    itemType = table.type;
                    break;
                }
            }
            
            if (!item) {
                throw new Error('Item not found or access denied');
            }
            
            // Update the item as completed
            const updateData = {
                status: 'completed',
                completed_date: completionDate
            };
            
            // Update performance streak if it's a routine
            if (itemType === 'routine') {
                const currentStreak = parseInt(item.performance_streak) || 0;
                updateData.performance_streak = currentStreak + 1;
                updateData.last_completed = completionDate;
            }
            
            // Build update query
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            Object.entries(updateData).forEach(([key, value]) => {
                updateFields.push(`${key} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            });
            
            updateValues.push(itemId, userId);
            
            const updateQuery = `
                UPDATE ${tableName}
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
                RETURNING *
            `;
            
            const result = await this.db.query(updateQuery, updateValues);
            const updatedItem = result.rows[0];
            
            // Handle recurring logic if it's a routine with recurrence
            if (itemType === 'routine' && item.recurrence_pattern) {
                console.log(`🔄 Routine has recurrence pattern: ${item.recurrence_pattern}, would create next instance`);
                // TODO: Implement recurring instance creation logic
                // This would involve calculating the next due date based on recurrence_pattern
                // and recurrence_interval, then creating a new task for the next occurrence
            }
            
            return updatedItem;
            
        } catch (error) {
            console.error('Error handling item completion:', error);
            throw error;
        }
    }
}

module.exports = { RecurringTaskManager };