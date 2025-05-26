// Enhanced MindOS Database Migration
// Run: node migrate-enhanced-memory.js

const { Pool } = require('pg');

// Database connection
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const migrationSQL = `
-- Enhanced MindOS Database Migration
-- Run this script to add tables for smart memory operations and conversation chunking

-- 1. Add operation tracking to existing memories table (if columns don't exist)
DO $$ 
BEGIN
    -- Add operation_history column to track updates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'operation_history') THEN
        ALTER TABLE memories ADD COLUMN operation_history JSONB DEFAULT '[]';
    END IF;
    
    -- Add last_operation_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'last_operation_type') THEN
        ALTER TABLE memories ADD COLUMN last_operation_type TEXT DEFAULT 'create';
    END IF;
    
    -- Add last_operation_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'last_operation_date') THEN
        ALTER TABLE memories ADD COLUMN last_operation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add update_count column to track how many times memory was updated
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'update_count') THEN
        ALTER TABLE memories ADD COLUMN update_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create conversation_sessions table for chunked responses
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

-- 3. Create conversation_chunks table for response chunking
CREATE TABLE IF NOT EXISTS conversation_chunks (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    chunk_order INTEGER NOT NULL,
    chunk_type TEXT NOT NULL, -- 'response_chunk', 'memory_confirmation', 'continuation'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

-- 4. Create memory_operations_log table for tracking operations
CREATE TABLE IF NOT EXISTS memory_operations_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id INTEGER,
    operation_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'merge'
    operation_trigger TEXT, -- 'user_input', 'ai_analysis', 'manual'
    input_text TEXT,
    confidence_score REAL,
    operation_data JSONB NOT NULL,
    result_status TEXT NOT NULL, -- 'success', 'failed', 'partial'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
);

-- 5. Create memory_matching_patterns table for smart matching
CREATE TABLE IF NOT EXISTS memory_matching_patterns (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    pattern_type TEXT NOT NULL, -- 'keyword', 'routine_completion', 'goal_progress'
    pattern_data JSONB NOT NULL,
    match_confidence REAL DEFAULT 0.8,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    use_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity ON conversation_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_conversation_chunks_session_id ON conversation_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_chunks_user_id ON conversation_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_chunks_status ON conversation_chunks(status);
CREATE INDEX IF NOT EXISTS idx_conversation_chunks_order ON conversation_chunks(session_id, chunk_order);

CREATE INDEX IF NOT EXISTS idx_memory_operations_user_id ON memory_operations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_operations_memory_id ON memory_operations_log(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_operations_type ON memory_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_memory_operations_status ON memory_operations_log(result_status);
CREATE INDEX IF NOT EXISTS idx_memory_operations_created_at ON memory_operations_log(created_at);

CREATE INDEX IF NOT EXISTS idx_memory_matching_user_id ON memory_matching_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_matching_type ON memory_matching_patterns(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_matching_active ON memory_matching_patterns(is_active);

CREATE INDEX IF NOT EXISTS idx_memories_operation_history ON memories USING GIN(operation_history);
CREATE INDEX IF NOT EXISTS idx_memories_last_operation ON memories(last_operation_type, last_operation_date);
CREATE INDEX IF NOT EXISTS idx_memories_update_count ON memories(update_count);
`;

const migrationSQL2 = `
-- 7. Insert default memory matching patterns for common operations
INSERT INTO memory_matching_patterns (user_id, memory_type, pattern_type, pattern_data, match_confidence) 
SELECT DISTINCT user_id, 'routine', 'routine_completion', 
    '{"keywords": ["did", "completed", "finished", "done"], "routine_types": ["morning", "evening", "workout", "exercise"]}', 
    0.85
FROM "user"
ON CONFLICT DO NOTHING;

INSERT INTO memory_matching_patterns (user_id, memory_type, pattern_type, pattern_data, match_confidence) 
SELECT DISTINCT user_id, 'goal', 'goal_progress', 
    '{"keywords": ["achieved", "progress", "working on", "completed"], "confidence_boost": 0.1}', 
    0.8
FROM "user"
ON CONFLICT DO NOTHING;

-- 8. Create function to clean up old conversation data
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
    -- Delete conversation chunks older than 7 days that have been sent
    DELETE FROM conversation_chunks 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND status = 'sent';
    
    -- Delete conversation sessions older than 30 days
    DELETE FROM conversation_sessions 
    WHERE last_activity < NOW() - INTERVAL '30 days';
    
    -- Delete memory operation logs older than 90 days
    DELETE FROM memory_operations_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to update memory operation history
CREATE OR REPLACE FUNCTION update_memory_operation_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Update operation history for updates
    IF TG_OP = 'UPDATE' THEN
        NEW.operation_history = COALESCE(OLD.operation_history, '[]'::jsonb) || 
            jsonb_build_object(
                'operation', 'update',
                'timestamp', NOW(),
                'changes', jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'old_modified', OLD.modified,
                    'new_modified', NEW.modified
                )
            );
        NEW.last_operation_type = 'update';
        NEW.last_operation_date = CURRENT_TIMESTAMP;
        NEW.update_count = COALESCE(OLD.update_count, 0) + 1;
    END IF;
    
    -- Set initial values for new records
    IF TG_OP = 'INSERT' THEN
        NEW.operation_history = COALESCE(NEW.operation_history, '[]'::jsonb) || 
            jsonb_build_object(
                'operation', 'create',
                'timestamp', NOW()
            );
        NEW.last_operation_type = 'create';
        NEW.last_operation_date = CURRENT_TIMESTAMP;
        NEW.update_count = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS memories_operation_history_trigger ON memories;
CREATE TRIGGER memories_operation_history_trigger
    BEFORE INSERT OR UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_memory_operation_history();

-- 10. Create function to get memory update suggestions
CREATE OR REPLACE FUNCTION get_memory_update_suggestions(
    p_user_id TEXT,
    p_input_text TEXT,
    p_memory_type TEXT DEFAULT NULL
)
RETURNS TABLE(
    memory_id INTEGER,
    memory_type TEXT,
    content_short TEXT,
    match_score REAL,
    match_reason TEXT
) AS $$
DECLARE
    input_lower TEXT := LOWER(p_input_text);
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.type,
        m.content_short,
        CASE 
            WHEN input_lower LIKE '%' || LOWER(m.routine_type) || '%' AND m.type = 'routine' THEN 0.9
            WHEN input_lower LIKE '%routine%' AND m.type = 'routine' THEN 0.8
            WHEN input_lower LIKE '%workout%' AND LOWER(m.content) LIKE '%workout%' THEN 0.8
            WHEN input_lower LIKE '%morning%' AND LOWER(m.content) LIKE '%morning%' THEN 0.8
            WHEN input_lower LIKE '%evening%' AND LOWER(m.content) LIKE '%evening%' THEN 0.8
            ELSE 0.6
        END as match_score,
        CASE 
            WHEN input_lower LIKE '%' || LOWER(m.routine_type) || '%' AND m.type = 'routine' THEN 'Routine type match'
            WHEN input_lower LIKE '%routine%' AND m.type = 'routine' THEN 'Generic routine match'
            WHEN input_lower LIKE '%workout%' AND LOWER(m.content) LIKE '%workout%' THEN 'Workout content match'
            WHEN input_lower LIKE '%morning%' AND LOWER(m.content) LIKE '%morning%' THEN 'Morning routine match'
            WHEN input_lower LIKE '%evening%' AND LOWER(m.content) LIKE '%evening%' THEN 'Evening routine match'
            ELSE 'Keyword match'
        END as match_reason
    FROM memories m
    WHERE m.user_id = p_user_id
    AND m.status != 'archived'
    AND (p_memory_type IS NULL OR m.type = p_memory_type)
    AND (
        (input_lower LIKE '%did%' OR input_lower LIKE '%completed%' OR input_lower LIKE '%finished%' OR input_lower LIKE '%done%')
        AND (
            LOWER(m.content) LIKE '%' || SPLIT_PART(input_lower, ' ', 2) || '%'
            OR input_lower LIKE '%' || LOWER(m.routine_type) || '%'
            OR (input_lower LIKE '%routine%' AND m.type = 'routine')
            OR (input_lower LIKE '%workout%' AND LOWER(m.content) LIKE '%workout%')
            OR (input_lower LIKE '%morning%' AND LOWER(m.content) LIKE '%morning%')
            OR (input_lower LIKE '%evening%' AND LOWER(m.content) LIKE '%evening%')
        )
    )
    ORDER BY match_score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- 11. Create summary view for memory analytics
CREATE OR REPLACE VIEW memory_operation_analytics AS
SELECT 
    user_id,
    DATE(created_at) as operation_date,
    operation_type,
    COUNT(*) as operation_count,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN result_status = 'success' THEN 1 END) as successful_operations,
    COUNT(CASE WHEN result_status = 'failed' THEN 1 END) as failed_operations
FROM memory_operations_log
GROUP BY user_id, DATE(created_at), operation_type
ORDER BY operation_date DESC;
`;

async function runMigration() {
    let client;
    
    try {
        console.log('🔄 Connecting to database...');
        client = await db.connect();
        
        console.log('🚀 Starting enhanced memory migration...');
        
        // Run the main migration SQL
        console.log('📝 Creating tables and indexes...');
        await client.query(migrationSQL);
        
        console.log('🎯 Setting up functions and patterns...');
        await client.query(migrationSQL2);
        
        // Run cleanup function
        console.log('🧹 Running initial cleanup...');
        await client.query('SELECT cleanup_old_conversations();');
        
        // Get migration summary
        const result = await client.query(`
            SELECT 
                'Migration Summary' as status,
                COUNT(CASE WHEN table_name = 'conversation_sessions' THEN 1 END) as conversation_sessions,
                COUNT(CASE WHEN table_name = 'conversation_chunks' THEN 1 END) as conversation_chunks,
                COUNT(CASE WHEN table_name = 'memory_operations_log' THEN 1 END) as memory_operations_log,
                COUNT(CASE WHEN table_name = 'memory_matching_patterns' THEN 1 END) as memory_matching_patterns
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('conversation_sessions', 'conversation_chunks', 'memory_operations_log', 'memory_matching_patterns');
        `);
        
        console.log('✅ Migration completed successfully!');
        console.table(result.rows);
        
        // Verify new columns were added to memories table
        const memoryColumns = await client.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'memories' 
            AND column_name IN ('operation_history', 'last_operation_type', 'last_operation_date', 'update_count')
            ORDER BY column_name;
        `);
        
        console.log('📊 New columns added to memories table:');
        console.table(memoryColumns.rows);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await db.end();
        console.log('🔌 Database connection closed');
    }
}

// Handle different operations based on command line arguments
if (require.main === module) {
    const operation = process.argv[2];
    
    switch (operation) {
        case 'cleanup':
            runCleanup()
                .then(() => {
                    console.log('🎉 Database cleanup completed!');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('💥 Cleanup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'status':
            checkStatus()
                .then(() => {
                    console.log('📊 Status check completed!');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('💥 Status check failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            // Default: run migration
            runMigration()
                .then(() => {
                    console.log('🎉 Enhanced memory migration completed successfully!');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('💥 Migration script failed:', error);
                    process.exit(1);
                });
            break;
    }
}

// Utility function to run cleanup
async function runCleanup() {
    let client;
    
    try {
        console.log('🧹 Running database cleanup...');
        client = await db.connect();
        
        const result = await client.query('SELECT cleanup_old_conversations();');
        console.log('✅ Cleanup completed successfully');
        
        // Show cleanup stats
        const stats = await client.query(`
            SELECT 
                'Cleanup Stats' as operation,
                (SELECT COUNT(*) FROM conversation_sessions WHERE status = 'active') as active_sessions,
                (SELECT COUNT(*) FROM conversation_chunks WHERE status = 'pending') as pending_chunks,
                (SELECT COUNT(*) FROM memory_operations_log WHERE created_at > NOW() - INTERVAL '7 days') as recent_operations
        `);
        
        console.table(stats.rows);
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    } finally {
        if (client) client.release();
        await db.end();
    }
}

// Utility function to check migration status
async function checkStatus() {
    let client;
    
    try {
        console.log('📊 Checking database status...');
        client = await db.connect();
        
        // Check if enhanced tables exist
        const tableCheck = await client.query(`
            SELECT 
                table_name,
                CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
            FROM (
                VALUES 
                    ('conversation_sessions'),
                    ('conversation_chunks'), 
                    ('memory_operations_log'),
                    ('memory_matching_patterns')
            ) AS expected(table_name)
            LEFT JOIN information_schema.tables t 
                ON t.table_name = expected.table_name 
                AND t.table_schema = 'public'
            ORDER BY expected.table_name;
        `);
        
        console.log('📋 Enhanced Tables Status:');
        console.table(tableCheck.rows);
        
        // Check memory table columns
        const columnCheck = await client.query(`
            SELECT 
                column_name,
                data_type,
                CASE WHEN column_default IS NOT NULL THEN 'YES' ELSE 'NO' END as has_default
            FROM information_schema.columns 
            WHERE table_name = 'memories' 
            AND column_name IN ('operation_history', 'last_operation_type', 'last_operation_date', 'update_count')
            ORDER BY column_name;
        `);
        
        console.log('🗃️ Enhanced Memory Columns:');
        console.table(columnCheck.rows);
        
        // Show recent activity
        const activityCheck = await client.query(`
            SELECT 
                'Recent Activity (7 days)' as period,
                (SELECT COUNT(*) FROM memory_operations_log WHERE created_at > NOW() - INTERVAL '7 days') as memory_operations,
                (SELECT COUNT(*) FROM conversation_sessions WHERE last_activity > NOW() - INTERVAL '7 days') as active_conversations,
                (SELECT COUNT(*) FROM conversation_chunks WHERE created_at > NOW() - INTERVAL '7 days') as conversation_chunks
        `);
        
        console.log('📈 Recent Activity:');
        console.table(activityCheck.rows);
        
    } catch (error) {
        console.error('❌ Status check failed:', error);
        
        // If tables don't exist, suggest migration
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log('\n💡 Enhanced tables not found. Run migration:');
            console.log('   npm run migrate-enhanced');
        }
        
        process.exit(1);
    } finally {
        if (client) client.release();
        await db.end();
    }
}

module.exports = { runMigration, runCleanup, checkStatus };
