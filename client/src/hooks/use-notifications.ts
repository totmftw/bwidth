import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { onWsMessage, authenticateWs } from "@/lib/ws";
import { playNotificationSound } from "@/lib/notification-sound";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Authenticate WebSocket for notifications when user is available
  useEffect(() => {
    if (user?.id) {
      authenticateWs(user.id);
    }
  }, [user?.id]);

  // Fetch notification list
  const listQuery = useQuery<{ notifications: any[]; unreadCount: number; total: number }>({
    queryKey: [api.notifications.list.path],
    queryFn: async () => {
      const res = await fetch(api.notifications.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!user,
  });

  // Lightweight unread count (polled as fallback for WS)
  const countQuery = useQuery<{ count: number }>({
    queryKey: [api.notifications.unreadCount.path],
    queryFn: async () => {
      const res = await fetch(api.notifications.unreadCount.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch count");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Real-time WebSocket notifications
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onWsMessage("notification", (notification: any) => {
      // Prepend to notification list cache
      queryClient.setQueryData(
        [api.notifications.list.path],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            notifications: [notification, ...old.notifications],
            unreadCount: (old.unreadCount || 0) + 1,
            total: (old.total || 0) + 1,
          };
        }
      );

      // Update count cache
      queryClient.setQueryData(
        [api.notifications.unreadCount.path],
        (old: any) => ({ count: (old?.count || 0) + 1 })
      );

      // Play sound
      playNotificationSound(notification.priority === "urgent" ? "urgent" : "normal");

      // Show toast
      toast({
        title: notification.title,
        description: notification.body,
      });
    });

    return unsubscribe;
  }, [user, queryClient, toast]);

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.notifications.unreadCount.path] });
    },
  });

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", api.notifications.markAllRead.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.notifications.unreadCount.path] });
    },
  });

  return {
    notifications: listQuery.data?.notifications || [],
    unreadCount: countQuery.data?.count ?? listQuery.data?.unreadCount ?? 0,
    total: listQuery.data?.total || 0,
    isLoading: listQuery.isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
