const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    console.log('Adding missing columns to notulen table...');
    await pool.query('ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "undangan_url" text;');
    await pool.query('ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "daftar_hadir_url" text;');
    await pool.query('ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "dokumentasi_urls" text;');
    console.log('Success!');
  } catch (error) {
    console.error('Failed to update schema:', error);
  } finally {
    await pool.end();
  }
}

main();
