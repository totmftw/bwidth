import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const usersRes = await pool.query(`
    SELECT u.id, u.username, u.metadata->>'role' as role
    FROM users u
  `);
  
  const results = [];
  for (const user of usersRes.rows) {
    if (user.role === 'artist') {
        const artistRes = await pool.query('SELECT id FROM artists WHERE user_id = $1', [user.id]);
        if (artistRes.rows.length === 0) {
            results.push(`Artist ${user.username} (ID: ${user.id}) is MISSING artist record.`);
        }
    } else if (user.role === 'organizer' || user.role === 'promoter') {
        const organizerRes = await pool.query('SELECT id FROM promoters WHERE user_id = $1', [user.id]);
        if (organizerRes.rows.length === 0) {
            results.push(`Organizer ${user.username} (ID: ${user.id}) is MISSING promoter record.`);
        }
    }
  }
  
  if (results.length === 0) {
    console.log("No missing records found for artists or organizers.");
  } else {
    console.log(results.join('\n'));
  }
  process.exit(0);
}
main();
