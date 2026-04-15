const { Pool } = require('d:/Website Restu Satrio Pinanggih/kipapp AI/node_modules/@neondatabase/serverless');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_JTlGOaj1zAI3@ep-delicate-frost-amg1pukk-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function main() {
  try {
    console.log('Altering table notulen...');
    await pool.query('ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "undangan_url" text');
    await pool.query('ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "daftar_hadir_url" text');
    await pool.query('ALTER TABLE "notulen" ADD COLUMN IF NOT EXISTS "dokumentasi_urls" text');
    console.log('Database updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error updating database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
