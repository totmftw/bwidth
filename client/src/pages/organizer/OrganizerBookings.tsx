/**
 * OrganizerBookings — Full booking management page for the Organizer role.
 *
 * Architecture:
 *   OrganizerBookings (list + tab filtering)
 *     └─ BookingDetail (single booking deep-dive, fetched by ID)
 *          ├─ NegotiationDisplay  — round tracker, offer comparison, history (Task 11.2)
 *          ├─ ContractSection     — contract status + sign/view CTA (Task 11.3)
 *          ├─ PaymentTimeline     — milestone-based payment breakdown (Task 11.4)
 *          └─ CompletionConfirmation — post-event rating + confirm form (Task 11.5)
 *
 * Data hooks (from use-organizer-bookings.ts):
 *   useOrganizerBookings(status?) — list query, optional status filter
 *   useOrganizerBooking(id)       — single booking detail query
 *   useCompleteBooking()          — mutation for POST /api/organizer/bookings/:id/complete
 *
 * Shared components reused from client/src/components/booking/:
 *   ContractViewer, NegotiationFlow, OfferComparison
 */
import { useState } from "react";
import { useOrganizerBookings, useOrganizerBooking, useCompleteBooking } from "@/hooks/use-organizer-bookings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  CreditCard,
  Star,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ContractViewer } from "@/components/booking/ContractViewer";
import { NegotiationFlow } from "@/components/booking/NegotiationFlow";
import { OfferComparison } from "@/components/booking/OfferComparison";

/**
 * Union of all possible booking statuses in the platform lifecycle.
 * Matches the booking status enum defined in shared/schema.ts.
 */
type BookingStatus = "inquiry" | "offered" | "negotiating" | "contracting" | "confirmed" | "paid_deposit" | "scheduled" | "completed" | "cancelled";

/**
 * Visual configuration for each booking status — maps status to a Badge variant,
 * Lucide icon component, and human-readable label.
 */
const STATUS_CONFIG: Record<BookingStatus, { variant: any; icon: any; label: string }> = {
  inquiry: { variant: "secondary", icon: AlertCircle, label: "Inquiry" },
  offered: { variant: "outline", icon: Clock, label: "Offered" },
  negotiating: { variant: "default", icon: MessageSquare, label: "Negotiating" },
  contracting: { variant: "default", icon: FileText, label: "Contracting" },
  confirmed: { variant: "default", icon: CheckCircle, label: "Confirmed" },
  paid_deposit: { variant: "default", icon: CreditCard, label: "Deposit Paid" },
  scheduled: { variant: "default", icon: Calendar, label: "Scheduled" },
  completed: { variant: "default", icon: CheckCircle, label: "Completed" },
  cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
};

/** Renders a colored Badge with icon for a given booking status. */
function StatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inquiry;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// ─── Negotiation Display (Task 11.2) ────────────────────────────────────────

/**
 * NegotiationDisplay — Shows the current negotiation state for a booking.
 *
 * Renders:
 *  - Round counter (current / max of 3)
 *  - Side-by-side offer comparison (original vs latest) via OfferComparison
 *  - Chronological negotiation history timeline
 *  - "Open Negotiation" CTA when counter-offers are still allowed
 *  - Warning banner when max rounds are exhausted
 *
 * @param booking            - Enriched booking object from the API
 * @param onOpenNegotiation  - Callback to switch BookingDetail into negotiation mode
 */
function NegotiationDisplay({ booking, onOpenNegotiation }: { booking: any; onOpenNegotiation: () => void }) {
  const meta = booking.meta || {};
  const history = meta.history || [];
  const round = meta.negotiationRound || 0;
  // Platform enforces a maximum of 3 negotiation rounds (see design doc §7)
  const maxRounds = 3;
  // Counter-offers are only allowed when rounds remain AND booking is in a negotiable status
  const canCounter = round < maxRounds && (booking.status === "negotiating" || booking.status === "inquiry" || booking.status === "offered");

  // Find original and latest offers from history
  const originalEntry = history.find((h: any) => h.action === "offered" || h.action === "inquiry");
  const latestEntry = history.length > 0 ? history[history.length - 1] : null;

  const originalOffer = {
    offerAmount: originalEntry?.amount || booking.offerAmount || "0",
    currency: booking.offerCurrency || "INR",
    eventDate: booking.event?.startTime,
    slotTime: originalEntry?.slotTime || meta.slotTime,
  };

  const currentOffer = {
    offerAmount: latestEntry?.amount || booking.offerAmount || "0",
    currency: booking.offerCurrency || "INR",
    eventDate: booking.event?.startTime,
    slotTime: latestEntry?.slotTime || meta.slotTime,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Negotiation</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Round {round}/{maxRounds}
          </Badge>
          {round >= maxRounds && (
            <Badge variant="destructive" className="text-xs">Max rounds reached</Badge>
          )}
        </div>
      </div>

      {/* Offer comparison table */}
      {history.length > 1 && (
        <OfferComparison
          currentOffer={originalOffer}
          newOffer={currentOffer}
          userRole="organizer"
        />
      )}

      {/* Negotiation history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</h4>
          {history.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3 text-sm border-l-2 border-primary/20 pl-3 py-1">
              <div className="flex-1">
                <div className="font-medium capitalize">{entry.action?.replace(/_/g, " ")}</div>
                {entry.message && (
                  <p className="text-muted-foreground text-xs mt-1">{entry.message}</p>
                )}
                {entry.amount && (
                  <p className="text-xs mt-1">
                    Amount: {booking.offerCurrency} {Number(entry.amount).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {entry.at ? format(new Date(entry.at), "MMM d, p") : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {canCounter && (
        <div className="pt-2">
          <Button onClick={onOpenNegotiation} className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Open Negotiation
          </Button>
        </div>
      )}

      {round >= maxRounds && booking.status === "negotiating" && (
        <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Max negotiation rounds reached. You must Accept or Decline.
        </div>
      )}
    </div>
  );
}

// ─── Contract Management Section (Task 11.3) ────────────────────────────────

/**
 * ContractSection — Displays contract status and provides a CTA to view/sign.
 *
 * Only renders when the booking has reached the "contracting" stage or beyond.
 * Shows different copy depending on whether signatures are still pending
 * (48-hour signing deadline) or the contract is fully executed.
 *
 * Delegates the actual contract display to the shared ContractViewer component.
 *
 * @param booking         - Enriched booking object
 * @param onViewContract  - Callback to switch BookingDetail into contract viewer mode
 */
function ContractSection({ booking, onViewContract }: { booking: any; onViewContract: () => void }) {
  // Contract is relevant from "contracting" onward through the full lifecycle
  const isContractingOrBeyond = ["contracting", "confirmed", "paid_deposit", "scheduled", "completed"].includes(booking.status);

  if (!isContractingOrBeyond) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Contract
        </h3>
        <Badge variant="outline" className="text-xs">
          {booking.status === "contracting" ? "Pending Signatures" : "Active"}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {booking.status === "contracting"
          ? "Contract has been generated and is awaiting signatures from both parties. You have 48 hours to sign."
          : "Contract has been signed by both parties."}
      </p>

      <Button onClick={onViewContract} variant="outline" className="w-full">
        <FileText className="w-4 h-4 mr-2" />
        {booking.status === "contracting" ? "Review & Sign Contract" : "View Contract"}
      </Button>
    </div>
  );
}

// ─── Payment Timeline (Task 11.4) ───────────────────────────────────────────

/** Shape of a single payment milestone in the three-stage payment schedule. */
interface PaymentMilestone {
  label: string;
  description: string;
  amount: number;
  dueDate?: string;
  status: "pending" | "initiated" | "completed" | "overdue";
}

/**
 * PaymentTimeline — Renders the milestone-based payment schedule for a booking.
 *
 * Payment structure (per platform business rules):
 *   1. Deposit     — configurable % (default 30%) due on contract signing
 *   2. Pre-Event   — 40% of total, due 7 days before event start
 *   3. Final       — remainder, due after event completion confirmation
 *   + Platform commission line item (2-5%, default 3%)
 *
 * Milestone statuses are derived from the booking's current status:
 *   - "completed" statuses cascade forward (e.g. paid_deposit → deposit is completed)
 *   - "overdue" is calculated by comparing due date against current time via isPast()
 *
 * Only renders when booking has reached "confirmed" or later (contract signed).
 *
 * @param booking - Enriched booking object with offerAmount, finalAmount, depositPercent, event dates
 */
function PaymentTimeline({ booking }: { booking: any }) {
  const hasContract = ["confirmed", "paid_deposit", "scheduled", "completed"].includes(booking.status);
  if (!hasContract) return null;

  // Use finalAmount (post-negotiation) if available, otherwise fall back to original offer
  const finalAmount = Number(booking.finalAmount || booking.offerAmount || 0);
  // Deposit percentage is configurable per booking; defaults to 30% (platform standard)
  const depositPercent = Number(booking.depositPercent || 30);
  const depositAmount = Math.round((depositPercent / 100) * finalAmount);
  // Pre-event payment is fixed at 40% of total booking value
  const preEventAmount = Math.round(finalAmount * 0.4);
  // Final payment is the remainder after deposit + pre-event
  const finalPayment = finalAmount - depositAmount - preEventAmount;
  // Platform commission: 2-5% range, defaulting to 3% (shown as informational line item)
  const commissionRate = 0.03;
  const commission = Math.round(finalAmount * commissionRate);

  const eventDate = booking.event?.startTime ? new Date(booking.event.startTime) : null;
  const preEventDate = eventDate ? new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000) : null;

  const milestones: PaymentMilestone[] = [
    {
      label: "Deposit",
      description: `${depositPercent}% on contract signing`,
      amount: depositAmount,
      dueDate: undefined,
      status: booking.status === "paid_deposit" || booking.status === "scheduled" || booking.status === "completed" ? "completed" : "pending",
    },
    {
      label: "Pre-Event",
      description: "7 days before event",
      amount: preEventAmount,
      dueDate: preEventDate?.toISOString(),
      status: booking.status === "scheduled" || booking.status === "completed"
        ? "completed"
        : preEventDate && isPast(preEventDate)
          ? "overdue"
          : "pending",
    },
    {
      label: "Final Payment",
      description: "After event completion",
      amount: finalPayment,
      dueDate: eventDate?.toISOString(),
      status: booking.status === "completed" ? "completed" : "pending",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        Payment Timeline
      </h3>

      <div className="space-y-2">
        {milestones.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
              m.status === "overdue"
                ? "border-red-500/30 bg-red-500/5"
                : m.status === "completed"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                m.status === "completed" ? "bg-green-500" :
                m.status === "overdue" ? "bg-red-500" :
                "bg-muted-foreground/30"
              }`} />
              <div>
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.description}</div>
                {m.dueDate && (
                  <div className="text-xs text-muted-foreground">
                    Due: {format(new Date(m.dueDate), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {booking.offerCurrency} {m.amount.toLocaleString()}
              </div>
              {m.status === "overdue" && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </div>
              )}
              {m.status === "completed" && (
                <div className="flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle className="w-3 h-3" />
                  Paid
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Platform commission line item */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-dashed text-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <div>
              <div className="font-medium text-muted-foreground">Platform Commission</div>
              <div className="text-xs text-muted-foreground">{(commissionRate * 100).toFixed(0)}% of booking amount</div>
            </div>
          </div>
          <div className="font-semibold text-muted-foreground">
            {booking.offerCurrency} {commission.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2 border-t text-sm font-semibold">
        <span>Total</span>
        <span>{booking.offerCurrency} {finalAmount.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ─── Event Completion Confirmation (Task 11.5) ──────────────────────────────

/**
 * CompletionConfirmation — Post-event confirmation form for the organizer.
 *
 * Appears only after the event's end time has passed and the booking is in a
 * confirmable status (confirmed / paid_deposit / scheduled).
 *
 * Three states:
 *   1. Hidden — event hasn't ended yet or booking status doesn't qualify
 *   2. Already confirmed — shows read-only summary with the organizer's rating
 *      and a note about waiting for artist confirmation
 *   3. Confirmation form — checkbox + 1-5 star rating + optional private note
 *
 * On submit, calls POST /api/organizer/bookings/:id/complete via useCompleteBooking.
 * If both organizer and artist confirm, the booking transitions to "completed"
 * and the final payment milestone is triggered.
 *
 * Auto-confirm deadline: 48 hours after event end (platform auto-confirms if
 * the organizer doesn't act).
 *
 * @param booking - Enriched booking object with event dates and meta.completionFeedback
 */
function CompletionConfirmation({ booking }: { booking: any }) {
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const completeBooking = useCompleteBooking();

  // Fall back to startTime if endTime isn't set (single-slot events)
  const eventEndTime = booking.event?.endTime || booking.event?.startTime;
  const eventEnded = eventEndTime ? isPast(new Date(eventEndTime)) : false;
  const meta = booking.meta || {};
  // Check if organizer has already submitted their confirmation
  const alreadyConfirmed = meta.completionFeedback?.organizer;

  // Only show for confirmed/scheduled/paid_deposit bookings after event end
  if (!eventEnded || !["confirmed", "paid_deposit", "scheduled"].includes(booking.status)) {
    return null;
  }

  if (alreadyConfirmed) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Completion Confirmed
        </h3>
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-sm">
          <p>You confirmed this booking on {format(new Date(alreadyConfirmed.confirmedAt), "PPp")}.</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground">Your rating:</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < alreadyConfirmed.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          {!meta.completionFeedback?.artist && (
            <p className="text-xs text-muted-foreground mt-2">Waiting for artist to confirm.</p>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!confirmed || rating === 0) return;
    completeBooking.mutate({
      id: booking.id,
      confirmed,
      rating,
      note: note || undefined,
    });
  };

  const autoConfirmDeadline = eventEndTime ? new Date(new Date(eventEndTime).getTime() + 48 * 60 * 60 * 1000) : null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Star className="w-4 h-4" />
        Confirm Event Completion
      </h3>

      {autoConfirmDeadline && (
        <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded-lg">
          <Clock className="w-3 h-3" />
          Auto-confirms in {formatDistanceToNow(autoConfirmDeadline)} if not manually confirmed.
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="confirm-performance"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <Label htmlFor="confirm-performance" className="text-sm">
            I confirm the artist performed as per the contract terms
          </Label>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Performance Rating</Label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                className="p-0.5 hover:scale-110 transition-transform"
                aria-label={`Rate ${i + 1} star${i > 0 ? "s" : ""}`}
              >
                <Star
                  className={`w-6 h-6 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                />
              </button>
            ))}
            {rating > 0 && <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Private Note (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any notes about the performance..."
            className="h-20 text-sm"
            maxLength={1000}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!confirmed || rating === 0 || completeBooking.isPending}
          className="w-full"
        >
          {completeBooking.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Confirm Completion
        </Button>
      </div>
    </div>
  );
}

// ─── Booking Detail View ────────────────────────────────────────────────────

/**
 * BookingDetail — Deep-dive view for a single booking.
 *
 * Manages three internal view modes:
 *   "detail"      — default; shows header card + all sub-sections
 *   "contract"    — full-screen ContractViewer (shared component)
 *   "negotiation" — full-screen NegotiationFlow (shared component)
 *
 * Fetches the booking by ID via useOrganizerBooking (separate query from the
 * list to get full enriched data including artist, event, and meta).
 *
 * Sub-sections rendered conditionally based on booking status:
 *   - NegotiationDisplay: inquiry / offered / negotiating
 *   - ContractSection: contracting and beyond
 *   - PaymentTimeline: confirmed and beyond
 *   - CompletionConfirmation: after event end time
 *
 * @param bookingId - Booking ID to fetch and display
 * @param onBack    - Callback to return to the booking list
 */
function BookingDetail({ bookingId, onBack }: { bookingId: number; onBack: () => void }) {
  const [viewMode, setViewMode] = useState<"detail" | "contract" | "negotiation">("detail");
  const { data: booking, isLoading } = useOrganizerBooking(bookingId);

  if (isLoading || !booking) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = (booking.status || "inquiry") as BookingStatus;

  // Contract viewer
  if (viewMode === "contract") {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <Button variant="ghost" onClick={() => setViewMode("detail")} className="mb-4">
          ← Back to Booking
        </Button>
        <ContractViewer bookingId={booking.id} onClose={() => setViewMode("detail")} />
      </div>
    );
  }

  // Negotiation flow
  if (viewMode === "negotiation") {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <Button variant="ghost" onClick={() => setViewMode("detail")} className="mb-4">
          ← Back to Booking
        </Button>
        <NegotiationFlow booking={booking} onClose={() => setViewMode("detail")} />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Back to Bookings
      </Button>

      <div className="space-y-6">
        {/* Header Card */}
        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Booking #{booking.id}</h2>
              <p className="text-muted-foreground">
                {booking.artist?.stageName || booking.artist?.user?.name || "Artist"}
                {booking.event?.title ? ` • ${booking.event.title}` : ""}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">
                  {booking.offerCurrency} {Number(booking.offerAmount || 0).toLocaleString()}
                </span>
              </div>
              {booking.finalAmount && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Final: {booking.offerCurrency} {Number(booking.finalAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {booking.event?.startTime
                    ? format(new Date(booking.event.startTime), "PPP")
                    : "Date TBD"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Updated {booking.updatedAt ? format(new Date(booking.updatedAt), "PPp") : "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Inquiry message */}
          {status === "inquiry" && booking.meta?.message && (
            <div className="bg-muted/50 p-4 rounded-lg mt-4">
              <h3 className="font-semibold text-sm mb-2">Artist's Message</h3>
              <p className="text-sm text-muted-foreground">{booking.meta.message}</p>
            </div>
          )}

          {/* Inquiry action buttons */}
          {status === "inquiry" && (
            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button variant="default" onClick={() => setViewMode("negotiation")}>Accept</Button>
              <Button variant="outline" onClick={() => setViewMode("negotiation")}>Counter-Offer</Button>
              <Button variant="destructive" onClick={() => setViewMode("negotiation")}>Decline</Button>
            </div>
          )}
        </Card>

        {/* Negotiation Section (11.2) */}
        {(status === "negotiating" || status === "offered" || status === "inquiry") && (
          <Card className="p-6">
            <NegotiationDisplay
              booking={booking}
              onOpenNegotiation={() => setViewMode("negotiation")}
            />
          </Card>
        )}

        {/* Contract Section (11.3) */}
        <Card className="p-6">
          <ContractSection
            booking={booking}
            onViewContract={() => setViewMode("contract")}
          />
        </Card>

        {/* Payment Timeline (11.4) */}
        <Card className="p-6">
          <PaymentTimeline booking={booking} />
        </Card>

        {/* Completion Confirmation (11.5) */}
        <Card className="p-6">
          <CompletionConfirmation booking={booking} />
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * OrganizerBookings — Top-level page component mounted at /bookings for organizer role.
 *
 * Two modes:
 *   1. List mode (default) — tabbed view of all bookings with status filter tabs
 *      showing counts per status. Clicking a booking card navigates to detail mode.
 *   2. Detail mode — renders BookingDetail for the selected booking ID.
 *
 * The list is fetched via useOrganizerBookings which hits GET /api/organizer/bookings
 * with an optional ?status= query param driven by the active tab.
 */
export default function OrganizerBookings() {
  // undefined = "all" tab (no status filter sent to API)
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  // When set, switches from list mode to BookingDetail
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const { data: bookings = [], isLoading, error } = useOrganizerBookings(selectedStatus);

  // Group bookings by status to show counts in each tab trigger
  const groupedBookings = bookings.reduce((acc, booking) => {
    const status = (booking.status || "inquiry") as BookingStatus;
    if (!acc[status]) acc[status] = [];
    acc[status].push(booking);
    return acc;
  }, {} as Record<BookingStatus, any[]>);

  if (selectedBookingId) {
    return (
      <BookingDetail
        bookingId={selectedBookingId}
        onBack={() => setSelectedBookingId(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load bookings</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="text-muted-foreground">Manage your artist bookings and negotiations</p>
      </div>

      <Tabs value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="inquiry">Inquiries ({groupedBookings.inquiry?.length || 0})</TabsTrigger>
          <TabsTrigger value="negotiating">Negotiating ({groupedBookings.negotiating?.length || 0})</TabsTrigger>
          <TabsTrigger value="contracting">Contracting ({groupedBookings.contracting?.length || 0})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({groupedBookings.confirmed?.length || 0})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({groupedBookings.completed?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus || "all"} className="space-y-4">
          {bookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No bookings found</h3>
              <p className="text-sm text-muted-foreground">
                {selectedStatus
                  ? `No bookings with status "${selectedStatus}"`
                  : "Start by creating an event and inviting artists"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedBookingId(booking.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {booking.artist?.stageName || booking.artist?.user?.name || "Artist"}
                          </h3>
                          <StatusBadge status={(booking.status || "inquiry") as BookingStatus} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.event?.title || "Event"} •
                          {booking.event?.startTime
                            ? format(new Date(booking.event.startTime), " MMM d, yyyy")
                            : " Date TBD"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-semibold">
                        {booking.offerCurrency} {Number(booking.offerAmount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {booking.updatedAt ? format(new Date(booking.updatedAt), "MMM d") : "N/A"}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
