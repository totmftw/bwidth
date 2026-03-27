import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    MapPin,
    Users,
    Clock,
    AlignLeft,
    Utensils,
    Music,
    Wifi,
    Zap,
    Car,
    Camera,
    Wind,
    ShieldCheck,
    ExternalLink,
    ImageIcon,
    Building2,
    ChevronLeft,
    ChevronRight,
    Phone,
    Globe,
} from "lucide-react";
import { useState } from "react";

interface EventDetailModalProps {
    opportunity: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (opportunity: any, stage?: any) => void;
}

// Map keyword → icon for amenities
const AMENITY_ICONS: Record<string, any> = {
    food: Utensils,
    catering: Utensils,
    menu: Utensils,
    parking: Car,
    wifi: Wifi,
    internet: Wifi,
    power: Zap,
    electricity: Zap,
    generator: Zap,
    ac: Wind,
    "air condition": Wind,
    cooling: Wind,
    security: ShieldCheck,
    cctv: Camera,
    camera: Camera,
    sound: Music,
    audio: Music,
    pa: Music,
    dj: Music,
    green: AlignLeft,  // green room
};

function amenityIcon(label: string) {
    const lower = label.toLowerCase();
    for (const [key, Icon] of Object.entries(AMENITY_ICONS)) {
        if (lower.includes(key)) return Icon;
    }
    return ShieldCheck; // generic fallback
}

// Simple photo gallery with prev/next
function PhotoGallery({ photos }: { photos: any[] }) {
    const [idx, setIdx] = useState(0);
    if (!photos || photos.length === 0) return null;

    const current = photos[idx];
    const src = current?.data || current?.url;

    return (
        <div className="relative w-full rounded-xl overflow-hidden bg-black/60" style={{ aspectRatio: "16/7" }}>
            <img
                src={src}
                alt={current?.altText || "Venue photo"}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {photos.length > 1 && (
                <>
                    <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 rounded-full p-1 transition-colors"
                        onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 rounded-full p-1 transition-colors"
                        onClick={() => setIdx((i) => (i + 1) % photos.length)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {photos.map((_, i) => (
                            <div
                                key={i}
                                onClick={() => setIdx(i)}
                                className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Render a venue address JSONB object into a readable string
function formatAddress(address: any): string {
    if (!address) return "";
    if (typeof address === "string") return address;
    const parts = [
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.pincode || address.zip,
        address.country,
    ].filter(Boolean);
    return parts.join(", ");
}

export function EventDetailModal({ opportunity, open, onOpenChange, onApply }: EventDetailModalProps) {
    if (!opportunity) return null;

    // Support both flat and nested structures
    const event = opportunity.event || opportunity;
    const venue = opportunity.venue || event.venue || null;
    const organizer = opportunity.organizer || event.organizer || null;
    const stages = event.stages || [];
    const tempVenue = opportunity.temporaryVenue || event.temporaryVenue || null;

    // Active venue display — prefer registered venue, fall back to temporaryVenue
    const activeVenueName = venue?.name || tempVenue?.name || "Venue TBA";
    const activeVenueAddress = formatAddress(venue?.address)
        || tempVenue?.location
        || "Address not provided";
    const activeMapsLink = tempVenue?.mapsLink || venue?.metadata?.mapsLink || venue?.metadata?.googleMaps || null;

    const photos: any[] = venue?.photos || [];
    const amenities: any[] = venue?.amenities
        ? (Array.isArray(venue.amenities) ? venue.amenities : Object.entries(venue.amenities).map(([k, v]) => `${k}${v !== true ? `: ${v}` : ''}`))
        : [];

    const capacityTotal = venue?.capacity || event.capacityTotal;
    const capacitySeated = venue?.capacitySeated;
    const capacityStanding = venue?.capacityStanding;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#0A0A0C] border-white/10 rounded-2xl">

                {/* Hero */}
                <div className="w-full relative bg-gradient-to-br from-primary/20 via-indigo-900/20 to-black border-b border-white/8">
                    <div className="px-6 pt-8 pb-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Badge
                                    variant="outline"
                                    className="mb-2 text-xs bg-primary/10 text-primary border-primary/30"
                                >
                                    {event.visibility === "public" ? "Public Gig" : "Private Invite"}
                                </Badge>
                                <DialogTitle className="text-3xl font-display font-bold text-white leading-tight">
                                    {event.title}
                                </DialogTitle>
                                <p className="text-white/60 mt-1">
                                    Hosted by <span className="text-white/90 font-medium">{organizer?.name || "Organizer"}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick stats bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/8 divide-x divide-white/8">
                        {[
                            {
                                icon: CalendarIcon,
                                label: "Date",
                                value: format(new Date(event.startTime), "MMM d, yyyy"),
                            },
                            {
                                icon: Clock,
                                label: "Time",
                                value: `${format(new Date(event.startTime), "h:mm a")}${event.endTime ? ` – ${format(new Date(event.endTime), "h:mm a")}` : ""}`,
                            },
                            {
                                icon: MapPin,
                                label: "Venue",
                                value: activeVenueName,
                            },
                            {
                                icon: Users,
                                label: "Capacity",
                                value: capacityTotal ? `${capacityTotal} Pax` : "N/A",
                            },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex flex-col gap-0.5 px-5 py-4">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Icon className="w-3.5 h-3.5" /> {label}
                                </span>
                                <span className="font-semibold text-sm leading-snug truncate" title={value}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* About */}
                    {event.description && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <AlignLeft className="w-4 h-4" /> About
                            </h3>
                            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-[15px]">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Venue Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Venue Information
                        </h3>

                        {/* Photo Gallery */}
                        {photos.length > 0 ? (
                            <PhotoGallery photos={photos} />
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-muted-foreground/40 rounded-xl border border-dashed border-white/10 bg-black/20 py-8 text-sm">
                                <ImageIcon className="w-5 h-5" /> No venue photos uploaded
                            </div>
                        )}

                        <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/8 overflow-hidden">
                            {/* Name + address */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="text-xl font-semibold">{activeVenueName}</h4>
                                        {activeVenueAddress && activeVenueAddress !== "Address not provided" && (
                                            <p className="text-muted-foreground text-sm mt-1 flex items-start gap-1.5">
                                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/60" />
                                                {activeVenueAddress}
                                            </p>
                                        )}
                                    </div>
                                    {activeMapsLink && (
                                        <a
                                            href={activeMapsLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium border border-primary/20 transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Maps
                                        </a>
                                    )}
                                </div>

                                {/* Directions / landmarks from temporaryVenue */}
                                {tempVenue?.landmark && (
                                    <p className="text-sm text-muted-foreground">
                                        📍 Landmark: {tempVenue.landmark}
                                    </p>
                                )}
                                {tempVenue?.directions && (
                                    <p className="text-sm text-muted-foreground">
                                        🗺 Directions: {tempVenue.directions}
                                    </p>
                                )}
                                {tempVenue?.contactName && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5" />
                                        {tempVenue.contactName}{tempVenue.contactPhone ? ` · ${tempVenue.contactPhone}` : ""}
                                    </p>
                                )}
                            </div>

                            {/* Capacity breakdown */}
                            {(capacityTotal || capacitySeated || capacityStanding) && (
                                <div className="px-5 py-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Capacity</p>
                                    <div className="flex flex-wrap gap-4">
                                        {capacityTotal && (
                                            <div className="flex flex-col items-center bg-white/5 rounded-xl px-5 py-3 min-w-[80px]">
                                                <Users className="w-4 h-4 text-primary mb-1" />
                                                <span className="text-lg font-bold">{capacityTotal}</span>
                                                <span className="text-xs text-muted-foreground">Total</span>
                                            </div>
                                        )}
                                        {capacitySeated && (
                                            <div className="flex flex-col items-center bg-white/5 rounded-xl px-5 py-3 min-w-[80px]">
                                                <span className="text-lg">🪑</span>
                                                <span className="text-lg font-bold">{capacitySeated}</span>
                                                <span className="text-xs text-muted-foreground">Seated</span>
                                            </div>
                                        )}
                                        {capacityStanding && (
                                            <div className="flex flex-col items-center bg-white/5 rounded-xl px-5 py-3 min-w-[80px]">
                                                <span className="text-lg">🧍</span>
                                                <span className="text-lg font-bold">{capacityStanding}</span>
                                                <span className="text-xs text-muted-foreground">Standing</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Amenities */}
                            {amenities.length > 0 && (
                                <div className="px-5 py-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Amenities & Facilities</p>
                                    <div className="flex flex-wrap gap-2">
                                        {amenities.map((a: any, i: number) => {
                                            const label = typeof a === "string" ? a : (a.name || a.label || JSON.stringify(a));
                                            const Icon = amenityIcon(label);
                                            return (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-sm border border-white/8 text-foreground/80"
                                                >
                                                    <Icon className="w-3.5 h-3.5 text-primary/70" />
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Space dimensions if present */}
                            {venue?.spaceDimensions && (
                                <div className="px-5 py-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stage / Space</p>
                                    <p className="text-sm text-muted-foreground">
                                        {typeof venue.spaceDimensions === "string"
                                            ? venue.spaceDimensions
                                            : Object.entries(venue.spaceDimensions as Record<string, any>)
                                                .map(([k, v]) => `${k}: ${v}`)
                                                .join(" · ")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Available Slots */}
                    {stages.length > 0 && (
                        <div className="space-y-3 pb-24 md:pb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Available Slots
                            </h3>
                            <div className="grid gap-3">
                                {stages.map((stage: any) => (
                                    <div
                                        key={stage.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-black/30 gap-4"
                                    >
                                        <div className="space-y-0.5">
                                            <h4 className="font-semibold">{stage.name || "Main Stage"}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {stage.startTime && format(new Date(stage.startTime), "h:mm a")}
                                                {stage.endTime && ` – ${format(new Date(stage.endTime), "h:mm a")}`}
                                                {stage.capacity && (
                                                    <span className="ml-2 text-xs bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                                        {stage.capacity} cap
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                onOpenChange(false);
                                                onApply(opportunity, stage);
                                            }}
                                        >
                                            Apply for Slot
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky footer CTA — only without specific slots */}
                {stages.length === 0 && (
                    <div className="sticky bottom-0 left-0 right-0 p-4 bg-[#0A0A0C]/90 backdrop-blur-xl border-t border-white/10 flex justify-end gap-3 z-10">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 px-8 shadow-lg shadow-primary/20"
                            onClick={() => {
                                onOpenChange(false);
                                onApply(opportunity);
                            }}
                        >
                            Apply to Play
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
