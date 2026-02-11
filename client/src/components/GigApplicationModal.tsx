import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

const formSchema = z.object({
    eventId: z.number(),
    stageId: z.number().optional(),
    offerAmount: z.coerce.number().min(1, "Amount must be positive"),
    currency: z.string().default("INR"),
    message: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof formSchema>;

interface GigApplicationModalProps {
    event: any; // Using any for simplicity as Event type might need import
    stage?: any; // The selected stage/timeslot
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GigApplicationModal({ event, stage, open, onOpenChange }: GigApplicationModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<ApplicationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            eventId: event?.id,
            stageId: stage?.id,
            offerAmount: 5000, // Default suggestion
            currency: "INR",
            message: "",
        },
        values: { // Update values when event changes
            eventId: event?.id,
            stageId: stage?.id,
            offerAmount: 5000,
            currency: "INR",
            message: "",
        }
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (data: ApplicationFormValues) => {
            await apiRequest("POST", "/api/bookings/apply", data);
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
        mutate(data);
    };

    if (!event) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Apply for {event.title} {stage ? `- ${stage.name}` : ''}</DialogTitle>
                    <DialogDescription>
                        Submit your application with your proposed fee.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <input type="hidden" {...form.register("eventId")} value={event.id} />

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
