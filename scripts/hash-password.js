#!/usr/bin/env node
/**
 * Win Room v2.0 - Password Hash Generator
 *
 * Usage:
 *   node scripts/hash-password.js YOUR_PASSWORD
 *
 * Or interactive:
 *   node scripts/hash-password.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

async function hashPassword(password) {
  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters long!');
    process.exit(1);
  }

  console.log('\n🔐 Hashing password...\n');

  const hash = await bcrypt.hash(password, 10);

  console.log('✅ Password hash generated!\n');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Password Hash (copy this):');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(hash);
  console.log('─────────────────────────────────────────────────────────────\n');

  console.log('📝 Now you can use this in SQL:\n');
  console.log(`INSERT INTO wr.sellers (seller_id, display_name, email, password_hash, role, is_active)`);
  console.log(`VALUES ('admin', 'Admin User', 'admin@example.com', '${hash}', 'admin', true);`);
  console.log('\n');
}

async function promptPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter password to hash: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const password = process.argv[2];

  if (password) {
    await hashPassword(password);
  } else {
    const pwd = await promptPassword();
    await hashPassword(pwd);
  }
}

main().catch(console.error);
