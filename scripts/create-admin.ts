#!/usr/bin/env tsx
/**
 * Win Room v2.0 - Create Admin User Script
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 *
 * This script creates the first admin user with a hashed password.
 */

import 'dotenv/config';

// For development with DigitalOcean managed databases (self-signed certs)
if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL?.includes('digitalocean.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import bcrypt from 'bcryptjs';
import { query } from '../lib/db/connection';
import * as readline from 'readline';

interface SellerData {
  seller_id: string;
  display_name: string;
  email: string;
  password: string;
  role: 'admin' | 'finance' | 'sales_lead' | 'sales';
  pipedrive_owner_id: number;
}

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Create admin user
 */
async function createAdmin(data: SellerData) {
  try {
    console.log('\n🔐 Creating admin user...\n');

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);
    console.log('✅ Password hashed');

    // Check if user already exists
    const existing = await query<{ seller_id: string }>(
      'SELECT seller_id FROM wr.sellers WHERE email = $1 OR seller_id = $2',
      [data.email.toLowerCase(), data.seller_id]
    );

    if (existing.length > 0) {
      console.error('❌ Error: User already exists with this email or seller_id');
      console.log('\nExisting user:', existing[0]);
      process.exit(1);
    }

    // Insert seller
    await query(
      `INSERT INTO wr.sellers (
        seller_id,
        display_name,
        email,
        password_hash,
        role,
        pipedrive_owner_id,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        data.seller_id,
        data.display_name,
        data.email.toLowerCase(),
        passwordHash,
        data.role,
        data.pipedrive_owner_id,
      ]
    );

    console.log('✅ Admin user created successfully!\n');
    console.log('User details:');
    console.log('─────────────────────────────────────');
    console.log(`Seller ID:     ${data.seller_id}`);
    console.log(`Display Name:  ${data.display_name}`);
    console.log(`Email:         ${data.email}`);
    console.log(`Role:          ${data.role}`);
    console.log(`Password:      ******* (hidden)`);
    console.log('─────────────────────────────────────\n');

    console.log('🎉 You can now login with these credentials!\n');
    console.log('Login URL: http://localhost:3000/login');
    console.log(`Email: ${data.email}`);
    console.log(`Password: [the password you entered]\n`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Win Room v2.0 - Create Admin User           ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const sellerId = await prompt('Seller ID (e.g., admin): ');
  const displayName = await prompt('Display Name (e.g., Admin User): ');
  const email = await prompt('Email (e.g., admin@example.com): ');
  const password = await prompt('Password (min 8 characters): ');
  const confirmPassword = await prompt('Confirm Password: ');

  if (password !== confirmPassword) {
    console.error('\n❌ Passwords do not match!');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌ Password must be at least 8 characters long!');
    process.exit(1);
  }

  const role = (await prompt('Role (admin/finance/sales_lead/sales) [admin]: ')) || 'admin';

  if (!['admin', 'finance', 'sales_lead', 'sales'].includes(role)) {
    console.error('\n❌ Invalid role! Must be: admin, finance, sales_lead, or sales');
    process.exit(1);
  }

  let pipedriveId = '';
  while (!pipedriveId) {
    const answer = await prompt('Pipedrive Owner ID (required): ');
    if (answer && Number(answer) > 0) {
      pipedriveId = answer;
    } else {
      console.log('Please enter a positive numeric Pipedrive Owner ID.');
    }
  }

  await createAdmin({
    seller_id: sellerId,
    display_name: displayName,
    email: email,
    password: password,
    role: role as any,
    pipedrive_owner_id: parseInt(pipedriveId, 10),
  });
}

/**
 * Quick mode with defaults
 */
async function quickMode() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Win Room v2.0 - Quick Admin Creation        ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log('Creating admin user with default values...\n');

  const password = await prompt('Enter password for admin user: ');

  if (password.length < 8) {
    console.error('\n❌ Password must be at least 8 characters long!');
    process.exit(1);
  }

  let pipedriveId = '';
  while (!pipedriveId) {
    const answer = await prompt('Enter Pipedrive Owner ID for admin user: ');
    if (answer && Number(answer) > 0) {
      pipedriveId = answer;
    } else {
      console.log('Please enter a positive numeric value.');
    }
  }

  await createAdmin({
    seller_id: 'admin',
    display_name: 'Admin',
    email: 'admin@winroom.local',
    password: password,
    role: 'admin',
    pipedrive_owner_id: parseInt(pipedriveId, 10),
  });
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Win Room v2.0 - Create Admin User

Usage:
  npx tsx scripts/create-admin.ts [options]

Options:
  --quick, -q        Quick mode with default values
  --help, -h         Show this help message

Interactive Mode (default):
  Prompts you for all user details

Quick Mode:
  Creates user with these defaults:
  - Seller ID: admin
  - Display Name: Admin
  - Email: admin@winroom.local
  - Role: admin
  - Password: [you will be prompted]

Examples:
  # Interactive mode
  npx tsx scripts/create-admin.ts

  # Quick mode
  npx tsx scripts/create-admin.ts --quick
`);
    process.exit(0);
  }

  if (args.includes('--quick') || args.includes('-q')) {
    await quickMode();
  } else {
    await interactiveMode();
  }

  // Close database connection
  const { closePool } = await import('../lib/db/connection');
  await closePool();
  process.exit(0);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
