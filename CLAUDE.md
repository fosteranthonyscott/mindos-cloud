# CLAUDE.md - Project Context for AI Assistant

This file helps Claude understand the Full Brain project context across sessions.

## Project Overview

**Full Brain** (formerly MindOS) is a personal AI assistant application that combines task management, goal tracking, and AI-powered assistance through a social media-style feed interface.

**Production URL**: https://fullbrain-cloud-production.up.railway.app/

## Current State (Last Updated: June 8, 2025)

### Repository Status
- **Branch**: main
- **Latest Commit**: b28eb47 - Fix aggressive scroll behavior causing jumps near bottom
- **Working Tree**: Modified (implementing new database schema)
- **Sync Status**: Local changes not yet committed

### Current Work: Database Schema Migration
- **Status**: Ready for Testing
- **Changes Made**:
  1. Created new normalized database schema (database-schema.sql)
  2. Created database initialization module (database-init.js)
  3. Created authentication adapter for schema compatibility (auth-adapter.js)
  4. Created entity adapter for memory endpoint compatibility (entity-adapter.js)
  5. Updated server.js to support both old and new schemas
  6. All authentication endpoints preserved and working
  7. Memory API endpoints now use adapters for compatibility
  8. Fixed syntax errors and tested server startup

### Migration Notes:
- Server now supports BOTH old and new schemas simultaneously
- Authentication is fully preserved and backwards compatible
- Memory endpoints work with both schemas via adapters
- No breaking changes to existing API
- Ready for deployment with proper DATABASE_URL

### Recent Changes
1. Fixed scroll behavior issues
2. Fixed Load ALL Items functionality
3. Improved API error handling
4. Rebranded from MindOS to Full Brain
5. Enhanced mobile drag and drop

## Technology Stack

### Backend
- Node.js (>=18.0.0) with Express.js
- PostgreSQL database
- JWT authentication
- Anthropic Claude API integration
- Deployment: Railway (primary), Heroku-compatible

### Frontend
- Vanilla JavaScript (ES6+)
- Responsive HTML5/CSS3
- Font Awesome icons
- Social media-style feed interface

### Key Dependencies
```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "node-fetch": "^3.3.2"
}
```

## Core Features

1. **AI Chat System**
   - Claude integration with claude-3-5-sonnet-20241022
   - Context-aware conversations
   - Item-specific AI interactions
   - Drag-and-drop bubble interface

2. **Memory Management**
   - Categories: goals, routines, preferences, insights, events, system
   - Priority levels (1-5)
   - Recurring task scheduling
   - Performance streak tracking

3. **Feed Interface**
   - Infinite scroll with smart loading
   - Card-based design
   - Real-time updates
   - Mobile-responsive

## Development Guidelines

### Before Making Changes
```bash
# Always sync with GitHub first
git fetch origin
git pull origin main
git status
```

### Code Style
- Use existing patterns and conventions
- Follow ES6+ JavaScript standards
- Maintain responsive design principles
- Test on mobile and desktop

### Testing Commands
```bash
npm run dev     # Development server with nodemon
npm start       # Production server
```

### Deployment
```bash
# Railway deployment
npm run deploy

# Or standard git push (Railway auto-deploys from main)
git push origin main
```

### Environment Variables
Required in production:
- DATABASE_URL
- CLAUDE_API_KEY
- JWT_SECRET
- NODE_ENV
- PORT (usually provided by platform)

## Key Files

- `server.js` - Main backend server
- `public/index.html` - Frontend application
- `smart-text-algorithm.js` - Natural language processing
- `recurring-task-manager.js` - Background task scheduling
- `bubble-interface.js` - AI interaction UI component

## API Endpoints

### Authentication
- POST `/api/register`
- POST `/api/login`

### Claude AI
- POST `/api/claude` - Main chat
- POST `/api/claude/chat` - Item-specific chat
- POST `/api/claude/quick-actions` - Smart suggestions

### Memories
- GET/POST `/api/memories`
- PUT/DELETE `/api/memories/:id`
- GET `/api/memories/today`
- GET `/api/memories/recurring-dashboard`

## Common Tasks

### Adding New Features
1. Check existing patterns in codebase
2. Update both frontend and backend
3. Test thoroughly on mobile and desktop
4. Ensure backward compatibility

### Debugging
- Check browser console for frontend errors
- Check server logs for backend errors
- Verify environment variables
- Test API endpoints independently

### Performance
- Feed uses virtual scrolling for large datasets
- Memories are cached with smart expiration
- Database queries are optimized with indexes

## Known Issues
- None currently tracked

## Future Considerations
- Test suite implementation
- Enhanced AI model options
- Expanded recurring task patterns
- Multi-user collaboration features

---

**Note**: This file should be updated when significant changes are made to help maintain context across AI assistant sessions.