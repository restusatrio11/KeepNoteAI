const { Pool } = require('./node_modules/@neondatabase/serverless');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_JTlGOaj1zAI3@ep-delicate-frost-amg1pukk-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function main() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notulen'");
    console.log(JSON.stringify(res.rows));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
