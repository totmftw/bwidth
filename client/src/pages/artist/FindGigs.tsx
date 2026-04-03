import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, MapPin, Calendar, DollarSign, Music, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { GigApplicationModal } from "@/components/GigApplicationModal";
import { EventDetailModal } from "@/components/EventDetailModal";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings, useUpdateBooking } from "@/hooks/use-bookings";
import { useToast } from "@/hooks/use-toast";

export default function FindGigs() {
    const [search, setSearch] = useState("");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { data: bookings } = useBookings();
    const { mutate: updateBooking } = useUpdateBooking();
    const [selectedGig, setSelectedGig] = useState<any>(null);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
    const [genreFilter, setGenreFilter] = useState("All");

    const { data: artistStatus } = useQuery({
        queryKey: ["/api/artists/profile/status"],
        queryFn: async () => {
            const res = await fetch("/api/artists/profile/status", { credentials: "include" });
            if (!res.ok) return { isComplete: true };
            return await res.json();
        },
    });

    const { data: opportunities, isLoading } = useQuery({
        queryKey: ["/api/opportunities", search],
        queryFn: async () => {
            // In a real app, we'd pass search params to the API
            // const params = new URLSearchParams({ genre: search });
            const res = await fetch("/api/opportunities", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch opportunities");
            return await res.json();
        }
    });

    const handleApply = (opportunity: any, stage?: any) => {
        if (artistStatus && !artistStatus.isComplete) {
            toast({ title: "Complete your profile first", description: "You need to complete your artist profile before applying to gigs.", variant: "destructive" });
            setLocation("/profile/setup");
            return;
        }
        // opportunity object contains { event, venue, organizer }
        // The modal expects just the event object
        setSelectedGig({ event: opportunity.event || opportunity, stage });
        setApplyModalOpen(true);
    };

    const handleViewDetails = (gig: any) => {
        setSelectedOpportunity(gig);
        setDetailModalOpen(true);
    };

    const handleWithdraw = (bookingId: number) => {
        if (confirm("Are you sure you want to withdraw your application?")) {
            updateBooking({ id: bookingId, status: "cancelled", notes: "Artist withdrew application." } as any);
        }
    };

    // Normalize data structure to ensure { event, venue, organizer, temporaryVenue } format
    const normalizedOpportunities = opportunities?.map((op: any) => {
        if (op.event) return op;
        const { venue, organizer, stages, temporaryVenue, ...eventData } = op;
        return {
            event: { ...eventData, stages },
            venue,
            organizer,
            temporaryVenue: temporaryVenue ?? null,
        };
    });

    // Extract unique genres from all events for the filter pills
    const GENRE_PRESETS = ["Jazz", "Rock", "EDM", "Classical", "Bollywood", "Hip-Hop", "Pop", "Indie", "Folk"];
    const eventGenres = useMemo(() => {
        const genres = new Set<string>();
        normalizedOpportunities?.forEach((op: any) => {
            const meta = op.event?.metadata as any;
            const genre = meta?.genre || meta?.primaryGenre || meta?.category;
            if (genre && typeof genre === "string") genres.add(genre);
            const tags = meta?.genres || meta?.tags;
            if (Array.isArray(tags)) tags.forEach((t: string) => genres.add(t));
        });
        // Merge presets with discovered genres
        GENRE_PRESETS.forEach(g => genres.add(g));
        return ["All", ...Array.from(genres).sort()];
    }, [normalizedOpportunities]);

    // Client-side filtering by search text + genre
    const filteredOpportunities = normalizedOpportunities?.filter((op: any) => {
        // Genre filter
        if (genreFilter !== "All") {
            const meta = op.event?.metadata as any;
            const eventGenre = (meta?.genre || meta?.primaryGenre || meta?.category || "").toLowerCase();
            const eventTags = [
                ...(Array.isArray(meta?.genres) ? meta.genres : []),
                ...(Array.isArray(meta?.tags) ? meta.tags : []),
            ].map((t: string) => t.toLowerCase());
            const matchesGenre = eventGenre.includes(genreFilter.toLowerCase()) || eventTags.some((t: string) => t.includes(genreFilter.toLowerCase()));
            // Also check if the event title/description mentions the genre
            const titleMatch = op.event?.title?.toLowerCase().includes(genreFilter.toLowerCase()) || op.event?.description?.toLowerCase().includes(genreFilter.toLowerCase());
            if (!matchesGenre && !titleMatch) return false;
        }
        // Text search filter
        if (!search) return true;
        const term = search.toLowerCase();
        const addrObj = op.venue?.address;
        const addrStr = addrObj && typeof addrObj === "object"
            ? Object.values(addrObj as Record<string, any>).filter((v) => v && typeof v === "string").join(" ")
            : "";
        return (
            op.event?.title?.toLowerCase().includes(term) ||
            op.event?.description?.toLowerCase().includes(term) ||
            op.venue?.name?.toLowerCase().includes(term) ||
            addrStr.toLowerCase().includes(term) ||
            op.temporaryVenue?.name?.toLowerCase().includes(term) ||
            op.temporaryVenue?.location?.toLowerCase().includes(term) ||
            false
        );
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Find Gigs</h1>
                    <p className="text-muted-foreground">Discover performance opportunities for your act</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by genre, venue, or city..."
                            className="pl-9 bg-card border-white/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="border-white/10">
                        <SlidersHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Genre Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mt-4 scrollbar-hide">
                {eventGenres.map((genre) => (
                    <button
                        key={genre}
                        onClick={() => setGenreFilter(genre)}
                        className={cn(
                            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            genreFilter === genre
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background/60 text-muted-foreground border-white/10 hover:border-white/30"
                        )}
                    >
                        {genre}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
                </div>
            ) : filteredOpportunities?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOpportunities.map((op: any) => {
                        const { event, venue, organizer, temporaryVenue } = op;
                        const venueAddress = (() => {
                            if (venue?.address && typeof venue.address === "object") {
                                const addr = venue.address as Record<string, any>;
                                return addr.city || addr.full || addr.street || Object.values(addr).filter((v) => v && typeof v === "string").join(", ") || "TBA";
                            }
                            if (venue?.location) return venue.location;
                            if (temporaryVenue?.location) return temporaryVenue.location;
                            return "TBA";
                        })();
                        
                        return (
                        <Card key={event.id} className="group overflow-hidden border-white/5 bg-card/40 hover:bg-card/60 transition-all hover:border-primary/30 flex flex-col">
                            <div className="h-32 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 flex flex-col justify-end relative">
                                <div className="absolute top-4 right-4 text-right">
                                    <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-md mb-2">
                                        {event.status}
                                    </Badge>
                                </div>
                                <h3 className="text-xl font-bold font-display text-white">{event.title}</h3>
                                <p className="text-sm text-gray-300 flex items-center gap-1 truncate pb-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" /> {venue?.name || temporaryVenue?.name || "TBD"}{venueAddress && venueAddress !== "TBA" ? `, ${venueAddress}` : ""}
                                </p>
                            </div>

                            <CardContent className="p-5 flex-1 space-y-4">
                                <div className="flex flex-col gap-2 text-sm">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="w-4 h-4 text-primary/70" />
                                        <span>{event.startTime ? format(new Date(event.startTime), "MMM d, yyyy") : "Date TBD"}</span>
                                        {event.endTime && <span className="text-xs opacity-70 border-l border-white/20 pl-1.5 ml-0.5">{format(new Date(event.endTime), "MMM d")}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Music className="w-4 h-4 text-primary/70" />
                                        <span>By {organizer?.name || "Organizer"}</span>
                                    </div>
                                    {(venue?.capacityTotal || venue?.capacity) && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Music className="w-4 h-4 text-primary/70 opacity-0" /> {/* Spacer */}
                                            <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full border border-white/5">Capacity: {venue.capacityTotal || venue.capacity} Pax</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {event.description || "No description provided."}
                                </p>

                                {event.stages && event.stages.length > 0 ? (
                                    <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Timeslots</p>
                                        <div className="grid gap-2">
                                            {event.stages.map((stage: any) => {
                                                const hasApplied = bookings?.find((b: any) => b.eventId === event.id && b.stageId === stage.id && b.status !== 'cancelled' && b.status !== 'rejected');
                                                return (
                                                <div key={stage.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/5 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{stage.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {stage.startTime ? format(new Date(stage.startTime), "p") : "TBD"}
                                                            {stage.endTime ? ` - ${format(new Date(stage.endTime), "p")}` : ""}
                                                        </span>
                                                    </div>
                                                    {hasApplied ? (
                                                        <div className="flex items-center gap-1">
                                                            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setLocation(`/bookings?bookingId=${hasApplied.id}`)}>
                                                                Go to chat
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2" onClick={() => handleWithdraw(hasApplied.id)}>
                                                                Withdraw
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleApply(op, stage)}>
                                                            Apply
                                                        </Button>
                                                    )}
                                                </div>
                                            )})}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <p className="text-sm text-muted-foreground">Full Event Application</p>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between">
                                <Button 
                                    variant="outline" 
                                    className="border-white/10 hover:bg-white/5" 
                                    onClick={() => handleViewDetails(op)}
                                >
                                    View Details
                                </Button>
                                {!event.stages || event.stages.length === 0 ? (
                                    (() => {
                                        const hasApplied = bookings?.find((b: any) => b.eventId === event.id && !b.stageId && b.status !== 'cancelled' && b.status !== 'rejected');
                                        return hasApplied ? (
                                            <div className="flex items-center gap-2">
                                                <Button className="gap-2 group-hover:bg-primary/90" onClick={() => setLocation(`/bookings?bookingId=${hasApplied.id}`)}>
                                                    Go to chat
                                                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs" onClick={() => handleWithdraw(hasApplied.id)}>
                                                    Withdraw
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button className="gap-2 group-hover:bg-primary/90" onClick={() => handleApply(op)}>
                                                Apply Now
                                                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </Button>
                                        );
                                    })()
                                ) : (
                                    <span className="text-xs text-muted-foreground">Select a slot above</span>
                                )}
                            </CardFooter>
                        </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No opportunities found matching your criteria.</p>
                </div>
            )}

            <GigApplicationModal
                event={selectedGig?.event}
                stage={selectedGig?.stage}
                open={applyModalOpen}
                onOpenChange={setApplyModalOpen}
            />

            <EventDetailModal
                opportunity={selectedOpportunity}
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                onApply={handleApply}
            />
        </div>
    );
}
