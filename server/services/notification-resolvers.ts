/**
 * Notification Target Resolvers — determines which users should receive a notification
 * based on the event type, payload, and notification type definition's targetRoles.
 */

import { storage } from "../storage";
import type { DomainEvent } from "./event-bus";
import type { NotificationType } from "@shared/schema";

export async function resolveTargetUsers(
  event: DomainEvent,
  typeDef: NotificationType
): Promise<number[]> {
  const targetRoles = (typeDef.targetRoles as string[]) || [];
  const payload = event.payload;
  const userIds: number[] = [];

  // Booking-based resolution (booking, negotiation, contract events)
  if (payload.bookingId) {
    try {
      const details = await storage.getBookingWithDetails(payload.bookingId);
      if (details) {
        if (targetRoles.includes("artist") && details.artist?.userId) {
          userIds.push(details.artist.userId);
        }
        if (
          (targetRoles.includes("organizer") || targetRoles.includes("promoter")) &&
          details.organizer?.userId
        ) {
          userIds.push(details.organizer.userId);
        }
        if (targetRoles.includes("venue_manager") && details.venue?.userId) {
          userIds.push(details.venue.userId);
        }
      }
    } catch (err) {
      console.error(`[NotificationResolver] Failed to resolve booking ${payload.bookingId}:`, err);
    }
  }

  // Contract-based resolution (when bookingId isn't directly available)
  if (payload.contractId && !payload.bookingId) {
    try {
      const contract = await storage.getContractWithDetails(payload.contractId);
      if (contract?.booking) {
        const bookingDetails = await storage.getBookingWithDetails(contract.booking.id);
        if (bookingDetails) {
          if (targetRoles.includes("artist") && bookingDetails.artist?.userId) {
            userIds.push(bookingDetails.artist.userId);
          }
          if (
            (targetRoles.includes("organizer") || targetRoles.includes("promoter")) &&
            bookingDetails.organizer?.userId
          ) {
            userIds.push(bookingDetails.organizer.userId);
          }
        }
      }
    } catch (err) {
      console.error(`[NotificationResolver] Failed to resolve contract ${payload.contractId}:`, err);
    }
  }

  // Direct userId targets (for system events with explicit userId in payload)
  if (payload.targetUserId) {
    userIds.push(payload.targetUserId);
  }

  // Admin-targeted events
  if (targetRoles.includes("admin") || targetRoles.includes("platform_admin")) {
    try {
      const adminIds = await storage.getAdminUserIds();
      userIds.push(...adminIds);
    } catch (err) {
      console.error("[NotificationResolver] Failed to resolve admin users:", err);
    }
  }

  // Deduplicate
  return userIds.filter((id, idx) => userIds.indexOf(id) === idx);
}
