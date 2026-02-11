import { useState } from "react";
import { useBookings, useUpdateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Check,
    X,
    Clock,
    Loader2,
    Calendar,
    MapPin,
    DollarSign,
    User,
    FileText,
    MessageSquare,
    ChevronRight,
    Filter,
    Search,
    IndianRupee,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { NegotiationFlow } from "@/components/booking/NegotiationFlow";
import { ContractViewer } from "@/components/booking/ContractViewer";

type BookingStatus = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    inquiry: { label: "Inquiry", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Eye },
    offered: { label: "Offered", color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: Clock },
    negotiating: { label: "Negotiating", color: "text-orange-500", bgColor: "bg-orange-500/10", icon: MessageSquare },
    confirmed: { label: "Confirmed", color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle },
    paid_deposit: { label: "Deposit Paid", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: IndianRupee },
    scheduled: { label: "Scheduled", color: "text-cyan-500", bgColor: "bg-cyan-500/10", icon: Calendar },
    completed: { label: "Completed", color: "text-violet-500", bgColor: "bg-violet-500/10", icon: CheckCircle },
    cancelled: { label: "Cancelled", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
    disputed: { label: "Disputed", color: "text-red-600", bgColor: "bg-red-600/10", icon: AlertCircle },
    refunded: { label: "Refunded", color: "text-gray-500", bgColor: "bg-gray-500/10", icon: XCircle },
};

export default function ArtistBookings() {
    const { user } = useAuth();
    const { data: bookings, isLoading } = useBookings();
    const updateMutation = useUpdateBooking();

    const [activeTab, setActiveTab] = useState<BookingStatus>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [showNegotiation, setShowNegotiation] = useState(false);
    const [showContract, setShowContract] = useState(false);
    const [responseType, setResponseType] = useState<"accept" | "decline" | null>(null);
    const [responseMessage, setResponseMessage] = useState("");

    if (!user) return null;

    // Filter bookings based on tab and search
    const filteredBookings = bookings?.filter(booking => {
        const status = booking.status || "";

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const organizer = (booking as any).organizer;
            const venue = (booking as any).venue;
            const matchesOrganizer = (organizer?.organizationName || organizer?.user?.name || "")
                .toLowerCase().includes(query);
            const matchesVenue = (venue?.name || "").toLowerCase().includes(query);
            if (!matchesOrganizer && !matchesVenue) return false;
        }

        // Tab filter
        switch (activeTab) {
            case "pending":
                return ["inquiry", "offered", "negotiating"].includes(status);
            case "confirmed":
                return ["confirmed", "paid_deposit", "scheduled"].includes(status);
            case "completed":
                return status === "completed";
            case "cancelled":
                return ["cancelled", "disputed", "refunded"].includes(status);
            default:
                return true;
        }
    }).sort((a, b) => {
        const dateA = (a as any).eventDate || a.createdAt;
        const dateB = (b as any).eventDate || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    }) || [];

    // Count by status type
    const pendingCount = bookings?.filter(b => ["inquiry", "offered", "negotiating"].includes(b.status || "")).length || 0;
    const confirmedCount = bookings?.filter(b => ["confirmed", "paid_deposit", "scheduled"].includes(b.status || "")).length || 0;
    const completedCount = bookings?.filter(b => b.status === "completed").length || 0;

    const handleStatusUpdate = async (id: number, status: string) => {
        updateMutation.mutate({ id, status: status as any });
        setShowResponseDialog(false);
        setSelectedBooking(null);
        setResponseMessage("");
    };

    const handleCloseDetails = () => {
        setShowDetailsDialog(false);
        setShowNegotiation(false);
        setShowContract(false);
        setSelectedBooking(null);
    };

    const openResponseDialog = (booking: any, type: "accept" | "decline") => {
        setSelectedBooking(booking);
        setResponseType(type);
        setShowResponseDialog(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Bookings</h1>
                    <p className="text-muted-foreground">Manage your gigs and booking requests</p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by organizer or venue..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/60"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                    label="Total Bookings"
                    value={bookings?.length || 0}
                    icon={Calendar}
                />
                <StatsCard
                    label="Pending"
                    value={pendingCount}
                    icon={Clock}
                    highlight={pendingCount > 0}
                />
                <StatsCard
                    label="Confirmed"
                    value={confirmedCount}
                    icon={CheckCircle}
                    color="text-green-500"
                />
                <StatsCard
                    label="Completed"
                    value={completedCount}
                    icon={Check}
                    color="text-violet-500"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookingStatus)}>
                <TabsList className="bg-background/60 border border-white/10">
                    <TabsTrigger value="all" className="gap-2">
                        All
                        <Badge variant="secondary" className="ml-1">{bookings?.length || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="gap-2">
                        Pending
                        {pendingCount > 0 && (
                            <Badge className="ml-1 bg-yellow-500/20 text-yellow-500">{pendingCount}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredBookings.length > 0 ? (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {filteredBookings.map((booking, index) => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        index={index}
                                        onAccept={() => openResponseDialog(booking, "accept")}
                                        onDecline={() => openResponseDialog(booking, "decline")}
                                        onViewDetails={() => {
                                            setSelectedBooking(booking);
                                            setShowDetailsDialog(true);
                                        }}
                                        isUpdating={updateMutation.isPending}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <EmptyState tab={activeTab} />
                    )}
                </TabsContent>
            </Tabs>

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={(open) => !open && handleCloseDetails()}>
                <DialogContent className="max-w-2xl">
                    {selectedBooking && (
                        <>
                            {showNegotiation ? (
                                <NegotiationFlow
                                    booking={selectedBooking}
                                    onClose={() => setShowNegotiation(false)}
                                />
                            ) : showContract ? (
                                <ContractViewer
                                    bookingId={selectedBooking.id}
                                    onClose={() => setShowContract(false)}
                                />
                            ) : (
                                <>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            Booking Details
                                            <StatusBadge status={selectedBooking.status} />
                                        </DialogTitle>
                                        <DialogDescription>
                                            {format(new Date(selectedBooking.eventDate), "EEEE, MMMM d, yyyy")}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid grid-cols-2 gap-6 py-4">
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Organizer</Label>
                                                <p className="font-medium">{selectedBooking.organizer?.organizationName && selectedBooking.organizer.organizationName !== 'Unknown' ? selectedBooking.organizer.organizationName : (selectedBooking.organizer?.user?.name || selectedBooking.organizer?.name || "Organizer")}</p>
                                            </div>
                                            {selectedBooking.venue && (
                                                <div>
                                                    <Label className="text-muted-foreground text-xs">Venue</Label>
                                                    <p className="font-medium">{selectedBooking.venue.name}</p>
                                                    <p className="text-sm text-muted-foreground">{selectedBooking.venue.address?.street || selectedBooking.venue.address || ""}</p>
                                                </div>
                                            )}
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Slot Time</Label>
                                                <p className="font-medium">{selectedBooking.slotTime || (selectedBooking.event?.startTime ? format(new Date(selectedBooking.event.startTime), "p") : "To be confirmed")}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Offered Amount</Label>
                                                <p className="text-2xl font-bold">₹{Number(selectedBooking.offerAmount).toLocaleString('en-IN')}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Currency</Label>
                                                <p className="font-medium">{selectedBooking.currency || "INR"}</p>
                                            </div>
                                            {selectedBooking.notes && (
                                                <div>
                                                    <Label className="text-muted-foreground text-xs">Notes</Label>
                                                    <p className="text-sm">{selectedBooking.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        {["inquiry", "offered", "negotiating"].includes(selectedBooking.status) && (
                                            <Button variant="outline" onClick={() => setShowNegotiation(true)}>
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Negotiate
                                            </Button>
                                        )}

                                        {["confirmed", "scheduled", "paid_deposit"].includes(selectedBooking.status) && (
                                            <Button variant="outline" onClick={() => setShowContract(true)}>
                                                <FileText className="w-4 h-4 mr-2" />
                                                View Contract
                                            </Button>
                                        )}
                                        {["inquiry", "offered"].includes(selectedBooking.status) && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowDetailsDialog(false);
                                                        openResponseDialog(selectedBooking, "decline");
                                                    }}
                                                >
                                                    Decline
                                                </Button>
                                                <Button
                                                    className="bg-green-600 hover:bg-green-500"
                                                    onClick={() => {
                                                        setShowDetailsDialog(false);
                                                        openResponseDialog(selectedBooking, "accept");
                                                    }}
                                                >
                                                    Accept Offer
                                                </Button>
                                            </>
                                        )}
                                        {!["inquiry", "offered"].includes(selectedBooking.status) && (
                                            <Button variant="outline" onClick={handleCloseDetails}>
                                                Close
                                            </Button>
                                        )}
                                    </DialogFooter>
                                </>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Response Dialog */}
            <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {responseType === "accept" ? "Accept Booking" : "Decline Booking"}
                        </DialogTitle>
                        <DialogDescription>
                            {responseType === "accept"
                                ? "Confirm that you want to accept this booking offer."
                                : "Let the organizer know why you're declining this offer."}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="py-4">
                            <div className="p-4 rounded-xl bg-background/60 border border-white/10 mb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium">{selectedBooking.organizer?.organizationName || "Booking"}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(selectedBooking.eventDate), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    <p className="text-xl font-bold">₹{Number(selectedBooking.offerAmount).toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {responseType === "decline" && (
                                <div className="space-y-2">
                                    <Label>Reason (optional)</Label>
                                    <Textarea
                                        placeholder="Let them know why you're declining..."
                                        value={responseMessage}
                                        onChange={(e) => setResponseMessage(e.target.value)}
                                        className="bg-background/60"
                                    />
                                </div>
                            )}

                            {responseType === "accept" && (
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-green-500">Ready to accept?</p>
                                            <p className="text-sm text-muted-foreground">
                                                By accepting, you're committing to this performance. The organizer will be notified and can proceed with the contract.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowResponseDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleStatusUpdate(
                                selectedBooking?.id,
                                responseType === "accept" ? "confirmed" : "cancelled"
                            )}
                            disabled={updateMutation.isPending}
                            className={responseType === "accept" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {responseType === "accept" ? "Confirm & Accept" : "Decline Booking"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

function BookingCard({
    booking,
    index,
    onAccept,
    onDecline,
    onViewDetails,
    isUpdating
}: {
    booking: any;
    index: number;
    onAccept: () => void;
    onDecline: () => void;
    onViewDetails: () => void;
    isUpdating: boolean;
}) {
    const isPending = ["inquiry", "offered", "negotiating"].includes(booking.status);
    const eventDate = new Date(booking.eventDate);
    const isUpcoming = isAfter(eventDate, new Date());

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="glass-card border-white/5 hover:border-primary/20 transition-all group">
                <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Date Card */}
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10 shrink-0">
                            <span className="text-xs font-medium text-muted-foreground">
                                {format(eventDate, "MMM")}
                            </span>
                            <span className="text-xl font-bold">
                                {format(eventDate, "dd")}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        {booking.organizer?.organizationName && booking.organizer.organizationName !== 'Unknown' ? booking.organizer.organizationName : (booking.organizer?.user?.name || booking.organizer?.name || "Organizer")}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        {booking.venue && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {booking.venue.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {booking.slotTime || (booking.event?.startTime ? format(new Date(booking.event.startTime), "p") : "TBC")}
                                        </span>
                                    </div>
                                </div>
                                <StatusBadge status={booking.status} />
                            </div>

                            {booking.notes && (
                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                    {booking.notes}
                                </p>
                            )}
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-4 md:flex-col md:items-end">
                            <div className="text-right">
                                <p className="text-xl font-bold">
                                    ₹{Number(booking.offerAmount).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-muted-foreground">{booking.currency || "INR"}</p>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-primary/10 text-primary"
                                onClick={onViewDetails}
                            >
                                View Details
                                <ArrowUpRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inquiry;
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={`${config.bgColor} ${config.color} border-current/20 font-medium`}
        >
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
        </Badge>
    );
}

function StatsCard({
    label,
    value,
    icon: Icon,
    color = "text-foreground",
    highlight = false
}: {
    label: string;
    value: number;
    icon: any;
    color?: string;
    highlight?: boolean;
}) {
    return (
        <Card className={`glass-card border-white/5 ${highlight ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ tab }: { tab: BookingStatus }) {
    const messages: Record<BookingStatus, { title: string; description: string }> = {
        all: { title: "No bookings yet", description: "Your booking requests will appear here" },
        pending: { title: "No pending requests", description: "You're all caught up!" },
        confirmed: { title: "No confirmed gigs", description: "Accept booking requests to see them here" },
        completed: { title: "No completed gigs", description: "Your performance history will appear here" },
        cancelled: { title: "No cancelled bookings", description: "That's great! No cancellations" },
    };

    const { title, description } = messages[tab];

    return (
        <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
        </div>
    );
}
