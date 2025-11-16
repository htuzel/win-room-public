# 📢 Promotion Banner System - Setup Guide

## ✅ Complete!

The promotion banner system is fully ready with **database + admin panel**!

---

## 🚀 Setup (One-Time Setup)

### 1. Run Database Migration

Run the migration in your PostgreSQL database:

```bash
# Connect to database
psql -U your_user -d your_database

# or
psql $DATABASE_URL

# Run migration file
\i lib/db/migrations/create_promotions_table.sql
```

**Alternative**: Execute `lib/db/migrations/create_promotions_table.sql` using a SQL client

Migration does the following:
- ✅ Creates `promotions` table
- ✅ Adds default "Black Friday" promotion
- ✅ Enforces only 1 active promotion rule (trigger)
- ✅ Adds indexes (performance)

---

## 🎯 Usage

### Admin Panel Management

1. **Go to Admin Panel**
   ```
   https://sales-panel.flalingo.com/admin
   ```

2. **Click "📢 Promotions" Tab**
   - In the tab list on the right side

3. **Create/Edit Promotion**
   - **Title**: Campaign title (e.g., "Black Friday! 🔥")
   - **Message**: Detail message
   - **Theme**: 4 color options
     - 🎀 Promo (Purple/Pink) - For campaigns
     - 💚 Success (Green) - For achievements
     - 💙 Info (Blue) - For announcements
     - 🧡 Warning (Orange) - For warnings
   - **Icon**: Select emoji (20+ ready options)
   - **Active**: Show/hide banner

4. **Preview**
   - You'll see live preview in the right panel

5. **Save and Publish**
   - Published instantly, all users will see it

---

## 🏗️ Technical Architecture

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
GET  /api/promotions/current       → Active promotion (public, no auth)
GET  /api/admin/promotions         → All promotions (admin only)
POST /api/admin/promotions         → New promotion (admin only)
PUT  /api/admin/promotions         → Update (admin only)
```

### Pages
```
/admin/promotions                  → Admin panel UI
/                                  → Dashboard (banner visible)
/installments                      → Installments (banner visible)
```

---

## 📂 File Structure

```
lib/
├── config/
│   ├── promotions.ts              ❌ No longer used (moved to database)
│   └── PROMOTIONS_README.md       ❌ Old manual guide
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

### Banner Not Showing?
1. Did database migration run?
   ```sql
   SELECT * FROM promotions;
   ```
2. Is `visible = true`?
3. Any errors in browser console?

### Admin Panel Not Opening?
- Is user role `admin`, `finance`, or `sales_lead`?
- Is token valid?

### API 500 Error?
- Is database connection working?
- Does `promotions` table exist?

---

## 🎨 Old System (Manual Config) vs New System (Database)

### Old (Manual)
```typescript
// lib/config/promotions.ts
export const currentPromotion = {
  title: 'Black Friday!',
  message: 'Showtime!',
  variant: 'promo',
  icon: '🎯',
  visible: true,
};
```
❌ Requires file edit
❌ Requires code deployment
❌ Non-technical admins cannot use it

### New (Database + Admin UI)
```
Admin Panel → Promotions → Edit → Save
```
✅ No code change
✅ No deployment
✅ Published instantly
✅ Non-technical admins can use it
✅ History tracking
✅ Preview

---

## 🚀 Next Steps (Optional Future Features)

- [ ] Promotion history (list of past campaigns)
- [ ] Template library (ready templates)
- [ ] Schedule (start/end dates)
- [ ] Targeting (show to specific roles)
- [ ] A/B testing
- [ ] Click tracking

---

## 📞 Support

If you encounter issues:
1. Make sure migration ran
2. Check database connection is working
3. Look at browser console
4. Inspect API responses

**File**: `/lib/db/migrations/create_promotions_table.sql`
**Admin Panel**: `/admin/promotions`
**API**: `/api/admin/promotions`

---

**Status**: ✅ Production Ready
**Date**: 2025-10-25
