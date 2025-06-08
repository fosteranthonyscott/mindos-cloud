// Script to create test data in the new schema
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestData() {
    try {
        // First, get a user ID to work with
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            console.error('No users found in database!');
            return;
        }
        
        const userId = userResult.rows[0].id;
        console.log(`Creating test data for user: ${userId}`);
        
        // Create a project
        const projectResult = await pool.query(`
            INSERT INTO projects (user_id, name, description, status, priority)
            VALUES ($1, 'Full Brain Development', 'Main project for app improvements', 'active', '8')
            RETURNING id
        `, [userId]);
        const projectId = projectResult.rows[0].id;
        
        // Create goals
        await pool.query(`
            INSERT INTO goals (user_id, project_id, name, description, priority, status)
            VALUES 
            ($1, $2, 'Launch Full Brain v2', 'Complete the migration to new schema and deploy', '9', 'active'),
            ($1, $2, 'Implement AI Features', 'Add advanced Claude integration features', '7', 'active'),
            ($1, NULL, 'Learn Spanish', 'Achieve conversational fluency in Spanish', '6', 'active')
        `, [userId, projectId]);
        
        // Create routines
        await pool.query(`
            INSERT INTO routines (user_id, name, description, priority, status, recurrence_pattern)
            VALUES 
            ($1, 'Morning Meditation', 'Start the day with 10 minutes of mindfulness', '8', 'active', 'daily'),
            ($1, 'Weekly Review', 'Review goals and plan for the week', '7', 'active', 'weekly'),
            ($1, 'Exercise', 'Physical activity for health', '9', 'active', 'daily')
        `, [userId]);
        
        // Create tasks
        await pool.query(`
            INSERT INTO tasks (user_id, project_id, name, description, priority, status, due_date)
            VALUES 
            ($1, $2, 'Fix database schema issues', 'Resolve column mismatches in entity adapter', '10', 'active', CURRENT_DATE),
            ($1, $2, 'Test enhanced endpoint', 'Verify all API endpoints work correctly', '9', 'active', CURRENT_DATE + INTERVAL '1 day'),
            ($1, NULL, 'Buy groceries', 'Weekly shopping for essentials', '5', 'active', CURRENT_DATE),
            ($1, NULL, 'Call mom', 'Weekly check-in call', '7', 'active', CURRENT_DATE + INTERVAL '2 days')
        `, [userId, projectId]);
        
        // Create events
        await pool.query(`
            INSERT INTO events (user_id, name, description, priority, status, start_datetime, end_datetime)
            VALUES 
            ($1, 'Team Meeting', 'Weekly sync with development team', '8', 'active', 
                CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day 1 hour'),
            ($1, 'Doctor Appointment', 'Annual checkup', '9', 'active',
                CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '5 days 30 minutes')
        `, [userId]);
        
        // Create notes
        await pool.query(`
            INSERT INTO notes (user_id, title, content, tags)
            VALUES 
            ($1, 'API Design Ideas', 'Consider implementing GraphQL for more flexible queries', ARRAY['development', 'api']),
            ($1, 'Meeting Notes', 'Discussed new feature roadmap and timeline', ARRAY['meeting', 'planning']),
            ($1, 'Bug Report', 'Users reporting slow load times on mobile devices', ARRAY['bug', 'performance'])
        `, [userId]);
        
        console.log('✅ Test data created successfully!');
        console.log('Created:');
        console.log('- 1 project');
        console.log('- 3 goals');
        console.log('- 3 routines');
        console.log('- 4 tasks');
        console.log('- 2 events');
        console.log('- 3 notes');
        
    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        await pool.end();
    }
}

// Check command line argument
if (process.argv[2] === '--confirm') {
    createTestData();
} else {
    console.log('This script will create test data in your database.');
    console.log('To run it, use: node create-test-data.js --confirm');
    console.log('\nMake sure you have the correct DATABASE_URL in your .env file!');
}