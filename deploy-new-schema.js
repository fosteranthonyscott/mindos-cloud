#!/usr/bin/env node

/**
 * Manual Schema Deployment Script
 * This script safely deploys the new database schema to your Railway PostgreSQL instance
 * 
 * Usage: node deploy-new-schema.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkExistingSchema() {
    console.log('🔍 Checking existing database schema...');
    
    const checkQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `;
    
    const result = await pool.query(checkQuery);
    const tables = result.rows.map(row => row.table_name);
    
    console.log('📊 Existing tables:', tables);
    
    const hasOldSchema = tables.includes('memories') && tables.includes('user');
    const hasNewSchema = ['users', 'projects', 'goals', 'routines', 'tasks', 'events', 'notes'].every(
        table => tables.includes(table)
    );
    
    return { hasOldSchema, hasNewSchema, tables };
}

async function deploySchema() {
    console.log('🚀 Starting schema deployment...\n');
    
    try {
        // Check current state
        const { hasOldSchema, hasNewSchema, tables } = await checkExistingSchema();
        
        if (hasNewSchema) {
            console.log('✅ New schema already deployed!');
            console.log('📋 Found tables:', tables.filter(t => !['user', 'memories'].includes(t)).join(', '));
            return;
        }
        
        console.log(`\n📊 Current state:`);
        console.log(`   Old schema (memories): ${hasOldSchema ? '✅' : '❌'}`);
        console.log(`   New schema: ${hasNewSchema ? '✅' : '❌'}`);
        
        // Ask for confirmation
        console.log('\n⚠️  WARNING: This will create the new database schema.');
        console.log('   The old schema will remain intact.');
        console.log('   No data will be migrated automatically.\n');
        console.log('   To proceed, press Ctrl+C within 10 seconds to cancel...');
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('\n📝 Reading schema file...');
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schemaSQL = await fs.readFile(schemaPath, 'utf8');
        
        console.log('🔨 Deploying new schema...');
        
        // Split the schema into individual statements
        const statements = schemaSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const statement of statements) {
            try {
                // Skip DROP statements for safety
                if (statement.toUpperCase().includes('DROP')) {
                    console.log('⏭️  Skipping DROP statement for safety');
                    continue;
                }
                
                await pool.query(statement + ';');
                successCount++;
                
                // Log progress for important tables
                if (statement.includes('CREATE TABLE')) {
                    const tableMatch = statement.match(/CREATE TABLE (\w+)/i);
                    if (tableMatch) {
                        console.log(`✅ Created table: ${tableMatch[1]}`);
                    }
                }
            } catch (error) {
                errorCount++;
                if (error.code === '42P07') { // duplicate table
                    console.log(`⏭️  Table already exists, skipping...`);
                } else if (error.code === '42710') { // duplicate type
                    console.log(`⏭️  Type already exists, skipping...`);
                } else {
                    console.error(`❌ Error executing statement:`, error.message);
                }
            }
        }
        
        console.log(`\n📊 Deployment complete!`);
        console.log(`   Successful statements: ${successCount}`);
        console.log(`   Skipped/Errors: ${errorCount}`);
        
        // Verify deployment
        const { hasNewSchema: deployed, tables: newTables } = await checkExistingSchema();
        
        if (deployed) {
            console.log('\n✅ NEW SCHEMA SUCCESSFULLY DEPLOYED!');
            console.log('📋 New tables created:', newTables.filter(t => !['user', 'memories'].includes(t)).join(', '));
            console.log('\n🎯 Next steps:');
            console.log('   1. Test the application with the new schema');
            console.log('   2. Run data migration when ready');
            console.log('   3. Monitor for any issues');
        } else {
            console.log('\n⚠️  Schema deployment incomplete. Please check the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the deployment
deploySchema().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});