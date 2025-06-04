# MindOS Deployment Guide

## Recent Changes Deployed
- **AI Comment Bubble Interface**: Replaced full-screen chat with compact, draggable bubbles
- **Quick Actions**: Context-aware quick action buttons for different item types
- **Pinning System**: Pin important AI insights for later reference
- **Bug Fixes**: Fixed ID type comparison issues for better compatibility

## Deployment Checklist

### Pre-Deployment
- [x] Code changes committed to git
- [x] `.gitignore` file created to exclude node_modules and test files
- [x] Changes pushed to GitHub repository
- [x] Dependencies listed in package.json

### Environment Variables Required
Ensure these are set in your Railway/hosting environment:
```
DATABASE_URL=postgresql://user:password@host:port/database
CLAUDE_API_KEY=your-anthropic-api-key
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT=3000 (or use Railway's provided port)
```

### Railway Deployment (Recommended)

1. **If not already connected to Railway:**
   ```bash
   # Install Railway CLI if needed
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Link to existing project or create new
   railway link
   ```

2. **Deploy from GitHub (Preferred):**
   - Go to your Railway dashboard
   - Connect your GitHub repository
   - Railway will auto-deploy on push to main branch
   - Your recent push will trigger a deployment

3. **Manual Deploy via CLI:**
   ```bash
   railway up
   ```

### Alternative Deployment Options

#### Heroku
```bash
# Add Heroku remote if not exists
heroku git:remote -a your-app-name

# Deploy
git push heroku main
```

#### Custom VPS
```bash
# SSH to your server
ssh user@your-server

# Clone/pull latest changes
git pull origin main

# Install dependencies
npm install

# Start with PM2 (recommended)
pm2 start server.js --name mindos
pm2 save
```

### Post-Deployment Verification

1. **Check Application Health:**
   - Visit: `https://your-app-url/health`
   - Should return JSON with status "ok"

2. **Test Key Features:**
   - [ ] User registration/login
   - [ ] Feed loading
   - [ ] AI bubble interface opens when clicking brain icon
   - [ ] Quick actions appear in bubble
   - [ ] Messages send successfully
   - [ ] Pinning system works
   - [ ] Task completion updates status

3. **Monitor Logs:**
   ```bash
   # Railway
   railway logs
   
   # Heroku
   heroku logs --tail
   
   # PM2
   pm2 logs mindos
   ```

### Troubleshooting

1. **Database Connection Issues:**
   - Verify DATABASE_URL is correct
   - Check SSL settings match production requirements
   - Ensure database is accessible from deployment environment

2. **Claude API Issues:**
   - Verify CLAUDE_API_KEY is set correctly
   - Check API key hasn't expired
   - Monitor usage limits

3. **Module Not Found Errors:**
   - Ensure all dependencies are in package.json (not devDependencies)
   - Run `npm install` in production environment
   - Check Node.js version matches requirements (>=18.0.0)

### Rollback if Needed
```bash
# Find previous commit
git log --oneline

# Revert to previous version
git revert HEAD
git push origin main
```

## Current Deployment Status
- **GitHub**: ✅ Pushed successfully
- **Production URL**: https://mindos-cloud-production.up.railway.app/
- **Last Deploy**: Just now (bubble interface implementation)

## Next Steps
1. Log into Railway dashboard to monitor deployment
2. Check deployment logs for any errors
3. Test the new bubble interface in production
4. Monitor performance and user feedback