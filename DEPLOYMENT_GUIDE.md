# 🚀 Win Room v2.0 - DigitalOcean App Platform Deployment Guide

**Duration**: ~30 minutes
**Difficulty**: Easy
**Cost**: ~$12-18/month

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Preparing Git Repository](#2-preparing-git-repository)
3. [Creating New App on App Platform](#3-creating-new-app-on-app-platform)
4. [Component Configuration](#4-component-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Deployment](#6-deployment)
7. [Post-Deployment Checks](#7-post-deployment-checks)
8. [Domain Binding (Optional)](#8-domain-binding-optional)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### 1.1 Requirements Check

- ✅ DigitalOcean account ([sign up](https://cloud.digitalocean.com/registrations/new))
- ✅ PostgreSQL database ready (already available!)
- ✅ Git repository (GitHub/GitLab)
- ✅ Project working locally

### 1.2 Project Analysis

Win Room v2.0 requires **3 separate processes**:

| Process | Port | Command | Description |
|---------|------|---------|-------------|
| **Next.js App** | 3000 | `npm start` | Web UI and API endpoints |
| **Socket.IO Server** | 3001 | `npm run start:socket` | WebSocket real-time updates |
| **Poller Worker** | - | `npm run start:worker` | Database sync (2s interval) |

> **App Platform Strategy**: We will deploy as 3 separate "Components"

---

## 2. Preparing Git Repository

### 2.1 Create repository if it doesn't exist

```bash
# In project directory in terminal
cd /Users/admin/Documents/Projects/win-room

# Git init (if not exists)
git init

# Create new repo on GitHub
# Example: https://github.com/yourusername/win-room

# Add remote
git remote add origin https://github.com/yourusername/win-room.git

# Commit and push
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git push -u origin main
```

### 2.2 `.gitignore` Check

Make sure these are in `.gitignore` file:

```
node_modules/
.next/
.env
.env.local
*.log
.DS_Store
```

### 2.3 `package.json` Production Scripts Check

Already available, but verify:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "start:socket": "tsx services/socket/server.ts",
    "start:worker": "tsx services/poller/worker.ts"
  }
}
```

✅ Ready!

---

## 3. Creating New App on App Platform

### 3.1 Login to DigitalOcean

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **"Create App"** button

### 3.2 Connect Repository

1. **Source**: Select GitHub
2. Click **Authorize DigitalOcean** button (if first time)
3. Select your repository: `yourusername/win-room`
4. **Branch**: Select `main`
5. **Autodeploy**: ✅ Keep active (auto deploy on every push)
6. Click **Next** button

---

## 4. Component Configuration

App Platform will auto-detect. **We will manually add 3 Components**:

### 4.1 Component 1: Next.js Web Service

Click **Edit Plan** button, then:

#### Component Settings:
- **Component Name**: `web`
- **Component Type**: `Web Service`
- **Environment**: `Node.js`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Run Command**:
  ```bash
  npm start
  ```
- **HTTP Port**: `3000`
- **HTTP Route**: `/`
- **Instance Size**: `Basic ($5/mo)` or `Professional ($12/mo)`
- **Instance Count**: `1`

#### Health Check:
- **Path**: `/api/health` (we will create this)
- **Initial Delay**: `30 seconds`

Click **Save** button.

---

### 4.2 Component 2: Socket.IO Worker Service

**Add Component** → **Worker**

#### Component Settings:
- **Component Name**: `socket-server`
- **Component Type**: `Worker`
- **Environment**: `Node.js`
- **Build Command**:
  ```bash
  npm install
  ```
- **Run Command**:
  ```bash
  npm run start:socket
  ```
- **Instance Size**: `Basic ($5/mo)`
- **Instance Count**: `1`

> **IMPORTANT**: We're selecting Worker type because it doesn't require HTTP route, but will listen on port 3001

Click **Save** button.

---

### 4.3 Component 3: Poller Worker Service

**Add Component** → **Worker**

#### Component Settings:
- **Component Name**: `poller-worker`
- **Component Type**: `Worker`
- **Environment**: `Node.js`
- **Build Command**:
  ```bash
  npm install
  ```
- **Run Command**:
  ```bash
  npm run start:worker
  ```
- **Instance Size**: `Basic ($5/mo)`
- **Instance Count**: `1`

Click **Save** button.

---

## 5. Environment Variables

### 5.1 Adding Environment Variables

Go to **App Settings** → **Environment Variables** section.

**ADD TO ALL** (for all 3 components):

```env
# Database Configuration (copy from DigitalOcean connection details)
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?sslmode=require
DB_HOST=<db_host>
DB_PORT=<db_port>
DB_NAME=<db_name>
DB_USER=<db_user>
DB_PASSWORD=<db_password>

# Core DB (use the same string unless you run a dedicated core database)
CORE_DB_URL=postgresql://<core_db_user>:<core_db_password>@<core_db_host>:<core_db_port>/<core_db_name>?sslmode=require

# JWT Configuration (generate a brand new value per environment)
JWT_SECRET=<generate_a_strong_random_string>
JWT_EXPIRES_IN=2d

# Socket.IO Server
SOCKET_PORT=3001

# Poller Worker Configuration
POLLER_INTERVAL_MS=2000
POLLER_BATCH_SIZE=500

# Rate Limiting
RATE_LIMIT_GENERAL=60
RATE_LIMIT_CLAIM=10

# Environment
NODE_ENV=production
```

### 5.2 Socket.IO URL (Component-specific)

Add **only to `web` component**:

```env
NEXT_PUBLIC_SOCKET_URL=${socket-server.PRIVATE_URL}
```

> **Explanation**: `${socket-server.PRIVATE_URL}` uses App Platform's internal networking. Provides direct access to socket server.

**OR** simpler (public URL):

```env
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.ondigitalocean.app
```

> **Note**: If you use public URL, you need to add HTTP route for socket server

### 5.3 CORS Setting (Component-specific)

Add **only to `socket-server` component**:

```env
SOCKET_CORS_ORIGIN=${web.PUBLIC_URL}
```

---

## 6. Deployment

### 6.1 Initial Deployment

1. Click **Review** button
2. Check all settings:
   - ✅ 3 components visible
   - ✅ Environment variables added
   - ✅ Build and run commands correct
3. Click **Create Resources** button

### 6.2 Deployment Process

**Deployment takes approximately 5-10 minutes**:

1. ✅ Building... (npm install + build)
2. ✅ Deploying... (creating containers)
3. ✅ Running health checks...
4. ✅ Live!

You can follow real-time from **Logs** tab.

### 6.3 Expected Log Outputs

#### Web Component:
```
> next start
ready - started server on 0.0.0.0:3000
```

#### Socket Server:
```
Socket.IO server running on port 3001
Listening for client connections...
```

#### Poller Worker:
```
Poller worker started
Polling interval: 2000ms
Connecting to database...
```

---

## 7. Post-Deployment Checks

### 7.1 Create Health Check Endpoint

Create this file locally:

**`app/api/health/route.ts`**:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

Push it:

```bash
git add app/api/health/route.ts
git commit -m "Add health check endpoint"
git push
```

App Platform will **automatically redeploy**.

### 7.2 Get App URL

After deployment completes:

1. **App Platform** → **Settings** → **Domains**
2. Copy default URL:
   ```
   https://win-room-xxxxx.ondigitalocean.app
   ```

### 7.3 Manual Test

#### Test 1: Web UI
```bash
curl https://win-room-xxxxx.ondigitalocean.app/api/health
# Response: {"status":"ok","timestamp":"2025-10-24T..."}
```

#### Test 2: Socket.IO (browser console)
```javascript
const io = require('socket.io-client');
const socket = io('https://win-room-xxxxx.ondigitalocean.app');

socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));
```

#### Test 3: Database Connection
```bash
# Check from App Platform logs
# Component: poller-worker
# Log: "Connected to database successfully"
```

---

## 8. Domain Binding (Optional)

### 8.1 Add Custom Domain

1. **App Platform** → **Settings** → **Domains**
2. Click **Add Domain** button
3. Enter domain: `winroom.yourdomain.com`
4. Add the **CNAME** record provided by DigitalOcean to your domain provider:
   ```
   Type: CNAME
   Name: winroom
   Value: win-room-xxxxx.ondigitalocean.app.
   ```
5. Wait for DNS propagation (~10-60 minutes)
6. DigitalOcean will automatically create SSL certificate

---

## 9. Troubleshooting

### 9.1 "Build Failed" Error

**Check logs**:
```
Component: web
Error: Module not found: Can't resolve 'xyz'
```

**Solution**:
```bash
# Test locally
npm install
npm run build

# If no issues, push
git push
```

---

### 9.2 "Health Check Failed" Error

**Reason**: `/api/health` endpoint doesn't exist

**Solution**: Apply 7.1 above

---

### 9.3 Socket.IO Connection Error

**Check logs**:
```
Component: socket-server
Error: CORS origin not allowed
```

**Solution**:
1. Check CORS setting in `services/socket/server.ts` file:
   ```typescript
   const io = new Server(server, {
     cors: {
       origin: process.env.SOCKET_CORS_ORIGIN || '*',
       methods: ['GET', 'POST']
     }
   });
   ```

2. Set environment variable correctly (see 5.3)

---

### 9.4 Database Connection Error

**Check logs**:
```
Error: connect ECONNREFUSED
```

**Reason**: Database firewall rules

**Solution**:
1. **DigitalOcean** → **Databases** → **Settings** → **Trusted Sources**
2. **Add Trusted Source** → **App Platform**
3. Select your app: `win-room`
4. Save

> App Platform automatically adds its IP range

---

### 9.5 Poller Worker Not Running

**Check logs**:
```
Component: poller-worker
No logs appear
```

**Solution**:
1. Add `console.log` in `services/poller/worker.ts` file:
   ```typescript
   console.log('Poller worker started at:', new Date().toISOString());
   ```

2. Check environment variables:
   - Is `DATABASE_URL` correct?
   - Is `POLLER_INTERVAL_MS` set?

---

### 9.6 "Out of Memory" Error

**Solution**: Increase instance size

1. **App Settings** → **Components** → **web** (or problematic component)
2. **Instance Size**: Select `Professional ($12/mo)`
3. Save and redeploy

---

## 10. Monitoring and Scaling

### 10.1 App Platform Metrics

Monitor these from **Insights** tab:
- CPU usage
- Memory usage
- Request rate
- Response time

### 10.2 Setting Up Alerts

1. **Settings** → **Alerts**
2. **Create Alert**
3. Select metric (e.g., "CPU > 80%")
4. Add Email/Slack webhook

### 10.3 Auto-scaling

With **Professional plan**:
1. **Components** → **web** → **Scaling**
2. **Auto-scaling**: Enable
3. **Min instances**: 1
4. **Max instances**: 3
5. **CPU threshold**: 70%

---

## 11. Costs

| Component | Instance Size | Cost/month |
|-----------|---------------|------------|
| Web | Basic | $5 |
| Socket Server | Basic | $5 |
| Poller Worker | Basic | $5 |
| **TOTAL** | | **$15/month** |

> If using **Professional** instances: $12 x 3 = **$36/month**

---

## 12. Next Steps

✅ **Deployment complete!**

Now:
1. 🧪 **Test**: Are all features working?
2. 📊 **Monitoring**: Track metrics and logs
3. 🔒 **Security**: Change JWT secrets specific to production
4. 🌐 **Domain**: Add custom domain
5. 📈 **Scaling**: Adjust instance count based on traffic

---

## 12. Initial Setup After Deployment

### 12.1 Create Admin User

After deployment completes, create **your first admin user**:

#### Method 1: From Local to Remote Database

```bash
# 1. Copy production database URL from DigitalOcean panel
export DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?sslmode=require"

# 2. Create admin
npm run admin:create

# Seller ID: admin
# Display Name: Admin User
# Email: admin@yourcompany.com
# Password: [strong password]
# Role: admin
```

#### Method 2: DigitalOcean Console

1. **Database** → **Overview** → **Connection Details**
2. **Copy** connection string
3. Click **"Open Console"**
4. Paste SQL:

```sql
-- First create password hash (locally)
-- node scripts/hash-password.js YourStrongPassword123

INSERT INTO wr.sellers (
  seller_id,
  display_name,
  email,
  password_hash,
  role,
  is_active
) VALUES (
  'admin',
  'Admin User',
  'admin@yourcompany.com',
  '$2a$10$[HASH_HERE]',
  'admin',
  true
);
```

#### Method 3: App Platform Console (Advanced)

```bash
# App Platform → Components → web → Console

# In console:
cd /workspace
npm run admin:create:quick
```

### 12.2 Verify Admin Login

```bash
curl -X POST https://your-app-name.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "YOUR_PASSWORD"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "seller_id": "admin",
    "email": "admin@yourcompany.com",
    "role": "admin"
  }
}
```

### 12.3 Add Sales Users

Add sales users the same way:

```bash
npm run admin:create
# seller_id: merve, role: sales

npm run admin:create
# seller_id: sait, role: sales
```

**Detailed guide**: [`scripts/ADMIN_SETUP.md`](./scripts/ADMIN_SETUP.md)

---

## 13. Useful Commands

### Monitoring Logs

```bash
# Via CLI (requires DigitalOcean CLI)
doctl apps logs <app-id> --type run --follow

# Or web interface:
# App Platform → Logs → Select component → Tail Logs
```

### Redeploy

```bash
# Automatic with git push
git push origin main

# Manual (App Platform UI)
# Components → ... → Force Rebuild & Deploy
```

### Updating Environment Variables

```bash
# From UI:
# App Settings → Environment Variables → Edit → Save

# Via CLI:
doctl apps update <app-id> --spec spec.yaml
```

---

## 📞 Help

If you encounter issues:
1. **Check logs** (separately for each component)
2. Are **health checks** working?
3. Is **database connection** up?
4. Are **environment variables** correct?

**DigitalOcean Support**: https://cloud.digitalocean.com/support

---

## ✅ Checklist

Pre-deployment checklist:

- [ ] Git repository ready
- [ ] `.env` file in `.gitignore`
- [ ] PostgreSQL database ready and accessible
- [ ] `package.json` scripts correct
- [ ] Health check endpoint created
- [ ] Environment variables ready
- [ ] 3 components configured (web, socket, poller)
- [ ] CORS settings configured
- [ ] Database trusted sources added

**If you've done all of these, you're ready for deployment! 🚀**
