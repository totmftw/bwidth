import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useConversationMessages } from "@/hooks/use-conversation";
import { cn } from "@/lib/utils";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import {
  api,
  type NegotiationSummaryResponseV2,
  type NegotiationActionInput,
  type NegotiationSnapshot,
} from "@shared/routes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCheck,
  X,
  ThumbsUp,
  ArrowLeftRight,
  Loader2,
  Info,
  Check,
  LogOut,
  Clock,
  Send,
  MessageSquare,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NegotiationFlowProps {
  booking: any;
  onClose: () => void;
  onStartContract?: () => void;
}

export function NegotiationFlow({ booking, onClose, onStartContract }: NegotiationFlowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"view" | "propose">("view");
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Track last dispatched action for toast message in onSuccess
  const lastActionRef = useRef<NegotiationActionInput["action"]>("edit");

  // Profile completion check
  const profileStatusEndpoint =
    user?.role === "artist" ? "/api/artists/profile/status" :
    (user?.role === "organizer" || user?.role === "promoter") ? "/api/organizer/profile/status" :
    (user?.role === "venue_manager" || user?.role === "venue") ? "/api/venues/profile/status" :
    null;

  const { data: profileStatus } = useQuery({
    queryKey: [profileStatusEndpoint],
    queryFn: async () => {
      const res = await fetch(profileStatusEndpoint!, { credentials: "include" });
      if (!res.ok) return { isComplete: true };
      return res.json();
    },
    enabled: !!profileStatusEndpoint && !!user,
    staleTime: 60000,
  });

  const isProfileComplete = profileStatus?.isComplete ?? true;

  const summaryQueryKey = api.bookings.negotiationSummary.path.replace(":id", booking.id.toString());

  const { data: summary, isLoading, refetch } = useQuery<NegotiationSummaryResponseV2>({
    queryKey: [summaryQueryKey],
    queryFn: async () => {
      const res = await apiRequest(
        api.bookings.negotiationSummary.method,
        api.bookings.negotiationSummary.path.replace(":id", booking.id.toString())
      );
      return res.json();
    },
    refetchInterval: 5000,
  });

  // Chat: real-time messages via WebSocket
  const conversationId = summary?.conversation?.id ?? null;
  const { data: chatMessages = [] } = useConversationMessages(conversationId);

  // Auto-scroll to newest chat message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const sendChatMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!conversationId) throw new Error("No conversation");
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => setChatMessage(""),
    onError: (err: any) => toast({ title: "Chat error", description: err.message, variant: "destructive" }),
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || sendChatMutation.isPending) return;
    sendChatMutation.mutate(chatMessage.trim());
  };

  // Single unified mutation replacing all previous propose/accept/walkaway/rider mutations
  const actionMutation = useMutation({
    mutationFn: async (payload: NegotiationActionInput) => {
      lastActionRef.current = payload.action;
      const res = await apiRequest(
        api.bookings.negotiationAction.method,
        api.bookings.negotiationAction.path.replace(":id", booking.id.toString()),
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      const action = lastActionRef.current;
      toast({
        title:
          action === "edit" ? "Proposal sent" :
          action === "accept" ? "Terms accepted" :
          "Walked away",
      });
      setMode("view");
      queryClient.invalidateQueries({ queryKey: [summaryQueryKey] });
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.organizer.bookings.list.path] });
      refetch();
      if (action === "walkaway") onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Action failed",
        variant: "destructive",
      });
    },
  });

  // Derive user role bucket (artist vs organizer side)
  const userRole = user?.role === "artist" ? "artist" : "organizer";

  // Deadline calculation — prefer stepDeadlineAt, fall back to booking.flowDeadlineAt
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState<boolean>(false);

  useEffect(() => {
    if (!summary) return;

    const deadlineSource = summary.stepDeadlineAt ?? summary.booking?.flowDeadlineAt ?? null;
    const isTerminalState = ["locked", "walked_away", "expired"].includes(summary.stepState ?? "");

    if (!deadlineSource || isTerminalState) {
      setTimeLeft("");
      setIsExpiredLocal(false);
      return;
    }

    const deadline = new Date(deadlineSource);

    const updateTime = () => {
      const now = new Date();
      if (now > deadline) {
        setIsExpiredLocal(true);
        setTimeLeft("Expired");
        return;
      }
      const hours = differenceInHours(deadline, now);
      const minutes = differenceInMinutes(deadline, now) % 60;
      setTimeLeft(`${hours}h ${minutes}m remaining`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [summary?.stepDeadlineAt, summary?.booking?.flowDeadlineAt, summary?.stepState]);

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading negotiation workspace...</p>
      </div>
    );
  }

  if (!isProfileComplete) {
    const setupPath =
      user?.role === "artist" ? "/profile/setup" :
      (user?.role === "organizer" || user?.role === "promoter") ? "/organizer/setup" :
      "/venue/setup";
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Profile Required</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Complete your profile to participate in negotiations. You can still view bookings and apply to gigs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLocation(setupPath)}>Complete Profile</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  // Turn and action derivations
  const isMyTurn =
    (summary.whoseTurn === "artist" && userRole === "artist") ||
    (summary.whoseTurn === "organizer" && userRole === "organizer");

  const availableActions = summary.availableActions ?? [];
  const canEdit = availableActions.includes("edit") && isMyTurn;
  const canAccept = availableActions.includes("accept") && isMyTurn;
  const canWalkAway = availableActions.includes("walkaway") && isMyTurn;

  const stepState = summary.stepState ?? "applied";
  const activity = summary.activity ?? [];

  const isTerminal = ["locked", "walked_away", "expired"].includes(stepState);
  const isLocked = stepState === "locked";
  const isWalkedAway = stepState === "walked_away";
  const isExpiredState = stepState === "expired";

  // Determine who walked away for the terminal message (from activity log)
  const walkAwayActivity = activity.find((a) => a.type === "walked_away");
  const walkedAwayRole = walkAwayActivity?.actorRole ?? "A party";

  // Display snapshot: prefer lockedTerms when negotiation is complete, else current proposal
  const displaySnapshot = isLocked && summary.lockedTerms
    ? summary.lockedTerms
    : summary.currentProposal?.snapshot ?? null;

  const otherPartyLabel = userRole === "artist" ? "organizer" : "artist";

  const stepLabels = ["Organizer Proposal", "Artist Response", "Organizer Response", "Artist Final"];

  return (
    <div className="flex flex-col h-[80vh] bg-background">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Negotiation Workspace</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline">
              Step {summary.currentStep ?? 0}/{summary.maxSteps ?? 4}
            </Badge>
            <Badge
              variant={
                isLocked ? "default" :
                isWalkedAway ? "destructive" :
                isExpiredState ? "destructive" :
                "secondary"
              }
            >
              {stepState.replace(/_/g, " ").toUpperCase()}
            </Badge>
            {!isTerminal && timeLeft && (
              <Badge
                variant={isExpiredLocal ? "destructive" : "outline"}
                className="flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                {timeLeft}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Step Progress Indicator */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30 shrink-0">
        {[1, 2, 3, 4].map((step) => {
          const isCompleted = (summary.currentStep ?? 0) >= step;
          const isCurrent =
            (summary.currentStep ?? 0) === step - 1 &&
            !["locked", "walked_away", "expired"].includes(stepState);
          return (
            <div key={step} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0",
                  isCompleted
                    ? "bg-primary text-primary-foreground border-primary"
                    : isCurrent
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={cn(
                  "text-xs truncate hidden lg:block",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {stepLabels[step - 1]}
              </span>
              {step < 4 && (
                <div
                  className={cn(
                    "flex-1 h-0.5",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left: Terms Board */}
        <ScrollArea className="flex-1 border-b lg:border-b-0 lg:border-r p-4 lg:p-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            {isLocked ? "Agreed Terms" : "Current Terms Board"}
          </h3>

          {displaySnapshot ? (
            <div className="space-y-6">
              {summary.history && summary.history.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-xs text-muted-foreground">Offer History</Label>
                  <div className="space-y-1">
                    {summary.history.map((proposal: any, idx: number) => {
                      const isLast = idx === summary.history.length - 1;
                      const amount = proposal.snapshot?.financial?.offerAmount;
                      const currency = proposal.snapshot?.financial?.currency || "INR";
                      const role = proposal.submittedByRole || "unknown";
                      return (
                        <div key={proposal.id || idx} className={`flex items-center gap-2 text-xs ${isLast ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLast ? "bg-primary" : "bg-muted-foreground/40"}`} />
                          <span className="capitalize">{role}</span>
                          <span>→</span>
                          <span>{currency} {amount?.toLocaleString('en-IN') || "?"}</span>
                          {isLast && <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px]">current</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Financial</Label>
                <div className="p-3 bg-muted/40 rounded-md font-mono text-lg">
                  {displaySnapshot.financial?.currency || "INR"}{" "}
                  {displaySnapshot.financial?.offerAmount?.toLocaleString() || "0"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Schedule</Label>
                <div className="p-3 bg-muted/40 rounded-md text-sm space-y-0.5">
                  {displaySnapshot.schedule?.stageName && (
                    <div className="font-medium">{displaySnapshot.schedule.stageName}</div>
                  )}
                  <div>
                    {(() => {
                      const startsAt = displaySnapshot.schedule?.startsAt;
                      const endsAt = displaySnapshot.schedule?.endsAt;
                      const stageId = displaySnapshot.schedule?.stageId;
                      // Fallback: look up stage from eventStages if snapshot times are missing
                      const fallbackStage = (!startsAt || !endsAt) && stageId
                        ? (summary.eventStages ?? []).find((s: any) => s.id === stageId)
                        : null;
                      const resolvedStart = startsAt || fallbackStage?.startTime;
                      const resolvedEnd = endsAt || fallbackStage?.endTime;
                      return (
                        <>
                          {resolvedStart
                            ? format(new Date(resolvedStart), "MMM d, h:mm a")
                            : "TBD"}
                          {" – "}
                          {resolvedEnd
                            ? format(new Date(resolvedEnd), "h:mm a")
                            : "TBD"}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tech Rider Requirements</Label>
                <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1">
                  {displaySnapshot.techRider?.artistRequirements?.length ? (
                    displaySnapshot.techRider?.artistRequirements?.map((req, i) => {
                      // When negotiation is locked, all rider items are implicitly confirmed.
                      const effectiveStatus = isLocked ? "confirmed" : (req.status ?? "pending");
                      return (
                        <div key={i} className="flex justify-between items-center">
                          <span>
                            {req.quantity}x {req.item}
                          </span>
                          <Badge
                            variant={effectiveStatus === "confirmed" ? "default" : "secondary"}
                          >
                            {effectiveStatus}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Artist Brings</Label>
                <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1">
                  {displaySnapshot.techRider?.artistBrings?.length ? (
                    displaySnapshot.techRider?.artistBrings?.map((req, i) => (
                      <div key={i}>
                        {req.quantity}x {req.item}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-md">
              No proposal snapshot available yet.
            </div>
          )}
        </ScrollArea>

        {/* Right: Activity & Actions */}
        <div className="w-full lg:w-96 flex flex-col bg-muted/10 shrink-0">
          <ScrollArea className="flex-1 min-h-0 p-4 lg:p-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Activity
            </h3>
            <div className="space-y-4">
              {activity.map((act) => (
                <div key={act.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold capitalize text-xs">
                      {act.actorRole || "System"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(act.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="bg-background border rounded-md p-2 text-xs">
                    {act.type.replace(/_/g, " ")}
                    {act.metadata && typeof act.metadata.note === "string" && (
                      <div className="mt-1 italic opacity-80">
                        "{act.metadata.note}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator />

          {/* Chat Panel */}
          {conversationId && (
            <>
              <div className="px-4 pt-3 pb-1 shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Chat
                </h3>
              </div>
              <div className="h-36 overflow-y-auto px-4 pb-2 space-y-2 shrink-0">
                {chatMessages.filter((m: any) => m.messageType === "text").map((msg: any) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                      <span className="text-[10px] text-muted-foreground mb-0.5">
                        {msg.sender?.displayName || msg.sender?.username || "—"}{" "}
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                      <div className={cn("max-w-[80%] rounded-lg px-3 py-1.5 text-xs", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {msg.body}
                      </div>
                    </div>
                  );
                })}
                {chatMessages.filter((m: any) => m.messageType === "text").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-2">No messages yet</p>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="px-4 pb-3 shrink-0">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder={userRole === "artist" ? "Message the organizer..." : "Message the artist..."}
                    className="flex-1 h-8 text-xs"
                    disabled={sendChatMutation.isPending}
                  />
                  <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={!chatMessage.trim() || sendChatMutation.isPending}>
                    {sendChatMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </Button>
                </form>
              </div>
              <Separator />
            </>
          )}

          <div className="p-4 lg:p-6 space-y-2 shrink-0 bg-background border-t">
            {/* ── Terminal: locked / agreed ── */}
            {isTerminal && isLocked && (
              <div className="space-y-3">
                <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-3 rounded-md text-sm flex items-center gap-2 border border-green-500/20">
                  <CheckCheck className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Negotiation Complete — Terms Locked</span>
                </div>
                {onStartContract && (
                  <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={onStartContract}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Proceed to Contract →
                  </Button>
                )}
              </div>
            )}

            {/* ── Terminal: walked away ── */}
            {isTerminal && isWalkedAway && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>
                  Negotiation ended —{" "}
                  <span className="font-semibold capitalize">{walkedAwayRole}</span> walked away.
                </span>
              </div>
            )}

            {/* ── Terminal: expired ── */}
            {isTerminal && isExpiredState && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Deadline expired — negotiation closed.</span>
              </div>
            )}

            {/* ── Active: not user's turn ── */}
            {!isTerminal && !isMyTurn && (
              <div className="bg-blue-500/10 text-blue-700 p-3 rounded-md text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                <span>
                  Waiting for{" "}
                  <span className="font-semibold capitalize">{otherPartyLabel}</span>...
                </span>
              </div>
            )}

            {/* ── Active: user's turn ── */}
            {!isTerminal && isMyTurn && mode === "view" && (
              <>
                {canAccept && (
                  <Button
                    className="w-full"
                    onClick={() => actionMutation.mutate({ action: "accept" })}
                    disabled={actionMutation.isPending}
                  >
                    {actionMutation.isPending && lastActionRef.current === "accept" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4 mr-2" />
                    )}
                    Accept Terms
                  </Button>
                )}

                {canEdit && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setMode("propose")}
                    disabled={actionMutation.isPending}
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    {(summary.currentStep ?? 0) === 0 ? "Submit Initial Proposal" : "Propose Changes"}
                  </Button>
                )}

                {canWalkAway && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
                        disabled={actionMutation.isPending}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Walk Away
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Walk away from this negotiation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently close this negotiation. The other party will be notified. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => actionMutation.mutate({ action: "walkaway" })}
                        >
                          Walk Away
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}

            {/* ── Propose form ── */}
            {mode === "propose" && (
              <ProposeForm
                currentSnapshot={displaySnapshot}
                eventStages={summary.eventStages ?? []}
                event={summary.event ?? null}
                onCancel={() => setMode("view")}
                onSubmit={(snapshot: NegotiationSnapshot, note: string) =>
                  actionMutation.mutate({ action: "edit", snapshot, note })
                }
                isPending={actionMutation.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ProposeForm sub-component ───────────────────────────────────────────────

type EventStage = { id: number; name: string | null; startTime: string | null; endTime: string | null; orderIndex: number };
type EventInfo = { title: string; startTime: string; endTime: string | null } | null;

/** Format a stage time range as "9:00 PM – 11:00 PM" */
function fmtRange(start: string | null, end: string | null): string {
  if (!start) return "";
  const s = format(new Date(start), "h:mm a");
  const e = end ? format(new Date(end), "h:mm a") : "";
  return e ? `${s} – ${e}` : s;
}

/** Build the label shown for each Select option */
function stageOptionLabel(stage: EventStage): string {
  const timeRange = fmtRange(stage.startTime, stage.endTime);
  const name = stage.name ?? "Unnamed Stage";
  return timeRange ? `${name} — ${timeRange}` : name;
}

interface ProposeFormProps {
  currentSnapshot: NegotiationSnapshot | null | undefined;
  eventStages: EventStage[];
  event: EventInfo;
  onCancel: () => void;
  onSubmit: (snapshot: NegotiationSnapshot, note: string) => void;
  isPending: boolean;
}

function ProposeForm({ currentSnapshot, eventStages, event, onCancel, onSubmit, isPending }: ProposeFormProps) {
  const defaultAmount = currentSnapshot?.financial?.offerAmount?.toString() ?? "0";
  const defaultCurrency = currentSnapshot?.financial?.currency ?? "INR";

  // Pre-select stage if already in snapshot, or auto-select if only one stage
  const initialStageId = (() => {
    if (currentSnapshot?.schedule?.stageId) return String(currentSnapshot.schedule.stageId);
    if (eventStages.length === 1) return String(eventStages[0].id);
    if (eventStages.length === 0 && event) return "__event__";
    return "__none__";
  })();

  const [amount, setAmount] = useState(defaultAmount);
  const [selectedSlot, setSelectedSlot] = useState<string>(initialStageId);
  const [note, setNote] = useState("");

  // Build schedule from the currently selected slot
  const buildSchedule = () => {
    if (selectedSlot === "__event__" && event) {
      return {
        stageId: null,
        stageName: null,
        slotLabel: fmtRange(event.startTime, event.endTime) || "Full Event",
        startsAt: event.startTime,
        endsAt: event.endTime ?? null,
        soundCheckLabel: null,
        soundCheckAt: null,
      };
    }
    const stage = eventStages.find((s) => String(s.id) === selectedSlot);
    if (stage) {
      return {
        stageId: stage.id,
        stageName: stage.name ?? null,
        slotLabel: fmtRange(stage.startTime, stage.endTime) || null,
        startsAt: stage.startTime ?? null,
        endsAt: stage.endTime ?? null,
        soundCheckLabel: null,
        soundCheckAt: null,
      };
    }
    // No slot selected or "__none__" — preserve existing schedule or null
    return currentSnapshot?.schedule ?? null;
  };

  const selectedStage = eventStages.find((s) => String(s.id) === selectedSlot);
  const previewTime = selectedSlot === "__event__" && event
    ? fmtRange(event.startTime, event.endTime)
    : selectedStage
    ? fmtRange(selectedStage.startTime, selectedStage.endTime)
    : null;

  const handleSubmit = () => {
    const updatedSnapshot: NegotiationSnapshot = {
      ...(currentSnapshot ?? {}),
      financial: {
        ...(currentSnapshot?.financial ?? {}),
        currency: defaultCurrency,
        offerAmount: Number(amount),
      },
      schedule: buildSchedule(),
    } as NegotiationSnapshot;
    onSubmit(updatedSnapshot, note);
  };

  const hasSlotOptions = eventStages.length > 0 || event != null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">New Offer Amount ({defaultCurrency})</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {hasSlotOptions && (
        <div className="space-y-1">
          <Label className="text-xs">Performance Slot</Label>
          <Select value={selectedSlot} onValueChange={setSelectedSlot}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select a stage / time slot…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No preference (TBD)</SelectItem>
              {eventStages.length > 0
                ? eventStages.map((stage) => (
                    <SelectItem key={stage.id} value={String(stage.id)}>
                      {stageOptionLabel(stage)}
                    </SelectItem>
                  ))
                : event && (
                    <SelectItem value="__event__">
                      {`Full event — ${format(new Date(event.startTime), "MMM d")}${fmtRange(event.startTime, event.endTime) ? `, ${fmtRange(event.startTime, event.endTime)}` : ""}`}
                    </SelectItem>
                  )}
            </SelectContent>
          </Select>
          {previewTime && (
            <p className="text-xs text-muted-foreground pl-1">{previewTime}</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Note</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-16 text-sm"
          placeholder="Optional message to the other party..."
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button className="flex-1" disabled={isPending} onClick={handleSubmit}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
        </Button>
      </div>
    </div>
  );
}
