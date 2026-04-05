/**
 * VenueApplications — inbox for artist applications to the venue's events.
 * Mirrors OrganizerBookings.tsx patterns for consistency.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { useToast } from "@/hooks/use-toast";
import {
    Check,
    Clock,
    Loader2,
    Calendar,
    MessageSquare,
    Search,
    IndianRupee,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    FileText,
    User,
    Inbox,
    Music2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

import { useNegotiationChatContext } from "@/components/booking/NegotiationChatToggle";
import { ArtistProfileModal } from "@/components/ArtistProfileModal";

type AppTab = "all" | "pending" | "accepted" | "completed" | "declined";

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    inquiry: { label: "Inquiry", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Eye },
    offered: { label: "Offered", color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: Clock },
    negotiating: { label: "Negotiating", color: "text-orange-500", bgColor: "bg-orange-500/10", icon: MessageSquare },
    contracting: { label: "Contracting", color: "text-purple-500", bgColor: "bg-purple-500/10", icon: FileText },
    confirmed: { label: "Confirmed", color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle },
    paid_deposit: { label: "Deposit Paid", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: IndianRupee },
    scheduled: { label: "Scheduled", color: "text-cyan-500", bgColor: "bg-cyan-500/10", icon: Calendar },
    completed: { label: "Completed", color: "text-violet-500", bgColor: "bg-violet-500/10", icon: CheckCircle },
    cancelled: { label: "Declined", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
    disputed: { label: "Disputed", color: "text-red-600", bgColor: "bg-red-600/10", icon: AlertCircle },
    refunded: { label: "Refunded", color: "text-gray-500", bgColor: "bg-gray-500/10", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || { label: status, color: "text-muted-foreground", bgColor: "bg-muted", icon: Clock };
    const Icon = config.icon;
    return (
        <Badge className={`${config.bgColor} ${config.color} border-0 font-medium`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
        </Badge>
    );
}

function StatsCard({
    label, value, icon: Icon, highlight = false, color
}: {
    label: string; value: number; icon: any; highlight?: boolean; color?: string;
}) {
    return (
        <Card className={`glass-card border-white/5 ${highlight && value > 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-primary/10 ${color || "text-primary"}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <p className={`text-2xl font-bold ${highlight && value > 0 ? "text-yellow-500" : ""}`}>{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ tab }: { tab: AppTab }) {
    const messages: Record<AppTab, { title: string; desc: string; cta?: string; ctaHref?: string }> = {
        all: { title: "No applications yet", desc: "Once artists apply to your events, they'll appear here." },
        pending: {
            title: "No pending applications",
            desc: "Make sure your events are published so artists can discover and apply.",
            cta: "Create an Event",
            ctaHref: "/venue/events/create",
        },
        accepted: { title: "No accepted applications", desc: "Applications you accept will appear here." },
        completed: { title: "No completed shows yet", desc: "Past performances will appear here after events are completed." },
        declined: { title: "No declined applications", desc: "Applications you decline will appear here." },
    };
    const msg = messages[tab];
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{msg.title}</h3>
            <p className="text-muted-foreground max-w-sm mb-6">{msg.desc}</p>
            {msg.cta && msg.ctaHref && (
                <Button asChild>
                    <Link href={msg.ctaHref}>{msg.cta}</Link>
                </Button>
            )}
        </div>
    );
}

export default function VenueApplications() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: venueStatus } = useQuery({
        queryKey: ["/api/venues/profile/status"],
        queryFn: async () => {
            const res = await fetch("/api/venues/profile/status", { credentials: "include" });
            if (!res.ok) return { isComplete: true };
            return await res.json();
        },
    });

    const { data: applications, isLoading } = useQuery<any[]>({
        queryKey: ["/api/venue/applications"],
        queryFn: async () => {
            const res = await fetch("/api/venue/applications", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch applications");
            return res.json();
        },
        enabled: !!user,
    });

    const acceptMutation = useMutation({
        mutationFn: async (bookingId: number) => {
            const res = await fetch(`/api/venue/applications/${bookingId}/accept`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to accept application");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Application accepted", description: "The artist has been confirmed for this event." });
            queryClient.invalidateQueries({ queryKey: ["/api/venue/applications"] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const declineMutation = useMutation({
        mutationFn: async (bookingId: number) => {
            const res = await fetch(`/api/venue/applications/${bookingId}/decline`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to decline application");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Application declined" });
            queryClient.invalidateQueries({ queryKey: ["/api/venue/applications"] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const [activeTab, setActiveTab] = useState<AppTab>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { openChat } = useNegotiationChatContext();

    if (!user) return null;

    const filtered = (applications || []).filter(app => {
        const status = app.status || "";

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const artist = app.artist || {};
            const event = app.event || {};
            const matches =
                (artist.name || artist.stageName || "").toLowerCase().includes(q) ||
                (event.title || "").toLowerCase().includes(q);
            if (!matches) return false;
        }

        switch (activeTab) {
            case "pending":   return ["inquiry", "offered", "negotiating"].includes(status);
            case "accepted":  return ["confirmed", "paid_deposit", "scheduled", "contracting"].includes(status);
            case "completed": return status === "completed";
            case "declined":  return ["cancelled", "disputed", "refunded"].includes(status);
            default: return true;
        }
    }).sort((a, b) => {
        const dateA = a.event?.startTime || a.createdAt;
        const dateB = b.event?.startTime || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const pendingCount = (applications || []).filter(a => ["inquiry", "offered", "negotiating"].includes(a.status || "")).length;
    const acceptedCount = (applications || []).filter(a => ["confirmed", "paid_deposit", "scheduled", "contracting"].includes(a.status || "")).length;
    const completedCount = (applications || []).filter(a => a.status === "completed").length;

    const openBooking = (booking: any, view: "negotiate" | "contract" = "negotiate") => {
        if (view === "negotiate" && venueStatus && !venueStatus.isComplete) {
            toast({ title: "Complete your profile first", description: "Complete your venue profile before starting negotiations.", variant: "destructive" });
            setLocation("/venue/setup");
            return;
        }
        openChat(booking, { contract: view === "contract" });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Artist Applications</h1>
                    <p className="text-muted-foreground">Review and respond to artist requests for your events</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by artist or event..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/60"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard label="Total Applications" value={applications?.length || 0} icon={Inbox} />
                <StatsCard label="Pending Review" value={pendingCount} icon={Clock} highlight={pendingCount > 0} />
                <StatsCard label="Accepted" value={acceptedCount} icon={CheckCircle} color="text-green-500" />
                <StatsCard label="Completed Shows" value={completedCount} icon={Music2} color="text-violet-500" />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AppTab)}>
                <TabsList className="bg-background/60 border border-white/10">
                    <TabsTrigger value="all">
                        All
                        <Badge variant="secondary" className="ml-2">{applications?.length || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                        Pending
                        {pendingCount > 0 && (
                            <Badge className="ml-2 bg-yellow-500/20 text-yellow-500">{pendingCount}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="declined">Declined</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {filtered.map((app, index) => (
                                    <ApplicationCard
                                        key={app.id}
                                        application={app}
                                        index={index}
                                        onOpen={(view) => openBooking(app, view)}
                                        onAccept={() => acceptMutation.mutate(app.id)}
                                        onDecline={() => declineMutation.mutate(app.id)}
                                        isAccepting={acceptMutation.isPending}
                                        isDeclining={declineMutation.isPending}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <EmptyState tab={activeTab} />
                    )}
                </TabsContent>
            </Tabs>

            {/* Chat popup + contract module are rendered globally via NegotiationChatProvider */}
        </div>
    );
}

function ApplicationCard({
    application,
    index,
    onOpen,
    onAccept,
    onDecline,
    isAccepting,
    isDeclining,
}: {
    application: any;
    index: number;
    onOpen: (view: "negotiate" | "contract") => void;
    onAccept: () => void;
    onDecline: () => void;
    isAccepting: boolean;
    isDeclining: boolean;
}) {
    const [, navigate] = useLocation();
    const [showArtistProfile, setShowArtistProfile] = useState(false);
    const status = application.status || "inquiry";
    const isPendingInquiry = status === "inquiry";
    const isNegotiating = ["offered", "negotiating"].includes(status);
    const isContracting = status === "contracting";
    const isAccepted = ["confirmed", "paid_deposit", "scheduled"].includes(status);

    const artist = application.artist || {};
    const artistName = artist.name || artist.stageName || artist.user?.displayName || "Artist";
    const primaryGenre = artist.metadata?.primaryGenre || artist.metadata?.genre || "";

    const eventDate = application.event?.startTime
        ? new Date(application.event.startTime)
        : application.eventDate
            ? new Date(application.eventDate)
            : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="glass-card border-white/5 hover:border-primary/20 transition-all">
                <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Date badge */}
                        {eventDate ? (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10 shrink-0">
                                <span className="text-xs font-medium text-muted-foreground">{format(eventDate, "MMM")}</span>
                                <span className="text-xl font-bold">{format(eventDate, "dd")}</span>
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
                                        onClick={() => setShowArtistProfile(true)}
                                    >
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        {artistName}
                                        {primaryGenre && (
                                            <span className="text-xs font-normal text-muted-foreground">· {primaryGenre}</span>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                        {application.event?.title && (
                                            <span>{application.event.title}</span>
                                        )}
                                        {application.slotTime && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {application.slotTime}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={status} />
                            </div>
                            {application.notes && (
                                <p className="text-sm text-muted-foreground truncate max-w-md">{application.notes}</p>
                            )}
                        </div>

                        {/* Amount + Actions */}
                        <div className="flex items-center gap-3 md:flex-col md:items-end shrink-0">
                            <div className="text-right">
                                <p className="text-xl font-bold">
                                    ₹{Number(application.offerAmount || 0).toLocaleString("en-IN")}
                                </p>
                                <p className="text-xs text-muted-foreground">{application.offerCurrency || "INR"}</p>
                            </div>

                            <div className="flex gap-2 md:flex-col">
                                {/* Inquiry: Accept / Decline */}
                                {isPendingInquiry && (
                                    <>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={onAccept}
                                            disabled={isAccepting || isDeclining}
                                        >
                                            {isAccepting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4 mr-1" />
                                            )}
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                            onClick={onDecline}
                                            disabled={isAccepting || isDeclining}
                                        >
                                            {isDeclining ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <XCircle className="w-4 h-4 mr-1" />
                                            )}
                                            Decline
                                        </Button>
                                    </>
                                )}

                                {/* Negotiating: Open workspace */}
                                {isNegotiating && (
                                    <Button
                                        size="sm"
                                        className="bg-primary/90 hover:bg-primary text-white"
                                        onClick={() => onOpen("negotiate")}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Open Workspace
                                    </Button>
                                )}

                                {/* Contracting */}
                                {isContracting && (
                                    <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => navigate(`/contract/${application.id}`)}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Start Contract
                                    </Button>
                                )}

                                {/* Accepted/Confirmed */}
                                {isAccepted && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="hover:bg-primary/10"
                                        onClick={() => navigate(`/contract/${application.id}`)}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Contract
                                    </Button>
                                )}

                                {/* Completed/Declined: view only */}
                                {["completed", "cancelled", "disputed", "refunded"].includes(status) && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        onClick={() => onOpen("negotiate")}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Artist profile modal */}
            {showArtistProfile && (
                <ArtistProfileModal
                    artist={artist}
                    open={showArtistProfile}
                    onOpenChange={(open) => !open && setShowArtistProfile(false)}
                />
            )}
        </motion.div>
    );
}
