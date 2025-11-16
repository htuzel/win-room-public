# ⚡ Quick Admin Creation Guide

3 komutla admin oluştur!

---

## 🚀 En Hızlı Yol (Quick Mode)

```bash
npm run admin:create:quick
```

**Soracağı tek şey:**
- Password gir (min 8 karakter)

**Otomatik oluşturulacaklar:**
- Seller ID: `admin`
- Display Name: `Admin`
- Email: `admin@winroom.local`
- Role: `admin`

---

## 🎯 Interactive Mode (Tüm detayları kendin belirle)

```bash
npm run admin:create
```

**Soracakları:**
1. Seller ID (örn: `admin`, `john`)
2. Display Name (örn: `Admin User`, `John Doe`)
3. Email (örn: `admin@example.com`)
4. Password (min 8 karakter)
5. Confirm Password
6. Role (`admin` / `finance` / `sales_lead` / `sales`)
7. Pipedrive Owner ID (opsiyonel, Enter ile geç)

---

## 🔑 Password Hash Oluştur (SQL için)

```bash
npm run hash-password YOUR_PASSWORD
```

veya interactive:

```bash
npm run hash-password
# Password soracak
```

---

## ✅ Test Et

### Login API test:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@winroom.local",
    "password": "YOUR_PASSWORD"
  }'
```

### Browser test:

1. Git: http://localhost:3000/login
2. Email: `admin@winroom.local`
3. Password: `[girdiğin password]`

---

## 📝 Örnek Kullanımlar

### Development (Hızlı Setup)
```bash
npm run admin:create:quick
# Password: [seçtiğin güçlü password]
```

### Production (Güvenli)
```bash
npm run admin:create
# Seller ID: admin
# Display Name: Company Admin
# Email: admin@yourcompany.com
# Password: [güçlü password]
# Role: admin
```

### Finance User
```bash
npm run admin:create
# Seller ID: finance1
# Display Name: Finance Manager
# Email: finance@company.com
# Password: [güçlü password]
# Role: finance
```

### Sales Lead
```bash
npm run admin:create
# Seller ID: lead1
# Display Name: Sales Lead
# Email: lead@company.com
# Password: [güçlü password]
# Role: sales_lead
```

---

## 🔒 Roller

| Role | Yetki |
|------|-------|
| `admin` | Tüm yetkiler |
| `finance` | Tüm yetkiler (admin ile aynı) |
| `sales_lead` | Ekip yönetimi + kendi satışları |
| `sales` | Sadece kendi satışları |

---

## 🐛 Sorun Giderme

**"User already exists"**
```sql
DELETE FROM wr.sellers WHERE seller_id = 'admin';
-- Sonra tekrar çalıştır
```

**"Invalid credentials"**
- Password doğru mu? (case-sensitive!)
- Email lowercase mu?

**Database bağlantı hatası**
```bash
# .env dosyasında DATABASE_URL doğru mu?
cat .env | grep DATABASE_URL
```

---

## 📚 Detaylı Guide

Daha fazla bilgi için: `scripts/ADMIN_SETUP.md`

---

**Hepsi bu kadar! 🎉**
