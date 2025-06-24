// app/utils/db.server.ts
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // <-- allow Aiven’s self-signed cert
  },
});

// Optional: verify immediately on startup
(async () => {
  try {
    const client = await db.connect();
    await client.query('SELECT 1');
    console.log('✅ Successfully connected to Aiven Postgres');
    client.release();
  } catch (e) {
    console.error('❌ Failed to connect to Aiven Postgres:', e);
    process.exit(1);
  }
})();
