import { db } from "./server/db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function run() {
  console.log("Running migration...");
  const query = fs.readFileSync("./migrations/0003_magenta_lady_deathstrike.sql", "utf8");
  const statements = query.split("--> statement-breakpoint");
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await db.execute(sql.raw(statement.trim()));
      } catch (err: any) {
        if (!err.message.includes("already exists")) {
          console.error("Error executing:", statement);
          console.error(err);
        }
      }
    }
  }
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
