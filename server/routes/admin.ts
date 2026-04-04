import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { appSettings, systemSettings, agentFeedback } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { notificationService } from "../services/notification.service";
import { emitDomainEvent } from "../services/event-bus";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { api } from "@shared/routes";
import { encrypt, isEncryptionConfigured } from "../services/encryption.service";

const router = Router();

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${buf.toString("hex")}`;
}

// Middleware to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as any;
  if (user.role !== "admin" && user.role !== "platform_admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Apply admin middleware to all routes in this router
router.use(isAdmin);

// ============================================================================
// STATS
// ============================================================================

router.get("/stats", async (req, res) => {
  try {
    const stats = await storage.getPlatformStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    res.status(500).json({ message: "Failed to fetch platform stats" });
  }
});

// ============================================================================
// USERS
// ============================================================================

// List all users
router.get("/users", async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Create a new user with profile
router.post("/users", async (req, res) => {
  try {
    const { username, email, password, displayName, role, firstName, lastName, phone } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password, and role are required" });
    }

    const validRoles = ["artist", "promoter", "organizer", "venue_manager", "admin", "platform_admin", "staff", "band_manager"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const passwordHash = await hashPassword(password);

    const result = await storage.createUserWithProfile({
      user: {
        username: username || null,
        email,
        passwordHash,
        displayName: displayName || null,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        status: "active" as any,
      },
      role,
    });

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_user_created",
      entityType: "user",
      entityId: result.user.id,
      context: { email, role },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// Get a single user with their profile
router.get("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUserWithProfile(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Update a user's fields
router.patch("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updated = await storage.adminUpdateUser(userId, req.body);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_user_updated",
      entityType: "user",
      entityId: userId,
      context: { fields: Object.keys(req.body) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Update user status (Approve/Reject/Suspend)
router.patch("/users/:id/status", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!["active", "suspended", "rejected", "pending_verification"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await storage.updateUserStatus(userId, status);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_user_status_update",
      entityType: "user",
      entityId: userId,
      context: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

// Update user role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    const validRoles = ["artist", "promoter", "organizer", "venue_manager", "admin", "platform_admin", "staff", "band_manager"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updated = await storage.updateUserRole(userId, role);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_user_role_update",
      entityType: "user",
      entityId: userId,
      context: { role },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

// Soft-delete a user
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updated = await storage.updateUserStatus(userId, "deleted");

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_user_deleted",
      entityType: "user",
      entityId: userId,
      context: {},
    });

    res.json(updated);
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ============================================================================
// ROLES
// ============================================================================

// Get role summary with user counts
router.get("/roles", async (req, res) => {
  try {
    const roleSummary = await storage.getRoleSummary();
    res.json(roleSummary);
  } catch (error) {
    console.error("Error fetching role summary:", error);
    res.status(500).json({ message: "Failed to fetch role summary" });
  }
});

// Get users by role
router.get("/roles/:roleName/users", async (req, res) => {
  try {
    const { roleName } = req.params;
    const users = await storage.getUsersByRole(roleName);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).json({ message: "Failed to fetch users by role" });
  }
});

// ============================================================================
// ARTISTS
// ============================================================================

router.get("/artists", async (req, res) => {
  try {
    const artists = await storage.getAdminArtistList();
    res.json(artists);
  } catch (error) {
    console.error("Error fetching artists:", error);
    res.status(500).json({ message: "Failed to fetch artists" });
  }
});

router.get("/artists/:id", async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);
    const artist = await storage.getArtist(artistId);
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  } catch (error) {
    console.error("Error fetching artist:", error);
    res.status(500).json({ message: "Failed to fetch artist" });
  }
});

router.patch("/artists/:id", async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);
    const updated = await storage.updateArtist(artistId, req.body);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_artist_updated",
      entityType: "artist",
      entityId: artistId,
      context: { fields: Object.keys(req.body) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating artist:", error);
    res.status(500).json({ message: "Failed to update artist" });
  }
});

// ============================================================================
// ORGANIZERS
// ============================================================================

router.get("/organizers", async (req, res) => {
  try {
    const organizers = await storage.getAdminOrganizerList();
    res.json(organizers);
  } catch (error) {
    console.error("Error fetching organizers:", error);
    res.status(500).json({ message: "Failed to fetch organizers" });
  }
});

router.get("/organizers/:id", async (req, res) => {
  try {
    const organizerId = parseInt(req.params.id);
    const organizer = await storage.getOrganizer(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    res.json(organizer);
  } catch (error) {
    console.error("Error fetching organizer:", error);
    res.status(500).json({ message: "Failed to fetch organizer" });
  }
});

router.patch("/organizers/:id", async (req, res) => {
  try {
    const organizerId = parseInt(req.params.id);
    const updated = await storage.updateOrganizer(organizerId, req.body);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_organizer_updated",
      entityType: "organizer",
      entityId: organizerId,
      context: { fields: Object.keys(req.body) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating organizer:", error);
    res.status(500).json({ message: "Failed to update organizer" });
  }
});

// ============================================================================
// VENUES
// ============================================================================

router.get("/venues", async (req, res) => {
  try {
    const venues = await storage.getAdminVenueList();
    res.json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({ message: "Failed to fetch venues" });
  }
});

router.get("/venues/:id", async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    const venue = await storage.getAdminVenueDetail(venueId);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json(venue);
  } catch (error) {
    console.error("Error fetching venue:", error);
    res.status(500).json({ message: "Failed to fetch venue" });
  }
});

router.patch("/venues/:id", async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    const updated = await storage.updateVenue(venueId, req.body);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_venue_updated",
      entityType: "venue",
      entityId: venueId,
      context: { fields: Object.keys(req.body) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating venue:", error);
    res.status(500).json({ message: "Failed to update venue" });
  }
});

// ============================================================================
// EVENTS
// ============================================================================

router.get("/events", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const eventsList = await storage.getAllEvents(status ? { status } : undefined);
    res.json(eventsList);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ message: "Failed to fetch event" });
  }
});

router.patch("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const updated = await storage.adminUpdateEvent(eventId, req.body);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_event_updated",
      entityType: "event",
      entityId: eventId,
      context: { fields: Object.keys(req.body) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
});

router.delete("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const hasActive = await storage.hasActiveBookings(eventId);
    if (hasActive) {
      return res.status(409).json({ message: "Cannot delete event with active bookings" });
    }

    await storage.adminDeleteEvent(eventId);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_event_deleted",
      entityType: "event",
      entityId: eventId,
      context: {},
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

// ============================================================================
// BOOKINGS
// ============================================================================

router.get("/bookings", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const bookingsList = await storage.getAllBookings(status ? { status } : undefined);
    res.json(bookingsList);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

router.get("/bookings/:id", async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Failed to fetch booking" });
  }
});

router.patch("/bookings/:id/status", async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status, reason } = req.body;

    const validStatuses = [
      "inquiry", "offered", "negotiating", "contracting", "confirmed",
      "paid_deposit", "scheduled", "completed", "cancelled", "disputed", "refunded",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid or missing booking status" });
    }

    if (!reason) {
      return res.status(400).json({ message: "A reason is required for admin status overrides" });
    }

    const updated = await storage.adminForceBookingStatus(
      bookingId,
      status,
      reason,
      (req.user as any).id
    );

    res.json(updated);
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
});

// ============================================================================
// CONTRACTS
// ============================================================================

// This route must be defined before /contracts/:id to avoid :id catching "pending"
router.get("/contracts/pending", async (req, res) => {
  try {
    const contracts = await storage.getContractsForAdminReview();
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching pending contracts:", error);
    res.status(500).json({ message: "Failed to fetch contracts" });
  }
});

router.get("/contracts", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const contractsList = await storage.getAllContracts(status ? { status } : undefined);
    res.json(contractsList);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ message: "Failed to fetch contracts" });
  }
});

router.get("/contracts/:id", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contract = await storage.getContractWithDetails(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });
    res.json(contract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ message: "Failed to fetch contract" });
  }
});

router.patch("/contracts/:id", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const updated = await storage.adminUpdateContract(contractId, req.body);

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_contract_updated",
      entityType: "contract",
      entityId: contractId,
      context: { fields: Object.keys(req.body) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating contract:", error);
    res.status(500).json({ message: "Failed to update contract" });
  }
});

// Review contract (approve/reject)
router.post("/contracts/:id/review", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const { status, note } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await storage.reviewContract(
      contractId,
      (req.user as any).id,
      status,
      note
    );

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_contract_review",
      entityType: "contract",
      entityId: contractId,
      context: { status, note },
    });

    // Notify both parties about admin review result
    if (status === "approved") {
      emitDomainEvent("contract.admin_approved", {
        bookingId: updated.bookingId,
        contractId,
        entityType: "contract",
        entityId: contractId,
        eventTitle: "Event",
        actionUrl: `/contract/${contractId}`,
      }, (req.user as any).id);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error reviewing contract:", error);
    res.status(500).json({ message: "Failed to review contract" });
  }
});

// ============================================================================
// CONVERSATIONS
// ============================================================================

router.get("/conversations", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const convos = await storage.getAllConversations(limit);
    res.json(convos);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const msgs = await storage.getConversationMessages(conversationId);
    res.json(msgs);
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// ============================================================================
// SETTINGS
// ============================================================================

router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select().from(appSettings);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.post("/settings", async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ message: "Key is required" });

    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));

    if (existing.length > 0) {
      await db
        .update(appSettings)
        .set({ value, updatedAt: new Date(), updatedBy: (req.user as any).id })
        .where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value, updatedBy: (req.user as any).id });
    }

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_setting_updated",
      entityType: "app_settings",
      entityId: 0,
      context: { key, value },
    });

    res.json({ success: true, message: "Setting updated" });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ message: "Failed to update setting" });
  }
});

router.get("/settings/system", async (req, res) => {
  try {
    const settings = await db.select().from(systemSettings);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ message: "Failed to fetch system settings" });
  }
});

router.post("/settings/system", async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) return res.status(400).json({ message: "Key is required" });

    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));

    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value, description });
    }

    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "admin_system_setting_updated",
      entityType: "system_settings",
      entityId: 0,
      context: { key, value },
    });

    res.json({ success: true, message: "System setting updated" });
  } catch (error) {
    console.error("Error updating system setting:", error);
    res.status(500).json({ message: "Failed to update system setting" });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

router.get("/audit", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const logs = await storage.getAuditLogs({ limit, offset, userId });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

// GET /api/admin/notification-types — list all notification types
router.get("/notification-types", async (req, res) => {
  try {
    const types = await storage.getNotificationTypes();
    res.json(types);
  } catch (error) {
    console.error("Error fetching notification types:", error);
    res.status(500).json({ message: "Failed to fetch notification types" });
  }
});

// POST /api/admin/notification-types — create new notification type
router.post("/notification-types", async (req, res) => {
  try {
    const { key, category, label, description, titleTemplate, bodyTemplate, targetRoles, channels, enabled, priority } = req.body;
    if (!key || !category || !label || !titleTemplate || !bodyTemplate || !targetRoles) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const type = await storage.createNotificationType({
      key, category, label, description, titleTemplate, bodyTemplate,
      targetRoles, channels: channels || ["in_app"], enabled: enabled ?? true,
      priority: priority || "normal",
    });
    await notificationService.refreshTypeCache();
    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "notification_type_created",
      entityType: "notification_type",
      entityId: type.id,
      context: { key },
    });
    res.status(201).json(type);
  } catch (error) {
    console.error("Error creating notification type:", error);
    res.status(500).json({ message: "Failed to create notification type" });
  }
});

// PUT /api/admin/notification-types/:id — update notification type
router.put("/notification-types/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const type = await storage.updateNotificationType(id, req.body);
    await notificationService.refreshTypeCache();
    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "notification_type_updated",
      entityType: "notification_type",
      entityId: id,
      context: { changes: req.body },
    });
    res.json(type);
  } catch (error) {
    console.error("Error updating notification type:", error);
    res.status(500).json({ message: "Failed to update notification type" });
  }
});

// DELETE /api/admin/notification-types/:id — disable notification type
router.delete("/notification-types/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const type = await storage.updateNotificationType(id, { enabled: false });
    await notificationService.refreshTypeCache();
    res.json(type);
  } catch (error) {
    console.error("Error disabling notification type:", error);
    res.status(500).json({ message: "Failed to disable notification type" });
  }
});

// GET /api/admin/notification-channels — list all channels
router.get("/notification-channels", async (req, res) => {
  try {
    const channels = await storage.getNotificationChannels();
    res.json(channels);
  } catch (error) {
    console.error("Error fetching notification channels:", error);
    res.status(500).json({ message: "Failed to fetch notification channels" });
  }
});

// PUT /api/admin/notification-channels/:id — update channel config
router.put("/notification-channels/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const channel = await storage.updateNotificationChannel(id, req.body);
    await notificationService.refreshChannelCache();
    await storage.createAuditLog({
      who: (req.user as any).id,
      action: "notification_channel_updated",
      entityType: "notification_channel",
      entityId: id,
      context: { changes: req.body },
    });
    res.json(channel);
  } catch (error) {
    console.error("Error updating notification channel:", error);
    res.status(500).json({ message: "Failed to update notification channel" });
  }
});

// POST /api/admin/notifications/test — send a test notification
router.post("/notifications/test", async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    if (!userId || !title) return res.status(400).json({ message: "userId and title are required" });

    emitDomainEvent("system.announcement", {
      entityType: "system",
      entityId: 0,
      targetUserId: userId,
      title: title || "Test Notification",
      message: body || "This is a test notification from admin.",
    }, (req.user as any).id);

    res.json({ success: true, message: "Test notification sent" });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ message: "Failed to send test notification" });
  }
});

// ============================================================================
// AI AGENTS — Admin Management
// ============================================================================

// GET /agents/configs — list all agent configurations
router.get("/agents/configs", async (req, res) => {
  try {
    const configs = await storage.listAgentConfigs();
    res.json(configs);
  } catch (error) {
    console.error("Error listing agent configs:", error);
    res.status(500).json({ message: "Failed to list agent configs" });
  }
});

// PUT /agents/configs/:agentType — update agent configuration
router.put("/agents/configs/:agentType", async (req, res) => {
  try {
    const { agentType } = req.params;
    const parsed = api.agents.admin.configs.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const data: any = { ...parsed.data };

    // Encrypt system API key if provided
    if (data.systemApiKey) {
      if (!isEncryptionConfigured()) {
        return res.status(500).json({ message: "Encryption not configured" });
      }
      const encrypted = encrypt(data.systemApiKey);
      data.systemApiKeyEncrypted = encrypted.encrypted;
      data.systemApiKeyIv = encrypted.iv;
      data.systemApiKeyTag = encrypted.tag;
      delete data.systemApiKey;
    }

    const config = await storage.upsertAgentConfig(agentType, data);
    res.json(config);
  } catch (error) {
    console.error("Error updating agent config:", error);
    res.status(500).json({ message: "Failed to update agent config" });
  }
});

// GET /agents/rate-limits — list rate limits
router.get("/agents/rate-limits", async (req, res) => {
  try {
    const limits = await storage.listAgentRateLimits();
    res.json(limits);
  } catch (error) {
    console.error("Error listing rate limits:", error);
    res.status(500).json({ message: "Failed to list rate limits" });
  }
});

// POST /agents/rate-limits — create/update rate limit
router.post("/agents/rate-limits", async (req, res) => {
  try {
    const parsed = api.agents.admin.rateLimits.upsert.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const limit = await storage.upsertAgentRateLimit(parsed.data as any);
    res.json(limit);
  } catch (error) {
    console.error("Error upserting rate limit:", error);
    res.status(500).json({ message: "Failed to upsert rate limit" });
  }
});

// DELETE /agents/rate-limits/:id — delete rate limit
router.delete("/agents/rate-limits/:id", async (req, res) => {
  try {
    await storage.deleteAgentRateLimit(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting rate limit:", error);
    res.status(500).json({ message: "Failed to delete rate limit" });
  }
});

// GET /agents/usage — usage stats
router.get("/agents/usage", async (req, res) => {
  try {
    const stats = await storage.getAgentUsageStats({});
    res.json(stats);
  } catch (error) {
    console.error("Error fetching agent usage:", error);
    res.status(500).json({ message: "Failed to fetch usage stats" });
  }
});

// GET /agents/sessions — all agent sessions (admin view)
router.get("/agents/sessions", async (req, res) => {
  try {
    const sessions = await storage.listAgentSessions({});
    res.json(sessions);
  } catch (error) {
    console.error("Error listing agent sessions:", error);
    res.status(500).json({ message: "Failed to list sessions" });
  }
});

// GET /agents/feedback — all feedback
router.get("/agents/feedback", async (req, res) => {
  try {
    const feedback = await db
      .select()
      .from(agentFeedback)
      .orderBy(desc(agentFeedback.createdAt))
      .limit(200);
    res.json(feedback);
  } catch (error) {
    console.error("Error listing feedback:", error);
    res.status(500).json({ message: "Failed to list feedback" });
  }
});

// GET /agents/prompts — list prompt versions
router.get("/agents/prompts", async (req, res) => {
  try {
    const [ewPrompts, negPrompts] = await Promise.all([
      storage.listPromptVersions("event_wizard"),
      storage.listPromptVersions("negotiation"),
    ]);
    res.json([...ewPrompts, ...negPrompts]);
  } catch (error) {
    console.error("Error listing prompts:", error);
    res.status(500).json({ message: "Failed to list prompts" });
  }
});

// POST /agents/prompts — create prompt version
router.post("/agents/prompts", async (req, res) => {
  try {
    const parsed = api.agents.admin.prompts.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const prompt = await storage.createPromptVersion(parsed.data as any);
    res.json(prompt);
  } catch (error) {
    console.error("Error creating prompt:", error);
    res.status(500).json({ message: "Failed to create prompt" });
  }
});

// PUT /agents/prompts/:id/activate — set active prompt version
router.put("/agents/prompts/:id/activate", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const prompt = await storage.activatePromptVersion(id);
    res.json(prompt);
  } catch (error) {
    console.error("Error activating prompt:", error);
    res.status(500).json({ message: "Failed to activate prompt" });
  }
});

// ============================================================================
// RESEARCH CONFIGURATION
// ============================================================================

router.get("/agents/research/config", async (req, res) => {
  try {
    const configs = await storage.listAgentConfigs();
    const negotiationConfig = configs.find((c: any) => c.agentType === "negotiation");
    res.json({
      researchConfig: negotiationConfig?.researchConfig ?? {
        feeSuggestionEnabled: true,
        externalResearchEnabled: false,
        cacheTtlHours: 24,
        minSampleSize: 10,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/agents/research/config", async (req, res) => {
  try {
    const { researchConfig } = req.body;
    if (!researchConfig) return res.status(400).json({ message: "researchConfig is required" });

    await storage.upsertAgentConfig("negotiation", {
      displayName: "Negotiation Agent",
      researchConfig,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/agents/research/cache/clear", async (req, res) => {
  try {
    // Import and use Drizzle directly for bulk delete
    const { db } = await import("../db");
    const { researchCache } = await import("@shared/schema");
    const deleted = await db.delete(researchCache).returning();
    res.json({ cleared: deleted.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================================
// NEGOTIATION ANALYTICS
// ============================================================================

router.get("/negotiation/analytics", async (req, res) => {
  try {
    const outcomes = await storage.getNegotiationOutcomes({});

    // Compute aggregate stats
    const total = outcomes.length;
    const signed = outcomes.filter(o => o.outcome === "signed").length;
    const rejected = outcomes.filter(o => o.outcome === "rejected" || o.outcome === "walked_away").length;
    const expired = outcomes.filter(o => o.outcome === "expired").length;

    // Fee accuracy
    const withFeeData = outcomes.filter(o => o.feeAccuracyDelta !== null);
    const avgFeeAccuracy = withFeeData.length > 0
      ? withFeeData.reduce((sum, o) => sum + Math.abs(Number(o.feeAccuracyDelta)), 0) / withFeeData.length
      : null;

    // Rounds distribution
    const roundsDist: Record<number, number> = {};
    outcomes.filter(o => o.roundsToAgreement !== null).forEach(o => {
      const r = o.roundsToAgreement!;
      roundsDist[r] = (roundsDist[r] || 0) + 1;
    });

    // Avg rounds to agreement (for signed only)
    const signedWithRounds = outcomes.filter(o => o.outcome === "signed" && o.roundsToAgreement !== null);
    const avgRounds = signedWithRounds.length > 0
      ? signedWithRounds.reduce((sum, o) => sum + o.roundsToAgreement!, 0) / signedWithRounds.length
      : null;

    // Genre breakdown
    const byGenre: Record<string, { count: number; avgFee: number | null }> = {};
    outcomes.filter(o => o.genre).forEach(o => {
      if (!byGenre[o.genre!]) byGenre[o.genre!] = { count: 0, avgFee: null };
      byGenre[o.genre!].count++;
      if (o.finalFee) {
        const prev = byGenre[o.genre!].avgFee || 0;
        byGenre[o.genre!].avgFee = prev + Number(o.finalFee);
      }
    });
    // Finalize averages
    Object.keys(byGenre).forEach(g => {
      if (byGenre[g].avgFee && byGenre[g].count > 0) {
        byGenre[g].avgFee = Math.round(byGenre[g].avgFee! / byGenre[g].count);
      }
    });

    res.json({
      total,
      outcomes: { signed, rejected, expired },
      avgFeeAccuracy: avgFeeAccuracy ? Math.round(avgFeeAccuracy) : null,
      avgRoundsToAgreement: avgRounds ? Math.round(avgRounds * 10) / 10 : null,
      roundsDistribution: roundsDist,
      byGenre,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/negotiation/outcomes", async (req, res) => {
  try {
    const { outcome, artistId, startDate, endDate, limit } = req.query;
    const outcomes = await storage.getNegotiationOutcomes({
      outcome: outcome as string | undefined,
      artistId: artistId ? parseInt(artistId as string) : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : 50,
    });
    res.json(outcomes);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
