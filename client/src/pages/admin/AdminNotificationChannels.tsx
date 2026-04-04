import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NotificationChannel {
  id: number;
  channel: string;
  enabled: boolean;
  config: Record<string, any>;
  rateLimit: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const channelMeta: Record<string, { icon: typeof Bell; label: string; description: string; configurable: boolean }> = {
  in_app: {
    icon: Bell,
    label: "In-App Notifications",
    description: "Real-time notifications via WebSocket with bell icon badge and popover. Always recommended.",
    configurable: true,
  },
  email: {
    icon: Mail,
    label: "Email Notifications",
    description: "Email delivery via SMTP/API. Configure your email provider to enable.",
    configurable: false,
  },
  sms: {
    icon: MessageSquare,
    label: "SMS Notifications",
    description: "SMS delivery for urgent notifications. Requires SMS provider (MSG91 for India DLT compliance).",
    configurable: false,
  },
  push: {
    icon: Smartphone,
    label: "Push Notifications",
    description: "Browser/mobile push notifications via FCM. Requires service worker setup.",
    configurable: false,
  },
};

export default function AdminNotificationChannels() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: channels = [], isLoading } = useQuery<NotificationChannel[]>({
    queryKey: ["/api/admin/notification-channels"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notification-channels", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      await apiRequest("PUT", `/api/admin/notification-channels/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-channels"] });
      toast({ title: "Channel updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleSoundMutation = useMutation({
    mutationFn: async ({ id, soundEnabled }: { id: number; soundEnabled: boolean }) => {
      await apiRequest("PUT", `/api/admin/notification-channels/${id}`, {
        config: { soundEnabled },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-channels"] });
      toast({ title: "Sound setting updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notification Channels
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enable or disable delivery channels globally. Phase 1: in-app only.
        </p>
      </div>

      <div className="grid gap-4">
        {channels.map((channel, index) => {
          const meta = channelMeta[channel.channel] || channelMeta.in_app;
          const Icon = meta.icon;
          const isInApp = channel.channel === "in_app";
          const soundEnabled = isInApp ? (channel.config as any)?.soundEnabled !== false : false;

          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!channel.enabled ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${channel.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}
                      `}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{meta.label}</h3>
                          <Badge variant={channel.enabled ? "default" : "secondary"} className="text-[10px]">
                            {channel.enabled ? "Active" : "Disabled"}
                          </Badge>
                          {!meta.configurable && (
                            <Badge variant="outline" className="text-[10px]">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {meta.description}
                        </p>

                        {/* In-app specific: sound toggle */}
                        {isInApp && channel.enabled && (
                          <div className="mt-3 flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 h-8"
                              onClick={() => toggleSoundMutation.mutate({
                                id: channel.id,
                                soundEnabled: !soundEnabled,
                              })}
                            >
                              {soundEnabled ? (
                                <><Volume2 className="w-3.5 h-3.5" /> Sound On</>
                              ) : (
                                <><VolumeX className="w-3.5 h-3.5" /> Sound Off</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMutation.mutate({
                        id: channel.id,
                        enabled: !channel.enabled,
                      })}
                      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    >
                      {channel.enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
