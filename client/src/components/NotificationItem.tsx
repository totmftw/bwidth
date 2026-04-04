import { useLocation } from "wouter";
import { Calendar, FileText, DollarSign, Bell, Music, Handshake } from "lucide-react";

interface NotificationItemProps {
  notification: {
    id: number;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: number | null;
    actionUrl?: string | null;
    notificationTypeKey: string;
    read: boolean;
    createdAt: string;
  };
  onRead: (id: number) => void;
  compact?: boolean;
}

const categoryIcons: Record<string, typeof Bell> = {
  booking: Calendar,
  negotiation: Handshake,
  contract: FileText,
  payment: DollarSign,
  system: Bell,
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationItem({ notification, onRead, compact }: NotificationItemProps) {
  const [, navigate] = useLocation();
  const category = notification.notificationTypeKey.split(".")[0];
  const Icon = categoryIcons[category] || Bell;

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    // Navigate to entity if actionUrl or entity info is available
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.entityType === "booking" && notification.entityId) {
      navigate(`/bookings?bookingId=${notification.entityId}`);
    } else if (notification.entityType === "contract" && notification.entityId) {
      navigate(`/contract/${notification.entityId}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer
        ${notification.read
          ? "opacity-60 hover:bg-muted/50"
          : "bg-primary/5 hover:bg-primary/10"
        }
      `}
    >
      <div className={`
        mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${notification.read ? "bg-muted" : "bg-primary/15 text-primary"}
      `}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate ${notification.read ? "font-normal" : "font-semibold"}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}
