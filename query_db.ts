import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://projectdmt:projectdmt@72.60.41.117:6969/projectdmt" });
const db = drizzle(pool);

async function main() {
  const usersRes = await pool.query('SELECT id, username, first_name, last_name, status, created_at FROM users ORDER BY created_at DESC LIMIT 10;');
  console.log("Users:", usersRes.rows);
  const eventsRes = await pool.query('SELECT id, title, organizer_id, status, start_time, created_at FROM events ORDER BY created_at DESC LIMIT 10;');
  console.log("Events:", eventsRes.rows);
  process.exit(0);
}
main();
