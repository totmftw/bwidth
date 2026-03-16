import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema } from "@shared/schema";
import { useCreateBooking } from "@/hooks/use-bookings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Schema refinement for the form specifically
const formSchema = insertBookingSchema.extend({
  offerAmount: z.coerce.number().min(1, "Amount must be positive"),
  eventDate: z.date({ required_error: "Date is required" }),
  organizerId: z.number().optional(),
  slotTime: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof formSchema>;

interface BookingModalProps {
  artistId: number;
  artistName: string;
  organizerId: number;
  /** Controlled open state — if provided, the parent manages open/close */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the newly created booking ID on success */
  onSuccess?: (bookingId: number) => void;
}

export function BookingModal({
  artistId,
  artistName,
  organizerId,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: BookingModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { mutate, isPending } = useCreateBooking();

  // Support both controlled (via open/onOpenChange) and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (controlledOpen === undefined) setUncontrolledOpen(v);
  };

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artistId,
      organizerId,
      offerCurrency: "INR",
      status: "offered",
      offerAmount: 0,
      notes: "",
    },
  });

  function onSubmit(data: BookingFormValues) {
    const submitData = {
      ...data,
      depositAmount: data.depositAmount ?? undefined,
    };
    mutate(submitData as any, {
      onSuccess: (booking: any) => {
        setOpen(false);
        if (onSuccess && booking?.id) {
          onSuccess(booking.id);
        }
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Book {artistName}</DialogTitle>
          <DialogDescription>
            Send an offer to this artist. They will have 48 hours to respond.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Event Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
                    !form.watch("eventDate") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("eventDate") ? format(form.watch("eventDate"), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("eventDate")}
                  onSelect={(date) => form.setValue("eventDate", date as Date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.eventDate && (
              <p className="text-xs text-destructive">{form.formState.errors.eventDate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Offer Amount (₹)</Label>
              <Input
                {...form.register("offerAmount")}
                type="number"
                placeholder="5000"
                className="bg-background"
              />
              {form.formState.errors.offerAmount && (
                <p className="text-xs text-destructive">{form.formState.errors.offerAmount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Slot Time</Label>
              <Input
                {...form.register("slotTime")}
                placeholder="22:00 - 00:00"
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message / Notes</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Tell them about the event, venue, vibe..."
              className="bg-background min-h-[100px]"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Offer...
                </>
              ) : (
                "Send Offer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
