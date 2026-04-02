import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminMessage {
  id: number;
  content: string;
  createdAt: string;
  sender: {
    displayName: string;
    metadata?: { role?: string };
  };
  messageType: string;
}

interface ConversationMeta {
  id: number;
  subject: string;
  type: string;
  participantNames?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const cfg: Record<string, string> = {
    artist: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    organizer: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    promoter: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    admin: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    platform_admin: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    venue_manager: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  };
  return (
    <Badge
      className={`border text-[10px] px-1.5 py-0 leading-4 ${cfg[role] ?? "bg-muted/50 text-muted-foreground border-white/10"}`}
    >
      {role.replace(/_/g, " ")}
    </Badge>
  );
}

function MessageTypeBadge({ type }: { type: string }) {
  if (type === "message" || !type) return null;
  return (
    <Badge className="bg-white/5 text-muted-foreground border border-white/10 text-[10px] px-1.5 py-0">
      {type}
    </Badge>
  );
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOrganizerRole(role?: string) {
  return role === "organizer" || role === "promoter";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminChatView() {
  const { id } = useParams<{ id: string }>();

  const { data: messages, isLoading, isError } = useQuery<AdminMessage[]>({
    queryKey: ["/api/admin/conversations", id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/conversations/${id}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!id,
  });

  // Messages come desc from API — reverse to show chronologically
  const ordered = messages ? [...messages].reverse() : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href="/admin/chats">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5 bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">
              Conversation #{id}
            </h1>
            <p className="text-sm text-muted-foreground">Read-only chat view</p>
          </div>
        </div>
      </motion.div>

      {/* Chat window */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-base text-muted-foreground font-normal">
              {isLoading
                ? "Loading messages…"
                : `${ordered.length} message${ordered.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                  >
                    <Skeleton className="h-16 w-64 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <p className="text-muted-foreground">Failed to load messages.</p>
              </div>
            ) : ordered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
                <p className="text-muted-foreground">No messages in this conversation.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {ordered.map((msg, idx) => {
                  const role = msg.sender?.metadata?.role;
                  const isRight = isOrganizerRole(role);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`flex ${isRight ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] ${isRight ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        {/* Sender info */}
                        <div
                          className={`flex items-center gap-1.5 ${isRight ? "flex-row-reverse" : ""}`}
                        >
                          <span className="text-xs font-medium text-foreground/80">
                            {msg.sender?.displayName ?? "Unknown"}
                          </span>
                          <RoleBadge role={role} />
                          <MessageTypeBadge type={msg.messageType} />
                        </div>

                        {/* Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isRight
                              ? "bg-primary/20 text-foreground rounded-tr-sm border border-primary/20"
                              : "bg-white/[0.05] text-foreground rounded-tl-sm border border-white/5"
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] text-muted-foreground px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
