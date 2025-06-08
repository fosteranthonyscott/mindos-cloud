const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Migration status tracking
async function logMigration(phase, status, error = null) {
    try {
        await pool.query(`
            INSERT INTO migration_status (phase, status, started_at, completed_at, error_message)
            VALUES ($1, $2, CURRENT_TIMESTAMP, 
                    CASE WHEN $2 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END, 
                    $3)
        `, [phase, status, error]);
    } catch (err) {
        console.error('Failed to log migration status:', err);
    }
}

// Check if new schema exists
async function checkNewSchema() {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name IN ('goals', 'routines', 'tasks', 'events', 'projects', 'users')
            AND table_schema = 'public'
        `);
        // New schema exists only if ALL core tables exist
        return parseInt(result.rows[0].count) >= 5;
    } catch (error) {
        console.error('Error checking schema:', error);
        return false;
    }
}

// Check if old schema exists
async function checkOldSchema() {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = 'memories'
        `);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('Error checking old schema:', error);
        return false;
    }
}

// Initialize new schema
async function initializeNewSchema() {
    console.log('Initializing new database schema...');
    
    try {
        // Read and execute the schema SQL file
        const schemaSQL = await fs.readFile(path.join(__dirname, 'database-schema.sql'), 'utf8');
        
        // Split by semicolons but be careful with functions/triggers
        const statements = schemaSQL
            .split(/;(?=\s*(?:--|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|$))/i)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.length > 0) {
                try {
                    await pool.query(statement);
                } catch (err) {
                    // Ignore errors for "already exists" cases
                    if (!err.message.includes('already exists')) {
                        console.error('Error executing statement:', err.message);
                        throw err;
                    }
                }
            }
        }
        
        console.log('✓ New schema created successfully');
        await logMigration('schema_creation', 'completed');
        return true;
    } catch (error) {
        console.error('Failed to initialize new schema:', error);
        await logMigration('schema_creation', 'failed', error.message);
        throw error;
    }
}

// Ensure user has required fields for new schema
async function updateUserSchema() {
    try {
        // Add tenant_id if it doesn't exist
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT uuid_generate_v4()
        `);
        
        // Add role if it doesn't exist (using text for now, will convert later)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER'
        `);
        
        // Update any null tenant_ids
        await pool.query(`
            UPDATE users 
            SET tenant_id = uuid_generate_v4() 
            WHERE tenant_id IS NULL
        `);
        
        console.log('✓ User schema updated');
        return true;
    } catch (error) {
        console.error('Error updating user schema:', error);
        // Don't throw - this might fail if columns already exist
        return false;
    }
}

// Create default user preferences
async function createDefaultPreferences() {
    try {
        // Create preferences for users who don't have them
        await pool.query(`
            INSERT INTO user_preferences (user_id)
            SELECT u.id
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM user_preferences up 
                WHERE up.user_id = u.id
            )
        `);
        
        console.log('✓ Default user preferences created');
        return true;
    } catch (error) {
        console.error('Error creating default preferences:', error);
        return false;
    }
}

// Main initialization function
async function initializeDatabase() {
    console.log('Starting database initialization...');
    
    try {
        // Check current state
        const hasNewSchema = await checkNewSchema();
        const hasOldSchema = await checkOldSchema();
        
        console.log(`Schema status - Old: ${hasOldSchema}, New: ${hasNewSchema}`);
        
        // If new schema doesn't exist, log but don't auto-create
        if (!hasNewSchema) {
            console.log('⚠️ New schema not deployed - running with old schema only');
            // Don't auto-create in production
            // await initializeNewSchema();
        } else {
            console.log('✓ New schema already exists');
        }
        
        // Only update schemas if new schema exists
        if (hasNewSchema) {
            await updateUserSchema();
            await createDefaultPreferences();
        }
        
        // If we have both schemas, we're in migration mode
        if (hasOldSchema && hasNewSchema) {
            console.log('⚠️  Both old and new schemas exist - migration mode');
            // Migration will be handled separately
        }
        
        console.log('✓ Database initialization complete');
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Export for use in server.js
module.exports = {
    pool,
    initializeDatabase,
    checkNewSchema,
    checkOldSchema,
    logMigration
};