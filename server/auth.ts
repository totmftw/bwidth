import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { pool } from "./db";
import connectPg from "connect-pg-simple";
import { normalizeRegistrationRole } from "./role-utils";

const scryptAsync = promisify(scrypt);
const PostgresStore = connectPg(session);

export function setupAuth(app: Express) {
  // Ensure SESSION_SECRET is set in production
  if (app.get("env") === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: app.get("env") === "production",
      httpOnly: true, // Prevent XSS attacks
      sameSite: "lax", // CSRF protection
    },
    store: new PostgresStore({
      pool,
      tableName: "session",
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for username: "${username}"`);
        const user = await storage.getUserByUsername(username);
        if (!user || !user.passwordHash) {
          console.log(`Login failed: Invalid username/no hash for: ${username}`);
          return done(null, false, { message: "Invalid username" });
        }

        const [salt, hash] = user.passwordHash.split(".");
        const hashBuffer = (await scryptAsync(password, salt, 64)) as Buffer;

        if (timingSafeEqual(Buffer.from(hash, "hex"), hashBuffer)) {
          console.log(`Login successful for: ${username}`);
          const authenticatedUser = user as any;
          if (authenticatedUser.metadata && authenticatedUser.metadata.role) {
            authenticatedUser.role = authenticatedUser.metadata.role;
          }

          // Fetch profiles for immediate response
          const artist = await storage.getArtistByUserId(authenticatedUser.id);
          const organizer = await storage.getOrganizerByUserId(authenticatedUser.id);
          const venue = await storage.getVenueByUserId(authenticatedUser.id);

          if (artist) authenticatedUser.artist = artist;
          if (organizer) authenticatedUser.organizer = organizer;
          if (venue) authenticatedUser.venue = venue;

          return done(null, authenticatedUser);
        } else {
          console.log(`Login failed: Invalid password for: ${username}`);
          return done(null, false, { message: "Invalid password" });
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id) as any;
      if (user) {
        if (user.metadata && user.metadata.role) {
          user.role = user.metadata.role;
        }

        // Fetch profiles
        const artist = await storage.getArtistByUserId(id);
        const organizer = await storage.getOrganizerByUserId(id);
        const venue = await storage.getVenueByUserId(id);

        if (artist) user.artist = artist;
        if (organizer) user.organizer = organizer;
        if (venue) user.venue = venue;
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const salt = randomBytes(16).toString("hex");
      const hash = (await scryptAsync(req.body.password, salt, 64)) as Buffer;
      const hashedPassword = `${salt}.${hash.toString("hex")}`;

      // Normalize role: "venue" -> "venue_manager", default to "artist"
      const normalizedRole = normalizeRegistrationRole(req.body.role);

      const user = await storage.createUser({
        username: req.body.username,
        email: req.body.email || `${req.body.username}@example.com`,
        passwordHash: hashedPassword,
        displayName: req.body.name,
        phone: req.body.phone,
        metadata: { role: normalizedRole },
      }) as any;

      if (user) {
        user.role = normalizedRole;
      }

      // Handle role-specific data creation
      if (req.body.role === 'artist' && req.body.roleData) {
        await storage.createArtist({ ...req.body.roleData, userId: user.id });
      } else if (req.body.role === 'organizer') {
        // Always create organizer record, even without roleData
        const existingOrg = await storage.getOrganizerByUserId(user.id);
        if (!existingOrg) {
          await storage.createOrganizer({
            userId: user.id,
            name: req.body.name || user.displayName || 'Organizer',
            ...(req.body.roleData || {}),
          });
        }
      } else if (normalizedRole === 'venue_manager' && req.body.roleData) {
        await storage.createVenue({ ...req.body.roleData, userId: user.id });
      }

      // Fetch profiles to include in registration response
      const artist = await storage.getArtistByUserId(user.id);
      const organizer = await storage.getOrganizerByUserId(user.id);
      const venue = await storage.getVenueByUserId(user.id);

      if (artist) user.artist = artist;
      if (organizer) user.organizer = organizer;
      if (venue) user.venue = venue;

      req.login(user, async (err) => {
        if (err) return next(err);

        await storage.createAuditLog({
          who: user.id,
          action: "user_registered",
          entityType: "user",
          entityId: user.id,
          context: { role: req.body.role }
        });

        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error during login" });
      }
      if (!user) {
        console.log("Login failed:", info?.message || "Invalid credentials");
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return res.status(500).json({ message: "Failed to establish session" });
        }

        await storage.createAuditLog({
          who: user.id,
          action: "user_login",
          entityType: "user",
          entityId: user.id
        });

        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = (req.user as any)?.id;
    req.logout(async (err) => {
      if (err) return next(err);

      if (userId) {
        await storage.createAuditLog({
          who: userId,
          action: "user_logout",
          entityType: "user",
          entityId: userId
        });
      }

      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
