import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, MapPin, Users, Clock, AlignLeft, Utensils, Music, Info } from "lucide-react";

interface EventDetailModalProps {
    opportunity: any; // The joined opportunity object
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (opportunity: any, stage?: any) => void;
}

export function EventDetailModal({ opportunity, open, onOpenChange, onApply }: EventDetailModalProps) {
    if (!opportunity || !opportunity.event) return null;

    const { event, venue, organizer } = opportunity;
    const stages = event.stages || [];

    // Parse Venue Data
    const venueCapacity = venue?.capacityTotal || venue?.capacity || event.capacityTotal || "Varies";
    const venueAddress = venue?.address ? Object.values(venue.address).filter(Boolean).join(", ") : venue?.location || "TBA";
    const venueAmenities = venue?.amenities ? (Array.isArray(venue.amenities) ? venue.amenities : [venue.amenities]) : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-[#0A0A0A] border-white/10">
                {/* Header Image / Hero Area */}
                <div className="w-full h-32 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative border-b border-white/10">
                    <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                                {event.visibility === 'public' ? 'Public Gig' : 'Private Invite'}
                            </span>
                            <DialogTitle className="text-3xl font-display font-bold text-white drop-shadow-md">
                                {event.title}
                            </DialogTitle>
                            <p className="text-white/80 font-medium">By {organizer?.name || 'Unknown Organizer'}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-white/5">
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> Date</span>
                            <span className="font-medium">{format(new Date(event.startTime), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Time</span>
                            <span className="font-medium">
                                {format(new Date(event.startTime), "h:mm a")} 
                                {event.endTime && ` - ${format(new Date(event.endTime), "h:mm a")}`}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Location</span>
                            <span className="font-medium truncate" title={venue?.name || 'Local Venue'}>{venue?.name || 'Local Venue'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> Capacity</span>
                            <span className="font-medium">{venueCapacity} Pax</span>
                        </div>
                    </div>

                    {/* About Section */}
                    {event.description && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <AlignLeft className="w-5 h-5 text-primary" /> About This Event
                            </h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Venue Details */}
                    <div className="space-y-4 pt-6 border-t border-white/5">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" /> Venue Information
                        </h3>
                        <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
                            <div>
                                <h4 className="font-medium text-white text-lg">{venue?.name || 'Venue TBA'}</h4>
                                <p className="text-muted-foreground text-sm mt-1">{venueAddress}</p>
                            </div>
                            
                            {(venue?.capacitySeated || venue?.capacityStanding) && (
                                <div className="flex gap-6 mt-2 pt-4 border-t border-white/5">
                                    {venue.capacitySeated && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground uppercase">Seated</span>
                                            <span className="font-medium">{venue.capacitySeated}</span>
                                        </div>
                                    )}
                                    {venue.capacityStanding && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground uppercase">Standing</span>
                                            <span className="font-medium">{venue.capacityStanding}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {venueAmenities.length > 0 && (
                                <div className="pt-4 border-t border-white/5">
                                    <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-muted-foreground" /> Amenities Available
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {venueAmenities.map((amenity: any, idx: number) => {
                                            const label = typeof amenity === 'string' ? amenity : amenity.name || JSON.stringify(amenity);
                                            // Quick icon mapping based on common terms
                                            let Icon = Info;
                                            if (label.toLowerCase().includes('food') || label.toLowerCase().includes('menu')) Icon = Utensils;
                                            if (label.toLowerCase().includes('sound') || label.toLowerCase().includes('audio')) Icon = Music;
                                            
                                            return (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-sm text-foreground/80 border border-white/10">
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeslots/Stages */}
                    {stages.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-white/5 pb-20 md:pb-0">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" /> Available Slots
                            </h3>
                            <div className="grid gap-3">
                                {stages.map((stage: any) => (
                                    <div key={stage.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 gap-4">
                                        <div>
                                            <h4 className="font-medium text-white">{stage.name || 'Main Stage'}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {stage.startTime && format(new Date(stage.startTime), "h:mm a")} 
                                                {stage.endTime && ` - ${format(new Date(stage.endTime), "h:mm a")}`}
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={() => {
                                                onOpenChange(false);
                                                onApply(opportunity, stage);
                                            }}
                                            className="w-full sm:w-auto"
                                            size="sm"
                                        >
                                            Apply for Slot
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Footer CTA - Only if no stages are specified (otherwise they apply per stage) */}
                {stages.length === 0 && (
                    <div className="sticky bottom-0 left-0 right-0 p-4 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/10 flex justify-end gap-3 z-10">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                        <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 px-8" 
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
