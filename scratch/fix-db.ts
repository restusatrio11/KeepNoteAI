import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log('Adding missing columns to notulen table...');
    await sql`ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "undangan_url" text;`;
    await sql`ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "daftar_hadir_url" text;`;
    await sql`ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "dokumentasi_urls" text;`;
    console.log('Success!');
  } catch (error) {
    console.error('Failed to update schema:', error);
  }
}

main();
