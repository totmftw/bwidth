
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import {
    users, artists, venues, events, bookings, contracts
} from './shared/schema';

async function verify() {
    console.log('Verifying Database Connection...');
    try {
        const result = await db.execute(sql`SELECT 1`);
        console.log('✅ Connection Successful');
    } catch (e) {
        console.error('❌ Connection Failed:', e);
        process.exit(1);
    }

    console.log('\nChecking Tables...');
    const tables = [
        'users', 'artists', 'venues', 'events', 'bookings', 'contracts', 'negotiations'
    ];

    for (const table of tables) {
        try {
            // Check if table exists by selecting 1 limit 0
            await db.execute(sql.raw(`SELECT 1 FROM "${table}" LIMIT 0`));
            console.log(`✅ Table '${table}' exists`);
        } catch (e: any) {
            if (e.code === '42P01') {
                console.log(`❌ Table '${table}' DOES NOT exist`);
            } else {
                console.error(`⚠️ Error checking '${table}':`, e.message);
            }
        }
    }

    process.exit(0);
}

verify();
