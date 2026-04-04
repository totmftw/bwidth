/**
 * Notification Service — core engine for routing domain events to user notifications.
 *
 * Lifecycle:
 *   1. init() — loads notification type definitions into memory cache, subscribes to event bus
 *   2. handleEvent() — looks up type by key, resolves target users, renders templates, persists + pushes
 *   3. refreshTypeCache() — called after admin updates notification types
 */

import { eventBus, type DomainEvent } from "./event-bus";
import { storage } from "../storage";
import { broadcastToUser } from "../ws-server";
import { resolveTargetUsers } from "./notification-resolvers";
import type { NotificationType } from "@shared/schema";

class NotificationService {
  private typeCache = new Map<string, NotificationType>();
  private channelEnabledCache = new Map<string, boolean>();

  async init(): Promise<void> {
    await this.refreshTypeCache();
    await this.refreshChannelCache();

    eventBus.on("*", (event: DomainEvent) => {
      this.handleEvent(event).catch((err) => {
        console.error(`[NotificationService] Error handling ${event.type}:`, err);
      });
    });

    console.log(`[NotificationService] Initialized with ${this.typeCache.size} notification types`);
  }

  async refreshTypeCache(): Promise<void> {
    const types = await storage.getNotificationTypes();
    this.typeCache.clear();
    types.forEach((t) => this.typeCache.set(t.key, t));
  }

  async refreshChannelCache(): Promise<void> {
    const channels = await storage.getNotificationChannels();
    this.channelEnabledCache.clear();
    channels.forEach((c) => this.channelEnabledCache.set(c.channel!, c.enabled));
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    const typeDef = this.typeCache.get(event.type);
    if (!typeDef || !typeDef.enabled) return;

    // Resolve which users should receive this notification
    const targetUserIds = await resolveTargetUsers(event, typeDef);
    if (targetUserIds.length === 0) return;

    // Render templates
    const title = this.interpolate(typeDef.titleTemplate, event.payload);
    const body = this.interpolate(typeDef.bodyTemplate, event.payload);

    const activeChannels = ((typeDef.channels as string[]) || ["in_app"]).filter(
      (ch) => this.channelEnabledCache.get(ch) !== false
    );

    for (const userId of targetUserIds) {
      // Don't notify the actor who triggered the event
      if (userId === event.actorUserId) continue;

      for (const channel of activeChannels) {
        if (channel === "in_app") {
          try {
            const notification = await storage.createNotification({
              userId,
              notificationTypeKey: event.type,
              channel: "in_app",
              title,
              body,
              entityType: event.payload.entityType || null,
              entityId: event.payload.entityId || null,
              actionUrl: event.payload.actionUrl || null,
              data: event.payload,
              delivered: true,
              deliveredAt: new Date(),
            });

            // Push real-time via WebSocket
            broadcastToUser(userId, {
              type: "notification",
              data: {
                ...notification,
                priority: typeDef.priority,
              },
            });
          } catch (err) {
            console.error(`[NotificationService] Failed to create notification for user ${userId}:`, err);
          }
        }
        // Future: email, sms, push channel handlers
      }
    }
  }

  /** Replace {{variable}} and {{nested.path}} tokens with event payload values */
  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
      const value = path.split(".").reduce((obj: any, key: string) => obj?.[key], data);
      return value != null ? String(value) : "";
    });
  }
}

export const notificationService = new NotificationService();
