/**
 * OrganizerBookings — card-based booking list with bottom-sheet negotiation/contract.
 * Mirrors the ArtistBookings UI/UX pattern for consistency across roles.
 */
import { useState } from "react";
import { useOrganizerBookings } from "@/hooks/use-organizer-bookings";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { format, isAfter } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
    Check,
    Clock,
    Loader2,
    Calendar,
    MapPin,
    MessageSquare,
    Search,
    IndianRupee,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    ArrowUpRight,
    FileText,
    User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { NegotiationFlow } from "@/components/booking/NegotiationFlow";
import { ContractViewer } from "@/components/booking/ContractViewer";
import { ArtistProfileModal } from "@/components/ArtistProfileModal";

type BookingTab = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    inquiry: { label: "Inquiry", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Eye },
    offered: { label: "Offered", color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: Clock },
    negotiating: { label: "Negotiating", color: "text-orange-500", bgColor: "bg-orange-500/10", icon: MessageSquare },
    contracting: { label: "Contracting", color: "text-purple-500", bgColor: "bg-purple-500/10", icon: FileText },
    confirmed: { label: "Confirmed", color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle },
    paid_deposit: { label: "Deposit Paid", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: IndianRupee },
    scheduled: { label: "Scheduled", color: "text-cyan-500", bgColor: "bg-cyan-500/10", icon: Calendar },
    completed: { label: "Completed", color: "text-violet-500", bgColor: "bg-violet-500/10", icon: CheckCircle },
    cancelled: { label: "Cancelled", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
    disputed: { label: "Disputed", color: "text-red-600", bgColor: "bg-red-600/10", icon: AlertCircle },
    refunded: { label: "Refunded", color: "text-gray-500", bgColor: "bg-gray-500/10", icon: XCircle },
};

export default function OrganizerBookings() {
    const { user } = useAuth();
    const { data: bookings, isLoading } = useOrganizerBookings();

    const [activeTab, setActiveTab] = useState<BookingTab>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sheetBooking, setSheetBooking] = useState<any>(null);
    const [sheetView, setSheetView] = useState<"negotiate" | "contract">("negotiate");

    if (!user) return null;

    const filteredBookings = bookings?.filter(booking => {
        const status = booking.status || "";

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const artist = (booking as any).artist;
            const venue = (booking as any).venue;
            const event = (booking as any).event;
            const matchesArtist = (artist?.name || artist?.stageName || "").toLowerCase().includes(query);
            const matchesVenue = (venue?.name || "").toLowerCase().includes(query);
            const matchesEvent = (event?.title || "").toLowerCase().includes(query);
            if (!matchesArtist && !matchesVenue && !matchesEvent) return false;
        }

        switch (activeTab) {
            case "pending":
                return ["inquiry", "offered", "negotiating", "contracting"].includes(status);
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

    const pendingCount = bookings?.filter(b => ["inquiry", "offered", "negotiating", "contracting"].includes(b.status || "")).length || 0;
    const confirmedCount = bookings?.filter(b => ["confirmed", "paid_deposit", "scheduled"].includes(b.status || "")).length || 0;
    const completedCount = bookings?.filter(b => b.status === "completed").length || 0;

    const openSheet = (booking: any, view: "negotiate" | "contract" = "negotiate") => {
        setSheetBooking(booking);
        setSheetView(view);
    };
    const closeSheet = () => setSheetBooking(null);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Bookings</h1>
                    <p className="text-muted-foreground">Manage your artist bookings and negotiations</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by artist, venue or event..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/60"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard label="Total Bookings" value={bookings?.length || 0} icon={Calendar} />
                <StatsCard label="Pending" value={pendingCount} icon={Clock} highlight={pendingCount > 0} />
                <StatsCard label="Confirmed" value={confirmedCount} icon={CheckCircle} color="text-green-500" />
                <StatsCard label="Completed" value={completedCount} icon={Check} color="text-violet-500" />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookingTab)}>
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
                                        onOpen={(view) => openSheet(booking, view)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <EmptyState tab={activeTab} />
                    )}
                </TabsContent>
            </Tabs>

            {/* Full-height Sheet — slides in from right */}
            <Sheet open={!!sheetBooking} onOpenChange={(open) => !open && closeSheet()}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-md h-full p-0 flex flex-col overflow-hidden border-l border-white/10"
                >
                    <VisuallyHidden><SheetTitle>Booking Details</SheetTitle></VisuallyHidden>
                    {sheetBooking && sheetView === "negotiate" && (
                        <NegotiationFlow
                            booking={sheetBooking}
                            onClose={closeSheet}
                            onStartContract={() => setSheetView("contract")}
                        />
                    )}
                    {sheetBooking && sheetView === "contract" && (
                        <ContractViewer
                            bookingId={sheetBooking.id}
                            onClose={closeSheet}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function BookingCard({
    booking,
    index,
    onOpen,
}: {
    booking: any;
    index: number;
    onOpen: (view: "negotiate" | "contract") => void;
}) {
    const [, navigate] = useLocation();
    const [showArtistProfile, setShowArtistProfile] = useState(false);
    const status = booking.status || "inquiry";
    const isPending = ["inquiry", "offered", "negotiating"].includes(status);
    const isContracting = status === "contracting";
    const isConfirmed = ["confirmed", "scheduled", "paid_deposit"].includes(status);

    const eventDate = booking.event?.startTime
        ? new Date(booking.event.startTime)
        : booking.eventDate
            ? new Date(booking.eventDate)
            : null;
    const isUpcoming = eventDate ? isAfter(eventDate, new Date()) : false;

    // Resolve artist display name: stage name (given name) or just name
    const artist = booking.artist || {};
    const artistStageName = artist.name || artist.stageName || "";
    const artistUserName = artist.user?.displayName || artist.user?.firstName || "";
    const artistDisplay = artistStageName || artistUserName || "Artist";

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
                        {eventDate ? (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10 shrink-0">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {format(eventDate, "MMM")}
                                </span>
                                <span className="text-xl font-bold">
                                    {format(eventDate, "dd")}
                                </span>
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center border border-white/10 shrink-0">
                                <Calendar className="w-6 h-6 text-muted-foreground" />
                            </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                    <h3 
                                        className="font-semibold hover:text-primary transition-colors flex items-center gap-2 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowArtistProfile(true);
                                        }}
                                    >
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        {artistDisplay}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        {booking.event?.title && (
                                            <span>{booking.event.title}</span>
                                        )}
                                        {booking.venue && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {booking.venue.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {booking.slotTime || (booking.event?.startTime
                                                ? format(new Date(booking.event.startTime), "p")
                                                : "TBC")}
                                        </span>
                                    </div>
                                </div>
                                <StatusBadge status={status} />
                            </div>

                            {booking.notes && (
                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                    {booking.notes}
                                </p>
                            )}
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-3 md:flex-col md:items-end">
                            <div className="text-right">
                                <p className="text-xl font-bold">
                                    ₹{Number(booking.offerAmount || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-muted-foreground">{booking.offerCurrency || "INR"}</p>
                            </div>

                            <div className="flex gap-2 md:flex-col">
                                {/* Negotiate/Respond for pending */}
                                {isPending && (
                                    <Button
                                        size="sm"
                                        className="bg-primary/90 hover:bg-primary text-white"
                                        onClick={() => onOpen("negotiate")}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        {status === "negotiating" ? "Open Chat" : status === "inquiry" ? "Start Negotiation" : "Negotiate"}
                                    </Button>
                                )}

                                {/* Contracting CTA */}
                                {isContracting && (
                                    <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => navigate(`/contract/${booking.id}`)}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Start Contract
                                    </Button>
                                )}

                                {/* Contract for confirmed */}
                                {isConfirmed && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="hover:bg-primary/10"
                                        onClick={() => navigate(`/contract/${booking.id}`)}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Contract
                                    </Button>
                                )}

                                {/* View Chat for completed/cancelled */}
                                {!isPending && !isContracting && !isConfirmed && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="hover:bg-primary/10 text-primary"
                                        onClick={() => onOpen("negotiate")}
                                    >
                                        View Chat
                                        <ArrowUpRight className="w-4 h-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ArtistProfileModal 
                artist={artist} 
                open={showArtistProfile} 
                onOpenChange={setShowArtistProfile} 
            />
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
    highlight = false,
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

function EmptyState({ tab }: { tab: BookingTab }) {
    const messages: Record<BookingTab, { title: string; description: string }> = {
        all: { title: "No bookings yet", description: "Discover artists and start booking!" },
        pending: { title: "No pending bookings", description: "You're all caught up!" },
        confirmed: { title: "No confirmed bookings", description: "Accept negotiations to see them here" },
        completed: { title: "No completed bookings", description: "Your event history will appear here" },
        cancelled: { title: "No cancellations", description: "That's great! No cancelled bookings" },
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
