/**
 * NegotiationChat — floating popup chat interface for structured negotiations.
 *
 * Portal-based floating panel (bottom-right, WhatsApp-style) with glass
 * morphism design. Replaces the previous full-screen Dialog implementation.
 *
 * Sections (top to bottom):
 *   1. Header — gradient blue bar, avatar, party name, round indicator
 *   2. Proposal Card — glass card with current term pills
 *   3. Messages — scrollable chat with bubble styles per sender type
 *   4. Quick Actions — accept / counter / walk-away (or generate contract)
 *   5. Input Bar — message composer with gradient send button
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useConversationMessages } from "@/hooks/use-conversation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  X,
  Minus,
  Loader2,
  Info,
  Check,
  LogOut,
  FileText,
  ThumbsUp,
  ThumbsDown,
  IndianRupee,
  Clock,
  Music,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NegotiationChatProps {
  booking: any;
  onClose: () => void;
  onOpenContract: () => void;
  /** Fully dismiss the chat (clear booking). Optional — falls back to onClose. */
  onDismiss?: () => void;
}

type EventStage = {
  id: number;
  name: string | null;
  startTime: string | null;
  endTime: string | null;
  orderIndex: number;
};

type EventInfo = {
  title: string;
  startTime: string;
  endTime: string | null;
} | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtRange(start: string | null, end: string | null): string {
  if (!start) return "";
  const s = format(new Date(start), "h:mm a");
  const e = end ? format(new Date(end), "h:mm a") : "";
  return e ? `${s} \u2013 ${e}` : s;
}

function stageOptionLabel(stage: EventStage): string {
  const timeRange = fmtRange(stage.startTime, stage.endTime);
  const name = stage.name ?? "Unnamed Stage";
  return timeRange ? `${name} \u2014 ${timeRange}` : name;
}

function buildSnapshotFromForm(
  amount: string,
  selectedSlot: string,
  eventStages: EventStage[],
  event: EventInfo,
  currentSnapshot: NegotiationSnapshot | null | undefined,
): NegotiationSnapshot {
  const defaultCurrency = currentSnapshot?.financial?.currency ?? "INR";

  let schedule: any = currentSnapshot?.schedule ?? null;
  if (selectedSlot === "__event__" && event) {
    schedule = {
      stageId: null,
      stageName: null,
      slotLabel: fmtRange(event.startTime, event.endTime) || "Full Event",
      startsAt: event.startTime,
      endsAt: event.endTime ?? null,
      soundCheckLabel: null,
      soundCheckAt: null,
    };
  } else {
    const stage = eventStages.find((s) => String(s.id) === selectedSlot);
    if (stage) {
      schedule = {
        stageId: stage.id,
        stageName: stage.name ?? null,
        slotLabel: fmtRange(stage.startTime, stage.endTime) || null,
        startsAt: stage.startTime ?? null,
        endsAt: stage.endTime ?? null,
        soundCheckLabel: null,
        soundCheckAt: null,
      };
    }
  }

  return {
    ...(currentSnapshot ?? {}),
    financial: {
      ...(currentSnapshot?.financial ?? {}),
      currency: defaultCurrency,
      offerAmount: Number(amount),
    },
    schedule,
  } as NegotiationSnapshot;
}

/** Format a currency value for display (INR locale). */
function fmtCurrency(value: number | string | null | undefined): string {
  if (value == null) return "\u2014";
  return `\u20B9${Number(value).toLocaleString("en-IN")}`;
}

/** Get initials from a name string (max 2 chars). */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// -- Proposal Card ----------------------------------------------------------

function ProposalCard({
  snapshot,
}: {
  snapshot: NegotiationSnapshot | null;
}) {
  if (!snapshot) return null;

  const fee = snapshot.financial?.offerAmount;
  const currency = snapshot.financial?.currency || "INR";
  const slotLabel =
    snapshot.schedule?.stageName ||
    snapshot.schedule?.slotLabel ||
    null;
  const riderItems = snapshot.techRider?.artistRequirements ?? [];

  return (
    <div
      className={cn(
        "mx-3 mt-2 rounded-2xl p-3",
        "bg-[rgba(22,161,251,0.16)] border border-[rgba(115,189,236,0.21)]",
        "backdrop-blur-md",
      )}
    >
      <p className="text-[10px] uppercase tracking-widest text-[#49AAFF] font-semibold mb-2">
        Current Terms
      </p>
      <div className="flex flex-wrap gap-1.5">
        {/* Fee pill — clickable: shows full financial breakdown */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex">
              <Badge
                variant="outline"
                className="text-xs bg-[rgba(24,139,239,0.10)] border-[rgba(115,189,236,0.21)] text-white gap-1 cursor-pointer hover:bg-[rgba(24,139,239,0.22)] transition-colors"
              >
                <IndianRupee className="w-3 h-3" />
                {fee != null ? fmtCurrency(fee) : "\u2014"}{" "}
                <span className="text-white/60 text-[10px]">{currency}</span>
              </Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-3 bg-[#0d1f35] border-[rgba(115,189,236,0.25)] text-white text-xs"
            side="top"
            align="start"
          >
            <p className="text-[10px] uppercase tracking-widest text-[#49AAFF] font-semibold mb-2">
              Financial Terms
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/60">Artist Fee</span>
                <span className="font-medium">{fee != null ? fmtCurrency(fee) : "—"} {currency}</span>
              </div>
              {snapshot.financial?.depositPercent != null && (
                <div className="flex justify-between">
                  <span className="text-white/60">Deposit</span>
                  <span className="font-medium">{snapshot.financial.depositPercent}%</span>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Slot pill */}
        {slotLabel && (
          <Badge
            variant="outline"
            className="text-xs bg-[rgba(24,139,239,0.10)] border-[rgba(115,189,236,0.21)] text-white gap-1"
          >
            <Clock className="w-3 h-3" />
            {slotLabel}
          </Badge>
        )}

        {/* Time range pill */}
        {snapshot.schedule?.startsAt && (
          <Badge
            variant="outline"
            className="text-xs bg-[rgba(24,139,239,0.10)] border-[rgba(115,189,236,0.21)] text-white/80"
          >
            {fmtRange(
              snapshot.schedule.startsAt,
              snapshot.schedule.endsAt ?? null,
            )}
          </Badge>
        )}

        {/* Tech rider pill — clickable: shows all rider items */}
        {riderItems.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex">
                <Badge
                  variant="outline"
                  className="text-xs bg-[rgba(24,139,239,0.10)] border-[rgba(115,189,236,0.21)] text-white gap-1 cursor-pointer hover:bg-[rgba(24,139,239,0.22)] transition-colors"
                >
                  <Music className="w-3 h-3" />
                  {riderItems.length} rider item{riderItems.length !== 1 ? "s" : ""}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-3 bg-[#0d1f35] border-[rgba(115,189,236,0.25)] text-white text-xs"
              side="top"
              align="start"
            >
              <p className="text-[10px] uppercase tracking-widest text-[#49AAFF] font-semibold mb-2">
                Tech Rider
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {riderItems.map((req, i) => {
                  const statusIcon =
                    req.status === "confirmed" ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                    ) : (req.status as string) === "rejected" ? (
                      <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                    ) : (
                      <HelpCircle className="w-3 h-3 text-white/40 shrink-0" />
                    );
                  return (
                    <div key={i} className="flex items-start gap-1.5">
                      {statusIcon}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1">
                          <span className="font-medium truncate">{req.item}</span>
                          {req.quantity > 1 && (
                            <span className="text-white/50 text-[10px]">×{req.quantity}</span>
                          )}
                        </div>
                        {req.category && (
                          <span className="text-white/40 text-[10px]">{req.category}</span>
                        )}
                        {req.notes && (
                          <p className="text-white/50 text-[10px] mt-0.5">{req.notes}</p>
                        )}
                        {req.organizerNotes && (
                          <p className="text-[#49AAFF]/80 text-[10px] mt-0.5 italic">{req.organizerNotes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {snapshot.techRider?.artistBrings && snapshot.techRider.artistBrings.length > 0 && (
                <>
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1.5">
                      Artist Brings
                    </p>
                    <div className="space-y-1">
                      {snapshot.techRider.artistBrings.map((item, i) => (
                        <div key={i} className="flex items-baseline gap-1">
                          <span className="text-white/70 truncate">{item.item}</span>
                          {item.quantity > 1 && (
                            <span className="text-white/40 text-[10px]">×{item.quantity}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// -- Chat Bubble ------------------------------------------------------------

function ChatBubble({
  msg,
  isMe,
  isAgent,
  wasFiltered,
  canRate,
  onRate,
}: {
  msg: any;
  isMe: boolean;
  isAgent: boolean;
  wasFiltered: boolean;
  canRate: boolean;
  onRate: (messageId: number, rating: "positive" | "negative") => void;
}) {
  const displayBody = msg.processedBody || msg.body;

  // Filtered message — amber inline notice, only visible to sender
  if (wasFiltered) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl px-3 py-2 max-w-[85%]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {msg.agentFilterReason || "Message refined for professional tone"}
          </span>
        </div>
      </div>
    );
  }

  // Agent message — centered, left blue border, italic
  if (isAgent) {
    return (
      <div className="flex justify-start my-1.5">
        <div className="flex flex-col gap-0.5 max-w-[85%]">
          <div
            className={cn(
              "rounded-[0_20px_20px_20px] px-3.5 py-2.5 text-sm leading-relaxed",
              "bg-[rgba(24,139,239,0.10)] border-l-[3px] border-l-[#188BEF]",
              "italic text-white/80",
            )}
          >
            <div className="flex items-center gap-1.5 mb-1 not-italic">
              <Bot className="w-3.5 h-3.5 text-[#49AAFF]" />
              <span className="text-[10px] font-medium text-[#49AAFF]">
                AI Assistant
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[13px]">{displayBody}</p>
          </div>
          {/* Timestamp + feedback */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-white/40">
              {msg.createdAt
                ? format(new Date(msg.createdAt), "h:mm a")
                : ""}
            </span>
            {canRate && (
              <div className="flex gap-1">
                <button
                  onClick={() => onRate(msg.id, "positive")}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3 text-white/40 hover:text-green-400" />
                </button>
                <button
                  onClick={() => onRate(msg.id, "negative")}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  <ThumbsDown className="w-3 h-3 text-white/40 hover:text-red-400" />
                </button>
              </div>
            )}
            {msg.feedbackRating === "positive" && (
              <ThumbsUp className="w-3 h-3 text-green-500" />
            )}
            {msg.feedbackRating === "negative" && (
              <ThumbsDown className="w-3 h-3 text-red-400" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal message — sent (right) or received (left)
  return (
    <div
      className={cn("flex mb-1.5", isMe ? "justify-end" : "justify-start")}
    >
      <div
        className={cn("flex flex-col gap-0.5 max-w-[78%]")}
      >
        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed",
            isMe
              ? "rounded-[20px_0_20px_20px] text-white"
              : "rounded-[0_20px_20px_20px] text-white/90",
            isMe
              ? "bg-gradient-to-b from-[#49AAFF] to-[#188BEF]"
              : "bg-[rgba(22,161,251,0.16)] border border-[rgba(115,189,236,0.21)]",
          )}
          style={
            isMe
              ? { backgroundImage: "linear-gradient(180deg, #49AAFF 0%, #188BEF 100%)" }
              : undefined
          }
        >
          <p className="whitespace-pre-wrap">{displayBody}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isMe ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-[10px] text-white/40">
            {msg.createdAt
              ? format(new Date(msg.createdAt), "h:mm a")
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// -- Counter Offer Inline ---------------------------------------------------

function CounterOfferInline({
  currentSnapshot,
  eventStages,
  event,
  isPending,
  onSubmit,
  onCancel,
}: {
  currentSnapshot: NegotiationSnapshot | null | undefined;
  eventStages: EventStage[];
  event: EventInfo;
  isPending: boolean;
  onSubmit: (snapshot: NegotiationSnapshot, note: string) => void;
  onCancel: () => void;
}) {
  const defaultAmount =
    currentSnapshot?.financial?.offerAmount?.toString() ?? "0";
  const defaultCurrency = currentSnapshot?.financial?.currency ?? "INR";

  const initialStageId = (() => {
    if (currentSnapshot?.schedule?.stageId)
      return String(currentSnapshot.schedule.stageId);
    if (eventStages.length === 1) return String(eventStages[0].id);
    if (eventStages.length === 0 && event) return "__event__";
    return "__none__";
  })();

  const [amount, setAmount] = useState(defaultAmount);
  const [selectedSlot, setSelectedSlot] = useState(initialStageId);
  const [note, setNote] = useState("");

  const hasSlotOptions = eventStages.length > 0 || event != null;

  const handleSubmit = () => {
    const snapshot = buildSnapshotFromForm(
      amount,
      selectedSlot,
      eventStages,
      event,
      currentSnapshot,
    );
    onSubmit(snapshot, note);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "mx-3 my-2 rounded-2xl p-3 space-y-2.5",
        "bg-[rgba(22,161,251,0.16)] border border-[rgba(115,189,236,0.21)]",
        "backdrop-blur-md",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5 text-[#49AAFF]" />
          Counter Offer
        </span>
        <button
          onClick={onCancel}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>

      <div className="flex gap-2">
        {/* Amount */}
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-white/50">
            Amount ({defaultCurrency})
          </Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 bg-white/5 border-[rgba(115,189,236,0.21)] text-sm text-white rounded-xl"
          />
        </div>

        {/* Slot */}
        {hasSlotOptions && (
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-white/50">Slot</Label>
            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
              <SelectTrigger className="h-8 bg-white/5 border-[rgba(115,189,236,0.21)] text-xs text-white rounded-xl">
                <SelectValue placeholder="Select slot..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No preference</SelectItem>
                {eventStages.map((stage) => (
                  <SelectItem key={stage.id} value={String(stage.id)}>
                    {stageOptionLabel(stage)}
                  </SelectItem>
                ))}
                {eventStages.length === 0 && event && (
                  <SelectItem value="__event__">
                    Full event \u2014{" "}
                    {format(new Date(event.startTime), "MMM d")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Note */}
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-8 min-h-[32px] text-xs bg-white/5 border-[rgba(115,189,236,0.21)] text-white rounded-xl resize-none"
        placeholder="Optional note..."
        rows={1}
      />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-white/20 text-white/70 hover:bg-white/10 rounded-xl"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 text-xs text-white rounded-xl"
          style={{
            backgroundImage:
              "linear-gradient(185.92deg, #49AAFF 55.63%, #188BEF 95.3%)",
          }}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Submit Offer"
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// -- Quick Actions ----------------------------------------------------------

function QuickActions({
  isTerminal,
  isMyTurn,
  canAccept,
  canEdit,
  canWalkAway,
  isPending,
  onAccept,
  onCounter,
  onWalkAway,
}: {
  isTerminal: boolean;
  isMyTurn: boolean;
  canAccept: boolean;
  canEdit: boolean;
  canWalkAway: boolean;
  isPending: boolean;
  onAccept: () => void;
  onCounter: () => void;
  onWalkAway: () => void;
}) {
  // Terminal states — no action buttons (banners in chat handle CTAs)
  if (isTerminal || !isMyTurn) return null;

  return (
    <div className="flex gap-2 px-3 py-2 shrink-0">
      {/* Accept */}
      {canAccept && (
        <Button
          className="flex-1 h-9 text-xs font-medium text-white rounded-xl"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #49AAFF 0%, #188BEF 100%)",
            boxShadow: "0px 8px 24px rgba(24, 139, 239, 0.35)",
          }}
          onClick={onAccept}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5 mr-1" />
              Accept
            </>
          )}
        </Button>
      )}

      {/* Counter */}
      {canEdit && (
        <Button
          variant="outline"
          className="flex-1 h-9 text-xs font-medium text-[#49AAFF] border-[rgba(115,189,236,0.21)] hover:bg-[rgba(24,139,239,0.10)] rounded-xl"
          onClick={onCounter}
          disabled={isPending}
        >
          Counter
        </Button>
      )}

      {/* Walk Away */}
      {canWalkAway && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs font-medium text-white/50 border-white/15 hover:bg-white/5 rounded-xl"
              disabled={isPending}
            >
              Walk Away
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Walk away from negotiation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the booking and end the negotiation
                permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={onWalkAway}
              >
                Walk Away
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// -- Input Bar --------------------------------------------------------------

function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  isSending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  isSending: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 shrink-0",
        "bg-[rgba(22,161,251,0.08)] border-t border-[rgba(115,189,236,0.21)]",
      )}
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Negotiation ended" : "Type a message..."}
        disabled={disabled}
        className={cn(
          "flex-1 h-10 text-sm text-white rounded-xl",
          "bg-white/5 border-[rgba(115,189,236,0.21)]",
          "placeholder:text-white/30",
          "focus-visible:ring-[#188BEF]/40",
        )}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim() || isSending}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
          "text-white transition-all duration-200",
          disabled || !value.trim()
            ? "bg-white/10 cursor-not-allowed opacity-40"
            : "cursor-pointer",
        )}
        style={
          !disabled && value.trim()
            ? {
                backgroundImage:
                  "linear-gradient(185.92deg, #49AAFF 55.63%, #188BEF 95.3%)",
                boxShadow: "0px 8px 24px rgba(24, 139, 239, 0.35)",
              }
            : undefined
        }
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NegotiationChat({
  booking,
  onClose,
  onOpenContract,
  onDismiss,
}: NegotiationChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Counter offer form toggle
  const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);

  // Track last action for toast label
  const lastActionRef = useRef<NegotiationActionInput["action"]>("edit");

  // -- Profile completion check -------------------------------------------
  const profileStatusEndpoint =
    user?.role === "artist"
      ? "/api/artists/profile/status"
      : user?.role === "organizer" || user?.role === "promoter"
        ? "/api/organizer/profile/status"
        : user?.role === "venue_manager" || user?.role === "venue"
          ? "/api/venues/profile/status"
          : null;

  const { data: profileStatus } = useQuery({
    queryKey: [profileStatusEndpoint],
    queryFn: async () => {
      const res = await fetch(profileStatusEndpoint!, {
        credentials: "include",
      });
      if (!res.ok) return { isComplete: true };
      return res.json();
    },
    enabled: !!profileStatusEndpoint && !!user,
    staleTime: 60000,
  });
  const isProfileComplete = profileStatus?.isComplete ?? true;

  // -- Ensure conversation exists (idempotent on mount) --------------------
  const [conversationReady, setConversationReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function ensureConversation() {
      try {
        await apiRequest(
          "POST",
          `/api/entities/booking/${booking.id}/conversation/negotiation/open`,
        );
        if (!cancelled) setConversationReady(true);
      } catch (err) {
        console.error("[NegotiationChat] Failed to open conversation:", err);
        if (!cancelled) setConversationReady(true);
      }
    }
    ensureConversation();
    return () => { cancelled = true; };
  }, [booking.id]);

  // -- Auto-start agent session (agent always mediates, direct chat forbidden) --
  useEffect(() => {
    if (!conversationReady) return;
    fetch(
      api.agents.negotiation.start.path.replace(":bookingId", booking.id.toString()),
      {
        method: api.agents.negotiation.start.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ strategy: "balanced" }),
      },
    ).catch(() => {
      // 409 = already active, 403 = auth issue — both non-critical
    });
  }, [conversationReady, booking.id]);

  // -- Negotiation summary (5s poll) --------------------------------------
  const summaryQueryKey = api.bookings.negotiationSummary.path.replace(
    ":id",
    booking.id.toString(),
  );
  const {
    data: summary,
    isLoading,
    refetch,
  } = useQuery<NegotiationSummaryResponseV2>({
    queryKey: [summaryQueryKey],
    queryFn: async () => {
      const res = await apiRequest(
        api.bookings.negotiationSummary.method,
        api.bookings.negotiationSummary.path.replace(
          ":id",
          booking.id.toString(),
        ),
      );
      return res.json();
    },
    refetchInterval: 5000,
    enabled: conversationReady,
  });

  // -- Chat messages (WebSocket) ------------------------------------------
  const conversationId = summary?.conversation?.id ?? null;
  const { data: chatMessages = [] } =
    useConversationMessages(conversationId);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // -- Send chat ----------------------------------------------------------
  const sendChatMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!conversationId) throw new Error("No conversation");
      const res = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/messages`,
        { body },
      );
      return res.json();
    },
    onSuccess: () => setChatMessage(""),
    onError: (err: any) =>
      toast({
        title: "Chat error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handleSendChat = useCallback(() => {
    if (!chatMessage.trim() || sendChatMutation.isPending) return;
    sendChatMutation.mutate(chatMessage.trim());
  }, [chatMessage, sendChatMutation]);

  // -- Message feedback ---------------------------------------------------
  const rateMessage = useCallback(
    async (messageId: number, rating: "positive" | "negative") => {
      if (!conversationId) return;
      try {
        await fetch(
          `/api/conversations/${conversationId}/messages/${messageId}/feedback`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ rating }),
          },
        );
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", conversationId, "messages"],
        });
      } catch {
        /* non-critical */
      }
    },
    [conversationId, queryClient],
  );

  // -- Negotiation actions ------------------------------------------------
  const actionMutation = useMutation({
    mutationFn: async (payload: NegotiationActionInput) => {
      lastActionRef.current = payload.action;
      const res = await apiRequest(
        api.bookings.negotiationAction.method,
        api.bookings.negotiationAction.path.replace(
          ":id",
          booking.id.toString(),
        ),
        payload,
      );
      return res.json();
    },
    onSuccess: () => {
      const action = lastActionRef.current;
      toast({
        title:
          action === "edit"
            ? "Proposal sent"
            : action === "accept"
              ? "Terms accepted!"
              : "Walked away",
      });
      setIsOfferFormOpen(false);
      queryClient.invalidateQueries({ queryKey: [summaryQueryKey] });
      queryClient.invalidateQueries({
        queryKey: [api.bookings.list.path],
      });
      queryClient.invalidateQueries({
        queryKey: [api.organizer.bookings.list.path],
      });
      refetch();
      if (action === "walkaway") onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message || "Action failed",
        variant: "destructive",
      }),
  });

  // -- Derived state ------------------------------------------------------
  const userRole = user?.role === "artist" ? "artist" : "organizer";

  // Deadline timer
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!summary) return;
    const deadlineSource =
      summary.stepDeadlineAt ?? summary.booking?.flowDeadlineAt ?? null;
    const isTerminalState = ["locked", "walked_away", "expired"].includes(
      summary.stepState ?? "",
    );
    if (!deadlineSource || isTerminalState) {
      setTimeLeft("");
      return;
    }
    const deadline = new Date(deadlineSource);
    const updateTime = () => {
      const now = new Date();
      if (now > deadline) {
        setTimeLeft("Expired");
        return;
      }
      const hours = differenceInHours(deadline, now);
      const minutes = differenceInMinutes(deadline, now) % 60;
      setTimeLeft(`${hours}h ${minutes}m`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [
    summary?.stepDeadlineAt,
    summary?.booking?.flowDeadlineAt,
    summary?.stepState,
  ]);

  // Turn derivations
  const isMyTurn =
    (summary?.whoseTurn === "artist" && userRole === "artist") ||
    (summary?.whoseTurn === "organizer" && userRole === "organizer");
  const availableActions = summary?.availableActions ?? [];
  const canEdit = availableActions.includes("edit") && isMyTurn;
  const canAccept = availableActions.includes("accept") && isMyTurn;
  const canWalkAway = availableActions.includes("walkaway") && isMyTurn;
  const stepState = summary?.stepState ?? "applied";
  const isTerminal = ["locked", "walked_away", "expired"].includes(stepState);
  const isLocked = stepState === "locked";
  const displaySnapshot =
    isLocked && summary?.lockedTerms
      ? summary.lockedTerms
      : (summary?.currentProposal?.snapshot ?? null);
  const otherPartyLabel = userRole === "artist" ? "organizer" : "artist";

  // Other party name for header
  const otherPartyName =
    userRole === "artist"
      ? booking.organizer?.organizationName ||
        booking.organizer?.name ||
        "Organizer"
      : booking.artist?.stageName ||
        booking.artist?.name ||
        "Artist";

  // Event data for offer form
  const eventStages: EventStage[] = summary?.eventStages ?? [];
  const bookingEvent = booking.event ?? null;
  const eventInfo: EventInfo = bookingEvent
    ? {
        title: bookingEvent.title,
        startTime: bookingEvent.startTime,
        endTime: bookingEvent.endTime ?? null,
      }
    : null;

  // -- Loading state (rendered inside the portal) -------------------------
  // -- Profile gate (rendered inside the portal) --------------------------

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // -- Render via portal --------------------------------------------------
  const portalContent = (
    <AnimatePresence>
      {/* Floating popup panel — no backdrop, non-blocking */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className={cn(
          "fixed z-[9999] flex flex-col overflow-hidden",
          isMobile
            ? "inset-0 rounded-none"
            : "bottom-6 right-6 rounded-[20px]",
          !isMobile && "w-[400px] max-h-[720px] min-h-[480px]",
        )}
        style={{
          background:
            "linear-gradient(180deg, rgba(14, 28, 54, 0.97) 0%, rgba(8, 18, 38, 0.99) 100%)",
          border: "1.36px solid rgba(255, 255, 255, 0.14)",
          boxShadow:
            "0 8px 40px rgba(0, 0, 0, 0.4), 0 0 80px rgba(24, 139, 239, 0.12)",
          ...(isMobile ? {} : { height: "min(720px, calc(100vh - 48px))" }),
        }}
      >
        {/* ============================================================= */}
        {/* HEADER                                                         */}
        {/* ============================================================= */}
        <header
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #49AAFF 0%, #188BEF 100%)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white text-sm font-bold">
              {getInitials(otherPartyName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">
                {otherPartyName}
              </h2>
              <p className="text-[11px] text-white/70 truncate">
                Round {(summary?.currentStep ?? 0) + 1} of{" "}
                {summary?.maxSteps ?? 4}
                {" \u00B7 "}
                {booking.event?.title || "Negotiation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Deadline timer */}
            {timeLeft && (
              <div className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1">
                <Clock className="w-3 h-3 text-white/80" />
                <span className="text-[11px] text-white/90 font-medium">
                  {timeLeft}
                </span>
              </div>
            )}

            {/* Minimize button — hides popup, keeps FAB */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              title="Minimize"
            >
              <Minus className="w-4 h-4 text-white" />
            </button>

            {/* Dismiss button — fully closes chat */}
            <button
              onClick={onDismiss ?? onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-red-500/40 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </header>

        {/* ============================================================= */}
        {/* LOADING / PROFILE GATE                                        */}
        {/* ============================================================= */}
        {(isLoading || !summary) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#49AAFF]" />
              <p className="text-sm text-white/50">
                Loading negotiation...
              </p>
            </div>
          </div>
        )}

        {!isLoading && summary && !isProfileComplete && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(24,139,239,0.10)] flex items-center justify-center">
                <Info className="w-6 h-6 text-[#49AAFF]" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Complete Your Profile
              </h3>
              <p className="text-white/50 text-sm">
                Complete your profile to participate in negotiations.
              </p>
              <div className="flex gap-2">
                <Button
                  className="text-white rounded-xl"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, #49AAFF 0%, #188BEF 100%)",
                  }}
                  onClick={() => {
                    const setupPath =
                      user?.role === "artist"
                        ? "/profile/setup"
                        : user?.role === "organizer" ||
                            user?.role === "promoter"
                          ? "/organizer/setup"
                          : "/venue/setup";
                    onClose();
                    setLocation(setupPath);
                  }}
                >
                  Complete Profile
                </Button>
                <Button
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MAIN CONTENT (visible after loading + profile check)          */}
        {/* ============================================================= */}
        {!isLoading && summary && isProfileComplete && (
          <>
            {/* Status badge row */}
            <div className="flex items-center justify-center py-2 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] py-0.5 px-3 rounded-full",
                  isLocked &&
                    "border-green-500/40 text-green-400 bg-green-500/10",
                  stepState === "walked_away" &&
                    "border-red-500/40 text-red-400 bg-red-500/10",
                  stepState === "expired" &&
                    "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
                  !isTerminal &&
                    isMyTurn &&
                    "border-[#188BEF]/40 text-[#49AAFF] bg-[rgba(24,139,239,0.10)]",
                  !isTerminal &&
                    !isMyTurn &&
                    "border-white/20 text-white/50",
                )}
              >
                {isLocked
                  ? "Terms Agreed"
                  : stepState === "walked_away"
                    ? "Walked Away"
                    : stepState === "expired"
                      ? "Expired"
                      : isMyTurn
                        ? "Your Turn"
                        : `Waiting for ${otherPartyLabel}`}
              </Badge>
            </div>

            {/* PROPOSAL CARD */}
            <ProposalCard snapshot={displaySnapshot} />

            {/* MESSAGES */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-3 py-2 space-y-1">
                {/* Date header */}
                {bookingEvent?.startTime && (
                  <div className="text-center py-2">
                    <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-3 py-1">
                      {format(
                        new Date(bookingEvent.startTime),
                        "EEEE, MMMM d",
                      )}
                    </span>
                  </div>
                )}

                {/* Chat messages */}
                {chatMessages.map((msg: any) => {
                  const isAgent =
                    msg.isAgentGenerated ||
                    (msg.messageType || "").startsWith("agent");
                  const isMe = msg.senderId === user?.id && !isAgent;
                  const wasFiltered = msg.agentFilterAction === "filter";
                  const canRate = isAgent && !msg.feedbackRating;

                  // Filtered messages only visible to sender
                  if (wasFiltered && msg.senderId !== user?.id) return null;

                  return (
                    <ChatBubble
                      key={msg.id}
                      msg={msg}
                      isMe={isMe}
                      isAgent={isAgent}
                      wasFiltered={wasFiltered}
                      canRate={canRate}
                      onRate={rateMessage}
                    />
                  );
                })}

                {/* Terminal state banners */}
                {isLocked && (
                  <div className="my-4 mx-2">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                        <Check className="w-4 h-4" />
                        Terms Agreed — Contract Ready
                      </div>
                      {displaySnapshot?.financial && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-white/40 text-[10px]">Fee</p>
                            <p className="text-white font-mono font-semibold">
                              {"\u20B9"}{Number(displaySnapshot.financial.offerAmount || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          {displaySnapshot.schedule?.stageName && (
                            <div>
                              <p className="text-white/40 text-[10px]">Slot</p>
                              <p className="text-white">{displaySnapshot.schedule.stageName}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs text-white rounded-xl gap-1.5"
                        style={{
                          backgroundImage: "linear-gradient(180deg, #49AAFF 0%, #188BEF 100%)",
                          boxShadow: "0px 4px 16px rgba(24, 139, 239, 0.35)",
                        }}
                        onClick={onOpenContract}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Generate Contract
                      </Button>
                    </div>
                  </div>
                )}
                {/* If booking is confirmed (contract signed) */}
                {["confirmed", "paid_deposit", "scheduled", "completed"].includes(booking.status || "") && (
                  <div className="my-4 mx-2">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                        <Check className="w-4 h-4" />
                        Booking Confirmed — Contract Signed
                      </div>
                    </div>
                  </div>
                )}

                {/* If booking is already in contracting state (contract exists, needs review/signing) */}
                {!isLocked && booking.status === "contracting" && (
                  <div className="my-4 mx-2">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-purple-400 text-xs font-medium">
                        <FileText className="w-4 h-4" />
                        Contract In Progress
                      </div>
                      <p className="text-white/60 text-xs">
                        The contract has been generated and is awaiting review and signatures.
                      </p>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs text-white rounded-xl gap-1.5 bg-purple-600 hover:bg-purple-700"
                        onClick={onOpenContract}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Open Contract
                      </Button>
                    </div>
                  </div>
                )}
                {stepState === "walked_away" && (
                  <div className="flex justify-center my-4">
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-xs">
                      <LogOut className="w-4 h-4" />
                      Negotiation ended \u2014 a party walked away.
                    </div>
                  </div>
                )}
                {stepState === "expired" && (
                  <div className="flex justify-center my-4">
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-4 py-2 text-xs">
                      <Clock className="w-4 h-4" />
                      Negotiation expired \u2014 deadline passed.
                    </div>
                  </div>
                )}

                {/* Counter offer inline form */}
                <AnimatePresence>
                  {isOfferFormOpen && (
                    <CounterOfferInline
                      currentSnapshot={displaySnapshot}
                      eventStages={eventStages}
                      event={eventInfo}
                      isPending={actionMutation.isPending}
                      onSubmit={(snapshot, note) => {
                        actionMutation.mutate({
                          action: "edit",
                          snapshot,
                          note,
                        });
                      }}
                      onCancel={() => setIsOfferFormOpen(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Agent thinking indicator — visible while message is being processed */}
                {sendChatMutation.isPending && (
                  <div className="flex justify-start my-1.5 px-1">
                    <div className="flex items-center gap-2 rounded-[0_20px_20px_20px] px-3.5 py-2.5 bg-[rgba(24,139,239,0.10)] border-l-[3px] border-l-[#188BEF]">
                      <Bot className="w-3.5 h-3.5 text-[#49AAFF] shrink-0" />
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#49AAFF] animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#49AAFF] animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#49AAFF] animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* QUICK ACTIONS */}
            <QuickActions
              isTerminal={isTerminal}
              isMyTurn={isMyTurn}
              canAccept={canAccept}
              canEdit={canEdit}
              canWalkAway={canWalkAway}
              isPending={actionMutation.isPending}
              onAccept={() => actionMutation.mutate({ action: "accept" })}
              onCounter={() => {
                setIsOfferFormOpen(true);
                setTimeout(() => {
                  chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              onWalkAway={() =>
                actionMutation.mutate({ action: "walkaway" })
              }
            />

            {/* INPUT BAR */}
            {!isTerminal && (
              <InputBar
                value={chatMessage}
                onChange={setChatMessage}
                onSubmit={handleSendChat}
                disabled={isTerminal}
                isSending={sendChatMutation.isPending}
              />
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(portalContent, document.body);
}
