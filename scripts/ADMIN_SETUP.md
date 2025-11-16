# 🔐 Win Room v2.0 - Admin User Setup Guide

Bu guide ilk admin kullanıcınızı oluşturmanıza yardımcı olur.

---

## 🎯 Üç Yöntem

### 1️⃣ TypeScript Script (ÖNERİLEN - En Kolay) ⭐

**Interactive Mode:**
```bash
npx tsx scripts/create-admin.ts
```

Sırayla soracak:
- Seller ID (örn: `admin`)
- Display Name (örn: `Admin User`)
- Email (örn: `admin@example.com`)
- Password (min 8 karakter)
- Confirm Password
- Role (admin/finance/sales_lead/sales)
- Pipedrive Owner ID (opsiyonel)

**Quick Mode (varsayılan değerlerle):**
```bash
npx tsx scripts/create-admin.ts --quick
```

Sadece password sorar, diğerleri otomatik:
- Seller ID: `admin`
- Display Name: `Admin`
- Email: `admin@winroom.local`
- Role: `admin`

---

### 2️⃣ Node.js Script (SQL için hash oluştur)

**Adım 1: Password hash oluştur**
```bash
node scripts/hash-password.js
# Veya direkt:
node scripts/hash-password.js MySecretPassword123
```

**Adım 2: SQL çalıştır**

`scripts/create-admin.sql` dosyasını aç ve:
1. `'YOUR_HASHED_PASSWORD_HERE'` yerine yukarıdaki hash'i yapıştır
2. Diğer değerleri düzenle (email, display_name, vb.)
3. SQL'i çalıştır:

```bash
psql $DATABASE_URL -f scripts/create-admin.sql
```

---

### 3️⃣ Manuel SQL (psql console)

```bash
# psql'e bağlan
psql $DATABASE_URL

# Hash oluştur (başka bir terminal'de)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10).then(console.log);"

# SQL çalıştır (hash'i yapıştır)
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
  'admin@example.com',
  '$2a$10$... [HASH_BURAYA]',
  'admin',
  true
);
```

---

## 👥 Birden Fazla Admin

### Yöntem 1: Script'i tekrar çalıştır
```bash
npx tsx scripts/create-admin.ts
# Farklı email ve seller_id kullan
```

### Yöntem 2: SQL ile toplu ekle
```sql
-- Önce password'leri hash'le
-- Hash 1: node scripts/hash-password.js Password1
-- Hash 2: node scripts/hash-password.js Password2

INSERT INTO wr.sellers (seller_id, display_name, email, password_hash, role, is_active)
VALUES
  ('admin1', 'Admin One', 'admin1@example.com', '$2a$10$...', 'admin', true),
  ('admin2', 'Admin Two', 'admin2@example.com', '$2a$10$...', 'admin', true),
  ('finance1', 'Finance User', 'finance@example.com', '$2a$10$...', 'finance', true);
```

---

## 🔑 Roller ve Yetkiler

| Role | Yetki Seviyesi | Açıklama |
|------|----------------|----------|
| **admin** | 🔴 Full Access | Tüm yönetim işlemleri, goals, objections, exclusions |
| **finance** | 🔴 Full Access | Admin ile aynı (finansal veriler dahil) |
| **sales_lead** | 🟡 Team Access | Ekip filtreleri, kendi ve ekibinin verileri |
| **sales** | 🟢 Personal Only | Sadece kendi satışları, bar-only leaderboard |

---

## ✅ Doğrulama

### Admin oluşturuldu mu kontrol et:

```sql
SELECT
  seller_id,
  display_name,
  email,
  role,
  is_active,
  password_hash IS NOT NULL as has_password
FROM wr.sellers
WHERE role IN ('admin', 'finance');
```

Beklenen çıktı:
```
 seller_id | display_name |        email         | role  | is_active | has_password
-----------+--------------+----------------------+-------+-----------+--------------
 admin     | Admin User   | admin@example.com    | admin | t         | t
```

### Login testi:

**Local development:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YOUR_PASSWORD"
  }'
```

Beklenen yanıt:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "seller_id": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Production:**
```bash
curl -X POST https://your-app.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YOUR_PASSWORD"
  }'
```

---

## 🔒 Güvenlik Best Practices

### 1. Güçlü Password Kullan
```
✅ GOOD: MyS3cur3P@ssw0rd!2025
❌ BAD:  admin123
```

### 2. Production Email Kullan
```
✅ GOOD: admin@yourcompany.com
❌ BAD:  admin@example.com
```

### 3. Development vs Production

**Development:**
```bash
# Local için basit credentials OK
npx tsx scripts/create-admin.ts --quick
# Email: admin@winroom.local
# Password: [seçtiğin güçlü password]
```

**Production:**
```bash
# Production için strong credentials ZORUNLU
npx tsx scripts/create-admin.ts
# Email: admin@yourcompany.com
# Password: [strong password generator kullan]
```

### 4. Password Rotation

Production'da admin password'ünü düzenli değiştir:

```sql
-- Yeni hash oluştur
-- node scripts/hash-password.js NewPassword123

-- Password güncelle
UPDATE wr.sellers
SET password_hash = '$2a$10$NEW_HASH_HERE'
WHERE seller_id = 'admin';
```

---

## 🐛 Troubleshooting

### "User already exists" hatası

```sql
-- Mevcut kullanıcıyı kontrol et
SELECT * FROM wr.sellers WHERE email = 'admin@example.com';

-- Silmek istersen (DİKKAT!)
DELETE FROM wr.sellers WHERE seller_id = 'admin';

-- Veya güncelle
UPDATE wr.sellers
SET password_hash = '$2a$10$NEW_HASH',
    role = 'admin',
    is_active = true
WHERE seller_id = 'admin';
```

### "Invalid credentials" login hatası

**Sebep 1: Password yanlış**
- Password'ü doğru girdiğinden emin ol
- Case-sensitive!

**Sebep 2: Hash doğru değil**
```sql
-- Password hash var mı?
SELECT password_hash IS NOT NULL as has_password
FROM wr.sellers WHERE seller_id = 'admin';

-- Yoksa yeniden oluştur
UPDATE wr.sellers
SET password_hash = '$2a$10$NEW_HASH'
WHERE seller_id = 'admin';
```

**Sebep 3: Email lowercase değil**
```sql
-- Email'i kontrol et
SELECT email FROM wr.sellers WHERE seller_id = 'admin';

-- Lowercase'e çevir
UPDATE wr.sellers
SET email = LOWER(email)
WHERE seller_id = 'admin';
```

### "Account is inactive" hatası

```sql
-- Kullanıcıyı aktif et
UPDATE wr.sellers
SET is_active = true
WHERE seller_id = 'admin';
```

---

## 📝 Örnek Senaryolar

### Senaryo 1: İlk kurulum (development)

```bash
# 1. Database migration'ları çalıştır
psql $DATABASE_URL -f scripts/db/01_create_schema.sql
psql $DATABASE_URL -f scripts/db/02_create_tables.sql
psql $DATABASE_URL -f scripts/db/03_create_functions.sql
psql $DATABASE_URL -f scripts/db/04_add_auth_fields.sql

# 2. Admin oluştur
npx tsx scripts/create-admin.ts --quick
# Password: [seçtiğin güçlü password]

# 3. Test et
npm run dev
# Browser: http://localhost:3000/login
# Email: admin@winroom.local
# Password: [bir üstte belirlediğin password]
```

### Senaryo 2: Production deployment

```bash
# 1. Production database'e bağlan
export DATABASE_URL="postgresql://user:pass@prod-host:5432/db"

# 2. Strong credentials ile admin oluştur
npx tsx scripts/create-admin.ts

# Seller ID: admin
# Display Name: Company Admin
# Email: admin@yourcompany.com
# Password: [use password manager generated]
# Role: admin

# 3. Doğrula
curl -X POST https://your-app.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"..."}'
```

### Senaryo 3: Birden fazla admin + finance ekibi

```bash
# Admin 1
npx tsx scripts/create-admin.ts
# seller_id: admin1, email: admin1@company.com, role: admin

# Admin 2
npx tsx scripts/create-admin.ts
# seller_id: admin2, email: admin2@company.com, role: admin

# Finance
npx tsx scripts/create-admin.ts
# seller_id: finance1, email: finance@company.com, role: finance

# Sales Lead
npx tsx scripts/create-admin.ts
# seller_id: lead1, email: lead@company.com, role: sales_lead
```

---

## 🚀 Deployment Checklist

Production'a deploy etmeden önce:

- [ ] Database migration'lar çalıştırıldı
- [ ] `04_add_auth_fields.sql` çalıştırıldı (role ve password_hash kolonları eklendi)
- [ ] En az 1 admin user oluşturuldu
- [ ] Admin credentials test edildi (login çalışıyor)
- [ ] Production JWT_SECRET güçlü bir değer (`.env.production.template`)
- [ ] Admin password güçlü (min 12 karakter, özel karakterler)
- [ ] Production email kullanıldı (gerçek domain)
- [ ] Credentials güvenli bir yerde saklandı (password manager)

---

## 📚 İlgili Dosyalar

- **Script**: `scripts/create-admin.ts` - TypeScript interactive script
- **SQL Template**: `scripts/create-admin.sql` - Manuel SQL template
- **Hash Tool**: `scripts/hash-password.js` - Password hash generator
- **Migration**: `scripts/db/04_add_auth_fields.sql` - Auth fields migration
- **Login API**: `app/api/auth/login/route.ts` - Login endpoint
- **JWT Library**: `lib/auth/jwt.ts` - JWT utilities

---

## ❓ Sorular

**S: Development'ta password olmadan login olabilir miyim?**

A: Evet! `password_hash = NULL` ise development mode'da login çalışır:
```sql
INSERT INTO wr.sellers (seller_id, display_name, email, role, is_active)
VALUES ('dev', 'Dev User', 'dev@test.local', 'admin', true);
-- password_hash yok, herhangi bir password ile login olur
```

**S: Email unique mi?**

A: Evet, email unique constraint var. Aynı email ile 2 kullanıcı oluşturamazsın.

**S: Seller ID değiştirilebilir mi?**

A: Hayır, seller_id primary key. Değiştirmek yerine yeni kullanıcı oluştur.

**S: Password'ü nasıl sıfırlarım?**

A: Yeni hash oluştur ve UPDATE:
```bash
node scripts/hash-password.js NewPassword123
# Hash'i kopyala

psql $DATABASE_URL
UPDATE wr.sellers SET password_hash = '$2a$10$...' WHERE seller_id = 'admin';
```

---

## 🎉 Hazırsın!

Artık admin kullanıcını oluşturdun ve sisteme giriş yapabilirsin!

**Next Steps:**
1. 🔓 Login yap: `/login`
2. 👥 Sales users ekle
3. 🎯 Goals ayarla
4. 📊 Dashboard'u kontrol et

**Happy selling! 🚀**
