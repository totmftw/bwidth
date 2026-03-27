import { db } from "../db";
import { artists, artistCategoryHistory, commissionPolicies } from "../../shared/schema";
import { isNull, eq } from "drizzle-orm";

async function run() {
  console.log("Starting backfill for artist categories...");
  
  // Seed default commission policies if they don't exist
  const existingPolicies = await db.select().from(commissionPolicies);
  if (existingPolicies.length === 0) {
    console.log("Seeding default commission policies...");
    await db.insert(commissionPolicies).values([
      {
        artistCategory: "budding",
        artistPct: "80.00",
        organizerPct: "5.00",
        platformPctTotal: "15.00",
        minArtistGuarantee: "100.00",
      },
      {
        artistCategory: "mid_scale",
        artistPct: "85.00",
        organizerPct: "5.00",
        platformPctTotal: "10.00",
        minArtistGuarantee: "500.00",
      },
      {
        artistCategory: "international",
        artistPct: "90.00",
        organizerPct: "2.00",
        platformPctTotal: "8.00",
        minArtistGuarantee: "5000.00",
      },
      {
        artistCategory: "custom",
        artistPct: "85.00",
        organizerPct: "5.00",
        platformPctTotal: "10.00",
      }
    ]);
  }

  const artistsToUpdate = await db.select().from(artists).where(isNull(artists.artistCategory));
  console.log(`Found ${artistsToUpdate.length} artists to update.`);

  for (const artist of artistsToUpdate) {
    const category = "mid_scale"; // default backfill category
    
    await db.update(artists)
      .set({ 
        artistCategory: category,
        artistCategorySource: "auto",
        artistCategoryAssignedAt: new Date(),
        artistCategoryNotes: "System backfill",
      })
      .where(eq(artists.id, artist.id));

    await db.insert(artistCategoryHistory).values({
      artistId: artist.id,
      oldCategory: null,
      newCategory: category,
      reason: "System backfill",
      changedAt: new Date(),
    });
  }

  console.log("Backfill completed.");
  process.exit(0);
}

run().catch(console.error);
