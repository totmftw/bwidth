import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://projectdmt:projectdmt@72.60.41.117:6969/projectdmt" });
const db = drizzle(pool);

async function main() {
  const usersRes = await pool.query(`
    SELECT u.id, u.username, u.email, r.name as role
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    ORDER BY u.created_at DESC
    LIMIT 20;
  `);
  console.log("Recent Users with roles:", usersRes.rows);
  process.exit(0);
}
main();
