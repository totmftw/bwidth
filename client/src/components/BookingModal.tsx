import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema } from "@shared/schema";
import { useCreateBooking } from "@/hooks/use-bookings";
import { useOrganizerEvents } from "@/hooks/use-organizer-events";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { CalendarIcon, Loader2, Calendar as CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Schema refinement for the form specifically
const formSchema = insertBookingSchema.extend({
  offerAmount: z.coerce.number().min(1, "Amount must be positive"),
  eventId: z.coerce.number().optional(),
  eventDate: z.date().optional(),
  organizerId: z.number().optional(),
  slotTime: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.eventId || data.eventDate, {
  message: "Either select an existing event or choose a date",
  path: ["eventDate"],
});

type BookingFormValues = z.infer<typeof formSchema>;

interface BookingModalProps {
  artistId: number;
  artistName: string;
  organizerId?: number;
  /** Trigger element for uncontrolled usage */
  trigger?: React.ReactNode;
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
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: BookingModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { mutate, isPending } = useCreateBooking();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isPendingVerification = (user as any)?.status === 'pending_verification';

  const isVenueManager = (user as any)?.metadata?.role === 'venue_manager' || (user as any)?.metadata?.role === 'venue';

  // Organizer events
  const { data: orgEvents, isLoading: isLoadingOrgEvents } = useOrganizerEvents();

  // Venue events (for venue managers)
  const { data: venueEventsRaw, isLoading: isLoadingVenueEvents } = useQuery({
    queryKey: ["/api/venues/events/upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/venues/events/upcoming", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isVenueManager,
  });

  // Normalize venue events to same shape as organizer events
  const venueEvents = (venueEventsRaw || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    startTime: e.date,
  }));

  const events = isVenueManager ? venueEvents : (orgEvents || []);
  const isLoadingEvents = isVenueManager ? isLoadingVenueEvents : isLoadingOrgEvents;

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
      eventId: undefined,
      slotTime: "",
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

  const FormContent = () => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 px-4 sm:px-0">
      <div className="space-y-2">
        <Label>Select Event</Label>
        <Select 
          value={form.watch("eventId")?.toString() || "none"} 
          onValueChange={(v) => {
            form.setValue("eventId", v === "none" ? undefined : parseInt(v));
          }}
          disabled={isLoadingEvents}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Create a new standalone booking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Create new draft event (pick date below)</SelectItem>
            {events?.map((event: any) => (
              <SelectItem key={event.id} value={event.id.toString()}>
                {event.title} • {event.startTime ? format(new Date(event.startTime), "MMM d") : "TBA"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!form.watch("eventId") && (
        <div className="space-y-2">
          <Label>Event Date *</Label>
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
                {form.watch("eventDate") ? format(form.watch("eventDate") as Date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
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
      )}

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
            type="time"
            step="60"
            className="bg-background w-full"
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

      <div className="flex justify-end pt-4 pb-6 sm:pb-0">
        {isPendingVerification && (
          <p className="text-xs text-yellow-500 text-center">
            Your account is pending verification. Offers cannot be sent until approved.
          </p>
        )}
        <Button type="submit" disabled={isPending || isPendingVerification} className="w-full bg-primary hover:bg-primary/90 text-white">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Offer...
            </>
          ) : (
            <>
              <CalendarCheck className="mr-2 h-4 w-4" />
              Send Offer
            </>
          )}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setOpen}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className="bg-card border-border">
          <DrawerHeader className="text-left">
            <DrawerTitle>Book {artistName}</DrawerTitle>
            <DrawerDescription>
              Send an offer to this artist. They will have 48 hours to respond.
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[80vh] overflow-y-auto w-full">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Book {artistName}</DialogTitle>
          <DialogDescription>
            Send an offer to this artist. They will have 48 hours to respond.
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}
