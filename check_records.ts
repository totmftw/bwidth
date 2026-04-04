import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const usersRes = await pool.query(`
    SELECT u.id, u.username, u.metadata->>'role' as role
    FROM users u
    ORDER BY u.created_at DESC
    LIMIT 20;
  `);
  
  console.log("Recent Users from users table:");
  for (const user of usersRes.rows) {
    if (user.role === 'artist') {
        const artistRes = await pool.query('SELECT id FROM artists WHERE user_id = $1', [user.id]);
        console.log(`User ${user.username} (ID: ${user.id}) is ARTIST. Artist record: ${artistRes.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    } else if (user.role === 'organizer' || user.role === 'promoter') {
        const organizerRes = await pool.query('SELECT id FROM promoters WHERE user_id = $1', [user.id]);
        console.log(`User ${user.username} (ID: ${user.id}) is ORGANIZER. Promoter record: ${organizerRes.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    } else {
        console.log(`User ${user.username} (ID: ${user.id}) is ${user.role}.`);
    }
  }

  const eventsRes = await pool.query('SELECT id, title, status, visibility, start_time, end_time FROM events ORDER BY created_at DESC LIMIT 5;');
  console.log("\nRecent Events:");
  console.log(eventsRes.rows);

  process.exit(0);
}
main();
