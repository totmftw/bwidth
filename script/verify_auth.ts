
import { storage } from "../server/storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function main() {
    console.log("Verifying Auth logic...");

    const username = `auth_test_${Date.now()}`;
    const password = "password123";

    // 1. Create User
    const salt = randomBytes(16).toString("hex");
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    const passwordHash = `${salt}.${hash.toString("hex")}`;

    await storage.createUser({
        username,
        email: `${username}@test.com`,
        passwordHash,
        displayName: "Auth Test User",
        metadata: { role: "artist" }
    });

    console.log("User created.");

    // 2. Fetch User and verify Hash
    const user = await storage.getUserByUsername(username);
    if (!user || !user.passwordHash) throw new Error("User not found or no hash");

    const [dbSalt, dbHash] = user.passwordHash.split(".");
    const testHash = (await scryptAsync(password, dbSalt, 64)) as Buffer;

    if (testHash.toString("hex") === dbHash) {
        console.log("Password verification SUCCESS");
    } else {
        throw new Error("Password verification FAILED");
    }

    process.exit(0);
}

main().catch(err => {
    console.error("Auth verification failed:", err);
    process.exit(1);
});
