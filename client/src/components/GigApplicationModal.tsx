import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApplicationSubmitInput } from "@shared/routes";
import {
    mergeTechnicalDefaultText,
    textToTechRiderBrings,
    textToTechRiderRequirements,
} from "@shared/negotiation-application";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
    eventId: z.number(),
    stageId: z.number().optional(),
    offerAmount: z.coerce.number().min(1, "Amount must be positive"),
    currency: z.string().default("INR"),
    message: z.string().optional(),
    artistRequirementsText: z.string().optional(),
    artistBringsText: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof formSchema>;

interface GigApplicationModalProps {
    event: any; // Using any for simplicity as Event type might need import
    stage?: any; // The selected stage/timeslot
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GigApplicationModal({ event, stage, open, onOpenChange }: GigApplicationModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const artistMetadata = (user?.artist?.metadata as Record<string, unknown> | undefined) || {};
    const artistRequirementsDefault = mergeTechnicalDefaultText(
        artistMetadata.equipmentRequirements,
        artistMetadata.technicalRider,
    );
    const artistBringsDefault = mergeTechnicalDefaultText(artistMetadata.equipmentBrings);

    const form = useForm<ApplicationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            eventId: event?.id,
            stageId: stage?.id,
            offerAmount: 5000, // Default suggestion
            currency: "INR",
            message: "",
            artistRequirementsText: artistRequirementsDefault,
            artistBringsText: artistBringsDefault,
        },
    });

    useEffect(() => {
        form.reset({
            eventId: event?.id,
            stageId: stage?.id,
            offerAmount: 5000,
            currency: "INR",
            message: "",
            artistRequirementsText: artistRequirementsDefault,
            artistBringsText: artistBringsDefault,
        });
    }, [artistBringsDefault, artistRequirementsDefault, event?.id, form, stage?.id]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (data: ApplicationSubmitInput) => {
            const res = await fetch(api.bookings.apply.path, {
                method: api.bookings.apply.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!res.ok) {
                let message = "Something went wrong. Please try again.";
                try {
                    const body = await res.json();
                    message = body.message || message;
                } catch {}

                if (res.status === 404) {
                    throw new Error("This event is no longer accepting applications. It may still be in draft stage or has been removed.");
                }
                if (res.status === 409) {
                    throw new Error(message);
                }
                throw new Error(message);
            }

            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Application Sent!",
                description: "The organizer has received your application.",
            });
            onOpenChange(false);
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Application Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: ApplicationFormValues) => {
        const payload: ApplicationSubmitInput = {
            eventId: data.eventId,
            message: data.message?.trim() || undefined,
            proposal: {
                financial: {
                    offerAmount: data.offerAmount,
                    currency: data.currency,
                    depositPercent: 30,
                },
                schedule: stage ? {
                    stageId: stage.id,
                    stageName: stage.name || null,
                    slotLabel: stage.name || null,
                    startsAt: stage.startTime || null,
                    endsAt: stage.endTime || null,
                    soundCheckLabel: null,
                    soundCheckAt: null,
                } : null,
                techRider: {
                    artistRequirements: textToTechRiderRequirements(data.artistRequirementsText),
                    artistBrings: textToTechRiderBrings(data.artistBringsText),
                    organizerCommitments: [],
                    organizerConfirmedAt: null,
                    organizerConfirmedBy: null,
                },
                logistics: null,
                notes: data.message?.trim()
                    ? {
                        artist: data.message.trim(),
                        organizer: null,
                    }
                    : null,
            },
        };

        mutate(payload);
    };

    if (!event) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Apply for {event.title} {stage ? `- ${stage.name}` : ''}</DialogTitle>
                    <DialogDescription>
                        Submit your proposed fee and event-specific technical details for this booking.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <input type="hidden" {...form.register("eventId", { valueAsNumber: true })} value={event.id} />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Proposed Fee</Label>
                            <Input
                                {...form.register("offerAmount")}
                                type="number"
                                placeholder="5000"
                            />
                            {form.formState.errors.offerAmount && (
                                <p className="text-xs text-destructive">{form.formState.errors.offerAmount.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {(event?.metadata as any)?.budgetMin && (event?.metadata as any)?.budgetMax
                                    ? `Event budget: ₹${Number((event.metadata as any).budgetMin).toLocaleString('en-IN')}–₹${Number((event.metadata as any).budgetMax).toLocaleString('en-IN')}`
                                    : event?.capacityTotal
                                    ? `Venue capacity: ${event.capacityTotal} — factor this into your fee`
                                    : "Tip: Check the event description for budget expectations"}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Input
                                {...form.register("currency")}
                                disabled
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Message to Organizer (Recommended)</Label>
                        <Textarea
                            {...form.register("message")}
                            placeholder="Why are you the best fit for this gig?"
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Event-Specific Rider Requirements</Label>
                        <Textarea
                            {...form.register("artistRequirementsText")}
                            placeholder="List each item the organizer should provide, one per line."
                            className="min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            Prefilled from your profile when available. Edit these for this event only.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Equipment You Will Bring</Label>
                        <Textarea
                            {...form.register("artistBringsText")}
                            placeholder="List the gear you will bring yourself, one item per line."
                            className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            Add only what you plan to bring for this event.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Applying...
                                </>
                            ) : (
                                "Submit Application"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
