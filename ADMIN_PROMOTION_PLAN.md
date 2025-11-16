# 📢 Admin Promotion Panel - İmplementasyon Planı

## 🎯 Şu Anki Durum

**Manuel Yönetim**: Admin `lib/config/promotions.ts` dosyasını düzenliyor.

```typescript
export const currentPromotion: PromotionConfig = {
  title: 'Black Friday! 🔥',
  message: 'Şov zamanı!',
  variant: 'promo',
  icon: '🎯',
  visible: true,
};
```

## ✅ Avantajlar
- ✅ Hızlı ve basit
- ✅ Code deployment gerektirmiyor
- ✅ Hemen çalışıyor
- ✅ Developer-friendly

## ❌ Dezavantajlar
- ❌ Teknik bilgi gerekiyor
- ❌ File access gerekiyor
- ❌ Non-technical admin kullanamıyor

---

## 🚀 Gelecek: Admin Panel Entegrasyonu

### Opsiyon 1: Database'e Taşıma (Önerilen)

#### Database Schema
```sql
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  variant VARCHAR(20) CHECK (variant IN ('promo', 'info', 'success', 'warning')),
  icon VARCHAR(10),
  visible BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sadece 1 aktif promotion olabilir
CREATE UNIQUE INDEX idx_active_promotion ON promotions (visible) WHERE visible = true;
```

#### API Endpoints
```
GET  /api/admin/promotions/current  → Aktif promotion'ı getir
POST /api/admin/promotions          → Yeni promotion oluştur
PUT  /api/admin/promotions/:id      → Güncelle
DELETE /api/admin/promotions/:id    → Sil
```

#### Admin Panel UI
`/admin/promotions` sayfası ekle:

```tsx
<AdminPromotionPanel>
  <input name="title" placeholder="Başlık" />
  <textarea name="message" placeholder="Mesaj" />
  <select name="variant">
    <option value="promo">Promo (Mor/Pembe)</option>
    <option value="success">Success (Yeşil)</option>
    <option value="info">Info (Mavi)</option>
    <option value="warning">Warning (Turuncu)</option>
  </select>
  <input name="icon" placeholder="Emoji (🎯)" />
  <toggle name="visible" label="Aktif" />
  <button>Kaydet</button>
</AdminPromotionPanel>

{/* Preview */}
<PromotionBanner {...previewData} />
```

#### Client-Side Değişiklik
```diff
- import { currentPromotion } from '@/lib/config/promotions';
+ const [promotion, setPromotion] = useState(null);

+ useEffect(() => {
+   fetch('/api/admin/promotions/current')
+     .then(res => res.json())
+     .then(setPromotion);
+ }, []);

  <PromotionBanner
-   title={currentPromotion.title}
+   title={promotion?.title}
    ...
  />
```

---

### Opsiyon 2: Config + Admin UI (Hybrid)

Config dosyası kalır ama admin panel'den düzenlenebilir.

#### API Endpoint
```
POST /api/admin/promotions/update
  → promotions.ts dosyasını günceller (fs.writeFile)
```

**Avantaj**: Database'e gerek yok
**Dezavantaj**: File write permissions gerekir, multiple instance'da sorunlu

---

## 📊 Önerilen İmplementasyon Sırası

### Phase 1: Database (1-2 gün)
1. ✅ Migration yaz (`promotions` table)
2. ✅ API routes oluştur
3. ✅ Admin panel UI ekle
4. ✅ Dashboard'da API'den çek

### Phase 2: Admin Features (1 gün)
1. ✅ Live preview ekle
2. ✅ History/geçmiş promotions
3. ✅ Template library (hazır örnekler)
4. ✅ Schedule (başlangıç/bitiş tarihleri) - **opsiyonel**

### Phase 3: Polish (0.5 gün)
1. ✅ Emoji picker ekle
2. ✅ Color preview
3. ✅ Responsive UI

---

## 🎨 Mockup: Admin Panel

```
┌─────────────────────────────────────────────┐
│  📢 Promotion Banner Yönetimi               │
├─────────────────────────────────────────────┤
│                                             │
│  Başlık *                                   │
│  ┌─────────────────────────────────────┐   │
│  │ Black Friday Başladı! 🔥            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Mesaj *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ Şov zamanı! Bugün özel indirimler   │   │
│  │ var, hızlı karar alın.              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Tema *                                     │
│  ┌─────────────────────────────────────┐   │
│  │ 🎀 Promo (Mor/Pembe)          ▼    │   │
│  └─────────────────────────────────────┘   │
│     💚 Success  💙 Info  🧡 Warning        │
│                                             │
│  Icon (Emoji) *                             │
│  ┌───────┐  [Emoji Picker]                 │
│  │  🎯   │                                  │
│  └───────┘                                  │
│                                             │
│  ☑ Aktif (Banner'ı göster)                 │
│                                             │
│  [Önizle]  [Kaydet ve Yayınla]             │
│                                             │
├─────────────────────────────────────────────┤
│  📋 Önizleme                                │
├─────────────────────────────────────────────┤
│                                             │
│  <PromotionBanner preview />                │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 💡 Hızlı Başlangıç (Manuel → Database)

### 1. Migration Oluştur
```bash
# Yeni migration dosyası
touch migrations/XXX_create_promotions_table.sql
```

### 2. API Route Ekle
```bash
# Admin API
touch app/api/admin/promotions/route.ts
touch app/api/admin/promotions/current/route.ts
```

### 3. Admin Panel
```bash
# Admin sayfası
touch app/admin/promotions/page.tsx
```

### 4. Dashboard Güncelle
```bash
# app/page.tsx içinde API'den çek
```

---

## 🎯 Sonuç

**Şu an**: Manuel config dosyası (hızlı, basit)
**İleride**: Database + Admin panel (professional, scalable)

**Öneri**: Şimdilik manuel kalsın, zamanla admin panel ekleriz.

---

**İletişim**: Bu dosya implementation roadmap'idir. Detay için projeyi inceleyin.
