# Win Room v2.0

**Privacy-first, gamified, transparent and fair sales room with real-time updates.**

⚡ **Quick Start**: Tüm proje dokümantasyonuna [`PROJECT.md`](./PROJECT.md) başvurun.

---

## 📖 Dokümantasyon

| Belge | Açıklama |
|-------|----------|
| **[PROJECT.md](./PROJECT.md)** | 📚 **ANA DOKÜMANTASYON** - Proje taslağı, mimarı, API, deployment, troubleshooting |
| [TSD.md](./TSD.md) | 🛠️ Teknik spesifikasyonlar, veri modeli detayları, hesaplama kuralları |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 📖 Detaylı DigitalOcean deployment adımları |
| [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md) | ⚡ 5 dakikalık hızlı deployment |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | ✅ Pre/post deployment kontrol listesi |

---

## 🚀 Hızlı Başlangıç

### Yerel Çalıştırma (3 Terminal)

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
# Bkz: DEPLOYMENT_QUICK_START.md

# 3. Database setup (ilk kez)
npm run admin:create
```

---

## 🎯 Özet

- **Privacy-First**: Kullanıcılar kendi satışlarını görmek, başkaları için sadece bar+rank
- **Claim System**: Mandatory claim (first_sales, remarketing, upgrade, installment)
- **Objections**: İtiraz yönetimi
- **Personal Goals**: Kişisel hedefler tracking
- **Margin Tracking**: Otomatik marj hesaplama
- **Real-time**: WebSocket ile anlık updates
- **Dark Theme**: Profesyonel dark UI

---

## 📋 Tech Stack

- Frontend: Next.js 14, React 19, Tailwind CSS 4, Socket.IO
- Backend: Node.js, API Routes, Poller Worker
- Database: PostgreSQL (wr + core schema)
- Deploy: DigitalOcean App Platform

---

## 📚 Daha Fazla Bilgi

👉 **Tüm detaylar için [`PROJECT.md`](./PROJECT.md) başvurun**

- Kurulum ve çalıştırma
- API endpoints
- WebSocket events
- Gizlilik ve güvenlik kuralları
- Deployment prosesi
- Troubleshooting

## 📄 License

Private - Internal Use Only
