// Direct database insert for specific user
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function insertTestDataForUser() {
    const userId = '2d1050cc-cb81-42cc-9aea-d3cf1e738ffa';
    const email = 'scott.foster@vanderhaags.com';
    
    try {
        console.log(`Inserting test data for user ${email} (${userId})`);
        
        // Create a project first
        const projectResult = await pool.query(`
            INSERT INTO projects (user_id, name, description, status, priority)
            VALUES ($1, 'Full Brain Development', 'Main project for app improvements', 'active', '8')
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        `, [userId]);
        
        const projectId = projectResult.rows[0]?.id || null;
        console.log('Project ID:', projectId);
        
        // Create goals
        console.log('Creating goals...');
        await pool.query(`
            INSERT INTO goals (user_id, project_id, name, description, priority, status)
            VALUES 
            ($1, $2, 'Complete Full Brain Migration', 'Finish the database schema migration and ensure all features work', '10', 'active'),
            ($1, $2, 'Implement Advanced AI Features', 'Add Claude integration with better context awareness', '8', 'active'),
            ($1, NULL, 'Personal Fitness Goal', 'Exercise 3 times per week for better health', '7', 'active'),
            ($1, NULL, 'Learn a New Skill', 'Master TypeScript and modern React patterns', '6', 'active')
            ON CONFLICT (id) DO NOTHING
        `, [userId, projectId]);
        
        // Create routines
        console.log('Creating routines...');
        await pool.query(`
            INSERT INTO routines (user_id, name, description, priority, status, recurrence_pattern)
            VALUES 
            ($1, 'Morning Planning', 'Review daily priorities and plan the day', '9', 'active', 'daily'),
            ($1, 'Weekly Review', 'Assess progress and plan next week', '8', 'active', 'weekly'),
            ($1, 'Daily Exercise', '30 minutes of physical activity', '9', 'active', 'daily'),
            ($1, 'Code Review', 'Review and improve existing code', '7', 'active', 'weekly'),
            ($1, 'Inbox Zero', 'Process all emails and messages', '6', 'active', 'daily')
            ON CONFLICT (id) DO NOTHING
        `, [userId]);
        
        // Create tasks with various priorities and due dates
        console.log('Creating tasks...');
        await pool.query(`
            INSERT INTO tasks (user_id, project_id, name, description, priority, status, due_date)
            VALUES 
            ($1, $2, 'Fix Authentication Issues', 'Resolve login problems and token management', '10', 'active', CURRENT_DATE),
            ($1, $2, 'Update Documentation', 'Document all API endpoints and features', '7', 'active', CURRENT_DATE + INTERVAL '2 days'),
            ($1, $2, 'Performance Optimization', 'Improve query performance for large datasets', '8', 'active', CURRENT_DATE + INTERVAL '3 days'),
            ($1, NULL, 'Schedule Team Meeting', 'Coordinate with team for sprint planning', '8', 'active', CURRENT_DATE + INTERVAL '1 day'),
            ($1, NULL, 'Review Pull Requests', 'Check and merge pending PRs', '9', 'active', CURRENT_DATE),
            ($1, NULL, 'Grocery Shopping', 'Buy weekly essentials', '5', 'active', CURRENT_DATE),
            ($1, NULL, 'Pay Bills', 'Monthly utilities and subscriptions', '7', 'active', CURRENT_DATE + INTERVAL '5 days')
            ON CONFLICT (id) DO NOTHING
        `, [userId, projectId]);
        
        // Create events
        console.log('Creating events...');
        await pool.query(`
            INSERT INTO events (user_id, name, description, priority, status, start_datetime, end_datetime)
            VALUES 
            ($1, 'Development Sprint Review', 'Review completed work and plan next sprint', '8', 'active', 
                CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days 2 hours'),
            ($1, 'Client Presentation', 'Demo new features to stakeholders', '10', 'active',
                CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '4 days 1 hour'),
            ($1, 'Team Standup', 'Daily sync meeting', '7', 'active',
                CURRENT_TIMESTAMP + INTERVAL '1 day 9 hours', CURRENT_TIMESTAMP + INTERVAL '1 day 9 hours 30 minutes')
            ON CONFLICT (id) DO NOTHING
        `, [userId]);
        
        // Create notes
        console.log('Creating notes...');
        await pool.query(`
            INSERT INTO notes (user_id, title, content, tags)
            VALUES 
            ($1, 'Architecture Decision', 'Decided to use normalized schema for better scalability', ARRAY['technical', 'architecture']),
            ($1, 'Meeting Notes - Jan 6', 'Discussed roadmap for Q1, focusing on performance and UX improvements', ARRAY['meeting', 'planning']),
            ($1, 'Bug Report', 'Users experiencing slow load times with large datasets - need pagination', ARRAY['bug', 'performance']),
            ($1, 'Feature Ideas', 'Consider adding: dark mode, export functionality, collaborative features', ARRAY['ideas', 'features']),
            ($1, 'Performance Metrics', 'Current load time: 2.3s average, target: under 1s', ARRAY['metrics', 'performance'])
            ON CONFLICT (id) DO NOTHING
        `, [userId]);
        
        console.log('✅ Test data insertion complete!');
        
        // Show summary
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM goals WHERE user_id = $1) as goals,
                (SELECT COUNT(*) FROM routines WHERE user_id = $1) as routines,
                (SELECT COUNT(*) FROM tasks WHERE user_id = $1) as tasks,
                (SELECT COUNT(*) FROM events WHERE user_id = $1) as events,
                (SELECT COUNT(*) FROM notes WHERE user_id = $1) as notes
        `, [userId]);
        
        console.log('\nData created for user:');
        console.log(`- Goals: ${counts.rows[0].goals}`);
        console.log(`- Routines: ${counts.rows[0].routines}`);
        console.log(`- Tasks: ${counts.rows[0].tasks}`);
        console.log(`- Events: ${counts.rows[0].events}`);
        console.log(`- Notes: ${counts.rows[0].notes}`);
        
    } catch (error) {
        console.error('Error inserting test data:', error);
    } finally {
        await pool.end();
    }
}

// Run immediately
insertTestDataForUser();