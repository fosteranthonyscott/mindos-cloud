// Password reset script
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetPassword(email, newPassword) {
    try {
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update the password in the database
        const result = await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, username, email',
            [hashedPassword, email]
        );
        
        if (result.rows.length === 0) {
            console.error('❌ No user found with email:', email);
            return;
        }
        
        console.log('✅ Password reset successful for user:', result.rows[0]);
        
    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        await pool.end();
    }
}

// Check command line arguments
if (process.argv.length !== 4) {
    console.log('Usage: node reset-password.js <email> <new-password>');
    console.log('Example: node reset-password.js user@example.com mynewpassword123');
    console.log('\nMake sure you have the correct DATABASE_URL in your .env file!');
} else {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    console.log(`Resetting password for: ${email}`);
    resetPassword(email, newPassword);
}