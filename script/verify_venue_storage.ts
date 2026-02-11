
import { storage } from "../server/storage";
import { insertUserSchema } from "../shared/schema";

async function main() {
  console.log("Starting Venue Storage verification...");

  // 1. Create a dummy user for the venue
  const username = `venue_test_${Date.now()}`;
  const user = await storage.createUser({
    username,
    password: "password123",
    role: "venue_manager",
    name: "Test Venue Owner",
    email: `${username}@test.com`,
    phone: "1234567890",
    roleData: {}, // Generic
  });
  console.log("Created user:", user.id);

  // 2. Create Venue
  console.log("Creating venue...");
  const venueData = {
    userId: user.id,
    name: "The Grand Test Venue",
    description: "A very nice place for testing",
    address: { street: "123 Test St", city: "Test City" },
    cityId: null,
    capacity: 1000,
    capacitySeated: 500,
    capacityStanding: 500,
    amenities: ["WiFi", "Bar"],
    metadata: { profileComplete: true },
  };
  
  const venue = await storage.createVenue(venueData);
  console.log("Venue created:", venue);

  if (venue.name !== venueData.name) throw new Error("Venue name mismatch");
  if (venue.capacity !== 1000) throw new Error("Venue capacity mismatch");

  // 3. Update Venue
  console.log("Updating venue...");
  const updatedVenue = await storage.updateVenue(venue.id, {
    description: "Updated description",
    capacity: 1200
  });
  console.log("Venue updated:", updatedVenue);

  if (updatedVenue.description !== "Updated description") throw new Error("Update failed description");
  if (updatedVenue.capacity !== 1200) throw new Error("Update failed capacity");

  // 4. Get Venue by User ID
  const fetchedVenue = await storage.getVenueByUserId(user.id);
  if (!fetchedVenue || fetchedVenue.id !== venue.id) throw new Error("Failed to get venue by user id");
  console.log("Fetched venue by user ID:", fetchedVenue.id);

  console.log("Verification SUCCESS");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification FAILED:", err);
  process.exit(1);
});
