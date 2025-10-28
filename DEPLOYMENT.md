# GGG Analytics Platform - Render Deployment Guide

This guide provides step-by-step instructions for deploying the GGG Analytics Platform on Render.

## Project Overview

- **Backend**: Node.js/Express server with SQLite database
- **Frontend**: React + Vite application
- **Architecture**: Full-stack application serving React build from Express server
- **Database**: SQLite with better-sqlite3 (persistent storage required)

## Prerequisites

- GitHub repository pushed and ready
- Render account (https://render.com)
- Admin credentials configured

## Deployment Architecture

The application runs as a **single web service** on Render:
- Express server runs on the configured PORT
- Server serves the React build from `/client/dist`
- SQLite database persists data in `/server/database/`
- Static assets and API routes handled by same server

---

## Step 1: Prepare Repository

### Files Already Configured
✅ Old MongoDB server files removed from root
✅ Root `package.json` updated to point to `/server/server.js`
✅ Server configured with proper CORS and security settings
✅ Health check endpoint available at `/health`

### Verify Before Deployment

```bash
# 1. Install dependencies at root
npm install

# 2. Install server dependencies
cd server
npm install
cd ..

# 3. Build frontend
cd client
npm install
npm run build
cd ..

# 4. Test locally (optional)
npm start
# Server should start on port 5001 (or PORT from env)
# Visit http://localhost:5001/health to verify
```

---

## Step 2: Create Render Web Service

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `GGG` repository

3. **Configure Service Settings**

### Basic Configuration

| Setting | Value |
|---------|-------|
| **Name** | `ggg-analytics-platform` (or your preferred name) |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your deployment branch) |
| **Root Directory** | Leave empty (root of repo) |
| **Runtime** | `Node` |
| **Build Command** | `npm install && cd server && npm install && cd ../client && npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free or Starter (minimum) |

### Environment Variables

Add these environment variables in Render Dashboard:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required for production mode |
| `PORT` | (Auto-set by Render) | Render sets this automatically |
| `SESSION_SECRET` | `[generate-strong-secret]` | Generate using: `openssl rand -base64 32` |
| `ALLOWED_ORIGINS` | `https://your-app.onrender.com,https://glazinggorillagames.com` | Comma-separated list of allowed CORS origins |

**Generate Session Secret:**
```bash
# Run locally to generate a secure secret
openssl rand -base64 32
# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Advanced Settings

**Auto-Deploy**: Enable (recommended)
- Automatically deploys when you push to the selected branch

**Health Check Path**: `/health`
- Render will ping this endpoint to verify service health

---

## Step 3: Configure Persistent Disk (CRITICAL)

SQLite requires persistent storage to retain data between deployments.

1. **In Render Dashboard** → Your Web Service → "Disks"

2. **Add Disk**:
   - **Name**: `ggg-database`
   - **Mount Path**: `/opt/render/project/src/server/database`
   - **Size**: 1 GB (minimum, adjust based on needs)

3. **Save Changes**

⚠️ **Important**: Without persistent disk, your database will reset on every deployment!

---

## Step 4: Deploy Application

1. **Save Configuration**
   - Click "Create Web Service" (for new service)
   - Render will automatically start the deployment

2. **Monitor Deployment**
   - Watch the build logs in Render Dashboard
   - Build process should:
     - Install root dependencies
     - Install server dependencies
     - Install client dependencies
     - Build React frontend
     - Start Express server

3. **Verify Deployment**
   - Once deployed, visit: `https://your-app.onrender.com/health`
   - Should return JSON with status and timestamp
   - Visit root URL to see React application

---

## Step 5: Configure Custom Domain (Optional)

1. **In Render Dashboard** → Your Service → "Settings" → "Custom Domain"

2. **Add Custom Domain**:
   - Enter: `glazinggorillagames.com` (or your domain)
   - Follow DNS configuration instructions

3. **Update CORS Origins**:
   - Add your custom domain to `ALLOWED_ORIGINS` environment variable
   - Format: `https://glazinggorillagames.com,https://www.glazinggorillagames.com`

4. **SSL Certificate**:
   - Render automatically provisions SSL certificates
   - HTTPS will be enabled automatically

---

## Application Architecture

### Server Structure
```
server/
├── server.js              # Main entry point
├── database/
│   ├── db.js             # SQLite database module
│   ├── schema.sql        # Database schema
│   ├── ggg.db            # Main database (persisted on disk)
│   ├── sessions.db       # Session storage (persisted on disk)
│   └── *.db-wal/shm      # SQLite WAL files
├── routes/
│   ├── admin.js          # Admin authentication & management
│   ├── cms.js            # CMS API for games/groups
│   └── public.js         # Public API endpoints
├── middleware/
│   ├── auth.js           # Authentication middleware
│   └── audit.js          # Audit logging
└── package.json          # Server dependencies
```

### API Endpoints

**Public Endpoints** (no auth required):
- `GET /proxy/latest` - Latest game/group data
- `GET /proxy/logs` - Recent logs (50 most recent)
- `GET /proxy/groups` - Group data
- `GET /proxy/images` - Game images/thumbnails
- `GET /proxy/total` - Total stats (playing, visits, members)
- `GET /proxy/all` - All data combined
- `POST /proxy/refresh` - Force data refresh
- `GET /health` - Health check

**Admin Endpoints** (authentication required):
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/me` - Get current admin session
- `POST /api/admin/change-password` - Change admin password

**CMS Endpoints** (admin auth required):
- `GET /api/cms/games` - List all games
- `POST /api/cms/games` - Add new game
- `PUT /api/cms/games/:id` - Update game
- `DELETE /api/cms/games/:id` - Delete game
- `GET /api/cms/groups` - List all groups
- `POST /api/cms/groups` - Add new group
- `PUT /api/cms/groups/:id` - Update group
- `DELETE /api/cms/groups/:id` - Delete group

### Frontend Routes
- `/` - Dashboard (home page)
- `/admin` - Admin panel (login & CMS management)
- All other routes fallback to React Router

---

## Database Management

### SQLite Configuration
- **Mode**: WAL (Write-Ahead Logging) for better concurrent access
- **Location**: `/server/database/ggg.db`
- **Sessions**: `/server/database/sessions.db`
- **Persistence**: Requires persistent disk mounted at `/opt/render/project/src/server/database`

### Backup Strategy
```bash
# Connect to Render shell (in Dashboard → Shell)
cd server/database
sqlite3 ggg.db ".backup backup-$(date +%Y%m%d).db"

# Download backup via Render Dashboard or SFTP
```

### Database Schema
See `server/database/schema.sql` for complete schema definition:
- `logs` - Analytics data logs
- `cms_games` - Game configuration
- `cms_groups` - Group configuration
- `admin_users` - Admin authentication (bcrypt hashed passwords)
- `audit_log` - Admin action audit trail

---

## Performance Configuration

### Caching Strategy
- **In-Memory Cache**: 15 minutes for latest data
- **HTTP Cache Headers**: 15 minutes for proxy endpoints
- **Database**: SQLite with optimized queries

### Rate Limiting
- **Roblox API**: 2 concurrent requests with exponential backoff
- **Proxy Endpoints**: 100 requests per 15 minutes per IP
- **Batch Delays**: 2 seconds between API batches

### Cold Start Optimization
- Initial data fetch delayed 5 seconds after server start
- Prevents Render cold start timeout issues
- Automatic refresh every 15 minutes

---

## Monitoring & Troubleshooting

### Health Checks
```bash
# Check server health
curl https://your-app.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-28T...",
  "cache": {
    "hasData": true,
    "age": 123456
  }
}
```

### Common Issues

**Issue**: Database resets on deployment
- **Solution**: Ensure persistent disk is mounted at correct path
- **Verify**: Check Render Dashboard → Disks → Mount Path

**Issue**: CORS errors from frontend
- **Solution**: Add frontend domain to `ALLOWED_ORIGINS` env variable
- **Format**: Comma-separated, include protocol (https://)

**Issue**: 502 Bad Gateway on startup
- **Solution**: Cold start taking too long
- **Verify**: Check logs for database initialization
- **Fix**: Server has 5-second delay built-in for cold starts

**Issue**: Roblox API rate limiting
- **Solution**: Already configured with retry logic and backoff
- **Note**: May see warnings in logs, data will fallback to cached/database

### View Logs
1. Render Dashboard → Your Service → "Logs"
2. Look for:
   - `🚀 Server running on port...`
   - `✅ Log saved to SQLite...`
   - `❌` or `⚠️` for errors/warnings

---

## Security Checklist

- ✅ Session secret set to strong random value
- ✅ Admin passwords hashed with bcrypt
- ✅ CORS configured with allowed origins only
- ✅ Rate limiting enabled on proxy endpoints
- ✅ HTTPS enforced (via Render)
- ✅ Session cookies httpOnly and secure in production
- ✅ SQLite in WAL mode (no concurrent write issues)
- ✅ Audit logging for admin actions
- ✅ Trust proxy enabled for correct IP detection

---

## Post-Deployment Steps

1. **Test Admin Login**
   - Visit `https://your-app.onrender.com/admin`
   - Login with admin credentials
   - Verify CMS functionality

2. **Verify Data Collection**
   - Visit `/proxy/latest` endpoint
   - Should return game and group data
   - Check logs for successful Roblox API calls

3. **Configure Monitoring** (Recommended)
   - Set up Render notifications for:
     - Deployment failures
     - Service downtime
     - Disk usage alerts (>80%)

4. **Update Repository**
   ```bash
   # Your deployment is ready!
   # Any future pushes to main branch will auto-deploy
   git add .
   git commit -m "Configure for Render deployment"
   git push origin main
   ```

---

## Scaling Considerations

### Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- Cold start time: ~30-60 seconds
- Limited compute resources

### Upgrading to Paid Tier
Benefits:
- No spin-down (always-on)
- Faster compute resources
- More disk space options
- Better for production use

### When to Upgrade
- Average response time > 2 seconds
- Frequent cold starts affecting users
- Database size approaching disk limit
- Need 99.9% uptime SLA

---

## Support & Resources

- **Render Documentation**: https://render.com/docs
- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **Express.js**: https://expressjs.com
- **React + Vite**: https://vitejs.dev

---

## Quick Reference

### Environment Variables Summary
```env
NODE_ENV=production
PORT=(auto-set by Render)
SESSION_SECRET=(generate strong secret)
ALLOWED_ORIGINS=https://your-app.onrender.com,https://yourdomain.com
```

### Build Command
```bash
npm install && cd server && npm install && cd ../client && npm install && npm run build
```

### Start Command
```bash
npm start
```

### Health Check
```
/health
```

### Persistent Disk Mount
```
/opt/render/project/src/server/database
```

---

**Deployment Status**: Ready for Production ✅

Last Updated: October 28, 2025
