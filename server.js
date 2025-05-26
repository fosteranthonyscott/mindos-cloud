const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'mindos-jwt-secret-2025';

// PostgreSQL connection with proper configuration
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
db.connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => console.error('❌ Database connection error:', err));

// Auto-run migration if environment variable is set
async function runMigrationIfNeeded() {
    if (process.env.RUN_MIGRATION === 'true') {
        try {
            console.log('🔄 Running database migrations...');
            
            // Drop existing tables if they exist
            await db.query(`DROP TABLE IF EXISTS memories CASCADE;`);
            await db.query(`DROP TABLE IF EXISTS "user" CASCADE;`);
            
            // Create user table
            await db.query(`
                CREATE TABLE "user" (
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
                CREATE TABLE memories (
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
        }
    }
}

// Run migration after database connection
runMigrationIfNeeded();

// In-memory conversation storage (sessions)
const activeConversations = new Map();

// Authentication middleware
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
};

// ... rest of your existing code remains the same ...
