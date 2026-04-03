/**
 * Domain Event Bus — in-process event system for triggering notifications.
 *
 * Business services emit domain events after successful operations.
 * The NotificationService subscribes to all events via the "*" wildcard.
 *
 * If horizontal scaling is needed later, swap EventEmitter for Redis pub/sub
 * without changing call sites.
 */

import { EventEmitter } from "events";

export interface DomainEvent {
  type: string;
  payload: Record<string, any>;
  actorUserId: number | null;
  timestamp: string;
}

class DomainEventBus extends EventEmitter {
  override emit(type: string, event: DomainEvent): boolean {
    // Emit on specific type AND wildcard so notification service can subscribe once
    super.emit(type, event);
    if (type !== "*") {
      super.emit("*", event);
    }
    return true;
  }
}

export const eventBus = new DomainEventBus();
eventBus.setMaxListeners(50);

/** Helper for consistent event emission from business services */
export function emitDomainEvent(
  type: string,
  payload: Record<string, any>,
  actorUserId: number | null
): void {
  eventBus.emit(type, {
    type,
    payload,
    actorUserId,
    timestamp: new Date().toISOString(),
  });
}
