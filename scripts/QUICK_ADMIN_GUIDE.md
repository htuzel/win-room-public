# ⚡ Quick Admin Creation Guide

Create admin in 3 commands!

---

## 🚀 Fastest Way (Quick Mode)

```bash
npm run admin:create:quick
```

**Only thing it will ask:**
- Enter password (min 8 characters)

**Will be created automatically:**
- Seller ID: `admin`
- Display Name: `Admin`
- Email: `admin@winroom.local`
- Role: `admin`

---

## 🎯 Interactive Mode (Specify all details yourself)

```bash
npm run admin:create
```

**What it will ask:**
1. Seller ID (e.g., `admin`, `john`)
2. Display Name (e.g., `Admin User`, `John Doe`)
3. Email (e.g., `admin@example.com`)
4. Password (min 8 characters)
5. Confirm Password
6. Role (`admin` / `finance` / `sales_lead` / `sales`)
7. Pipedrive Owner ID (optional, press Enter to skip)

---

## 🔑 Generate Password Hash (for SQL)

```bash
npm run hash-password YOUR_PASSWORD
```

or interactive:

```bash
npm run hash-password
# Will ask for password
```

---

## ✅ Test It

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

1. Go to: http://localhost:3000/login
2. Email: `admin@winroom.local`
3. Password: `[the password you entered]`

---

## 📝 Example Uses

### Development (Quick Setup)
```bash
npm run admin:create:quick
# Password: [your chosen strong password]
```

### Production (Secure)
```bash
npm run admin:create
# Seller ID: admin
# Display Name: Company Admin
# Email: admin@yourcompany.com
# Password: [strong password]
# Role: admin
```

### Finance User
```bash
npm run admin:create
# Seller ID: finance1
# Display Name: Finance Manager
# Email: finance@company.com
# Password: [strong password]
# Role: finance
```

### Sales Lead
```bash
npm run admin:create
# Seller ID: lead1
# Display Name: Sales Lead
# Email: lead@company.com
# Password: [strong password]
# Role: sales_lead
```

---

## 🔒 Roles

| Role | Permissions |
|------|-------------|
| `admin` | All permissions |
| `finance` | All permissions (same as admin) |
| `sales_lead` | Team management + own sales |
| `sales` | Only own sales |

---

## 🐛 Troubleshooting

**"User already exists"**
```sql
DELETE FROM wr.sellers WHERE seller_id = 'admin';
-- Then run again
```

**"Invalid credentials"**
- Is password correct? (case-sensitive!)
- Is email lowercase?

**Database connection error**
```bash
# Is DATABASE_URL correct in .env file?
cat .env | grep DATABASE_URL
```

---

## 📚 Detailed Guide

For more information: `scripts/ADMIN_SETUP.md`

---

**That's it! 🎉**
