import { Router } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";

const router = Router();

// GET /api/notifications — list notifications for authenticated user
router.get(api.notifications.list.path, async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

  const userId = (req.user as any).id;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;
  const unreadOnly = req.query.unreadOnly === "true";

  try {
    const [notificationsList, unreadCount, total] = await Promise.all([
      storage.getNotificationsByUser(userId, { limit, offset, unreadOnly }),
      storage.getUnreadNotificationCount(userId),
      storage.getNotificationCountByUser(userId, { unreadOnly }),
    ]);

    res.json({ notifications: notificationsList, unreadCount, total });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// GET /api/notifications/unread-count — lightweight badge count
router.get(api.notifications.unreadCount.path, async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

  try {
    const count = await storage.getUnreadNotificationCount((req.user as any).id);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

// POST /api/notifications/:id/read — mark single notification as read
router.post("/api/notifications/:id/read", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid notification ID" });

  try {
    const notification = await storage.markNotificationRead(id, (req.user as any).id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// POST /api/notifications/read-all — mark all notifications as read
router.post(api.notifications.markAllRead.path, async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

  try {
    const count = await storage.markAllNotificationsRead((req.user as any).id);
    res.json({ success: true, count });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

export default router;
