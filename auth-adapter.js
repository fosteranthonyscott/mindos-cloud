// Authentication adapter - Uses ONLY the new schema
const { v4: uuidv4 } = require('uuid');

class AuthAdapter {
    constructor(db) {
        this.db = db;
    }

    async findUserByEmailOrUsername(email, username) {
        return await this.db.query(
            'SELECT id, username, email, password_hash, role FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
    }

    async findUserById(userId) {
        return await this.db.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [userId]
        );
    }

    async createUser(username, email, passwordHash) {
        const userId = uuidv4();
        
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
    }

    async updateLastLogin(userId) {
        await this.db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );
    }

    getUserIdField() {
        return 'id';
    }

    transformUserForToken(user) {
        return {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'USER'
        };
    }
}

module.exports = AuthAdapter;