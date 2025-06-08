// Authentication adapter to work with both old and new schemas
const { v4: uuidv4 } = require('uuid');

class AuthAdapter {
    constructor(db, useNewSchema) {
        this.db = db;
        this.useNewSchema = useNewSchema;
    }

    async findUserByEmailOrUsername(email, username) {
        if (this.useNewSchema) {
            // New schema: users table with id as UUID
            return await this.db.query(
                'SELECT id, username, email, password_hash, role FROM users WHERE email = $1 OR username = $2',
                [email, username]
            );
        } else {
            // Old schema: user table with user_id
            const result = await this.db.query(
                'SELECT user_id as id, username, email, password_hash FROM "user" WHERE email = $1 OR username = $2',
                [email, username]
            );
            // Transform to match new schema format
            if (result.rows.length > 0) {
                result.rows = result.rows.map(row => ({
                    ...row,
                    role: 'USER' // Default role for old schema
                }));
            }
            return result;
        }
    }

    async findUserById(userId) {
        if (this.useNewSchema) {
            return await this.db.query(
                'SELECT id, username, email, role FROM users WHERE id = $1',
                [userId]
            );
        } else {
            const result = await this.db.query(
                'SELECT user_id as id, username, email FROM "user" WHERE user_id = $1',
                [userId]
            );
            // Transform to match new schema format
            if (result.rows.length > 0) {
                result.rows = result.rows.map(row => ({
                    ...row,
                    role: 'USER' // Default role for old schema
                }));
            }
            return result;
        }
    }

    async createUser(username, email, passwordHash) {
        const userId = uuidv4();
        const tenantId = uuidv4();
        
        if (this.useNewSchema) {
            // New schema with tenant support
            const result = await this.db.query(
                `INSERT INTO users (id, username, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, username, email, role`,
                [userId, username, email, passwordHash, 'USER']
            );
            
            // Create default user preferences
            await this.db.query(
                `INSERT INTO user_preferences (user_id) 
                 VALUES ($1)`,
                [userId]
            );
            
            return result;
        } else {
            // Old schema
            const result = await this.db.query(
                'INSERT INTO "user" (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING user_id as id, username, email',
                [userId, username, email, passwordHash]
            );
            // Transform to match new schema format
            if (result.rows.length > 0) {
                result.rows = result.rows.map(row => ({
                    ...row,
                    role: 'USER',
                    // tenant_id not used in new schema
                }));
            }
            return result;
        }
    }

    async updateLastLogin(userId) {
        if (this.useNewSchema) {
            await this.db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [userId]
            );
        }
        // Old schema doesn't track last login
    }

    getUserIdField() {
        return this.useNewSchema ? 'id' : 'user_id';
    }

    transformUserForToken(user) {
        return {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'USER',
            // tenantId not included in response
        };
    }
}

module.exports = AuthAdapter;