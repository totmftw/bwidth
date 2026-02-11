import { useState } from "react";
import { useBookings, useUpdateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { format, isAfter } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Check,
    Clock,
    Loader2,
    Calendar,
    MapPin,
    CheckCircle,
    XCircle,
    Eye,
    MessageSquare,
    ArrowUpRight,
    User,
    FileText
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
    paid_deposit: { label: "Deposit Paid", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: CheckCircle },
    scheduled: { label: "Scheduled", color: "text-cyan-500", bgColor: "bg-cyan-500/10", icon: Calendar },
    completed: { label: "Completed", color: "text-violet-500", bgColor: "bg-violet-500/10", icon: CheckCircle },
    cancelled: { label: "Cancelled", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
    disputed: { label: "Disputed", color: "text-red-600", bgColor: "bg-red-600/10", icon: XCircle },
    refunded: { label: "Refunded", color: "text-gray-500", bgColor: "bg-gray-500/10", icon: XCircle },
};

interface EnrichedBooking {
    id: number;
    status: string;
    eventDate: string;
    offerAmount: number;
    currency: string;
    slotTime: string | null;
    notes: string | null;
    artist: {
        id: number;
        stageName?: string;
        user?: {
            name: string;
            displayName?: string;
        };
    } | null;
    event: {
        id: number;
        title: string;
        startTime?: string;
    } | null;
    venue?: {
        name: string;
        address?: string;
    } | null;
    organizer?: {
        organizationName: string;
    } | null;
    meta?: any;
    createdAt: string;
}

export default function VenueBookings() {
    const { user } = useAuth();
    // Cast the bookings data to our EnrichedBooking type
    const { data: rawBookings, isLoading } = useBookings();
    const bookings = rawBookings as unknown as EnrichedBooking[] | undefined;

    const updateMutation = useUpdateBooking();

    const [activeTab, setActiveTab] = useState<BookingStatus>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showNegotiation, setShowNegotiation] = useState(false);
    const [showContract, setShowContract] = useState(false);

    // Response Dialog State
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [responseType, setResponseType] = useState<"accept" | "decline" | null>(null);
    const [responseMessage, setResponseMessage] = useState("");

    if (!user) return null;

    // Filter bookings based on tab and search
    const filteredBookings = bookings?.filter(booking => {
        const status = booking.status || "";

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const artistName = (booking.artist?.stageName || booking.artist?.user?.name || "").toLowerCase();
            const eventTitle = (booking.event?.title || "").toLowerCase();

            if (!artistName.includes(query) && !eventTitle.includes(query)) return false;
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

    const handleStatusUpdate = async (id: number, status: string) => {
        updateMutation.mutate({ id, status: status as any });
        setShowResponseDialog(false);
        setSelectedBooking(null);
        setResponseMessage("");
    };

    const openResponseDialog = (booking: any, type: "accept" | "decline") => {
        setSelectedBooking(booking);
        setResponseType(type);
        setShowResponseDialog(true);
    };

    const handleCloseDetails = () => {
        setShowDetailsDialog(false);
        setShowNegotiation(false);
        setShowContract(false);
        setSelectedBooking(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Venue Bookings</h1>
                    <p className="text-muted-foreground">Manage artist applications and bookings</p>
                </div>
                <Input
                    placeholder="Search artist or event..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-72 pl-9 bg-background/60"
                />
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookingStatus)}>
                <TabsList className="bg-background/60 border border-white/10">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
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
                                    <VenueBookingCard
                                        key={booking.id}
                                        booking={booking}
                                        index={index}
                                        onViewDetails={() => {
                                            setSelectedBooking(booking);
                                            setShowDetailsDialog(true);
                                        }}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            No bookings found.
                        </div>
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
                                            {selectedBooking.event?.title} - {format(new Date(selectedBooking.eventDate), "EEEE, MMMM d, yyyy")}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid grid-cols-2 gap-6 py-4">
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Artist</Label>
                                                <p className="font-medium">{selectedBooking.artist?.stageName || selectedBooking.artist?.user?.name || "Unknown Artist"}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Slot Time</Label>
                                                <p className="font-medium">{selectedBooking.slotTime || "TBC"}</p>
                                            </div>
                                            {selectedBooking.notes && (
                                                <div>
                                                    <Label className="text-muted-foreground text-xs">Application Note</Label>
                                                    <p className="text-sm border p-2 rounded-md bg-muted/50">{selectedBooking.notes}</p>
                                                </div>
                                            )}
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
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        {["inquiry", "offered", "negotiating"].includes(selectedBooking.status) && (
                                            <Button variant="outline" onClick={() => setShowNegotiation(true)}>
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Negotiate / Chat
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
                                                    Accept
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

            {/* Response Dialog (Accept/Decline) */}
            <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{responseType === "accept" ? "Accept Application" : "Decline Application"}</DialogTitle>
                        <DialogDescription>
                            {responseType === "accept"
                                ? "Confirm you want to book this artist. This will generate a contract."
                                : "Decline this application."}
                        </DialogDescription>
                    </DialogHeader>

                    {responseType === "decline" && (
                        <div className="py-2">
                            <Label>Reason (optional)</Label>
                            <Textarea
                                placeholder="Reason for declining..."
                                value={responseMessage}
                                onChange={e => setResponseMessage(e.target.value)}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResponseDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => handleStatusUpdate(selectedBooking.id, responseType === "accept" ? "confirmed" : "cancelled")}
                            className={responseType === "accept" ? "bg-green-600" : "bg-red-600"}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function VenueBookingCard({ booking, index, onViewDetails }: { booking: any, index: number, onViewDetails: () => void }) {
    const eventDate = new Date(booking.eventDate);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="glass-card border-white/5 hover:border-primary/20 transition-all group">
                <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10 shrink-0">
                            <span className="text-xs font-medium text-muted-foreground">
                                {format(eventDate, "MMM")}
                            </span>
                            <span className="text-xl font-bold">
                                {format(eventDate, "dd")}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        {booking.artist?.stageName || booking.artist?.user?.name || "Artist"}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {booking.event?.title || "Event"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {booking.slotTime || "TBC"}
                                        </span>
                                    </div>
                                </div>
                                <StatusBadge status={booking.status} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 md:flex-col md:items-end">
                            <div className="text-right">
                                <p className="text-xl font-bold">
                                    ₹{Number(booking.offerAmount).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={onViewDetails}>
                                View Details <ArrowUpRight className="ml-2 w-4 h-4" />
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
