# Win Room v2.0

**Privacy-first, gamified, transparent and fair sales room with real-time updates.**

⚡ **Quick Start**: Refer to [`PROJECT.md`](./PROJECT.md) for complete project documentation.

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[PROJECT.md](./PROJECT.md)** | 📚 **MAIN DOCUMENTATION** - Project overview, architecture, API, deployment, troubleshooting |
| [TSD.md](./TSD.md) | 🛠️ Technical specifications, data model details, calculation rules |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 📖 Detailed DigitalOcean deployment steps |
| [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md) | ⚡ 5-minute quick deployment |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | ✅ Pre/post deployment checklist |

---

## 🚀 Quick Start

### Local Development (3 Terminals)

```bash
# Terminal 1: Next.js App
npm install
npm run dev

# Terminal 2: Socket.IO Server
npm run dev:socket

# Terminal 3: Poller Worker
npm run dev:worker
```

### Production Deploy

```bash
# 1. Git push
git push origin main

# 2. DigitalOcean App Platform → Create App → 3 Components
# See: DEPLOYMENT_QUICK_START.md

# 3. Database setup (first time)
npm run admin:create
```

---

## 🎯 Overview

- **Privacy-First**: Users see their own sales, others see only bar+rank
- **Claim System**: Mandatory claim (first_sales, remarketing, upgrade, installment)
- **Objections**: Objection management system
- **Personal Goals**: Personal goal tracking
- **Margin Tracking**: Automatic margin calculation
- **Real-time**: Instant updates via WebSocket
- **Dark Theme**: Professional dark UI

---

## 📋 Tech Stack

- Frontend: Next.js 14, React 19, Tailwind CSS 4, Socket.IO
- Backend: Node.js, API Routes, Poller Worker
- Database: PostgreSQL (wr + core schema)
- Deploy: DigitalOcean App Platform

---

## 📚 More Information

👉 **Refer to [`PROJECT.md`](./PROJECT.md) for all details**

- Installation and setup
- API endpoints
- WebSocket events
- Privacy and security rules
- Deployment process
- Troubleshooting

## 📄 License

Private - Internal Use Only
