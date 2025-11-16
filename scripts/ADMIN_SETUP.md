# 🔐 Win Room v2.0 - Admin User Setup Guide

This guide helps you create your first admin user.

---

## 🎯 Three Methods

### 1️⃣ TypeScript Script (RECOMMENDED - Easiest) ⭐

**Interactive Mode:**
```bash
npx tsx scripts/create-admin.ts
```

Will ask in sequence:
- Seller ID (e.g., `admin`)
- Display Name (e.g., `Admin User`)
- Email (e.g., `admin@example.com`)
- Password (min 8 characters)
- Confirm Password
- Role (admin/finance/sales_lead/sales)
- Pipedrive Owner ID (optional)

**Quick Mode (with default values):**
```bash
npx tsx scripts/create-admin.ts --quick
```

Only asks for password, others are automatic:
- Seller ID: `admin`
- Display Name: `Admin`
- Email: `admin@winroom.local`
- Role: `admin`

---

### 2️⃣ Node.js Script (Generate hash for SQL)

**Step 1: Generate password hash**
```bash
node scripts/hash-password.js
# Or directly:
node scripts/hash-password.js MySecretPassword123
```

**Step 2: Run SQL**

Open the `scripts/create-admin.sql` file and:
1. Replace `'YOUR_HASHED_PASSWORD_HERE'` with the hash from above
2. Edit other values (email, display_name, etc.)
3. Run the SQL:

```bash
psql $DATABASE_URL -f scripts/create-admin.sql
```

---

### 3️⃣ Manual SQL (psql console)

```bash
# Connect to psql
psql $DATABASE_URL

# Generate hash (in another terminal)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10).then(console.log);"

# Run SQL (paste the hash)
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
  '$2a$10$... [HASH_HERE]',
  'admin',
  true
);
```

---

## 👥 Multiple Admins

### Method 1: Run script again
```bash
npx tsx scripts/create-admin.ts
# Use different email and seller_id
```

### Method 2: Bulk insert with SQL
```sql
-- First hash the passwords
-- Hash 1: node scripts/hash-password.js Password1
-- Hash 2: node scripts/hash-password.js Password2

INSERT INTO wr.sellers (seller_id, display_name, email, password_hash, role, is_active)
VALUES
  ('admin1', 'Admin One', 'admin1@example.com', '$2a$10$...', 'admin', true),
  ('admin2', 'Admin Two', 'admin2@example.com', '$2a$10$...', 'admin', true),
  ('finance1', 'Finance User', 'finance@example.com', '$2a$10$...', 'finance', true);
```

---

## 🔑 Roles and Permissions

| Role | Permission Level | Description |
|------|-----------------|-------------|
| **admin** | 🔴 Full Access | All management operations, goals, objections, exclusions |
| **finance** | 🔴 Full Access | Same as admin (including financial data) |
| **sales_lead** | 🟡 Team Access | Team filters, own and team's data |
| **sales** | 🟢 Personal Only | Only own sales, bar-only leaderboard |

---

## ✅ Verification

### Check if admin was created:

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

Expected output:
```
 seller_id | display_name |        email         | role  | is_active | has_password
-----------+--------------+----------------------+-------+-----------+--------------
 admin     | Admin User   | admin@example.com    | admin | t         | t
```

### Login test:

**Local development:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YOUR_PASSWORD"
  }'
```

Expected response:
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

## 🔒 Security Best Practices

### 1. Use Strong Password
```
✅ GOOD: MyS3cur3P@ssw0rd!2025
❌ BAD:  admin123
```

### 2. Use Production Email
```
✅ GOOD: admin@yourcompany.com
❌ BAD:  admin@example.com
```

### 3. Development vs Production

**Development:**
```bash
# Simple credentials OK for local
npx tsx scripts/create-admin.ts --quick
# Email: admin@winroom.local
# Password: [your chosen strong password]
```

**Production:**
```bash
# Strong credentials REQUIRED for production
npx tsx scripts/create-admin.ts
# Email: admin@yourcompany.com
# Password: [use strong password generator]
```

### 4. Password Rotation

Rotate admin password regularly in production:

```sql
-- Generate new hash
-- node scripts/hash-password.js NewPassword123

-- Update password
UPDATE wr.sellers
SET password_hash = '$2a$10$NEW_HASH_HERE'
WHERE seller_id = 'admin';
```

---

## 🐛 Troubleshooting

### "User already exists" error

```sql
-- Check existing user
SELECT * FROM wr.sellers WHERE email = 'admin@example.com';

-- Delete if you want (CAREFUL!)
DELETE FROM wr.sellers WHERE seller_id = 'admin';

-- Or update
UPDATE wr.sellers
SET password_hash = '$2a$10$NEW_HASH',
    role = 'admin',
    is_active = true
WHERE seller_id = 'admin';
```

### "Invalid credentials" login error

**Reason 1: Wrong password**
- Make sure you entered the password correctly
- Case-sensitive!

**Reason 2: Hash is incorrect**
```sql
-- Does password hash exist?
SELECT password_hash IS NOT NULL as has_password
FROM wr.sellers WHERE seller_id = 'admin';

-- If not, recreate
UPDATE wr.sellers
SET password_hash = '$2a$10$NEW_HASH'
WHERE seller_id = 'admin';
```

**Reason 3: Email not lowercase**
```sql
-- Check email
SELECT email FROM wr.sellers WHERE seller_id = 'admin';

-- Convert to lowercase
UPDATE wr.sellers
SET email = LOWER(email)
WHERE seller_id = 'admin';
```

### "Account is inactive" error

```sql
-- Activate user
UPDATE wr.sellers
SET is_active = true
WHERE seller_id = 'admin';
```

---

## 📝 Example Scenarios

### Scenario 1: Initial setup (development)

```bash
# 1. Run database migrations
psql $DATABASE_URL -f scripts/db/01_create_schema.sql
psql $DATABASE_URL -f scripts/db/02_create_tables.sql
psql $DATABASE_URL -f scripts/db/03_create_functions.sql
psql $DATABASE_URL -f scripts/db/04_add_auth_fields.sql

# 2. Create admin
npx tsx scripts/create-admin.ts --quick
# Password: [your chosen strong password]

# 3. Test
npm run dev
# Browser: http://localhost:3000/login
# Email: admin@winroom.local
# Password: [the password you set above]
```

### Scenario 2: Production deployment

```bash
# 1. Connect to production database
export DATABASE_URL="postgresql://user:pass@prod-host:5432/db"

# 2. Create admin with strong credentials
npx tsx scripts/create-admin.ts

# Seller ID: admin
# Display Name: Company Admin
# Email: admin@yourcompany.com
# Password: [use password manager generated]
# Role: admin

# 3. Verify
curl -X POST https://your-app.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"..."}'
```

### Scenario 3: Multiple admins + finance team

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

Before deploying to production:

- [ ] Database migrations are run
- [ ] `04_add_auth_fields.sql` is run (role and password_hash columns added)
- [ ] At least 1 admin user is created
- [ ] Admin credentials tested (login works)
- [ ] Production JWT_SECRET is a strong value (`.env.production.template`)
- [ ] Admin password is strong (min 12 characters, special characters)
- [ ] Production email is used (real domain)
- [ ] Credentials are saved securely (password manager)

---

## 📚 Related Files

- **Script**: `scripts/create-admin.ts` - TypeScript interactive script
- **SQL Template**: `scripts/create-admin.sql` - Manual SQL template
- **Hash Tool**: `scripts/hash-password.js` - Password hash generator
- **Migration**: `scripts/db/04_add_auth_fields.sql` - Auth fields migration
- **Login API**: `app/api/auth/login/route.ts` - Login endpoint
- **JWT Library**: `lib/auth/jwt.ts` - JWT utilities

---

## ❓ Questions

**Q: Can I login without password in development?**

A: Yes! If `password_hash = NULL`, login works in development mode:
```sql
INSERT INTO wr.sellers (seller_id, display_name, email, role, is_active)
VALUES ('dev', 'Dev User', 'dev@test.local', 'admin', true);
-- No password_hash, login works with any password
```

**Q: Is email unique?**

A: Yes, there is a unique constraint on email. You cannot create 2 users with the same email.

**Q: Can seller ID be changed?**

A: No, seller_id is the primary key. Create a new user instead of changing it.

**Q: How do I reset password?**

A: Generate new hash and UPDATE:
```bash
node scripts/hash-password.js NewPassword123
# Copy the hash

psql $DATABASE_URL
UPDATE wr.sellers SET password_hash = '$2a$10$...' WHERE seller_id = 'admin';
```

---

## 🎉 You're Ready!

You've now created your admin user and can log in to the system!

**Next Steps:**
1. 🔓 Log in: `/login`
2. 👥 Add sales users
3. 🎯 Set goals
4. 📊 Check the dashboard

**Happy selling! 🚀**
