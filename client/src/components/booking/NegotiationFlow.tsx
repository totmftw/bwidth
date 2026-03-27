import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import {
  Check, CheckCheck, X, ChevronUp, ChevronDown,
  IndianRupee, ThumbsUp, ThumbsDown, ArrowLeftRight,
  Loader2, Clock, Info, Lock, FileText, LogOut,
  CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface NegotiationFlowProps {
  booking: any;
  onClose: () => void;
  onStartContract?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: any, currency = "INR") {
  const num = Number(amount);
  if (isNaN(num)) return `${currency} —`;
  return `₹${num.toLocaleString("en-IN")}`;
}

function TimeStamp({ ts }: { ts: string }) {
  try {
    return (
      <span className="text-[10px] opacity-50 select-none">
        {format(new Date(ts), "MMM d, h:mm a")}
      </span>
    );
  } catch {
    return null;
  }
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, currency }: { msg: any; isMe: boolean; currency: string }) {
  const payload = msg.payload || {};

  if (msg.messageType === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-1.5 bg-muted/40 text-muted-foreground text-xs px-4 py-1.5 rounded-full max-w-[90%] text-center">
          <Info className="w-3 h-3 shrink-0" />
          <span>{msg.body}</span>
        </div>
      </div>
    );
  }

  const actionLabels: Record<string, { label: string; icon: any; color: string }> = {
    PROPOSE_COST: { label: "💰 Counter Offer", icon: ArrowLeftRight, color: "text-purple-400" },
    PROPOSE_SLOT: { label: "🕐 Slot Change", icon: CalendarClock, color: "text-blue-400" },
    PROPOSE_RIDER: { label: "🎸 Tech Rider Update", icon: FileText, color: "text-amber-400" },
    PROPOSE_CHANGE: { label: "💰 Counter Offer", icon: ArrowLeftRight, color: "text-purple-400" },
    ACCEPT: { label: "✅ Accepted", icon: ThumbsUp, color: "text-green-400" },
    WALK_AWAY: { label: "❌ Walked Away", icon: LogOut, color: "text-red-400" },
    DECLINE: { label: "❌ Declined", icon: ThumbsDown, color: "text-red-400" },
  };

  const meta = actionLabels[msg.actionKey] || null;
  const senderName = payload.senderName || (isMe ? "You" : "Other");

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3 px-3`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
          ${isMe
            ? "bg-violet-600 text-white rounded-br-md"
            : "bg-muted/60 text-foreground rounded-bl-md border border-border/40"}
        `}
      >
        {/* Sender name */}
        <p className={`text-[11px] font-bold mb-1 ${isMe ? "text-violet-200" : "text-primary"}`}>
          {isMe ? "You" : senderName}
        </p>

        {/* Action label */}
        {meta && (
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-2 ${isMe ? "text-violet-200" : meta.color}`}>
            {meta.label}
          </div>
        )}

        {/* Offer amount chip */}
        {payload.offerAmount && (
          <div className={`
            inline-flex items-center gap-1 rounded-lg px-3 py-1.5 mb-2 font-mono font-bold text-base
            ${isMe ? "bg-white/15" : "bg-primary/10 text-primary"}
          `}>
            <IndianRupee className="w-4 h-4" />
            {Number(payload.offerAmount).toLocaleString("en-IN")}
          </div>
        )}

        {/* Slot time chip */}
        {payload.slotTime && (
          <div className={`
            inline-flex items-center gap-1 rounded-lg px-3 py-1.5 mb-2 font-semibold text-sm
            ${isMe ? "bg-white/15" : "bg-blue-500/10 text-blue-400"}
          `}>
            <CalendarClock className="w-4 h-4" />
            {payload.slotTime}
          </div>
        )}

        {/* Tech Rider chip */}
        {(payload.providedEquipment?.length > 0 || payload.requestedEquipment?.length > 0) && (
          <div className={`
            flex flex-col gap-2 rounded-lg px-3 py-2 mb-2 text-sm
            ${isMe ? "bg-white/10" : "bg-amber-500/10 text-amber-500"}
          `}>
            {payload.providedEquipment?.length > 0 && (
              <div>
                <span className="font-semibold text-xs opacity-80 uppercase tracking-wider block mb-1">Provided by Organizer</span>
                <ul className="list-disc list-inside pl-2">
                  {payload.providedEquipment.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {payload.requestedEquipment?.length > 0 && (
              <div>
                <span className="font-semibold text-xs opacity-80 uppercase tracking-wider block mb-1">Requested by Artist</span>
                <ul className="list-disc list-inside pl-2">
                  {payload.requestedEquipment.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Note / body */}
        {(msg.body || payload.note) && (
          <p className={`text-sm leading-relaxed ${isMe ? "text-violet-100" : "text-foreground/80"}`}>
            {msg.body || payload.note}
          </p>
        )}

        {/* Timestamp row */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <TimeStamp ts={msg.createdAt} />
          {isMe && (
            <CheckCheck className="w-3.5 h-3.5 text-violet-300 ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rider Update Sheet ─────────────────────────────────────────────────────

function RiderUpdateSheet({ current, onConfirm, onCancel, isPending }: any) {
  const [provided, setProvided] = useState(current?.providedEquipment?.join("\n") || "");
  const [requested, setRequested] = useState(current?.requestedEquipment?.join("\n") || "");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    onConfirm({
      providedEquipment: provided.split("\n").map((s: string) => s.trim()).filter(Boolean),
      requestedEquipment: requested.split("\n").map((s: string) => s.trim()).filter(Boolean),
      note: note.trim()
    });
  };

  return (
    <div className="border-t bg-card px-4 py-4 animate-in slide-in-from-bottom-2 shrink-0">
      <h3 className="font-semibold text-sm mb-3">Update Tech Rider</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Equipment Provided by Organizer</label>
          <Textarea
            placeholder="E.g., PA System, 2x Mics..."
            value={provided}
            onChange={(e) => setProvided(e.target.value)}
            className="h-20 resize-none text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Equipment Requested by Artist</label>
          <Textarea
            placeholder="E.g., Pioneer CDJ-3000, specific monitors..."
            value={requested}
            onChange={(e) => setRequested(e.target.value)}
            className="h-20 resize-none text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Note (Optional)</label>
          <Input
            placeholder="Why the change?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1 h-10" disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1 h-10 bg-amber-600 hover:bg-amber-700" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Update"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Counter Cost Sheet ─────────────────────────────────────────────────────

function CounterCostSheet({
  booking,
  remainingRounds,
  onSubmit,
  onCancel,
  isPending,
}: {
  booking: any;
  remainingRounds: number;
  onSubmit: (data: { offerAmount: number; note: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [amount, setAmount] = useState(String(Number(booking.offerAmount)));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSend = () => {
    const num = Number(amount);
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }
    onSubmit({ offerAmount: num, note });
  };

  return (
    <div className="border-t bg-card/95 backdrop-blur-sm p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm">💰 Counter Offer</span>
          <span className="text-xs text-muted-foreground ml-2">({remainingRounds} remaining)</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="number"
          className="pl-8 text-base font-mono h-12"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(""); }}
          placeholder="Amount"
          inputMode="numeric"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground ml-1">Add a note (Optional)</Label>
        <Textarea
          className="resize-none text-sm min-h-[70px]"
          placeholder="Explain your offer…"
          value={note}
          onChange={e => { setNote(e.target.value); setError(""); }}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        className="w-full h-12 text-base font-semibold bg-violet-600 hover:bg-violet-700"
        onClick={handleSend}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
        Send Counter Offer
      </Button>
    </div>
  );
}

// ─── Slot Change Sheet ──────────────────────────────────────────────────────

function SlotChangeSheet({
  currentSlot,
  remainingRounds,
  onSubmit,
  onCancel,
  isPending,
}: {
  currentSlot: string;
  remainingRounds: number;
  onSubmit: (data: { slotTime: string; note: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [slotTime, setSlotTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSend = () => {
    if (!slotTime.trim()) { setError("Enter a valid time slot"); return; }
    onSubmit({ slotTime, note });
  };

  return (
    <div className="border-t bg-card/95 backdrop-blur-sm p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm">🕐 Change Time Slot</span>
          <span className="text-xs text-muted-foreground ml-2">({remainingRounds} remaining)</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Current slot: <span className="font-medium text-foreground">{currentSlot || "TBD"}</span>
      </div>

      <Input
        className="text-base h-12"
        value={slotTime}
        onChange={e => { setSlotTime(e.target.value); setError(""); }}
        placeholder="e.g. 8:00 PM - 10:00 PM"
        autoFocus
      />

      <Textarea
        className="resize-none text-sm min-h-[60px]"
        placeholder="Optional: reason for slot change…"
        value={note}
        onChange={e => { setNote(e.target.value); setError(""); }}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
        onClick={handleSend}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarClock className="w-4 h-4 mr-2" />}
        Propose Slot Change
      </Button>
    </div>
  );
}

// ─── Walk Away Confirm Sheet ────────────────────────────────────────────────

function WalkAwaySheet({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="border-t bg-card/95 backdrop-blur-sm p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-destructive">Walk Away from Deal</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">This will cancel the booking. Are you sure?</p>
      <Textarea
        className="resize-none text-sm min-h-[60px]"
        placeholder="Optional: reason for walking away…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12" onClick={onCancel}>Cancel</Button>
        <Button
          variant="destructive"
          className="h-12 font-semibold"
          onClick={() => onConfirm(note)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Walk Away"}
        </Button>
      </div>
    </div>
  );
}

// ─── Contract Terms Sheet ───────────────────────────────────────────────────

function ContractTermsSheet({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: (terms: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [terms, setTerms] = useState({
    travel: { flightClass: "economy", flightPreference: "", routing: "" },
    accommodation: { hotelStarRating: "3", roomType: "private room" },
    hospitality: { perDiem: 0, guestListCount: 2 },
  });

  return (
    <div className="border-t bg-card/95 backdrop-blur-sm p-4 space-y-4 animate-in slide-in-from-bottom-4 duration-200 h-96 overflow-y-auto">
      <div className="flex items-center justify-between sticky top-0 bg-card/95 pb-2 z-10">
        <span className="font-semibold text-sm text-emerald-500">Configure Contract Terms</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <Label className="text-xs text-primary">Travel & Flights</Label>
          <Input 
            placeholder="e.g. Business Class" 
            value={terms.travel.flightClass}
            onChange={e => setTerms({...terms, travel: {...terms.travel, flightClass: e.target.value}})} 
          />
          <Input 
            placeholder="Airline Preference (e.g. Star Alliance)" 
            value={terms.travel.flightPreference}
            onChange={e => setTerms({...terms, travel: {...terms.travel, flightPreference: e.target.value}})} 
          />
          <Input 
            placeholder="Routing Requirements (e.g. Direct only via BOM)" 
            value={terms.travel.routing}
            onChange={e => setTerms({...terms, travel: {...terms.travel, routing: e.target.value}})} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-primary">Accommodation</Label>
          <div className="flex gap-2">
            <Input 
              type="number" placeholder="Star Rating (e.g. 5)" min="1" max="5"
              value={terms.accommodation.hotelStarRating}
              onChange={e => setTerms({...terms, accommodation: {...terms.accommodation, hotelStarRating: e.target.value}})} 
            />
            <Input 
              placeholder="Room Type" 
              value={terms.accommodation.roomType}
              onChange={e => setTerms({...terms, accommodation: {...terms.accommodation, roomType: e.target.value}})} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-primary">Hospitality</Label>
          <div className="flex gap-2">
            <Input 
              type="number" placeholder="Per Diem (€/₹)" 
              value={terms.hospitality.perDiem}
              onChange={e => setTerms({...terms, hospitality: {...terms.hospitality, perDiem: Number(e.target.value)}})} 
            />
            <Input 
              type="number" placeholder="Guest List Count" 
              value={terms.hospitality.guestListCount}
              onChange={e => setTerms({...terms, hospitality: {...terms.hospitality, guestListCount: Number(e.target.value)}})} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4 sticky bottom-0 bg-card/95">
        <Button variant="outline" className="h-12" onClick={onCancel}>Cancel</Button>
        <Button
          className="h-12 font-semibold bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onConfirm(terms)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize & Accept"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function NegotiationFlow({ booking, onClose, onStartContract }: NegotiationFlowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sheet, setSheet] = useState<"cost" | "slot" | "rider" | "walkaway" | "terms" | null>(null);
  const [, navigate] = useLocation();

  // 1. Open / retrieve conversation
  const { mutate: openConvo, isPending: isOpening } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/entities/booking/${booking.id}/conversation/negotiation/open`
      );
      return res.json();
    },
    onSuccess: (data) => setConversationId(data.id),
    onError: () => toast({ title: "Could not open negotiation", variant: "destructive" }),
  });

  useEffect(() => { openConvo(); }, [booking.id]);

  // 2. Conversation + workflow state (poll every 4s)
  const { data: conversation } = useQuery<any>({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  // 3. Messages (poll every 4s)
  const { data: messages = [], isLoading: loadingMsgs } = useQuery<any[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // 4. Perform action mutation
  const { mutate: act, isPending: isActing } = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/actions`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizer/bookings`] });
      setSheet(null);
    },
    onError: (err: any) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const handleAction = (actionKey: string, inputs: any = {}) => {
    act({ actionKey, clientMsgId: crypto.randomUUID(), inputs });
  };

  // Derive state from workflow
  const wf = conversation?.workflowInstance;
  const ctx = (wf?.context as any) || {};
  const isCostMyTurn = ctx.costAwaitingUserId === user?.id;
  const isSlotMyTurn = ctx.slotAwaitingUserId === user?.id;
  const isTerminal = wf && ["ACCEPTED", "DECLINED"].includes(wf.currentNodeKey);
  const currentOffer = formatCurrency(booking.offerAmount, booking.offerCurrency);

  // Determine actor's role and remaining rounds
  const isArtist = user?.id === ctx.artistUserId;
  const myRole = isArtist ? "artist" : "organizer";
  const costKey = isArtist ? "costRoundsArtist" : "costRoundsOrganizer";
  const slotKey = isArtist ? "slotRoundsArtist" : "slotRoundsOrganizer";
  const myCostRoundsUsed = ctx[costKey] || 0;
  const mySlotRoundsUsed = ctx[slotKey] || 0;
  const costRemaining = Math.max(0, 2 - myCostRoundsUsed);
  const slotRemaining = Math.max(0, 1 - mySlotRoundsUsed);
  const costLocked = ctx.costLocked || false;
  const slotLocked = ctx.slotLocked || false;

  const counterName = isArtist
    ? (ctx.organizerName || booking.organizer?.organizationName || booking.organizer?.name || "Organizer")
    : (ctx.artistName || booking.artist?.stageName || booking.artist?.name || "Artist");

  return (
    <div className="flex flex-col w-full h-full bg-background" style={{ maxHeight: "100%" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm truncate">
              {ctx.artistName || "Artist"} ↔ {ctx.organizerName || "Organizer"}
            </h2>
            {isTerminal && (
              <Badge variant={wf.currentNodeKey === "ACCEPTED" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0 shrink-0">
                {wf.currentNodeKey === "ACCEPTED" ? "✅ Agreed" : "❌ Cancelled"}
              </Badge>
            )}
          </div>
          {/* Lock status + current terms */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{currentOffer}</span>
            {ctx.currentSlot && (
              <span className="text-xs text-muted-foreground">• {ctx.currentSlot}</span>
            )}
            {costLocked && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                <Lock className="w-2.5 h-2.5 mr-0.5" />Cost Locked
              </Badge>
            )}
            {slotLocked && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30">
                <Lock className="w-2.5 h-2.5 mr-0.5" />Slot Locked
              </Badge>
            )}
            {ctx.riderLocked && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                <Lock className="w-2.5 h-2.5 mr-0.5" />Rider Locked
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 overflow-y-auto py-3" style={{ overscrollBehavior: "contain" }}>
        {(isOpening || loadingMsgs) && !conversationId ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Initial context bubble */}
            <div className="flex justify-center mb-4">
              <div className="text-center text-xs text-muted-foreground px-4 py-2 bg-muted/30 rounded-xl max-w-xs">
                <span className="font-medium">Negotiation started</span>
                <br />
                Initial offer: <span className="font-semibold text-foreground">{currentOffer}</span>
                {ctx.currentSlot && (
                  <>
                    <br />
                    Slot: <span className="font-semibold text-foreground">{ctx.currentSlot}</span>
                  </>
                )}
                <br />
                <span className="text-[10px] opacity-60">
                  Each party: 2 cost negotiations, 1 slot change
                </span>
              </div>
            </div>

            {/* Messages */}
            {messages
              .filter((m: any) => m.messageType !== "system" || m.body)
              .map((msg: any, i: number) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <MessageBubble
                    key={msg.id ?? i}
                    msg={msg}
                    isMe={isMe}
                    currency={booking.offerCurrency}
                  />
                );
              })}

            {/* "Waiting" indicator */}
            {!isTerminal && conversationId && !isCostMyTurn && !isSlotMyTurn && (
              <div className="flex items-center gap-2 px-4 mt-3 text-muted-foreground">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs">{counterName} is reviewing…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Bottom Action Bar ── */}
      {!isTerminal && conversationId && (
        <>
          {sheet === "cost" && (
            <CounterCostSheet
              booking={booking}
              remainingRounds={costRemaining}
              onSubmit={(data) => handleAction("PROPOSE_COST", { offerAmount: data.offerAmount, note: data.note })}
              onCancel={() => setSheet(null)}
              isPending={isActing}
            />
          )}

          {sheet === "slot" && (
            <SlotChangeSheet
              currentSlot={ctx.currentSlot || ""}
              remainingRounds={slotRemaining}
              onSubmit={(data) => handleAction("PROPOSE_SLOT", { slotTime: data.slotTime, note: data.note })}
              onCancel={() => setSheet(null)}
              isPending={isActing}
            />
          )}

          {sheet === "rider" && (
            <RiderUpdateSheet
              current={ctx.currentRider}
              onConfirm={(payload: any) => handleAction("PROPOSE_RIDER", payload)}
              onCancel={() => setSheet(null)}
              isPending={isActing}
            />
          )}

          {sheet === "walkaway" && (
            <WalkAwaySheet
              onConfirm={(note) => handleAction("WALK_AWAY", { note })}
              onCancel={() => setSheet(null)}
              isPending={isActing}
            />
          )}

          {sheet === "terms" && (
            <ContractTermsSheet
              onConfirm={(terms) => handleAction("ACCEPT", { terms })}
              onCancel={() => setSheet(null)}
              isPending={isActing}
            />
          )}

          {!sheet && (
            <div className="border-t bg-card/90 backdrop-blur-sm px-4 py-3 shrink-0">
                <div className="space-y-2">
                  {/* Negotiation actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="h-12 font-medium rounded-xl border-violet-500/40 text-violet-400 hover:bg-violet-500/10 flex-col gap-0 py-1"
                      onClick={() => setSheet("cost")}
                      disabled={isActing || costLocked || costRemaining <= 0 || !isCostMyTurn}
                    >
                      <span className="text-xs">💰 Cost</span>
                      <span className="text-[9px] text-muted-foreground">
                        {costLocked ? "Locked" : !isCostMyTurn ? "Waiting" : `${costRemaining}/2 left`}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 font-medium rounded-xl border-blue-500/40 text-blue-400 hover:bg-blue-500/10 flex-col gap-0 py-1"
                      onClick={() => setSheet("slot")}
                      disabled={isActing || slotLocked || slotRemaining <= 0 || !isSlotMyTurn}
                    >
                      <span className="text-xs">🕐 Slot</span>
                      <span className="text-[9px] text-muted-foreground">
                        {slotLocked ? "Locked" : !isSlotMyTurn ? "Waiting" : `${slotRemaining}/1 left`}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 font-medium rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex-col gap-0 py-1"
                      onClick={() => setSheet("rider")}
                      disabled={isActing || ctx.riderLocked}
                    >
                      <span className="text-xs">🎸 Rider</span>
                      <span className="text-[9px] text-muted-foreground">
                        {ctx.riderLocked ? "Locked" : `Update`}
                      </span>
                    </Button>
                  </div>

                  {/* Primary: Accept */}
                  <Button
                    className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    onClick={() => setSheet("terms")}
                    disabled={isActing}
                  >
                    {isActing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-5 h-5 mr-2" />}
                    Configure Terms & Accept
                  </Button>

                  {/* Walk Away */}
                  <Button
                    variant="ghost"
                    className="w-full h-10 text-sm font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => setSheet("walkaway")}
                    disabled={isActing}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Walk Away
                  </Button>
                </div>
            </div>
          )}
        </>
      )}

      {/* ── Terminal State Banner ── */}
      {isTerminal && (
        <div className={`border-t px-4 py-5 shrink-0 ${
          wf.currentNodeKey === "ACCEPTED" ? "bg-emerald-500/10" : "bg-destructive/10"
        }`}>
          {wf.currentNodeKey === "ACCEPTED" ? (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-emerald-400 font-bold text-base">🎉 Deal Agreed!</p>
                <p className="text-emerald-400/70 text-sm mt-1">
                  {currentOffer} {ctx.currentSlot ? `• ${ctx.currentSlot}` : ""}
                </p>
              </div>
              <Button
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
                onClick={() => {
                  if (onStartContract) {
                    onStartContract();
                  } else {
                    navigate(`/contract/${booking.id}`);
                  }
                }}
              >
                <FileText className="w-5 h-5 mr-2" />
                Start Contract →
              </Button>
            </div>
          ) : (
            <p className="text-destructive font-semibold text-sm text-center">Negotiation ended. Booking cancelled.</p>
          )}
        </div>
      )}
    </div>
  );
}
