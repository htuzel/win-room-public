/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
#!/usr/bin/env node
/**
 * Win Room v2.0 - Database migration runner
 *
 * Executes SQL files in scripts/db in order using the configured PG credentials.
 * This keeps the `npm run db:migrate` script in package.json functional.
 */
const { readFile } = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
  } = process.env;

  if (!DB_NAME || !DB_USER) {
    console.error('Missing DB_NAME or DB_USER environment variables.');
    process.exit(1);
  }

  const pool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    max: 1,
  });

  const sqlFiles = [
    '01_create_schema.sql',
    '02_create_tables.sql',
    '03_create_functions.sql',
    '04_add_auth_fields.sql',
    '05_add_created_by_to_queue.sql',
    '06_claim_adjustments.sql',
    '07_finance_approval.sql',
    '08_queue_finance_approval.sql',
    '09_installments.sql',
    '10_create_promotions.sql',
    '11_lead_assignments.sql',
    '12_create_achievements.sql',
    '13_extend_achievement_types.sql',
    '13_social_reactions.sql',
    '14_attribution_shares.sql',
  ];

  try {
    for (const file of sqlFiles) {
      const fullPath = path.join(__dirname, file);
      console.log(`\n>>> Running ${file}`);
      const sql = await readFile(fullPath, 'utf8');
      await pool.query(sql);
      console.log(`✓ Completed ${file}`);
    }
    console.log('\nAll migrations executed successfully.');
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
