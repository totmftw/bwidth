import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// Middleware to check if user is admin
function isAdmin(req: any, res: any, next: any) {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== 'admin' && user.role !== 'platform_admin') {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
}

// Apply admin middleware only to admin routes
router.use("/admin", isAdmin);

// === USERS ===

// List all users
router.get("/admin/users", async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// Update user status (Approve/Reject)
router.patch("/admin/users/:id/status", async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { status } = req.body; // 'active', 'suspended', 'rejected'

        if (!['active', 'suspended', 'rejected', 'pending_verification'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updated = await storage.updateUserStatus(userId, status);

        await storage.createAuditLog({
            who: (req.user as any).id,
            action: "admin_user_status_update",
            entityType: "user",
            entityId: userId,
            context: { status }
        });

        res.json(updated);
    } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Failed to update user status" });
    }
});

// Update user role
router.patch("/admin/users/:id/role", async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        const validRoles = ['artist', 'promoter', 'organizer', 'venue_manager', 'admin', 'platform_admin', 'staff', 'band_manager'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const updated = await storage.updateUserRole(userId, role);

        await storage.createAuditLog({
            who: (req.user as any).id,
            action: "admin_user_role_update",
            entityType: "user",
            entityId: userId,
            context: { role }
        });

        res.json(updated);
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
    }
});

// === CONTRACTS ===

// Get contracts pending review
router.get("/admin/contracts/pending", async (req, res) => {
    try {
        const contracts = await storage.getContractsForAdminReview();
        res.json(contracts);
    } catch (error) {
        console.error("Error fetching pending contracts:", error);
        res.status(500).json({ message: "Failed to fetch contracts" });
    }
});

// Review contract
router.post("/admin/contracts/:id/review", async (req, res) => {
    try {
        const contractId = parseInt(req.params.id);
        const { status, note } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updated = await storage.reviewContract(
            contractId,
            (req.user as any).id,
            status,
            note
        );

        // If approved, notify parties? (System message logic should go here ideally)
        // For now, implicit via status change visible to them.

        await storage.createAuditLog({
            who: (req.user as any).id,
            action: "admin_contract_review",
            entityType: "contract",
            entityId: contractId,
            context: { status, note }
        });

        res.json(updated);
    } catch (error) {
        console.error("Error reviewing contract:", error);
        res.status(500).json({ message: "Failed to review contract" });
    }
});

// === CONVERSATIONS ===

// List all conversations (for admin oversight)
router.get("/admin/conversations", async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const convos = await storage.getAllConversations(limit);
        res.json(convos);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

// Get messages for a specific conversation
router.get("/admin/conversations/:id/messages", async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const messages = await storage.getConversationMessages(conversationId);
        res.json(messages);
    } catch (error) {
        console.error("Error fetching conversation messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

export default router;
