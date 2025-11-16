# 🚀 Win Room v2.0 - Deployment Quick Start

**Deploy in 5 minutes!** ⚡

---

## ✅ Pre-Check

```bash
# 1. Is the Git repository pushed?
git status
git push origin main

# 2. Is the .env file in .gitignore?
cat .gitignore | grep .env
```

---

## 📝 Component Configuration (Summary)

Create **3 Components** on App Platform:

### 1️⃣ Web Service
```yaml
Name: web
Type: Web Service
Build: npm install && npm run build
Run: npm start
Port: 3000
Route: /
Size: Basic ($5) or Professional ($12)
```

### 2️⃣ Socket.IO Worker
```yaml
Name: socket-server
Type: Worker
Build: npm install
Run: npm run start:socket
Size: Basic ($5)
```

### 3️⃣ Poller Worker
```yaml
Name: poller-worker
Type: Worker
Build: npm install
Run: npm run start:worker
Size: Basic ($5)
```

**Total Cost**: $15/month (Basic) or $30/month (Professional)

---

## 🔐 Environment Variables

**ADD TO ALL** (same for all components):

```env
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?sslmode=require
DB_HOST=<db_host>
DB_PORT=<db_port>
DB_NAME=<db_name>
DB_USER=<db_user>
DB_PASSWORD=<db_password>
CORE_DB_URL=postgresql://<core_db_user>:<core_db_password>@<core_db_host>:<core_db_port>/<core_db_name>?sslmode=require
JWT_SECRET=<generate_a_strong_random_string>
JWT_EXPIRES_IN=2d
SOCKET_PORT=3001
POLLER_INTERVAL_MS=2000
POLLER_BATCH_SIZE=500
RATE_LIMIT_GENERAL=60
RATE_LIMIT_CLAIM=10
NODE_ENV=production
```

### Component-Specific Variables:

**Only for `web` component:**
```env
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.ondigitalocean.app
```

**Only for `socket-server` component:**
```env
SOCKET_CORS_ORIGIN=https://your-app-name.ondigitalocean.app
```

> **Note**: Replace `your-app-name` with your actual app name!

---

## 🗄️ Database Setup

### 1. Add Trusted Sources

```
DigitalOcean → Databases → Settings → Trusted Sources
→ Add Trusted Source → App Platform → Select: win-room
```

### 2. Create WR Schema (if it doesn't exist)

```bash
# From local or via psql:
psql $DATABASE_URL

# Run scripts in order:
\i scripts/db/01_create_schema.sql
\i scripts/db/02_create_tables.sql
\i scripts/db/03_create_functions.sql
```

---

## 🎯 Deployment Steps

### Step 1: Prepare Repository
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Go to App Platform
1. https://cloud.digitalocean.com/apps
2. **Create App**
3. Select GitHub repo: `win-room`
4. Branch: `main`
5. **Next**

### Step 3: Configure Components
1. **Edit Plan** → Add 3 components (according to config above)
2. Add environment variables (to all)
3. **Review** → **Create Resources**

### Step 4: Wait for Deployment
- Takes 5-10 minutes
- Monitor from **Logs** tab

### Step 5: Test
```bash
# Health check
curl https://your-app-name.ondigitalocean.app/api/health

# Response:
# {"status":"ok","service":"win-room-web","timestamp":"..."}
```

---

## ✅ Post-Deployment Checklist

- [ ] Is the web app opening? → `https://your-app-name.ondigitalocean.app`
- [ ] Is health check working? → `/api/health`
- [ ] Is Socket.IO connecting? → Browser console test
- [ ] Are poller worker logs visible? → Logs tab
- [ ] Is database connection successful? → Check logs

---

## 🐛 Quick Troubleshooting

### Build error?
```bash
# Test locally:
npm install
npm run build

# If it works:
git push origin main
```

### Health check failing?
- Is health check endpoint created? → `app/api/health/route.ts`

### Socket.IO not connecting?
- Is CORS origin correct? → Check environment variables
- Is socket server running? → Check logs

### Cannot connect to database?
- Are trusted sources added? → Check database settings
- Is connection string correct? → Check environment variables

### Poller worker not working?
- Are logs visible? → `poller-worker` component logs
- Is there a database connection? → Check connection string

---

## 📊 Log Monitoring

```bash
# Web component:
App Platform → Components → web → Runtime Logs

# Socket server:
App Platform → Components → socket-server → Runtime Logs

# Poller worker:
App Platform → Components → poller-worker → Runtime Logs
```

**Expected outputs:**
- **Web**: `ready - started server on 0.0.0.0:3000`
- **Socket**: `Server listening on port 3001`
- **Poller**: `Poller worker started`

---

## 🔄 Redeploy

### Automatic (recommended):
```bash
git push origin main
# App Platform deploys automatically
```

### Manual:
```
App Platform → Components → ... → Force Rebuild & Deploy
```

---

## 🌐 Domain Binding

1. **App Settings** → **Domains** → **Add Domain**
2. Enter domain: `winroom.yourdomain.com`
3. Add CNAME record:
   ```
   Type: CNAME
   Name: winroom
   Value: win-room-xxxxx.ondigitalocean.app.
   ```
4. SSL is created automatically (~10 min)

---

## 💰 Cost Optimization

**For Development:**
```
Web: Basic ($5)
Socket: Basic ($5)
Poller: Basic ($5)
────────────────
Total: $15/month
```

**For Production:**
```
Web: Professional ($12) x 2 instances
Socket: Professional ($12)
Poller: Basic ($5)
─────────────────────────────
Total: $41/month
```

**With Auto-scaling:**
```
Web: 1-3 instances (based on load)
Socket: 1 instance
Poller: 1 instance
```

---

## 📞 If You Need Help

**Detailed guide**: `DEPLOYMENT_GUIDE.md`

**DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/

**Support**: https://cloud.digitalocean.com/support

---

## 🎉 Done!

Deployment complete! 🚀

**App URL**: https://your-app-name.ondigitalocean.app

**Next Steps**:
1. 🧪 Test all features
2. 📊 Set up monitoring
3. 🔒 Change production JWT secret
4. 🌐 Add custom domain
5. 📈 Optimize scaling settings
