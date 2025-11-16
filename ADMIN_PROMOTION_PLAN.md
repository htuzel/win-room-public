# 📢 Admin Promotion Panel - Implementation Plan

## 🎯 Current State

**Manual Management**: Admin edits `lib/config/promotions.ts` file.

```typescript
export const currentPromotion: PromotionConfig = {
  title: 'Black Friday! 🔥',
  message: 'Showtime!',
  variant: 'promo',
  icon: '🎯',
  visible: true,
};
```

## ✅ Advantages
- ✅ Fast and simple
- ✅ No code deployment required
- ✅ Works immediately
- ✅ Developer-friendly

## ❌ Disadvantages
- ❌ Requires technical knowledge
- ❌ Requires file access
- ❌ Non-technical admins cannot use it

---

## 🚀 Future: Admin Panel Integration

### Option 1: Move to Database (Recommended)

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

-- Only 1 active promotion allowed
CREATE UNIQUE INDEX idx_active_promotion ON promotions (visible) WHERE visible = true;
```

#### API Endpoints
```
GET  /api/admin/promotions/current  → Get active promotion
POST /api/admin/promotions          → Create new promotion
PUT  /api/admin/promotions/:id      → Update
DELETE /api/admin/promotions/:id    → Delete
```

#### Admin Panel UI
Add `/admin/promotions` page:

```tsx
<AdminPromotionPanel>
  <input name="title" placeholder="Title" />
  <textarea name="message" placeholder="Message" />
  <select name="variant">
    <option value="promo">Promo (Purple/Pink)</option>
    <option value="success">Success (Green)</option>
    <option value="info">Info (Blue)</option>
    <option value="warning">Warning (Orange)</option>
  </select>
  <input name="icon" placeholder="Emoji (🎯)" />
  <toggle name="visible" label="Active" />
  <button>Save</button>
</AdminPromotionPanel>

{/* Preview */}
<PromotionBanner {...previewData} />
```

#### Client-Side Changes
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

### Option 2: Config + Admin UI (Hybrid)

Config file remains but can be edited through admin panel.

#### API Endpoint
```
POST /api/admin/promotions/update
  → Updates promotions.ts file (fs.writeFile)
```

**Advantage**: No database needed
**Disadvantage**: Requires file write permissions, problematic with multiple instances

---

## 📊 Recommended Implementation Order

### Phase 1: Database (1-2 days)
1. ✅ Write migration (`promotions` table)
2. ✅ Create API routes
3. ✅ Add admin panel UI
4. ✅ Fetch from API in dashboard

### Phase 2: Admin Features (1 day)
1. ✅ Add live preview
2. ✅ History/past promotions
3. ✅ Template library (ready examples)
4. ✅ Schedule (start/end dates) - **optional**

### Phase 3: Polish (0.5 day)
1. ✅ Add emoji picker
2. ✅ Color preview
3. ✅ Responsive UI

---

## 🎨 Mockup: Admin Panel

```
┌─────────────────────────────────────────────┐
│  📢 Promotion Banner Management             │
├─────────────────────────────────────────────┤
│                                             │
│  Title *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ Black Friday Started! 🔥            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Message *                                  │
│  ┌─────────────────────────────────────┐   │
│  │ Showtime! Today we have special     │   │
│  │ discounts, decide quickly.          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Theme *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ 🎀 Promo (Purple/Pink)          ▼  │   │
│  └─────────────────────────────────────┘   │
│     💚 Success  💙 Info  🧡 Warning        │
│                                             │
│  Icon (Emoji) *                             │
│  ┌───────┐  [Emoji Picker]                 │
│  │  🎯   │                                  │
│  └───────┘                                  │
│                                             │
│  ☑ Active (Show banner)                    │
│                                             │
│  [Preview]  [Save and Publish]             │
│                                             │
├─────────────────────────────────────────────┤
│  📋 Preview                                 │
├─────────────────────────────────────────────┤
│                                             │
│  <PromotionBanner preview />                │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 💡 Quick Start (Manual → Database)

### 1. Create Migration
```bash
# New migration file
touch migrations/XXX_create_promotions_table.sql
```

### 2. Add API Route
```bash
# Admin API
touch app/api/admin/promotions/route.ts
touch app/api/admin/promotions/current/route.ts
```

### 3. Admin Panel
```bash
# Admin page
touch app/admin/promotions/page.tsx
```

### 4. Update Dashboard
```bash
# Fetch from API in app/page.tsx
```

---

## 🎯 Conclusion

**Current**: Manual config file (fast, simple)
**Future**: Database + Admin panel (professional, scalable)

**Recommendation**: Keep manual for now, add admin panel over time.

---

**Contact**: This file is an implementation roadmap. See the project for details.
