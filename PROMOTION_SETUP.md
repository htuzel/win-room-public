# 📢 Promotion Banner System - Setup Guide

## ✅ Tamamlandı!

Promotion banner sistemi **database + admin panel** ile tamamen hazır!

---

## 🚀 Kurulum (One-Time Setup)

### 1. Database Migration Çalıştır

PostgreSQL database'de migration'ı çalıştırın:

```bash
# Database'e bağlan
psql -U your_user -d your_database

# veya
psql $DATABASE_URL

# Migration dosyasını çalıştır
\i lib/db/migrations/create_promotions_table.sql
```

**Alternatif**: SQL client kullanarak (`lib/db/migrations/create_promotions_table.sql` dosyasını execute edin)

Migration şunları yapar:
- ✅ `promotions` tablosunu oluşturur
- ✅ Default "Black Friday" promotion'ı ekler
- ✅ Sadece 1 aktif promotion olabilir kuralını enforce eder (trigger)
- ✅ Index ekler (performance)

---

## 🎯 Kullanım

### Admin Panel'den Yönetim

1. **Admin Panel'e Git**
   ```
   https://sales-panel.flalingo.com/admin
   ```

2. **"📢 Promotions" Tab'ine Tıkla**
   - Sağ tarafta tab listesinde

3. **Promotion Oluştur/Düzenle**
   - **Başlık**: Kampanya başlığı (örn: "Black Friday! 🔥")
   - **Mesaj**: Detay mesajı
   - **Tema**: 4 renk seçeneği
     - 🎀 Promo (Mor/Pembe) - Kampanyalar için
     - 💚 Success (Yeşil) - Başarılar için
     - 💙 Info (Mavi) - Bilgilendirmeler için
     - 🧡 Warning (Turuncu) - Uyarılar için
   - **Icon**: Emoji seç (20+ hazır seçenek)
   - **Aktif**: Banner'ı göster/gizle

4. **Önizleme**
   - Sağ panelde canlı preview görürsün

5. **Kaydet ve Yayınla**
   - Anında yayınlanır, tüm kullanıcılar görür

---

## 🏗️ Teknik Mimari

### Database
```sql
Table: promotions
- id: SERIAL PRIMARY KEY
- title: VARCHAR(255)
- message: TEXT
- variant: VARCHAR(20) ['promo', 'info', 'success', 'warning']
- icon: VARCHAR(10)
- visible: BOOLEAN
- created_by: VARCHAR(100)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### API Endpoints
```
GET  /api/promotions/current       → Aktif promotion (public, no auth)
GET  /api/admin/promotions         → Tüm promotions (admin only)
POST /api/admin/promotions         → Yeni promotion (admin only)
PUT  /api/admin/promotions         → Güncelle (admin only)
```

### Pages
```
/admin/promotions                  → Admin panel UI
/                                  → Dashboard (banner görünür)
/installments                      → Installments (banner görünür)
```

---

## 📂 Dosya Yapısı

```
lib/
├── config/
│   ├── promotions.ts              ❌ Artık kullanılmıyor (database'e taşındı)
│   └── PROMOTIONS_README.md       ❌ Eski manuel guide
├── db/
│   └── migrations/
│       └── create_promotions_table.sql  ✅ Database migration
app/
├── api/
│   ├── promotions/
│   │   └── current/
│   │       └── route.ts           ✅ Public API (current promotion)
│   └── admin/
│       └── promotions/
│           └── route.ts           ✅ Admin API (CRUD)
├── admin/
│   └── promotions/
│       └── page.tsx               ✅ Admin UI
└── page.tsx                       ✅ Dashboard (displays banner)

components/
└── ui/
    └── PromotionBanner.tsx        ✅ Banner component
```

---

## 🔧 Troubleshooting

### Banner Görünmüyor?
1. Database migration çalıştı mı?
   ```sql
   SELECT * FROM promotions;
   ```
2. `visible = true` mı?
3. Browser console'da hata var mı?

### Admin Panel Açılmıyor?
- User role'ü `admin`, `finance` veya `sales_lead` mi?
- Token geçerli mi?

### API 500 Hatası?
- Database bağlantısı çalışıyor mu?
- `promotions` tablosu var mı?

---

## 🎨 Eski Sistem (Manuel Config) vs Yeni Sistem (Database)

### Eski (Manuel)
```typescript
// lib/config/promotions.ts
export const currentPromotion = {
  title: 'Black Friday!',
  message: 'Şov zamanı!',
  variant: 'promo',
  icon: '🎯',
  visible: true,
};
```
❌ File edit gerekir
❌ Code deployment gerekir
❌ Non-technical admin kullanamaz

### Yeni (Database + Admin UI)
```
Admin Panel → Promotions → Edit → Save
```
✅ No code change
✅ No deployment
✅ Anında yayınlanır
✅ Non-technical admin kullanabilir
✅ History tracking
✅ Preview

---

## 🚀 Next Steps (Optional Future Features)

- [ ] Promotion history (geçmiş kampanyalar listesi)
- [ ] Template library (hazır şablonlar)
- [ ] Schedule (başlangıç/bitiş tarihleri)
- [ ] Targeting (belirli role'lere göster)
- [ ] A/B testing
- [ ] Click tracking

---

## 📞 Support

Sorun yaşarsan:
1. Migration çalıştığından emin ol
2. Database connection çalışıyor mu kontrol et
3. Browser console'a bak
4. API response'ları incele

**Dosya**: `/lib/db/migrations/create_promotions_table.sql`
**Admin Panel**: `/admin/promotions`
**API**: `/api/admin/promotions`

---

**Status**: ✅ Production Ready
**Date**: 2025-10-25
