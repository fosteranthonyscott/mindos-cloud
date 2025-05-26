const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
    try {
        console.log('🔄 Running database migrations...');
        
        // Create user table
        await db.query(`
            CREATE TABLE IF NOT EXISTS "user" (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                onboarding_complete BOOLEAN DEFAULT false
            );
        `);
        
        // Create memories table
        await db.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES "user"(user_id)
            );
        `);
        
        // Create indexes
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
            CREATE INDEX IF NOT EXISTS idx_user_user_id ON "user"(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username);
            CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
            CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
        `);
        
        console.log('✅ Database migrations completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await db.end();
    }
}

migrate();
