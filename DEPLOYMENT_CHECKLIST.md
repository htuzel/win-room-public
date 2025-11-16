# ✅ Win Room v2.0 - Deployment Checklist

Pre-deployment and post-deployment checklist.

---

## 📋 PRE-DEPLOYMENT

### Repository Preparation
- [ ] Git repository created (GitHub/GitLab)
- [ ] `.gitignore` file includes `.env`
- [ ] `.env` file not committed
- [ ] Latest changes committed and pushed
- [ ] `main` branch up to date

### Code Review
- [ ] `package.json` scripts correct:
  - [ ] `"build": "next build"`
  - [ ] `"start": "next start"`
  - [ ] `"start:socket": "tsx services/socket/server.ts"`
  - [ ] `"start:worker": "tsx services/poller/worker.ts"`
- [ ] Health check endpoint exists: `app/api/health/route.ts`
- [ ] No TypeScript errors: `npm run build` successful
- [ ] Linter clean: `npm run lint` successful

### Database Preparation
- [ ] PostgreSQL database created (DigitalOcean)
- [ ] Database connection string ready
- [ ] `wr` schema created:
  - [ ] `scripts/db/01_create_schema.sql` executed
  - [ ] `scripts/db/02_create_tables.sql` executed
  - [ ] `scripts/db/03_create_functions.sql` executed
- [ ] Test data added (sellers, etc.)
- [ ] Database Trusted Sources configured (App Platform to be added)

### Environment Variables Preparation
- [ ] `.env.production.template` reviewed
- [ ] Production JWT secret prepared (strong random string)
- [ ] Database credentials correct
- [ ] Socket port setting correct (3001)
- [ ] CORS origins defined

---

## 🚀 DEPLOYMENT

### DigitalOcean App Platform Setup
- [ ] Navigated to App Platform
- [ ] Clicked "Create App"
- [ ] Connected GitHub repository
- [ ] Selected branch: `main`
- [ ] Enabled autodeploy

### Component 1: Web Service
- [ ] Component name: `web`
- [ ] Type: Selected `Web Service`
- [ ] Build command: `npm install && npm run build`
- [ ] Run command: `npm start`
- [ ] HTTP Port: `3000`
- [ ] HTTP Route: `/`
- [ ] Health check path: `/api/health`
- [ ] Selected instance size (Basic/Professional)
- [ ] Added environment variables (all)

### Component 2: Socket.IO Worker
- [ ] Component name: `socket-server`
- [ ] Type: Selected `Worker`
- [ ] Build command: `npm install`
- [ ] Run command: `npm run start:socket`
- [ ] Selected instance size (Basic)
- [ ] Added environment variables (all)
- [ ] Added `SOCKET_CORS_ORIGIN` (web URL)

### Component 3: Poller Worker
- [ ] Component name: `poller-worker`
- [ ] Type: Selected `Worker`
- [ ] Build command: `npm install`
- [ ] Run command: `npm run start:worker`
- [ ] Selected instance size (Basic)
- [ ] Added environment variables (all)

### Final Steps
- [ ] All settings reviewed
- [ ] Clicked "Create Resources"
- [ ] Deployment started

---

## ⏱️ DEPLOYMENT PROGRESS

### Build Phase
- [ ] Web component building... ✅
- [ ] Socket-server component building... ✅
- [ ] Poller-worker component building... ✅
- [ ] No build errors

### Deploy Phase
- [ ] Creating containers...
- [ ] Web service deployed ✅
- [ ] Socket server deployed ✅
- [ ] Poller worker deployed ✅

### Health Checks
- [ ] Web health check passing ✅
- [ ] App status "Live" ✅

### Database Connection
- [ ] Database Trusted Sources updated
- [ ] App Platform IP range added
- [ ] Test connection successful

---

## ✅ POST-DEPLOYMENT

### Basic Tests
- [ ] App URL opens: `https://win-room-xxxxx.ondigitalocean.app`
- [ ] Health check working: `/api/health` → `{"status":"ok"}`
- [ ] No 404 errors (Next.js routing working)
- [ ] Login page opens: `/login`

### Component Logs Review

#### Web Component:
- [ ] Logs opened: `Components → web → Runtime Logs`
- [ ] Expected output seen:
  ```
  ready - started server on 0.0.0.0:3000
  ```
- [ ] No errors
- [ ] Warnings normal (if any)

#### Socket Server:
- [ ] Logs opened: `Components → socket-server → Runtime Logs`
- [ ] Expected output seen:
  ```
  [Socket] Server listening on port 3001
  [Socket] CORS origins: https://...
  [Socket] Ready to accept connections
  [Socket] Starting event polling from ID: 0
  ```
- [ ] No errors
- [ ] Database connection successful

#### Poller Worker:
- [ ] Logs opened: `Components → poller-worker → Runtime Logs`
- [ ] Expected output seen:
  ```
  [Poller] Worker started
  [Poller] Polling interval: 2000ms
  [Poller] Connected to database
  ```
- [ ] No errors
- [ ] Polling started

### Functional Tests

#### API Endpoints:
- [ ] `GET /api/health` → 200 OK
- [ ] `GET /api/queue` → Authentication error (expected)
- [ ] `POST /api/login` → Working (with test user)

#### Socket.IO:
- [ ] Browser console test:
  ```javascript
  const socket = io('https://win-room-xxxxx.ondigitalocean.app');
  socket.on('connect', () => console.log('Connected!'));
  ```
- [ ] Connection successful
- [ ] Event broadcast working

#### Database:
- [ ] Web app can read from database
- [ ] Poller worker can write to database
- [ ] Data being written to events table

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Socket.IO latency < 100ms
- [ ] Memory usage normal (< 80%)
- [ ] CPU usage normal (< 70%)

---

## 🔧 CONFIGURATION

### Domain Setup (Optional)
- [ ] Custom domain added
- [ ] DNS CNAME record added
- [ ] SSL certificate created
- [ ] Access through domain working

### Security
- [ ] Production JWT secret changed
- [ ] CORS origins set to production domain
- [ ] Database password secure
- [ ] Environment variables encrypted (SECRET type)

### Monitoring
- [ ] Metrics opened: `Insights` tab
- [ ] CPU/Memory usage monitored
- [ ] Alerts configured (optional):
  - [ ] CPU > 80%
  - [ ] Memory > 80%
  - [ ] Health check fails
- [ ] Email/Slack notification configured

### Scaling (For Production)
- [ ] Auto-scaling enabled (optional)
- [ ] Min/Max instance count configured
- [ ] CPU threshold defined
- [ ] Load balancing working

---

## 📊 VERIFICATION

### End-to-End Test
- [ ] Can log in
- [ ] Queue displaying
- [ ] Claim operation working
- [ ] Leaderboard updating
- [ ] Real-time updates arriving (Socket.IO)
- [ ] Personal goals visible
- [ ] Admin panel accessible (with admin user)

### Data Flow Test
- [ ] Poller finding new subscriptions
- [ ] Adding to queue
- [ ] Creating events
- [ ] Socket.IO broadcasting
- [ ] Displaying on frontend

### Error Handling
- [ ] 404 page proper
- [ ] 500 errors logged
- [ ] Authentication errors proper
- [ ] Rate limiting working
- [ ] Database connection retry working

---

## 🎉 DEPLOYMENT COMPLETE!

If all checklists are completed, deployment is successful! 🚀

### Next Steps:
1. 📊 Monitor metrics daily
2. 📝 Check logs
3. 🐛 Set up bug reporting system
4. 📈 Optimize performance
5. 🔒 Conduct security audit
6. 👥 Provide user training
7. 📚 Update documentation

---

## 📞 Support

If there are issues:
1. Check logs (for each component)
2. See `DEPLOYMENT_GUIDE.md` → Troubleshooting section
3. Open DigitalOcean support ticket

**App Status**: https://cloud.digitalocean.com/apps/[app-id]

**Documentation**: `/DEPLOYMENT_GUIDE.md`

**Quick Start**: `/DEPLOYMENT_QUICK_START.md`

---

**Last Updated**: 2025-10-24
**Version**: 2.0.0
