import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

interface OfferDetails {
    offerAmount: string;
    currency: string;
    eventDate?: string | Date;
    slotTime?: string;
    duration?: string;
}

interface OfferComparisonProps {
    currentOffer: OfferDetails;
    newOffer: OfferDetails;
    userRole: "artist" | "organizer" | "venue_manager";
}

export function OfferComparison({ currentOffer, newOffer, userRole }: OfferComparisonProps) {
    const formatCurrency = (amount: string, currency: string) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            maximumFractionDigits: 0
        }).format(Number(amount));
    };

    const formatDate = (date?: string | Date) => {
        if (!date) return "TBD";
        return format(new Date(date), "PPP");
    };

    // Calculate delta percentage for fee
    const currentAmt = Number(currentOffer.offerAmount);
    const newAmt = Number(newOffer.offerAmount);
    const delta = newAmt - currentAmt;
    const deltaPercent = ((delta / currentAmt) * 100).toFixed(1);
    const isPositive = delta > 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center text-sm">
                {/* Current / Your Last Offer */}
                <Card className="p-3 bg-muted/50 border-dashed">
                    <p className="text-xs text-muted-foreground mb-1">Previous Terms</p>
                    <div className="font-semibold">{formatCurrency(currentOffer.offerAmount, currentOffer.currency)}</div>
                    <div className="text-xs">{formatDate(currentOffer.eventDate)}</div>
                    <div className="text-xs">{currentOffer.slotTime || "By event flow"}</div>
                </Card>

                <ArrowRight className="w-4 h-4 text-muted-foreground" />

                {/* Counter Offer */}
                <Card className="p-3 border-primary/50 bg-primary/5">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-medium text-primary mb-1">New Proposal</p>
                        {delta !== 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {isPositive ? '+' : ''}{deltaPercent}%
                            </span>
                        )}
                    </div>
                    <div className="font-bold text-primary">{formatCurrency(newOffer.offerAmount, newOffer.currency)}</div>
                    <div className="text-xs">{formatDate(newOffer.eventDate)}</div>
                    <div className="text-xs font-medium">{newOffer.slotTime || currentOffer.slotTime}</div>
                </Card>
            </div>
        </div>
    );
}
