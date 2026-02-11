import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, DollarSign, Music, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { GigApplicationModal } from "@/components/GigApplicationModal";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function FindGigs() {
    const [search, setSearch] = useState("");
    const [selectedGig, setSelectedGig] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);

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

    const handleApply = (gig: any, stage?: any) => {
        setSelectedGig({ event: gig, stage });
        setModalOpen(true);
    };

    // Client-side filtering for now
    const filteredOpportunities = opportunities?.filter((op: any) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
            op.title?.toLowerCase().includes(term) ||
            op.description?.toLowerCase().includes(term) ||
            // op.genre?.toLowerCase().includes(term) || // If genre exists on event
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

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
                </div>
            ) : filteredOpportunities?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOpportunities.map((gig: any) => (
                        <Card key={gig.id} className="group overflow-hidden border-white/5 bg-card/40 hover:bg-card/60 transition-all hover:border-primary/30 flex flex-col">
                            <div className="h-32 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 flex flex-col justify-end relative">
                                <div className="absolute top-4 right-4">
                                    <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-md">
                                        {gig.status}
                                    </Badge>
                                </div>
                                <h3 className="text-xl font-bold font-display text-white">{gig.title}</h3>
                                <p className="text-sm text-gray-300 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {gig.venue?.name || "TBD"}
                                </p>
                            </div>

                            <CardContent className="p-5 flex-1 space-y-4">
                                <div className="flex flex-col gap-2 text-sm">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>{gig.startTime ? format(new Date(gig.startTime), "MMM d, yyyy") : "Date TBD"}</span>
                                    </div>
                                    {(gig.metadata as any)?.genre && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Music className="w-4 h-4" />
                                            <span>{(gig.metadata as any).genre}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {gig.description || "No description provided."}
                                </p>

                                {gig.stages && gig.stages.length > 0 ? (
                                    <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Timeslots</p>
                                        <div className="grid gap-2">
                                            {gig.stages.map((stage: any) => (
                                                <div key={stage.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/5 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{stage.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {stage.startTime ? format(new Date(stage.startTime), "p") : "TBD"}
                                                            {stage.endTime ? ` - ${format(new Date(stage.endTime), "p")}` : ""}
                                                        </span>
                                                    </div>
                                                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleApply(gig, stage)}>
                                                        Apply
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <p className="text-sm text-muted-foreground">Full Event Application</p>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between">
                                <div className="font-semibold text-primary flex items-center gap-1">
                                    {/* Display budget range if available (mock logic) */}

                                </div>
                                {!gig.stages || gig.stages.length === 0 ? (
                                    <Button className="gap-2 group-hover:bg-primary/90" onClick={() => handleApply(gig)}>
                                        Apply Now
                                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Select a slot above</span>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No opportunities found matching your criteria.</p>
                </div>
            )}

            <GigApplicationModal
                event={selectedGig?.event}
                stage={selectedGig?.stage}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </div>
    );
}
